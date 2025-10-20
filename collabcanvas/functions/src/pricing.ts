import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize admin if not already
try {
  admin.app();
} catch {
  admin.initializeApp();
}

interface PriceRequest {
  materialName: string;
  unit?: string;
  storeNumber?: string; // e.g., '3620'
}

interface PriceResponse {
  success: boolean;
  priceUSD: number | null;
  link: string | null;
}

function normalizeKey(name: string, unit?: string) {
  const base = name.trim().toLowerCase();
  const unitPart = unit ? `__${unit.trim().toLowerCase()}` : '';
  // Place '-' at end of character class to avoid needing an escape
  return `${base}${unitPart}`.replace(/[^a-z0-9_-]+/g, '_');
}

async function fetchFromSerpApi(query: string): Promise<{ priceUSD: number | null; link: string | null; }>
{
  const apiKey = process.env.SERP_API_KEY || '';
  if (!apiKey) {
    console.error('SERP_API_KEY not configured');
    return { priceUSD: null, link: null };
  }

  const params = new URLSearchParams({
    engine: 'home_depot',
    q: query,
    api_key: apiKey,
  });

  const url = `https://serpapi.com/search.json?${params.toString()}`;
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      console.warn('SerpAPI non-OK response:', res.status, await res.text());
      return { priceUSD: null, link: null };
    }
    const data = await res.json();
    const results = data?.organic_results || [];
    if (!Array.isArray(results) || results.length === 0) {
      return { priceUSD: null, link: null };
    }
    const first = results[0];
    const link: string | null = first?.link || null;
    // price could be in price or extracted_price fields; handle string like "$3.58"
    const priceStr: string | number | undefined = first?.price || first?.primary_price || first?.extracted_price;
    let priceUSD: number | null = null;
    if (typeof priceStr === 'number') {
      priceUSD = priceStr;
    } else if (typeof priceStr === 'string') {
      const cleaned = priceStr.replace(/[^0-9.]/g, '');
      const parsed = parseFloat(cleaned);
      priceUSD = Number.isFinite(parsed) ? parseFloat(parsed.toFixed(2)) : null;
    }
    return { priceUSD, link };
  } catch (err) {
    console.error('SerpAPI fetch error:', err);
    return { priceUSD: null, link: null };
  }
}

export const getHomeDepotPrice = onCall<{ request: PriceRequest }>({
  cors: true,
  maxInstances: 20,
  memory: '256MiB',
}, async (req) => {
  try {
    const { materialName, unit, storeNumber } = req.data?.request || {} as PriceRequest;
    if (!materialName) throw new HttpsError('invalid-argument', 'materialName is required');

    const store = (storeNumber || '3620').toString();
    const key = normalizeKey(materialName, unit);
    const db = getFirestore();
    const docRef = db.collection('pricing').doc(store).collection('items').doc(key);

    // Cache lookup
    const cached = await docRef.get();
    if (cached.exists) {
      const d = cached.data() as { priceUSD?: number; link?: string } | undefined;
      return {
        success: true,
        priceUSD: d && typeof d.priceUSD === 'number' ? d.priceUSD : null,
        link: d && d.link ? d.link : null,
      };
    }

    // Fetch from SerpAPI
    const query = unit ? `${materialName} ${unit}` : materialName;
    const { priceUSD, link } = await fetchFromSerpApi(query);

    // Store in cache
    await docRef.set({
      key,
      materialName,
      unit: unit || null,
      priceUSD: typeof priceUSD === 'number' ? priceUSD : null,
      link: link || null,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return { success: true, priceUSD, link } as PriceResponse;
  } catch (e) {
    console.error('getHomeDepotPrice error:', e);
    if (e instanceof HttpsError) throw e;
    return { success: false, priceUSD: null, link: null } as PriceResponse;
  }
});


