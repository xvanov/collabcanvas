"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHomeDepotPrice = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
const dotenv = require("dotenv");
dotenv.config();
// Initialize admin if not already
try {
    admin.app();
}
catch (_a) {
    admin.initializeApp();
}
function normalizeKey(name, unit) {
    const base = name.trim().toLowerCase();
    const unitPart = unit ? `__${unit.trim().toLowerCase()}` : '';
    // Place '-' at end of character class to avoid needing an escape
    return `${base}${unitPart}`.replace(/[^a-z0-9_-]+/g, '_');
}
async function fetchFromSerpApi(query) {
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
        const results = (data === null || data === void 0 ? void 0 : data.organic_results) || [];
        if (!Array.isArray(results) || results.length === 0) {
            return { priceUSD: null, link: null };
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
        return { priceUSD, link };
    }
    catch (err) {
        console.error('SerpAPI fetch error:', err);
        return { priceUSD: null, link: null };
    }
}
exports.getHomeDepotPrice = (0, https_1.onCall)({
    cors: true,
    maxInstances: 20,
    memory: '256MiB',
}, async (req) => {
    var _a;
    try {
        const { materialName, unit, storeNumber } = ((_a = req.data) === null || _a === void 0 ? void 0 : _a.request) || {};
        if (!materialName)
            throw new https_1.HttpsError('invalid-argument', 'materialName is required');
        const store = (storeNumber || '3620').toString();
        const key = normalizeKey(materialName, unit);
        const db = (0, firestore_1.getFirestore)();
        const docRef = db.collection('pricing').doc(store).collection('items').doc(key);
        // Cache lookup
        const cached = await docRef.get();
        if (cached.exists) {
            const d = cached.data();
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
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        return { success: true, priceUSD, link };
    }
    catch (e) {
        console.error('getHomeDepotPrice error:', e);
        if (e instanceof https_1.HttpsError)
            throw e;
        return { success: false, priceUSD: null, link: null };
    }
});
//# sourceMappingURL=pricing.js.map