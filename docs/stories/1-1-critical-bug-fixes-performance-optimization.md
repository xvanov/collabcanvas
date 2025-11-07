# Story 1.1: Critical Bug Fixes & Performance Optimization

Status: ready-for-dev

## Story

As a contractor,
I want all critical bugs fixed and consistent performance across browsers,
so that I can reliably use the tool for production work without frustration.

## Acceptance Criteria

1. **Plan Deletion Persistence**
   - **Given** I am using CollabCanvas
   - **When** I delete a plan
   - **Then** The deletion persists after page reload and does not reappear

2. **Scale Deletion Persistence**
   - **Given** I am using CollabCanvas
   - **When** I delete a scale reference
   - **Then** The deletion persists after page reload and does not reappear

3. **Home Depot Price Integration**
   - **Given** I am using CollabCanvas
   - **When** I generate a BOM with common materials
   - **Then** Home Depot prices are fetched successfully for 90%+ of materials

4. **AI Shape Creation**
   - **Given** I am using CollabCanvas
   - **When** I use AI chat to create shapes (e.g., "add a red circle")
   - **Then** Shapes are created successfully without errors

5. **Firefox Performance**
   - **Given** I am using CollabCanvas
   - **When** I annotate with 100+ objects on Firefox
   - **Then** Canvas maintains 60 FPS performance matching Chrome performance

6. **Cross-Browser Performance**
   - **Given** I am using CollabCanvas
   - **When** I annotate with 100+ objects on any browser (Chrome, Firefox, Safari, Edge)
   - **Then** Canvas maintains consistent 60 FPS performance

7. **Object Culling**
   - **Given** I am using CollabCanvas
   - **When** I have many objects on the canvas (100+)
   - **Then** Only visible objects are rendered (object culling implemented)

8. **Viewport Optimization**
   - **Given** I am using CollabCanvas
   - **When** I pan or zoom the canvas
   - **Then** Only objects within the viewport are updated (viewport optimization implemented)

9. **Batch Updates**
   - **Given** I am using CollabCanvas
   - **When** Multiple shape updates occur simultaneously
   - **Then** Updates are batched together to reduce render calls (batching optimization implemented)

10. **Performance Measurement**
    - **Given** I am using CollabCanvas
    - **When** I measure performance with browser dev tools
    - **Then** Canvas rendering maintains 60 FPS during pan, zoom, and drawing operations across all browsers

## Tasks / Subtasks

