"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparePrices = exports.parseMatchResult = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
const dotenv = require("dotenv");
const path = require("path");
const openai_1 = require("openai");
// Load environment variables - try multiple locations
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
// Log environment variable loading status
if (process.env.NODE_ENV !== 'production') {
    console.log('[PRICE_COMPARISON] Environment check:');
    console.log('[PRICE_COMPARISON] - UNWRANGLE_API_KEY:', process.env.UNWRANGLE_API_KEY ? 'SET' : 'NOT SET');
    console.log('[PRICE_COMPARISON] - OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
}
// Initialize admin if not already
try {
    admin.app();
}
catch (_a) {
    admin.initializeApp();
}
// Configure Firestore to use emulator if running locally
if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log('[PRICE_COMPARISON] Using Firestore emulator:', process.env.FIRESTORE_EMULATOR_HOST);
}
else if (process.env.NODE_ENV !== 'production' && !process.env.FUNCTIONS_EMULATOR) {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8081';
    console.log('[PRICE_COMPARISON] Setting FIRESTORE_EMULATOR_HOST to 127.0.0.1:8081');
}
// ============ CONSTANTS ============
const PLATFORMS = {
    homeDepot: 'homedepot_search',
    lowes: 'lowes_search',
    aceHardware: 'acehardware_search',
};
const RETAILERS = ['homeDepot', 'lowes', 'aceHardware'];
const UNWRANGLE_TIMEOUT_MS = 30000; // 30 seconds per retailer
// ============ UNWRANGLE API ============
async function fetchFromUnwrangle(productName, platform, zipCode) {
    const apiKey = process.env.UNWRANGLE_API_KEY;
    if (!apiKey) {
        console.error('[PRICE_COMPARISON] UNWRANGLE_API_KEY not configured');
        throw new Error('UNWRANGLE_API_KEY not configured');
    }
    const params = new URLSearchParams({
        platform,
        search: productName,
        api_key: apiKey,
    });
    if (zipCode)
        params.append('zipcode', zipCode);
    const url = `https://data.unwrangle.com/api/getter/?${params}`;
    console.log(`[PRICE_COMPARISON] Fetching from Unwrangle: platform=${platform}, search="${productName}"`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UNWRANGLE_TIMEOUT_MS);
    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) {
            const errorText = await res.text();
            console.error(`[PRICE_COMPARISON] Unwrangle error: ${res.status} - ${errorText}`);
            return [];
        }
        const data = await res.json();
        const results = data.results || [];
        console.log(`[PRICE_COMPARISON] Unwrangle returned ${results.length} results for "${productName}" on ${platform}`);
        return results;
    }
    catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
            console.error(`[PRICE_COMPARISON] Unwrangle timeout for ${platform}`);
            return [];
        }
        console.error(`[PRICE_COMPARISON] Unwrangle fetch error:`, err);
        return [];
    }
}
// ============ JSON SANITIZATION ============
/**
 * Parse LLM response, handling markdown-wrapped JSON
 * GPT-4o-mini sometimes returns: ```json\n{...}\n```
 */
