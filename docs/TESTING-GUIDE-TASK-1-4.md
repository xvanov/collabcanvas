# Testing Guide for Tasks 1-4 Fixes

This guide helps you test the bug fixes locally before continuing with performance optimizations.

## Prerequisites

### 1. Firebase Setup
- Firebase project configured
- `.env` file with Firebase credentials (see `collabcanvas/README.md`)
- Firebase emulators (optional but recommended for testing)

### 2. Environment Variables

**Frontend (.env in `collabcanvas/`):**
```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_USE_FIREBASE_EMULATORS=false  # Set to true for local testing
```

**Cloud Functions (`.env` in `collabcanvas/functions/`):**
```bash
SERP_API_KEY=your_serpapi_key  # For Home Depot price testing
OPENAI_API_KEY=your_openai_key  # For AI command testing
```

### 3. Start Development Environment

**Terminal 1 - Frontend:**
```bash
cd collabcanvas
npm install
npm run dev
```

**Terminal 2 - Cloud Functions (if testing pricing/AI):**
```bash
cd collabcanvas/functions
npm install
npm run serve  # or use Firebase emulators
```

**Terminal 3 - Firebase Emulators (optional):**
```bash
firebase emulators:start
```

---

## Test 1: Plan Deletion Persistence ✅

### What Was Fixed
- Plan deletion now properly removes data from both Firestore and Storage
- Deletion persists after page reload

### How to Test

1. **Start the app:**
   ```bash
   cd collabcanvas
   npm run dev
   ```

2. **Sign in** with Google authentication

3. **Upload a plan:**
   - Click "Upload Plan" or use the file upload button
   - Select a PNG/JPG image
   - Verify the plan appears as background

4. **Delete the plan:**
   - Click "Delete Plan" button
   - Confirm deletion

5. **Verify deletion:**
   - Check browser console for logs:
     - `🎯 Background image deleted from Firestore`
     - `❌ Failed to delete background image from Storage` (if Storage deletion fails)
   - **Reload the page** (F5 or Cmd+R)
   - **Expected:** Plan should NOT reappear after reload

6. **Check Firestore:**
   - Open Firebase Console → Firestore Database
   - Navigate to `boards/global` document
   - **Expected:** `backgroundImage` field should be completely removed (not null, not undefined)

7. **Check Storage:**
   - Open Firebase Console → Storage
   - Navigate to `construction-plans/` folder
   - **Expected:** Deleted plan file should be removed from Storage

### Success Criteria
- ✅ Plan disappears immediately after deletion
- ✅ Plan does NOT reappear after page reload
- ✅ Firestore document has no `backgroundImage` field
- ✅ Storage file is deleted

---

## Test 2: Scale Deletion Persistence ✅

### What Was Fixed
- Scale deletion now properly removes data from Firestore
- Deletion persists after page reload

### How to Test

1. **Start the app** (if not already running)

2. **Create a scale reference:**
   - Upload a plan (if not already done)
   - Click "Scale Tool" in the toolbar
   - Click two points on the plan (e.g., a known wall length)
   - Enter a real-world measurement (e.g., "10 feet")
   - Verify scale line appears

3. **Delete the scale:**
   - Click "Delete Scale" or use the scale deletion option
   - Verify scale line disappears

4. **Verify deletion:**
   - Check browser console for:
     - `🎯 Scale line deleted from Firestore`
   - **Reload the page** (F5 or Cmd+R)
   - **Expected:** Scale should NOT reappear after reload

5. **Check Firestore:**
   - Open Firebase Console → Firestore Database
   - Navigate to `boards/global` document
   - **Expected:** `scaleLine` field should be completely removed (not null, not undefined)

### Success Criteria
- ✅ Scale disappears immediately after deletion
- ✅ Scale does NOT reappear after page reload
- ✅ Firestore document has no `scaleLine` field

---

## Test 3: Home Depot Price Integration ✅

### What Was Fixed
- Added retry logic with exponential backoff (3 retries)
- Implemented 24-hour cache TTL
- Added structured logging for success rate monitoring
- Improved error handling

### Prerequisites
- `SERP_API_KEY` configured in `collabcanvas/functions/.env`
- Cloud Functions running locally or deployed

### How to Test

1. **Start Cloud Functions:**
   ```bash
   cd collabcanvas/functions
   npm run serve
   ```
   Or deploy:
   ```bash
   firebase deploy --only functions:getHomeDepotPrice
   ```

2. **Test price fetching:**
   - Open browser console
   - Use the Material Estimation feature (if available) or test directly via Firebase Functions