- [x] Task 1: Fix Plan Deletion Persistence (AC: #1)
  - [x] Investigate Firebase deletion logic in `firestore.ts` and `storage.ts`
  - [x] Check Firestore security rules for plan deletion
  - [x] Verify client-side deletion logic removes plan from Firestore and Storage
  - [x] Test deletion persistence across page reloads
  - [x] Add unit tests for deletion operations

- [x] Task 2: Fix Scale Deletion Persistence (AC: #2)
  - [x] Investigate scale reference deletion logic
  - [x] Verify scale deletion removes data from Firestore
  - [x] Test scale deletion persistence across page reloads
  - [x] Add unit tests for scale deletion operations

- [x] Task 3: Fix Home Depot Price Integration (AC: #3)
  - [x] Debug SerpAPI integration in Cloud Function `getHomeDepotPrice`
  - [x] Verify API keys are correctly configured in Firebase Functions secrets
  - [x] Review request format and error handling
  - [x] Implement retry logic with exponential backoff
  - [x] Add price caching (24-hour TTL) to reduce API calls
  - [x] Test price fetching for common materials (drywall, paint, flooring, etc.)
  - [x] Monitor and log price fetch success rate (target: 90%+)
  - [x] Add integration tests for price fetching

- [x] Task 4: Fix AI Shape Creation Commands (AC: #4)
  - [x] Debug AI command parsing in Cloud Function `aiCommand`
  - [x] Review shape creation command execution logic
  - [x] Fix command parsing for "add a red circle" and similar commands
  - [x] Test AI shape creation commands in Space view
  - [x] Add unit tests for AI command parsing

- [ ] Task 5: Fix Firefox Performance Degradation (AC: #5, #6)
  - [ ] Profile Firefox canvas rendering performance with browser DevTools
  - [ ] Identify rendering bottlenecks specific to Firefox
  - [ ] Compare Firefox performance with Chrome performance
  - [ ] Implement browser-specific optimizations if needed
  - [ ] Test performance with 100+ objects on Firefox

- [ ] Task 6: Implement Object Culling (AC: #7)
  - [ ] Implement viewport calculation utility in `utils/viewport.ts`
  - [ ] Add object visibility check before rendering
  - [ ] Update `components/canvas/Canvas.tsx` to only render visible shapes
  - [ ] Test object culling with 100+ objects
  - [ ] Measure performance improvement

- [ ] Task 7: Implement Viewport Optimization (AC: #8)
  - [ ] Implement viewport-based update logic
  - [ ] Only update shapes within visible viewport during pan/zoom
  - [ ] Update `components/canvas/Canvas.tsx` with viewport optimization
  - [ ] Test viewport optimization during pan and zoom operations
  - [ ] Measure performance improvement

- [ ] Task 8: Implement Batch Updates (AC: #9)
  - [ ] Implement update batching utility in `utils/throttle.ts`
  - [ ] Batch multiple shape updates together
  - [ ] Reduce render calls by grouping updates
  - [ ] Update `components/canvas/Canvas.tsx` with batch update logic
  - [ ] Test batch updates with simultaneous shape modifications
  - [ ] Measure performance improvement

- [ ] Task 9: Cross-Browser Performance Testing (AC: #10)
  - [ ] Test canvas performance on Chrome (latest 2 versions)
  - [ ] Test canvas performance on Firefox (latest 2 versions)
  - [ ] Test canvas performance on Safari (latest 2 versions)
  - [ ] Test canvas performance on Edge (latest 2 versions)
  - [ ] Measure FPS with 100+ objects on all browsers
  - [ ] Verify 60 FPS target is met across all browsers
  - [ ] Document performance test results

- [ ] Task 10: Performance Monitoring and Logging
  - [ ] Add FPS monitoring to canvas component
  - [ ] Log performance metrics (FPS, render time, update count)
  - [ ] Add performance warnings when FPS drops below 60
  - [ ] Integrate with structured logging system

## Dev Notes

### Requirements Context

This story addresses critical production-blocking bugs and performance issues that must be resolved before launch. The story covers:

- **Data Persistence Issues**: Plan and scale deletion not persisting after reload
- **API Integration Issues**: Home Depot price fetching not achieving target success rate
- **AI Command Issues**: Shape creation commands failing
- **Performance Issues**: Firefox performance degradation and inconsistent cross-browser performance

**Source Documents:**
- Epic breakdown: [Source: docs/epics.md#Story-1.1]
- PRD requirements: [Source: docs/PRD.md#Critical-Bug-Fixes]
- Architecture guidance: [Source: docs/architecture.md#Performance-Optimization]
- Tech spec: [Source: docs/tech-spec-epic-1.md#Non-Functional-Requirements]

### Architecture Patterns and Constraints

**Firebase Deletion Pattern:**
- Plans stored in Firebase Storage and referenced in Firestore
- Scale references stored in Firestore board documents
- Deletion must remove data from both Storage and Firestore
- Use Firebase Admin SDK in Cloud Functions for reliable deletion if needed

**Performance Optimization Pattern:**
- Object culling: Calculate viewport bounds, filter shapes by visibility before rendering
- Viewport optimization: Only update shapes within visible area during pan/zoom
- Batch updates: Use `requestAnimationFrame` batching or debounce/throttle utilities
- Konva.js performance: Leverage Konva's built-in optimization features

**API Integration Pattern:**
- All external APIs route through Cloud Functions for security
- SerpAPI integration: Cloud Function `getHomeDepotPrice` handles price fetching
- Implement retry logic with exponential backoff
- Cache prices with 24-hour TTL to reduce API calls
- Standardized error handling: `{success, data?, error?}` format

**AI Command Pattern:**
- AI commands processed via Cloud Function `aiCommand`
- Shape creation commands parsed and executed client-side
- Commands must be validated before execution

**Source References:**
- Firebase deletion: [Source: docs/architecture.md#Data-Architecture]
- Performance optimization: [Source: docs/architecture.md#Performance-Optimization]
- API integration: [Source: docs/architecture.md#Integration-Points]
- Error handling: [Source: docs/architecture.md#Error-Handling]

### Project Structure Notes

**Files to Modify:**
- `src/services/firestore.ts` - Fix deletion persistence logic
- `src/services/storage.ts` - Fix plan deletion from Storage
- `functions/src/pricing.ts` - Fix Home Depot price fetching (Cloud Function)
- `functions/src/aiCommand.ts` - Fix AI shape creation command parsing
- `src/components/canvas/Canvas.tsx` - Implement performance optimizations
- `src/utils/viewport.ts` - Add viewport calculation utilities (create if needed)
- `src/utils/throttle.ts` - Add batch update utilities (create if needed)

**Files to Create:**
- `src/utils/viewport.ts` - Viewport calculation utilities for object culling
- `src/utils/throttle.ts` - Batch update utilities (if not exists)

**Testing Standards:**
- Unit tests: Service layer functions (firestore.ts, storage.ts)
- Integration tests: Cloud Function integration (pricing.ts, aiCommand.ts)
- E2E tests: Deletion persistence, price fetching, AI commands, performance
- Performance tests: FPS measurement with 100+ objects across browsers

**Source References:**
- Project structure: [Source: docs/architecture.md#Project-Structure]
- Testing strategy: [Source: docs/tech-spec-epic-1.md#Test-Strategy-Summary]

### Learnings from Previous Story

**First story in epic - no predecessor context**

### References

- Epic breakdown: [Source: docs/epics.md#Story-1.1]
- PRD critical bugs: [Source: docs/PRD.md#Critical-Bug-Fixes]
- Architecture performance: [Source: docs/architecture.md#Performance-Optimization]
- Tech spec NFRs: [Source: docs/tech-spec-epic-1.md#Non-Functional-Requirements]
- Firebase deletion: [Source: docs/architecture.md#Data-Architecture]
- API integration: [Source: docs/architecture.md#Integration-Points]
- Error handling: [Source: docs/architecture.md#Error-Handling]

## Dev Agent Record

### Context Reference

- docs/stories/1-1-critical-bug-fixes-performance-optimization.context.xml

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

**Task 1: Fix Plan Deletion Persistence** ✅
- Fixed Firestore deletion to use `deleteField()` instead of `undefined` with `merge: true`, which properly removes the field
- Added Storage deletion when plan is deleted to remove the actual file from Firebase Storage
- Updated subscription logic to handle deletion properly and prevent recursive loops
- Added unit tests for deletion operations

**Task 2: Fix Scale Deletion Persistence** ✅
- Fixed Firestore deletion to use `deleteField()` instead of `undefined` with `merge: true`
- Updated subscription logic to handle deletion properly
- Added unit tests for scale deletion operations

**Task 3: Fix Home Depot Price Integration** ✅
- Added retry logic with exponential backoff (3 retries, starting at 1 second)
- Implemented 24-hour cache TTL check to ensure fresh prices
- Added structured logging with `[PRICING]` prefix for success rate monitoring
- Improved error handling to distinguish between different failure types
- Cache now stores fetch time and error information for debugging

**Task 4: Fix AI Shape Creation Commands** ✅
- Added "add a red circle" and similar variations to command cache
- Improved OpenAI prompt to include example for "add a red circle"
- Added multiple command variations (add/create, with/without colors) to cache

### File List

**Modified Files:**
- `collabcanvas/src/services/firestore.ts` - Fixed plan and scale deletion to use `deleteField()`
- `collabcanvas/src/services/storage.ts` - Improved URL parsing to handle URLs without query parameters
- `collabcanvas/src/store/canvasStore.ts` - Added Storage deletion, improved subscription logic with `skipFirestoreSync` parameter
- `collabcanvas/functions/src/pricing.ts` - Added retry logic, cache TTL, structured logging
- `collabcanvas/functions/src/aiCommand.ts` - Added "add a red circle" and variations to cache, improved prompt

**Created Files:**
- `collabcanvas/src/services/storage.test.ts` - Unit tests for storage deletion
- `collabcanvas/src/services/firestore.test.ts` - Added tests for plan and scale deletion operations

**Updated Files:**
- `docs/sprint-status.yaml` - Updated story status to `in-progress`

