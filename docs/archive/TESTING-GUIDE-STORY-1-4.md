# Testing Guide for Story 1-4 Implementation

## How to Verify the Implementation Works

### Prerequisites
1. Make sure the dev server is running: `npm run dev` (in collabcanvas directory)
2. Make sure Firebase emulators are running (if using emulators)
3. Have a project created and accessible

### Testing Task 1: Context-Aware AI Chat

**Steps:**
1. Navigate to a project (e.g., `/project/{projectId}/scope`)
2. Open the AI chat (click the chat icon/button)
3. **Verify:** You should see a badge/indicator showing the current view (e.g., "Scope", "Time", "Space", "Money")
4. Navigate to different views (`/scope`, `/time`, `/space`, `/money`)
5. **Verify:** The view indicator in the chat updates to match the current view

**Expected Result:** Chat header shows current view context badge

---

### Testing Task 2: Pre-flight Validation System

**Steps:**
1. Open AI chat in any view
2. Type: "Generate BOM and Critical Path" or "Generate BOM and CPM"
3. **Verify:** You should see a pre-flight checklist showing:
   - ✅ Scale reference exists (if you have scale set)
   - ✅ Layers exist (if you have layers)
   - ✅ Annotations exist (if you have annotations)
   - ⚠️ Scope uploaded (recommended)
4. If validation fails (missing required items):
   - **Verify:** You see a blocking message explaining what's missing
   - **Verify:** You see clarifying questions
   - **Verify:** BOM/CPM generation is blocked

**Expected Result:** Pre-flight validation runs and blocks generation if required info is missing

---

### Testing Task 3: Parallel BOM and CPM Generation

**Steps:**
1. Ensure you have:
   - Scale reference set
   - At least one layer created
   - At least one annotation/shape
2. Open AI chat
3. Type: "Generate BOM and Critical Path"
4. **Verify:** You see progress messages showing:
   - "BOM: ⏳ Generating..."
   - "Critical Path: ⏳ Generating..."
5. **Verify:** Progress updates as generation completes
6. **Verify:** Success message appears when both complete

**Note:** This requires Cloud Functions `generateBOM` and `generateCPM` to be implemented. Currently, you'll see errors in console, but the progress tracking should work.

**Expected Result:** Both BOM and CPM generation start simultaneously with progress indicators

---

### Testing Task 4: Automatic Price Fetching

**Steps:**
1. After BOM is generated (or if you have an existing BOM)
2. **Verify:** Price fetching automatically starts after BOM generation
3. **Verify:** You see progress messages like:
   - "💰 Price fetching: X/Y materials priced (Z% success rate)"
4. Check browser console for detailed logs:
   - `[PRICING] Starting parallel price fetch for X materials`
   - `[PRICING] ✅ Success: Material Name = $XX.XX`
   - `[PRICING] Complete: X/Y materials priced successfully`

**Note:** Requires `getHomeDepotPrice` Cloud Function to be working. You'll see errors if it's not implemented, but the parallel execution logic should work.

**Expected Result:** Prices are fetched in parallel for all materials with progress tracking

---

### Testing Task 5: Price Failure Handling

**Steps:**
1. Generate a BOM with materials
2. If price fetching fails (API unavailable or material not found):
   - **Verify:** Materials have `priceError` field set
   - **Verify:** Error messages are clear (e.g., "Price API unavailable - please enter price manually")
3. Check browser console for retry logic (if retryFailed is enabled)

**Expected Result:** Failed price fetches are handled gracefully with clear error messages

---

### Testing Task 6: BOM Completion Blocking

**Steps:**
1. Load a BOM (generate one or use existing)
2. Check if BOM is complete:
   ```javascript
   // In browser console:
   import { isBOMComplete, getBOMCompletionMessage } from './services/bomService';
   const bom = /* your BOM object */;
   const result = isBOMComplete(bom);
   console.log(result);
   console.log(getBOMCompletionMessage(bom));
   ```
3. **Verify:** Function returns `isComplete: false` if materials lack prices
4. **Verify:** Function returns list of incomplete materials with reasons

**Expected Result:** Service-level validation correctly identifies incomplete BOMs

---

## Console Logging

All features include detailed console logging. Open browser DevTools (F12) and check:

- `[PRICING]` - Price fetching operations
- `[BOM]` - BOM generation and operations
- `[PRICING] ✅ Success` - Successful price fetches
- `[PRICING] ⚠️ No price found` - Failed price fetches
- `[PRICING] ❌ Error` - Price fetch errors

---

## Unit Tests

Run unit tests to verify service logic:

```bash
cd collabcanvas
npm test
```

This will run tests for:
- `preflightService.test.ts` - Pre-flight validation
- `aiService.test.ts` - Parallel BOM/CPM generation
- `pricingService.test.ts` - Price fetching and error handling
- `bomService.test.ts` - BOM completion validation

---

## Known Limitations

1. **Cloud Functions Not Implemented:**
   - `generateBOM` - Will show errors but progress tracking works
   - `generateCPM` - Will show errors but progress tracking works
   - `getHomeDepotPrice` - Price fetching will fail but error handling works

2. **UI Components:**
   - BOM table UI (Task 11) - Not yet implemented
   - Money View component (Task 19) - Not yet implemented
   - Manual price entry UI - Not yet implemented

3. **E2E Tests:**
   - E2E tests are pending and will be added later

---

## Quick Verification Checklist

- [ ] Page loads without errors
- [ ] AI chat opens and shows view context indicator
- [ ] Pre-flight validation runs when requesting BOM/CPM generation
- [ ] Progress indicators appear during generation
- [ ] Price fetching progress messages appear
- [ ] Console shows detailed logging
- [ ] Unit tests pass (`npm test`)

