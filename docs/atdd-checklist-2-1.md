# ATDD Checklist - Epic 2, Story 2.1: Project Isolation - Canvas, BOM, and Views Per Project

**Date:** 2025-01-12
**Author:** xvanov
**Primary Test Level:** E2E

---

## Story Summary

As a contractor, I want each project to have its own isolated canvas (Space view), bill of materials, and all view data, so that shapes, annotations, and estimates from one project don't appear in other projects.

**As a** contractor
**I want** each project to have its own isolated canvas, BOM, and view data
**So that** shapes, annotations, and estimates from one project don't appear in other projects

---

## Acceptance Criteria

1. **Project-Scoped Shapes Storage** - Shapes stored at `/projects/{projectId}/shapes/{shapeId}` and do not appear in other projects
2. **Project-Scoped Layers Storage** - Layers stored at `/projects/{projectId}/layers/{layerId}` and do not appear in other projects
3. **Project-Scoped Board State** - Board state stored at `/projects/{projectId}/board` and does not affect other projects
4. **Project-Scoped BOM (Already Implemented)** - BOM stored at `/projects/{projectId}/bom/data` (already working correctly)
5. **Project-Scoped Canvas Store** - Each project uses its own isolated Zustand store instance with no data leakage
6. **Proper Subscription Cleanup** - All Firestore subscriptions for Project A are properly cleaned up when navigating to Project B
7. **No Infinite Loops** - No infinite re-render loops occur and subscriptions do not trigger cascading updates
8. **useShapes Hook Project Scoping** - useShapes hook accepts projectId and subscribes to the correct project's shapes collection
9. **useLayers Hook Project Scoping** - useLayers hook accepts projectId and subscribes to the correct project's layers collection
10. **Component Integration** - All components correctly pass projectId to hooks and services
11. **Firestore Security Rules Update** - Firestore security rules enforce project-level access control
12. **Migration Path for Existing Data** - System handles migration gracefully from global board to project-scoped
13. **Real-time Collaboration Per Project** - Only users viewing the same project see updates
14. **Performance with Multiple Projects** - Application maintains 60 FPS when switching between projects rapidly

---

## Failing Tests Created (RED Phase)

### E2E Tests (10 tests)

**File:** `collabcanvas/tests/e2e/project-isolation.spec.ts` (450 lines)

- ✅ **Test:** should store shapes in project-scoped Firestore collection
  - **Status:** RED - Missing implementation: Firestore paths still use `/boards/global/shapes` instead of `/projects/{projectId}/shapes`
  - **Verifies:** AC1 - Shapes stored in project-scoped collection

- ✅ **Test:** should not show shapes from Project A in Project B
  - **Status:** RED - Missing implementation: Shapes are not filtered by projectId
  - **Verifies:** AC1 - Project isolation for shapes

- ✅ **Test:** should store layers in project-scoped Firestore collection
  - **Status:** RED - Missing implementation: Firestore paths still use `/boards/global/layers` instead of `/projects/{projectId}/layers`
  - **Verifies:** AC2 - Layers stored in project-scoped collection

- ✅ **Test:** should store board state in project-scoped Firestore document
  - **Status:** RED - Missing implementation: Board state still stored at `/boards/global` instead of `/projects/{projectId}/board`
  - **Verifies:** AC3 - Board state stored in project-scoped document

- ✅ **Test:** should store scale line in project-scoped board document
  - **Status:** RED - Missing implementation: Scale line not stored in project-scoped board document
  - **Verifies:** AC3 - Scale line stored in project-scoped board

- ✅ **Test:** should use isolated Zustand store instance per project
  - **Status:** RED - Missing implementation: Store isolation not fully verified, shapes leak between projects
  - **Verifies:** AC5 - Project-scoped canvas store isolation

- ✅ **Test:** should cleanup Firestore subscriptions when switching projects
  - **Status:** RED - Missing implementation: Subscription cleanup not implemented when projectId changes
  - **Verifies:** AC6 - Proper subscription cleanup

- ✅ **Test:** should not cause infinite re-render loops when creating shapes
  - **Status:** RED - Missing implementation: Infinite loop prevention not implemented
  - **Verifies:** AC7 - No infinite loops

- ✅ **Test:** should only show updates from users viewing the same project
  - **Status:** RED - Missing implementation: Real-time subscriptions not scoped to projects
  - **Verifies:** AC13 - Real-time collaboration per project

