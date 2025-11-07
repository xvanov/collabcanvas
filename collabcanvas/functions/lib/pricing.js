"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHomeDepotPrice = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
const dotenv = require("dotenv");
const path = require("path");
// Load environment variables - try multiple locations
dotenv.config(); // Default: .env in functions directory
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // Explicit path
dotenv.config({ path: path.resolve(process.cwd(), '.env') }); // Current working directory
// Log environment variable loading status
if (process.env.NODE_ENV !== 'production') {
    console.log('[PRICING] Environment check:');
    console.log('[PRICING] - SERP_API_KEY:', process.env.SERP_API_KEY ? 'SET' : 'NOT SET');
    console.log('[PRICING] - NODE_ENV:', process.env.NODE_ENV);
    console.log('[PRICING] - CWD:', process.cwd());
}
// Initialize admin if not already
try {
    admin.app();
}
catch (_a) {
    admin.initializeApp();
}
// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second
// Cache TTL: 24 hours
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
function normalizeKey(name, unit) {
    const base = name.trim().toLowerCase();
    const unitPart = unit ? `__${unit.trim().toLowerCase()}` : '';
    // Place '-' at end of character class to avoid needing an escape
    return `${base}${unitPart}`.replace(/[^a-z0-9_-]+/g, '_');
}
/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Fetch price from SerpAPI with retry logic and exponential backoff
 */