function parseMatchResult(content) {
    const cleaned = content
        .replace(/```json\n?/gi, '')
        .replace(/```\n?/g, '')
        .trim();
    try {
        const parsed = JSON.parse(cleaned);
        return {
            index: typeof parsed.index === 'number' ? parsed.index : 0,
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
            reasoning: parsed.reasoning || 'No reasoning provided',
        };
    }
    catch (_a) {
        // Fallback if JSON parsing fails
        console.warn('[PRICE_COMPARISON] JSON parse failed, using fallback');
        return { index: 0, confidence: 0.5, reasoning: 'Fallback to first result (JSON parse failed)' };
    }
}
exports.parseMatchResult = parseMatchResult;
// ============ LLM MATCHING ============
async function selectBestMatch(productName, results, retailer) {
    var _a, _b;
    if (results.length === 0) {
        return { index: -1, confidence: 0, reasoning: 'No search results' };
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error('[PRICE_COMPARISON] OPENAI_API_KEY not configured');
        return { index: 0, confidence: 0.5, reasoning: 'OpenAI not configured - defaulting to first result' };
    }
    const openai = new openai_1.default({ apiKey });
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{
                    role: 'user',
                    content: `Given the original product: "${productName}"
And these search results from ${retailer}:
${JSON.stringify(results.slice(0, 5), null, 2)}

Select the BEST matching product (index 0-4) based on:
1. Functional equivalence
2. Specification compatibility
3. Price competitiveness

Return ONLY JSON: { "index": number, "confidence": number (0-1), "reasoning": "brief" }`
                }],
            temperature: 0.1,
        });
        const content = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '{}';
        console.log(`[PRICE_COMPARISON] LLM response for ${retailer}: ${content.substring(0, 100)}...`);
        return parseMatchResult(content);
    }
    catch (err) {
        console.error(`[PRICE_COMPARISON] OpenAI error for ${retailer}:`, err);
        return { index: 0, confidence: 0.5, reasoning: 'OpenAI error - defaulting to first result' };
    }
}
// ============ PRODUCT NORMALIZATION ============
function normalizeProduct(rawProduct, retailer) {
    if (!rawProduct || typeof rawProduct !== 'object') {
        return null;
    }
    const product = rawProduct;
    // Extract price - handle various formats
    let price = 0;
    if (typeof product.price === 'number') {
        price = product.price;
    }
    else if (typeof product.price === 'string') {
        const cleaned = product.price.replace(/[^0-9.]/g, '');
        price = parseFloat(cleaned) || 0;
    }
    else if (typeof product.sale_price === 'number') {
        price = product.sale_price;
    }
    else if (typeof product.sale_price === 'string') {
        const cleaned = product.sale_price.replace(/[^0-9.]/g, '');
        price = parseFloat(cleaned) || 0;
    }
    // Extract ID - various field names
    const id = String(product.id || product.product_id || product.sku || product.item_id || '');
    // Extract URL
    const url = String(product.url || product.link || product.product_url || '');
    // Extract name
    const name = String(product.name || product.title || product.product_name || '');
    if (!id || !name || price <= 0) {
        return null;
    }
    return {
        id,
        name,
        brand: product.brand ? String(product.brand) : null,
        price,
        currency: 'USD',
        url,
        imageUrl: product.image ? String(product.image) : null,
        retailer,
    };
}
// ============ BEST PRICE DETERMINATION ============
function determineBestPrice(matches) {
    let bestRetailer = null;
    let bestProduct = null;
    let lowestPrice = Infinity;
    let highestPrice = 0;
    for (const retailer of RETAILERS) {
        const match = matches[retailer];
        if (match.selectedProduct && match.selectedProduct.price > 0) {
            if (match.selectedProduct.price < lowestPrice) {
                lowestPrice = match.selectedProduct.price;
                bestRetailer = retailer;
                bestProduct = match.selectedProduct;
            }
            if (match.selectedProduct.price > highestPrice) {
                highestPrice = match.selectedProduct.price;
            }
        }
    }
    if (!bestRetailer || !bestProduct) {
        return null;
    }
    const savings = highestPrice - lowestPrice;
    return { retailer: bestRetailer, product: bestProduct, savings };
}
// ============ SINGLE PRODUCT COMPARISON ============
async function compareOneProduct(productName, zipCode) {
    const matches = {};
    console.log(`[PRICE_COMPARISON] Comparing product: "${productName}"`);
    // Fetch from all retailers in parallel
    const retailerResults = await Promise.all(RETAILERS.map(async (retailer) => {
        try {
            const results = await fetchFromUnwrangle(productName, PLATFORMS[retailer], zipCode);
            const match = await selectBestMatch(productName, results, retailer);
            let selectedProduct = null;
            if (match.index >= 0 && results[match.index]) {
                selectedProduct = normalizeProduct(results[match.index], retailer);
            }
            return {
                retailer,
                match: {
                    selectedProduct,
                    confidence: match.confidence,
                    reasoning: match.reasoning,
                    searchResultsCount: results.length,
                },
            };
        }
        catch (error) {
            console.error(`[PRICE_COMPARISON] Error for ${retailer}:`, error);
            return {
                retailer,
                match: {
                    selectedProduct: null,
                    confidence: 0,
                    reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
                    searchResultsCount: 0,
                },
            };
        }
    }));
    // Build matches record
    for (const { retailer, match } of retailerResults) {
        matches[retailer] = match;
    }
    // Determine best price
    const bestPrice = determineBestPrice(matches);
    console.log(`[PRICE_COMPARISON] Completed comparison for "${productName}". Best price: ${bestPrice ? `$${bestPrice.product.price} at ${bestPrice.retailer}` : 'none'}`);
    return {
        originalProductName: productName,
        matches,
        bestPrice,
        comparedAt: Date.now(),
    };
}
// ============ MAIN CLOUD FUNCTION ============
exports.comparePrices = (0, https_1.onCall)({
    cors: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
    ],
    maxInstances: 10,
    memory: '1GiB',
    timeoutSeconds: 540, // Max for 2nd gen - handles large product lists
}, async (req) => {
    var _a, _b, _c;
    console.log('[PRICE_COMPARISON] Function invoked');
    console.log('[PRICE_COMPARISON] Request data:', JSON.stringify(req.data));
    const { projectId, productNames, forceRefresh, zipCode } = ((_a = req.data) === null || _a === void 0 ? void 0 : _a.request) || {};
    // Validate required parameters
    if (!projectId) {
        console.error('[PRICE_COMPARISON] projectId is required');
        throw new https_1.HttpsError('invalid-argument', 'projectId is required');
    }
    if (!productNames || !Array.isArray(productNames) || productNames.length === 0) {
        console.error('[PRICE_COMPARISON] productNames array is required');
        throw new https_1.HttpsError('invalid-argument', 'productNames array is required');
    }
    const db = (0, firestore_1.getFirestore)();
    const docRef = db.collection('projects').doc(projectId)
        .collection('priceComparison').doc('latest');
    // 1. Check for existing complete results (unless forceRefresh)
    if (!forceRefresh) {
        const existingDoc = await docRef.get();
        if (existingDoc.exists && ((_b = existingDoc.data()) === null || _b === void 0 ? void 0 : _b.status) === 'complete') {
            console.log('[PRICE_COMPARISON] Returning cached results');
            return { cached: true };
        }
    }
    // 2. Initialize progress document
    await docRef.set({
        status: 'processing',
        totalProducts: productNames.length,
        completedProducts: 0,
        results: [],
        startedAt: Date.now(),
        createdBy: ((_c = req.auth) === null || _c === void 0 ? void 0 : _c.uid) || 'anonymous',
    });
    console.log(`[PRICE_COMPARISON] Starting comparison for ${productNames.length} products`);
    const results = [];
    try {
        // 3. Process each product and update Firestore incrementally
        for (const productName of productNames) {
            const result = await compareOneProduct(productName, zipCode);
            results.push(result);
            // Update progress - frontend sees this via onSnapshot
            await docRef.update({
                completedProducts: results.length,
                results: results,
            });
            console.log(`[PRICE_COMPARISON] Progress: ${results.length}/${productNames.length} products completed`);
        }
        // 4. Mark complete
        await docRef.update({
            status: 'complete',
            completedAt: Date.now(),
        });
        console.log('[PRICE_COMPARISON] Comparison complete');
        return { cached: false };
    }
    catch (error) {
        // Handle errors gracefully
        console.error('[PRICE_COMPARISON] Error during comparison:', error);
        await docRef.update({
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new https_1.HttpsError('internal', 'Price comparison failed');
    }
});
//# sourceMappingURL=priceComparison.js.map