- ✅ **Test:** should maintain 60 FPS when switching between projects rapidly
  - **Status:** RED - Missing implementation: Performance optimization for project switching not implemented
  - **Verifies:** AC14 - Performance with multiple projects

---

## Data Factories Created

### Project Factory

**File:** `collabcanvas/tests/support/fixtures/factories/project-factory.ts`

**Exports:**

- `createProject(overrides?)` - Create single project with optional overrides
- `createProjects(count)` - Create array of projects
- `trackProject(projectId)` - Track project ID for cleanup
- `cleanup()` - Delete all tracked projects

**Example Usage:**

```typescript
const project = projectFactory.createProject({ name: 'My Project', ownerId: 'user-123' });
const projects = projectFactory.createProjects(5); // Generate 5 random projects
```

### Shape Factory

**File:** `collabcanvas/tests/support/fixtures/factories/shape-factory.ts`

**Exports:**

- `createShape(overrides?)` - Create single shape with optional overrides
- `createShapes(count)` - Create array of shapes

**Example Usage:**

```typescript
const shape = shapeFactory.createShape({ type: 'rect', x: 100, y: 100 });
const shapes = shapeFactory.createShapes(10); // Generate 10 random shapes
```

### Layer Factory

**File:** `collabcanvas/tests/support/fixtures/factories/layer-factory.ts`

**Exports:**

- `createLayer(overrides?)` - Create single layer with optional overrides
- `createLayers(count)` - Create array of layers

**Example Usage:**

```typescript
const layer = layerFactory.createLayer({ name: 'Walls', visible: true });
const layers = layerFactory.createLayers(3); // Generate 3 random layers
```

---

## Fixtures Created

### Project Isolation Fixtures

**File:** `collabcanvas/tests/support/fixtures/index.ts`

**Fixtures:**

- `projectFactory` - Project data factory with auto-cleanup
  - **Setup:** Creates ProjectFactory instance
  - **Provides:** Factory methods for creating projects
  - **Cleanup:** Deletes all tracked projects

- `shapeFactory` - Shape data factory
  - **Setup:** Creates ShapeFactory instance
  - **Provides:** Factory methods for creating shapes

- `layerFactory` - Layer data factory
  - **Setup:** Creates LayerFactory instance
  - **Provides:** Factory methods for creating layers

- `authenticatedProject` - Authenticated user with project
  - **Setup:** Creates user and project, authenticates user
  - **Provides:** Project object ready for testing
  - **Cleanup:** Deletes project via projectFactory.cleanup()

**Example Usage:**

```typescript
test('should create shape in project', async ({ authenticatedProject, shapeFactory }) => {
  const shape = shapeFactory.createShape();
  // authenticatedProject is ready to use with auto-cleanup
});
```

---

## Mock Requirements

### Firestore Service Mock

**Endpoint:** Firestore REST API (via Firebase SDK)

**Success Response:**

```json
{
  "shapes": {
    "shape-123": {
      "id": "shape-123",
      "type": "rect",
      "x": 100,
      "y": 100,
      "w": 50,
      "h": 50
    }
  }
}
```

**Failure Response:**

```json
{
  "error": {
    "code": "permission-denied",
    "message": "User does not have access to this project"
  }
}
```

**Notes:** 
- Firestore security rules must enforce project-level access control
- Mock should verify correct Firestore paths (`/projects/{projectId}/shapes` not `/boards/global/shapes`)

---

## Required data-testid Attributes

### Space View (Canvas)

- `shape-tool-rect` - Rectangle shape tool button
- `shape-tool-circle` - Circle shape tool button
- `canvas` - Canvas element for drawing shapes
- `shape` - Individual shape element (with `data-shape-type` attribute)
- `shape-{shapeId}` - Specific shape element by ID
- `layer-add-button` - Button to add new layer
- `layer-name-input` - Input field for layer name
- `layer-create-button` - Button to create layer
- `layer` - Individual layer element
- `background-image-upload` - File input for background image upload
- `background-image` - Background image element
- `scale-line-tool` - Scale line tool button
- `scale-line-length-input` - Input for scale line real-world length
- `scale-line-unit-select` - Select dropdown for scale line unit
- `scale-line-confirm-button` - Button to confirm scale line creation

