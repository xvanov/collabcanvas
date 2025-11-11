#!/usr/bin/env node
/**
 * Clear pricing cache from Firestore
 * Usage: node clear-pricing-cache.js [storeNumber]
 */

const admin = require('firebase-admin');

// Initialize admin (will use emulator if running)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'collabcanvas-dev',
  });
}

const db = admin.firestore();

async function clearPricingCache(storeNumber = '3620') {
  try {
    console.log(`[CACHE] Clearing pricing cache for store: ${storeNumber}`);
    
    const storeRef = db.collection('pricing').doc(storeNumber).collection('items');
    const snapshot = await storeRef.get();
    
    if (snapshot.empty) {
      console.log(`[CACHE] No cached items found for store ${storeNumber}`);
      return;
    }
    
    console.log(`[CACHE] Found ${snapshot.size} cached items`);
    
    const batch = db.batch();
    let count = 0;
    
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });
    
    await batch.commit();
    console.log(`[CACHE] ✅ Deleted ${count} cached items for store ${storeNumber}`);
    
  } catch (error) {
    console.error('[CACHE] Error clearing cache:', error);
    process.exit(1);
  }
}

// Get store number from command line args
const storeNumber = process.argv[2] || '3620';

clearPricingCache(storeNumber)
  .then(() => {
    console.log('[CACHE] Cache cleared successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[CACHE] Failed to clear cache:', error);
    process.exit(1);
  });