async function fetchFromSerpApi(query, attempt = 1) {
    console.log(`[PRICING] fetchFromSerpApi called: query="${query}", attempt=${attempt}`);
    const apiKey = process.env.SERP_API_KEY || '';
    if (!apiKey) {
        const error = 'SERP_API_KEY not configured';
        console.error(`[PRICING] ${error}`);
        return { priceUSD: null, link: null, error };
    }
    const params = new URLSearchParams({
        engine: 'home_depot',
        q: query,
        api_key: apiKey,
    });
    const url = `https://serpapi.com/search.json?${params.toString()}`;
    console.log(`[PRICING] Making request to SerpAPI (attempt ${attempt})...`);
    try {
        const res = await fetch(url, { method: 'GET' });
        console.log(`[PRICING] SerpAPI response status: ${res.status}`);
        if (!res.ok) {
            const errorText = await res.text();
            const error = `SerpAPI non-OK response: ${res.status} - ${errorText}`;
            console.warn(`[PRICING] ${error} (attempt ${attempt}/${MAX_RETRIES})`);
            // Retry on server errors (5xx) or rate limits (429)
            if ((res.status >= 500 || res.status === 429) && attempt < MAX_RETRIES) {
                const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                console.log(`[PRICING] Retrying in ${delay}ms...`);
                await sleep(delay);
                return fetchFromSerpApi(query, attempt + 1);
            }
            return { priceUSD: null, link: null, error };
        }
        console.log(`[PRICING] Parsing SerpAPI response...`);
        const data = await res.json();
        const results = (data === null || data === void 0 ? void 0 : data.organic_results) || [];
        if (!Array.isArray(results) || results.length === 0) {
            const error = 'No results found';
            console.warn(`[PRICING] ${error} for query: ${query}`);
            return { priceUSD: null, link: null, error };
        }
        const first = results[0];
        const link = (first === null || first === void 0 ? void 0 : first.link) || null;
        // price could be in price or extracted_price fields; handle string like "$3.58"
        const priceStr = (first === null || first === void 0 ? void 0 : first.price) || (first === null || first === void 0 ? void 0 : first.primary_price) || (first === null || first === void 0 ? void 0 : first.extracted_price);
        let priceUSD = null;
        if (typeof priceStr === 'number') {
            priceUSD = priceStr;
        }
        else if (typeof priceStr === 'string') {
            const cleaned = priceStr.replace(/[^0-9.]/g, '');
            const parsed = parseFloat(cleaned);
            priceUSD = Number.isFinite(parsed) ? parseFloat(parsed.toFixed(2)) : null;
        }
        if (priceUSD === null) {
            const error = 'Price not found in result';
            console.warn(`[PRICING] ${error} for query: ${query}`);
            return { priceUSD: null, link, error };
        }
        console.log(`[PRICING] Successfully fetched price $${priceUSD} for: ${query}`);
        return { priceUSD, link };
    }
    catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[PRICING] SerpAPI fetch error (attempt ${attempt}/${MAX_RETRIES}):`, error);
        // Retry on network errors
        if (attempt < MAX_RETRIES) {
            const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            console.log(`[PRICING] Retrying in ${delay}ms...`);
            await sleep(delay);
            return fetchFromSerpApi(query, attempt + 1);
        }
        return { priceUSD: null, link: null, error };
    }
}
exports.getHomeDepotPrice = (0, https_1.onCall)({
    cors: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
    ],
    maxInstances: 20,
    memory: '256MiB',
}, async (req) => {
    var _a;
    console.log('[PRICING] Function invoked');
    console.log('[PRICING] Request data:', JSON.stringify(req.data));
    try {
        // Log API key status (without exposing the key)
        const apiKeySet = !!process.env.SERP_API_KEY;
        console.log(`[PRICING] SERP_API_KEY configured: ${apiKeySet ? 'YES' : 'NO'}`);
        if (!apiKeySet) {
            console.error('[PRICING] SERP_API_KEY not found in environment variables');
            console.error('[PRICING] Make sure .env file exists in functions/ directory with SERP_API_KEY=...');
            return {
                success: false,
                priceUSD: null,
                link: null,
                error: 'SERP_API_KEY not configured. Check emulator logs for details.'
            };
        }
        const { materialName, unit, storeNumber } = ((_a = req.data) === null || _a === void 0 ? void 0 : _a.request) || {};
        if (!materialName) {
            console.error('[PRICING] materialName is required');
            throw new https_1.HttpsError('invalid-argument', 'materialName is required');
        }
        console.log(`[PRICING] Processing request for: ${materialName}${unit ? ` (${unit})` : ''}`);
        const store = (storeNumber || '3620').toString();
        const key = normalizeKey(materialName, unit);
        console.log(`[PRICING] Cache key: ${key}, Store: ${store}`);
        const db = (0, firestore_1.getFirestore)();
        const docRef = db.collection('pricing').doc(store).collection('items').doc(key);
        console.log(`[PRICING] Checking cache in Firestore...`);
        // Cache lookup with TTL check
        const cached = await docRef.get();
        console.log(`[PRICING] Cache lookup complete. Exists: ${cached.exists}`);
        if (cached.exists) {
            const d = cached.data();
            const updatedAt = d === null || d === void 0 ? void 0 : d.updatedAt;
            // Check if cache is still valid (within 24 hours)
            if (updatedAt) {
                const updatedAtMs = updatedAt.toMillis();
                const nowMs = Date.now();
                const ageMs = nowMs - updatedAtMs;
                if (ageMs < CACHE_TTL_MS) {
                    console.log(`[PRICING] Cache hit for: ${materialName} (age: ${Math.round(ageMs / 1000 / 60)} minutes)`);
                    return {
                        success: true,
                        priceUSD: d && typeof d.priceUSD === 'number' ? d.priceUSD : null,
                        link: d && d.link ? d.link : null,
                    };
                }
                else {
                    console.log(`[PRICING] Cache expired for: ${materialName} (age: ${Math.round(ageMs / 1000 / 60 / 60)} hours)`);
                }
            }
        }
        // Fetch from SerpAPI with retry logic
        const query = unit ? `${materialName} ${unit}` : materialName;
        console.log(`[PRICING] Fetching from SerpAPI: ${query}`);
        const startTime = Date.now();
        const { priceUSD, link, error } = await fetchFromSerpApi(query);
        const fetchTime = Date.now() - startTime;
        console.log(`[PRICING] SerpAPI fetch complete. Price: ${priceUSD}, Error: ${error || 'none'}, Time: ${fetchTime}ms`);
        const success = priceUSD !== null;
        // Log success rate metrics
        console.log(`[PRICING] Fetch result for "${materialName}": success=${success}, price=${priceUSD}, fetchTime=${fetchTime}ms${error ? `, error=${error}` : ''}`);
        // Store in cache (even if price is null, to avoid repeated failed requests)
        await docRef.set({
            key,
            materialName,
            unit: unit || null,
            priceUSD: typeof priceUSD === 'number' ? priceUSD : null,
            link: link || null,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            lastFetchTime: fetchTime,
            lastError: error || null,
        }, { merge: true });
        return { success, priceUSD, link, error };
    }
    catch (e) {
        console.error('getHomeDepotPrice error:', e);
        if (e instanceof https_1.HttpsError)
            throw e;
        return { success: false, priceUSD: null, link: null };
    }
});
//# sourceMappingURL=pricing.js.map