**Implementation Example:**

```tsx
<button data-testid="shape-tool-rect">Rectangle</button>
<canvas data-testid="canvas" />
<div data-testid="shape" data-shape-type="rect" data-shape-id={shape.id}>
  {/* shape content */}
</div>
<input type="file" data-testid="background-image-upload" />
```

---

## Implementation Checklist

### Test: should store shapes in project-scoped Firestore collection

**File:** `collabcanvas/tests/e2e/project-isolation.spec.ts`

**Tasks to make this test pass:**

- [ ] Update `services/firestore.ts` - Change `createShape` function to accept `projectId` parameter
- [ ] Update `services/firestore.ts` - Change shapes collection path from `/boards/global/shapes` to `/projects/{projectId}/shapes`
- [ ] Update `hooks/useShapes.ts` - Accept `projectId` parameter and pass to `createShape`
- [ ] Update `components/canvas/Canvas.tsx` - Pass `projectId` from route params to `useShapes` hook
- [ ] Update `pages/Project.tsx` - Ensure Space view passes `projectId` to canvas components
- [ ] Add required data-testid attributes: `shape-tool-rect`, `canvas`
- [ ] Run test: `npm run test:e2e -- project-isolation.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 4 hours

---

### Test: should not show shapes from Project A in Project B

**File:** `collabcanvas/tests/e2e/project-isolation.spec.ts`

**Tasks to make this test pass:**

- [ ] Update `services/firestore.ts` - Change `subscribeToShapesChanges` to accept `projectId` parameter
- [ ] Update `services/firestore.ts` - Filter shapes by projectId in subscription
- [ ] Update `hooks/useShapes.ts` - Pass `projectId` to `subscribeToShapesChanges`
- [ ] Verify shapes are filtered correctly when switching projects
- [ ] Add required data-testid attributes: `shape-{shapeId}`
- [ ] Run test: `npm run test:e2e -- project-isolation.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 3 hours

---

### Test: should store layers in project-scoped Firestore collection

**File:** `collabcanvas/tests/e2e/project-isolation.spec.ts`

**Tasks to make this test pass:**

- [ ] Update `services/firestore.ts` - Change `createLayer` function to accept `projectId` parameter
- [ ] Update `services/firestore.ts` - Change layers collection path from `/boards/global/layers` to `/projects/{projectId}/layers`
- [ ] Update `hooks/useLayers.ts` - Accept `projectId` parameter and pass to `createLayer`
- [ ] Update `components/canvas/Canvas.tsx` - Pass `projectId` to `useLayers` hook
- [ ] Add required data-testid attributes: `layer-add-button`, `layer-name-input`, `layer-create-button`, `layer`
- [ ] Run test: `npm run test:e2e -- project-isolation.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 3 hours

---

### Test: should store board state in project-scoped Firestore document

**File:** `collabcanvas/tests/e2e/project-isolation.spec.ts`

**Tasks to make this test pass:**

- [ ] Update `services/firestore.ts` - Change `saveBackgroundImage` function to accept `projectId` parameter
- [ ] Update `services/firestore.ts` - Change board document path from `/boards/global` to `/projects/{projectId}/board`
- [ ] Update components that upload background images to pass `projectId`
- [ ] Add required data-testid attributes: `background-image-upload`, `background-image`
- [ ] Run test: `npm run test:e2e -- project-isolation.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2 hours

---

### Test: should store scale line in project-scoped board document

**File:** `collabcanvas/tests/e2e/project-isolation.spec.ts`

**Tasks to make this test pass:**

- [ ] Update `services/firestore.ts` - Change `saveScaleLine` function to accept `projectId` parameter
- [ ] Update `services/firestore.ts` - Store scale line in `/projects/{projectId}/board` document
- [ ] Update components that create scale lines to pass `projectId`
- [ ] Add required data-testid attributes: `scale-line-tool`, `scale-line-length-input`, `scale-line-unit-select`, `scale-line-confirm-button`
- [ ] Run test: `npm run test:e2e -- project-isolation.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2 hours

---

### Test: should use isolated Zustand store instance per project

**File:** `collabcanvas/tests/e2e/project-isolation.spec.ts`

**Tasks to make this test pass:**

- [ ] Verify `store/projectCanvasStore.ts` properly isolates stores per project (already implemented)
- [ ] Update components using `useProjectCanvasStore` to pass `projectId` correctly
- [ ] Test that switching projects clears previous project's state (if needed)
- [ ] Verify no memory leaks from unused stores
- [ ] Run test: `npm run test:e2e -- project-isolation.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2 hours

