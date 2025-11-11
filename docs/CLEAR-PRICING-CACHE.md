# Clear Pricing Cache

## Quick Command

If Firebase emulators are running, use this command:

```bash
cd collabcanvas/functions
node clear-pricing-cache.js [storeNumber]
```

**Examples:**
```bash
# Clear cache for default store (3620)
node clear-pricing-cache.js

# Clear cache for specific store
node clear-pricing-cache.js 3620
```

## Alternative: Firebase CLI

If you want to use Firebase CLI directly:

```bash
# Connect to emulator Firestore
firebase firestore:delete pricing/3620/items --recursive --project collabcanvas-dev
```

## Manual: Firebase Console

1. Go to Firebase Console → Firestore
2. Navigate to: `pricing` → `3620` → `items`
3. Select all documents and delete

## Note

The cache will automatically expire after 24 hours, but clearing it manually allows immediate fresh API calls.

