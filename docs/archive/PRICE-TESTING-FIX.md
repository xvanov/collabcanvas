# How to Test Price Integration - Quick Fix Guide

## The Problem

You're seeing CORS errors because:
1. **You're calling a deployed Cloud Function from localhost** (`http://localhost:5173` → `https://us-central1-collabcanvas-dev.cloudfunctions.net`)
2. **Pricing logs appear in Cloud Functions logs, not browser console**

## Solution Options

### Option 1: Use Firebase Emulators (Recommended for Local Testing)

**This is the best option for local development!**

1. **Start Firebase Emulators:**
   ```bash
   cd collabcanvas
   firebase emulators:start --only functions
   ```

2. **Update your `.env` to use emulators:**
   ```bash
   VITE_USE_FIREBASE_EMULATORS=true
   ```

3. **Restart your dev server:**
   ```bash
   npm run dev
   ```

4. **Now pricing will work locally without CORS issues!**

### Option 2: Redeploy the Function (For Production Testing)

If you want to test against the deployed function:

1. **Redeploy the function:**
   ```bash
   cd collabcanvas/functions
   npm run build
   firebase deploy --only functions:getHomeDepotPrice
   ```

2. **The function already has `cors: true` configured**, so it should work after redeployment.

## Where to See Pricing Logs

### Browser Console (Client-Side)
After my fix, you'll now see:
```
[PRICING] Starting price fetch for 3 materials
[PRICING] Fetching price for: epoxy flooring
[PRICING] ✅ Success: epoxy flooring = $45.99 (https://...)
[PRICING] Complete: 2/3 materials priced successfully
```

### Cloud Functions Logs (Server-Side)
To see the detailed server logs:

**Option A: Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Functions** → **Logs**
4. Filter by `getHomeDepotPrice`
5. Look for `[PRICING]` logs

**Option B: Firebase CLI**
```bash
cd collabcanvas/functions
firebase functions:log --only getHomeDepotPrice
```

You'll see logs like:
```
[PRICING] Cache hit for: epoxy flooring (age: 5 minutes)
[PRICING] Fetch result for "epoxy flooring": success=true, price=45.99, fetchTime=1234ms
[PRICING] Successfully fetched price $45.99 for: epoxy flooring
```

## Testing Steps

1. **Generate an estimate** (you already did this ✅)
2. **Click "Refresh Prices"** button
3. **Check browser console** - you should now see `[PRICING]` logs
4. **Check Material Estimation Panel** - prices should appear next to materials
5. **If using emulators**, check terminal where emulators are running for server logs
6. **If using deployed function**, check Firebase Console → Functions → Logs

## What You Should See

### In Browser Console:
```
[PRICING] Starting price fetch for 1 materials
[PRICING] Fetching price for: epoxy flooring
[PRICING] ✅ Success: epoxy flooring = $45.99 (https://www.homedepot.com/...)
[PRICING] Complete: 1/1 materials priced successfully
```

### In Material Estimation Panel:
- Material name: "epoxy flooring"
- Unit price: "$45.99" (or "N/A" if price fetch failed)
- Total: "$X.XX" (quantity × unit price)
- Link: Clickable Home Depot link (if available)

## Troubleshooting

### Still seeing CORS errors?
- Make sure you're using Firebase emulators OR
- Redeploy the function: `firebase deploy --only functions:getHomeDepotPrice`

### No prices showing?
- Check browser console for `[PRICING]` logs
- Check if `SERP_API_KEY` is configured in `collabcanvas/functions/.env`
- Check Cloud Functions logs for errors

### Prices show as "N/A"?
- Material name might not be found in Home Depot
- Check Cloud Functions logs for the specific error
- Try a more common material name (e.g., "drywall" instead of "epoxy flooring")

## Quick Test

Try this in your browser console after clicking "Refresh Prices":
```javascript
// Check if prices were fetched
const bom = useCanvasStore.getState().billOfMaterials;
console.log('BOM with prices:', bom);
console.log('Materials:', bom?.totalMaterials.map(m => ({
  name: m.name,
  price: m.priceUSD,
  link: m.homeDepotLink
})));
```