---

### Test: should cleanup Firestore subscriptions when switching projects

**File:** `collabcanvas/tests/e2e/project-isolation.spec.ts`

**Tasks to make this test pass:**

- [ ] Update `hooks/useShapes.ts` - Add subscription cleanup in `useEffect` cleanup function
- [ ] Update `hooks/useShapes.ts` - Re-subscribe when `projectId` changes
- [ ] Update `hooks/useLayers.ts` - Add subscription cleanup in `useEffect` cleanup function
- [ ] Update `hooks/useLayers.ts` - Re-subscribe when `projectId` changes
- [ ] Test subscription cleanup on project switch
- [ ] Run test: `npm run test:e2e -- project-isolation.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 4 hours

---

### Test: should not cause infinite re-render loops when creating shapes

**File:** `collabcanvas/tests/e2e/project-isolation.spec.ts`

**Tasks to make this test pass:**

- [ ] Add `isSyncing` flags to prevent circular updates (Firestore → Store → Firestore)
- [ ] Use `useRef` to track subscription state and prevent re-subscription loops
- [ ] Memoize callbacks with `useCallback` and proper dependencies
- [ ] Ensure Firestore updates don't trigger store updates that trigger Firestore updates
- [ ] Test with multiple rapid shape creations
- [ ] Run test: `npm run test:e2e -- project-isolation.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 3 hours

---

### Test: should only show updates from users viewing the same project

**File:** `collabcanvas/tests/e2e/project-isolation.spec.ts`

**Tasks to make this test pass:**

- [ ] Verify Firestore subscriptions are scoped to `projectId`
- [ ] Test real-time updates with multiple users on different projects
- [ ] Verify users on Project 1 don't see updates from Project 2
- [ ] Run test: `npm run test:e2e -- project-isolation.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 2 hours

---

### Test: should maintain 60 FPS when switching between projects rapidly

**File:** `collabcanvas/tests/e2e/project-isolation.spec.ts`

**Tasks to make this test pass:**

- [ ] Optimize subscription cleanup to be non-blocking
- [ ] Batch Firestore reads when switching projects
- [ ] Limit number of active subscriptions
- [ ] Monitor subscription count and memory usage
- [ ] Run test: `npm run test:e2e -- project-isolation.spec.ts`
- [ ] ✅ Test passes (green phase)

**Estimated Effort:** 3 hours

---

## Running Tests

```bash
# Run all failing tests for this story
npm run test:e2e -- project-isolation.spec.ts

# Run specific test
npm run test:e2e -- project-isolation.spec.ts -g "should store shapes in project-scoped Firestore collection"

# Run tests in headed mode (see browser)
npm run test:e2e -- project-isolation.spec.ts --headed

# Debug specific test
npm run test:e2e -- project-isolation.spec.ts --debug