3. **Check logs:**
   - Look for structured logs with `[PRICING]` prefix:
     ```
     [PRICING] Cache hit for: drywall (age: 5 minutes)
     [PRICING] Fetch result for "drywall": success=true, price=12.99, fetchTime=1234ms
     [PRICING] Successfully fetched price $12.99 for: drywall
     ```

4. **Test retry logic:**
   - Temporarily break the API key or network
   - Check logs for retry attempts:
     ```
     [PRICING] SerpAPI non-OK response: 500 (attempt 1/3)
     [PRICING] Retrying in 1000ms...
     ```

5. **Test cache TTL:**
   - Fetch a price for a material (e.g., "drywall")
   - Fetch again immediately → should use cache
   - Wait 24+ hours → should fetch fresh price

6. **Check Firestore cache:**
   - Open Firebase Console → Firestore Database
   - Navigate to `pricing/{storeNumber}/items/{materialKey}`
   - **Expected:** Document should have:
     - `priceUSD`: number
     - `link`: string
     - `updatedAt`: timestamp
     - `lastFetchTime`: number (ms)
     - `lastError`: null or string

### Success Criteria
- ✅ Prices fetch successfully for common materials (drywall, paint, flooring)
- ✅ Retry logic works on failures (check logs)
- ✅ Cache works (second request is faster)
- ✅ Cache expires after 24 hours
- ✅ Success rate logs are visible in console

---

## Test 4: AI Shape Creation Commands ✅

### What Was Fixed
- Added "add a red circle" and variations to command cache
- Improved OpenAI prompt for better parsing

### Prerequisites
- `OPENAI_API_KEY` configured in `collabcanvas/functions/.env`
- Cloud Functions running locally or deployed

### How to Test

1. **Start Cloud Functions:**
   ```bash
   cd collabcanvas/functions
   npm run serve
   ```

2. **Test cached commands:**
   - Open the app and use AI chat
   - Try these commands (should be instant, no OpenAI call):
     - "add a red circle"
     - "create a red circle"
     - "add red circle"
     - "add a circle"
     - "create circle"
     - "add a rectangle"
     - "create rectangle"

3. **Verify shape creation:**
   - **Expected:** Red circle should appear on canvas
   - Check browser console for:
     - `🚀 Using cached command for: add a red circle`

4. **Test OpenAI parsing (for uncached commands):**
   - Try: "add a blue rectangle"
   - **Expected:** Should parse and create shape
   - Check Cloud Functions logs for:
     - `🤖 OpenAI parsed command: add a blue rectangle → {...}`

5. **Test error handling:**
   - Try invalid command: "make a sandwich"
   - **Expected:** Graceful error message, no crash

### Success Criteria
- ✅ "add a red circle" works immediately (cached)
- ✅ Red circle appears on canvas
- ✅ Other cached variations work
- ✅ Un-cached commands parse correctly via OpenAI
- ✅ Errors are handled gracefully

---

## Running Unit Tests

### Test Plan & Scale Deletion
```bash
cd collabcanvas
npm test -- src/services/firestore.test.ts src/services/storage.test.ts
```

**Expected:** All tests pass

### Test Coverage
```bash
npm test -- --coverage
```

---

## Debugging Tips

### Check Browser Console
- Look for `[PRICING]` logs for price integration
- Look for Firestore deletion logs
- Check for any error messages

### Check Firebase Console
- **Firestore:** Verify fields are removed (not just set to null)
- **Storage:** Verify files are deleted
- **Functions Logs:** Check Cloud Functions execution logs

### Check Network Tab
- Verify Firestore writes use `updateDoc` with `deleteField()`
- Check API calls for pricing/AI functions

### Common Issues

1. **Plan reappears after reload:**
   - Check Firestore: field should be completely gone, not null
   - Check Storage: file should be deleted
   - Check subscription logic isn't re-adding it

2. **Price fetching fails:**
   - Verify `SERP_API_KEY` is set
   - Check Cloud Functions logs for errors
   - Verify network connectivity

3. **AI commands don't work:**
   - Verify `OPENAI_API_KEY` is set
   - Check Cloud Functions logs
   - Try cached commands first (should work without API key)

---

## Next Steps After Testing

Once all tests pass:
1. ✅ Tasks 1-4 are verified working
2. Continue with Tasks 5-10 (Performance Optimizations)
3. Run full test suite: `npm test`
4. Run E2E tests: `npm run test:e2e`

---

## Quick Test Checklist

- [ ] Plan deletion persists after reload
- [ ] Scale deletion persists after reload
- [ ] Home Depot prices fetch successfully (90%+ success rate)
- [ ] "add a red circle" AI command works
- [ ] Unit tests pass
- [ ] No console errors
- [ ] Firestore fields are properly deleted (not null)

