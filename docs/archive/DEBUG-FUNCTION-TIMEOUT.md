# Debugging Function Timeout Issue

## The Problem
The function is timing out after 30 seconds, which means:
- The function is being called ✅
- But it's not responding ❌

## Quick Checks

### 1. Check Emulator Logs
Look at the terminal where you're running `firebase emulators:start`. You should see:
```
[PRICING] Function invoked
[PRICING] Request data: {...}
[PRICING] SERP_API_KEY configured: YES/NO
```

**If you DON'T see these logs**, the function isn't running in the emulator.

### 2. Rebuild Functions
```bash
cd collabcanvas/functions
npm run build
```

### 3. Restart Emulators
```bash
# Stop emulators (Ctrl+C)
cd collabcanvas
firebase emulators:start --only functions,firestore
```

### 4. Check Function is Deployed
When emulators start, you should see:
```
✔  functions[us-central1-getHomeDepotPrice]: http function initialized
```

If you DON'T see this, the function isn't being loaded.

## Common Issues

### Issue 1: Function Not Built
**Solution:** Run `npm run build` in `collabcanvas/functions/`

### Issue 2: Wrong Emulator Port
**Check:** Make sure emulator is on port 5001 (check `firebase.json`)

### Issue 3: SERP_API_KEY Not Loading
**Check:** 
- `.env` file is in `collabcanvas/functions/.env`
- Format: `SERP_API_KEY=your_key_here` (no quotes, no spaces)
- Rebuild after adding it

### Issue 4: Function Crashing Silently
**Check emulator logs** for error messages

## What to Look For

**In Emulator Terminal:**
```
[PRICING] Environment check:
[PRICING] - SERP_API_KEY: SET
[PRICING] Function invoked
[PRICING] Request data: {"request":{"materialName":"Epoxy Cleaner/Degreaser"...}}
```

**If you see errors**, they'll tell you what's wrong.

## Quick Test

After rebuilding and restarting, try clicking "Refresh Prices" again. Check BOTH:
1. Browser console (for client-side logs)
2. Emulator terminal (for server-side logs)

The emulator terminal logs will show you exactly what's happening inside the function.