# Run tests with coverage
npm run test:e2e -- project-isolation.spec.ts --coverage
```

---

## Red-Green-Refactor Workflow

### RED Phase (Complete) ✅

**TEA Agent Responsibilities:**

- ✅ All tests written and failing
- ✅ Fixtures and factories created with auto-cleanup
- ✅ Mock requirements documented
- ✅ data-testid requirements listed
- ✅ Implementation checklist created

**Verification:**

- All tests run and fail as expected
- Failure messages are clear and actionable
- Tests fail due to missing implementation, not test bugs

---

### GREEN Phase (DEV Team - Next Steps)

**DEV Agent Responsibilities:**

1. **Pick one failing test** from implementation checklist (start with highest priority)
2. **Read the test** to understand expected behavior
3. **Implement minimal code** to make that specific test pass
4. **Run the test** to verify it now passes (green)
5. **Check off the task** in implementation checklist
6. **Move to next test** and repeat

**Key Principles:**

- One test at a time (don't try to fix all at once)
- Minimal implementation (don't over-engineer)
- Run tests frequently (immediate feedback)
- Use implementation checklist as roadmap

**Progress Tracking:**

- Check off tasks as you complete them
- Share progress in daily standup
- Mark story as IN PROGRESS in `docs/sprint-status.yaml`

---

### REFACTOR Phase (DEV Team - After All Tests Pass)

**DEV Agent Responsibilities:**

1. **Verify all tests pass** (green phase complete)
2. **Review code for quality** (readability, maintainability, performance)
3. **Extract duplications** (DRY principle)
4. **Optimize performance** (if needed)
5. **Ensure tests still pass** after each refactor
6. **Update documentation** (if API contracts change)

**Key Principles:**

- Tests provide safety net (refactor with confidence)
- Make small refactors (easier to debug if tests fail)
- Run tests after each change
- Don't change test behavior (only implementation)

**Completion:**

- All tests pass
- Code quality meets team standards
- No duplications or code smells
- Ready for code review and story approval

---

## Next Steps

1. **Review this checklist** with team in standup or planning
2. **Run failing tests** to confirm RED phase: `npm run test:e2e -- project-isolation.spec.ts`
3. **Begin implementation** using implementation checklist as guide
4. **Work one test at a time** (red → green for each)
5. **Share progress** in daily standup
6. **When all tests pass**, refactor code for quality
7. **When refactoring complete**, run `bmad sm story-done` to move story to DONE

---

## Knowledge Base References Applied

This ATDD workflow consulted the following knowledge fragments:

- **fixture-architecture.md** - Test fixture patterns with setup/teardown and auto-cleanup using Playwright's `test.extend()`
- **data-factories.md** - Factory patterns using `@faker-js/faker` for random test data generation with overrides support
- **network-first.md** - Route interception patterns (intercept BEFORE navigation to prevent race conditions)
- **test-quality.md** - Test design principles (Given-When-Then, one assertion per test, determinism, isolation)

See `bmad/bmm/testarch/tea-index.csv` for complete knowledge fragment mapping.

---

## Test Execution Evidence

### Initial Test Run (RED Phase Verification)

**Command:** `npm run test:e2e -- project-isolation.spec.ts`

**Results:**

```
[To be filled after running tests]
```

**Summary:**

- Total tests: 10
- Passing: 0 (expected)
- Failing: 10 (expected)
- Status: ✅ RED phase verified

**Expected Failure Messages:**

1. "should store shapes in project-scoped Firestore collection" - Expected to fail with "Request to /boards/global/shapes not intercepted" or similar
2. "should not show shapes from Project A in Project B" - Expected to fail with "Shape from Project A visible in Project B"
3. "should store layers in project-scoped Firestore collection" - Expected to fail with "Request to /boards/global/layers not intercepted"
4. "should store board state in project-scoped Firestore document" - Expected to fail with "Request to /boards/global not intercepted"
5. "should store scale line in project-scoped board document" - Expected to fail with "Scale line not stored in project-scoped board"
6. "should use isolated Zustand store instance per project" - Expected to fail with "Shapes leak between projects"
7. "should cleanup Firestore subscriptions when switching projects" - Expected to fail with "Subscription cleanup not implemented"
8. "should not cause infinite re-render loops when creating shapes" - Expected to fail with "Infinite loop detected" or "Maximum update depth exceeded"
9. "should only show updates from users viewing the same project" - Expected to fail with "Updates from Project 1 visible in Project 2"
10. "should maintain 60 FPS when switching between projects rapidly" - Expected to fail with "Navigation time exceeds 1 second"

---

## Notes

- **Story 2.1** implements project isolation for canvas data (shapes, layers, board state) to ensure that each project has its own isolated Space view data
- Currently, all projects share global Firestore collections (`/boards/global/*`), causing shapes and annotations from one project to appear in all projects
- This story refactors the Firestore data structure to store canvas data per project, matching the existing project-scoped BOM structure
- **Key Features:**
  - Project-scoped Firestore collections for shapes, layers, and board state
  - Proper subscription cleanup when switching projects
  - Prevention of infinite re-render loops
  - Integration with existing `projectCanvasStore.ts` for store isolation

---

## Contact

**Questions or Issues?**

- Ask in team standup
- Tag @tea in Slack/Discord
- Refer to `bmad/bmm/docs/tea-README.md` for workflow documentation
- Consult `bmad/bmm/testarch/knowledge` for testing best practices

---

**Generated by BMad TEA Agent** - 2025-01-12


