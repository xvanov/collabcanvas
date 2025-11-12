# Unified AI Chat Fix - Store Migration Complete (November 2025)

## 1. Goal
- Resolve the "Maximum update depth exceeded" crash when opening a project and interacting with `UnifiedAIChat`.
- Ensure AI commands, material estimation, and toolbar/canvas state stay scoped to the active project.
- Complete migration from legacy singleton `useCanvasStore` to project-scoped stores.

## ⚠️ CURRENT STATUS: Infinite Loop Issue Persists

**As of latest update:** The "Maximum update depth exceeded" error and "getSnapshot should be cached" warning are still occurring in the `Toolbar` component, despite extensive refactoring to use individual selectors.

**Current Test:** `UnifiedAIChat` component has been temporarily commented out in `Toolbar.tsx` to test if removing it resolves the infinite loop. This will help determine if the issue is:
- Caused by multiple components (Toolbar + UnifiedAIChat) subscribing to the store simultaneously
- Or if it's isolated to Toolbar's own store subscriptions

**Error Details:**
```
react-dom-client.development.js:8129 The result of getSnapshot should be cached to avoid an infinite loop
react-dom-client.development.js:4624 Uncaught Error: Maximum update depth exceeded
An error occurred in the <Toolbar> component
```

**Attempted Fixes:**
1. ✅ Split object selectors into individual selectors for Maps/Arrays vs functions/primitives
2. ✅ Removed `shallow` comparison from all components
3. ✅ Changed default equality function from `mapArrayEquality` to Zustand's default reference equality
4. ✅ Ensured all selectors are memoized with `useMemo`

**Components/Hooks Migrated:**
- ✅ UnifiedAIChat.tsx - Individual selectors
- ✅ Toolbar.tsx - Individual selectors (still has infinite loop)
- ✅ Canvas.tsx - Individual selectors
- ✅ ShapePropertiesPanel.tsx - Individual selectors
- ✅ useShapes.ts - Individual selectors
- ✅ useLayers.ts - Individual selectors
- ✅ Board.tsx - Individual selectors

**Root Cause Hypothesis:**
The infinite loop persists despite using individual selectors. Possible causes:
1. Store updates triggering cascading re-renders across multiple `useScopedCanvasStore` calls
2. Functions in the store (`canUndo`, `canRedo`, etc.) being recreated on every state update
3. Zustand's subscription mechanism causing re-renders even when values haven't changed
4. Interaction between multiple store subscriptions in the same component

**Next Steps to Investigate:**
1. ✅ **TESTING**: Temporarily commented out `UnifiedAIChat` component in `Toolbar.tsx` to test if it's causing the infinite loop
   - If removing UnifiedAIChat resolves the issue, it suggests the problem is with multiple components subscribing to the store simultaneously
   - If the issue persists, the problem is likely within Toolbar's own store subscriptions
2. Add React DevTools Profiler to identify which selector is causing the loop
3. Check if store functions are being recreated unnecessarily
4. Consider using `useStore` with explicit equality checks
5. Investigate if `useScopedCanvasStoreApi` is causing issues
6. Consider batching store updates or using a different subscription pattern

**Technical Details of Attempted Fixes:**

1. **Individual Selectors Pattern** (Applied to all components):
   ```typescript
   // Before: Object selector with shallow
   const { shapes, createShape, ... } = useScopedCanvasStore(projectId, selector, shallow);
   
   // After: Individual selectors
   const selectShapes = useMemo(() => (state: any) => state.shapes, []);
   const selectCreateShape = useMemo(() => (state: any) => state.createShape, []);
   const shapes = useScopedCanvasStore(projectId, selectShapes);
   const createShape = useScopedCanvasStore(projectId, selectCreateShape);
   ```

2. **Equality Function Changes**:
   - Removed `mapArrayEquality` as default equality function
   - Changed to Zustand's default reference equality (`Object.is`)
   - Rationale: Maps/Arrays are already compared by reference, custom equality was unnecessary

3. **Selector Memoization**:
   - All selectors wrapped in `useMemo` with empty dependency array
   - Ensures selector functions are stable across renders

**Files Modified:**
- `collabcanvas/src/components/Toolbar.tsx`
- `collabcanvas/src/components/UnifiedAIChat.tsx`
- `collabcanvas/src/components/Canvas.tsx`
- `collabcanvas/src/components/ShapePropertiesPanel.tsx`
- `collabcanvas/src/hooks/useShapes.ts`
- `collabcanvas/src/hooks/useLayers.ts`
- `collabcanvas/src/pages/Board.tsx`
- `collabcanvas/src/store/projectCanvasStore.ts`

## 2. Final Architecture

### Store Access Pattern
All components and hooks now use one of these patterns:

1. **`useScopedCanvasStore(projectId, selector, equalityFn)`** - Hook for reactive state access
2. **`useScopedCanvasStoreApi(projectId)`** - Hook for non-reactive store API access (e.g., `storeApi.getState()`)
3. **`getProjectCanvasStoreApi(projectId)`** - Direct store API access (non-hook, for tests/utilities)

### Migration Status

#### ✅ Completed
- **Core Store Functions**: `useScopedCanvasStore`, `useScopedCanvasStoreApi` properly handle undefined projectId
- **Bridging Helper**: `useCanvasStoreForProject` created for migration support
- **Test Utilities**: `createMockProjectStore`, `cleanupProjectStores`, `resetProjectStore` in `store/__tests__/testUtils.ts`
- **Components**: All major components migrated:
  - `Board.tsx` - Uses `useScopedCanvasStore` and `useScopedCanvasStoreApi`
  - `Canvas.tsx` - Uses scoped stores with projectId from context
  - `Toolbar.tsx` - Uses scoped stores with projectId from context
  - `MaterialDialogueBox.tsx` - Uses scoped stores with projectId from context
  - `UnifiedAIChat.tsx` - Uses scoped stores with projectId from context
- **Hooks**: `useShapes`, `useLayers` automatically use scoped stores when projectId provided
- **Integration Tests**: Migrated to use scoped stores:
  - `material.integration.test.ts`
  - `layer.integration.test.ts`
  - `canvasStore.layers.color.test.ts`

#### 🔄 Remaining (Non-Critical)
- Some component test files still use global store (can be migrated incrementally):
  - `LayersPanel.test.tsx`
  - `LayersPanel.color.test.tsx`
  - `MeasurementDisplay.test.tsx`
  - `annotation.integration.test.ts`
- `aiService.integration.test.ts` - Uses global store (can be migrated)
- `canvasStore.test.ts` - Tests global store implementation (intentionally kept)

## 3. Key Fixes

### Store API Consistency
Fixed `useScopedCanvasStoreApi` to properly return global store API when `projectId` is undefined, ensuring consistent behavior with `useScopedCanvasStore`.

### Test Migration Pattern
All integration tests now follow this pattern:
```typescript
const testProjectId = 'test-project-name';
const store = getProjectCanvasStoreApi(testProjectId);
const state = store.getState();

beforeEach(() => {
  // Reset store state
});

afterEach(() => {
  releaseProjectCanvasStore(testProjectId);
});
```

## 4. Testing Steps

### Run Tests
```bash
# Integration tests
npm run test -- src/test/material.integration.test.ts
npm run test -- src/test/layer.integration.test.ts
npm run test -- src/store/__tests__/canvasStore.layers.color.test.ts

# Component tests
npm run test -- src/components/UnifiedAIChat.test.tsx
npm run test -- src/components/Toolbar.test.tsx
```

### Runtime Verification
1. Launch the app
2. Open any project
3. Verify no "Maximum update depth exceeded" warnings
4. Verify no "getSnapshot" warnings
5. Test switching between projects to ensure isolation
6. Test AI chat functionality
7. Test material estimation

## 5. Architecture Benefits

1. **Complete Isolation** - Each project has its own isolated store
2. **Consistent API** - All components use the same scoped store pattern
3. **Backward Compatible** - Falls back to global store when projectId undefined
4. **Test Support** - Utilities provided for test isolation
5. **Prevents Most Infinite Loops** - Proper handling of undefined projectId prevents render loops (though one issue persists in Toolbar)

## 6. Migration Guide for Remaining Tests

For test files still using `useCanvasStore`:

1. Import scoped store functions:
   ```typescript
   import { getProjectCanvasStoreApi, releaseProjectCanvasStore } from '../store/projectCanvasStore';
   ```

2. Replace `useCanvasStore.getState()` with:
   ```typescript
   const store = getProjectCanvasStoreApi('test-project-id');
   const state = store.getState();
   ```

3. Replace `useCanvasStore.setState()` with:
   ```typescript
   store.setState({ ... });
   ```

4. Add cleanup in `afterEach`:
   ```typescript
   afterEach(() => {
     releaseProjectCanvasStore('test-project-id');
   });
   ```

## 7. Known Issues

### Resolved ✅
- ✅ "api.getState is not a function" errors
- ✅ Store API inconsistency between hooks
- ✅ Test isolation between projects
- ✅ Infinite render loops when projectId is undefined (for cached default state)

### Open Issues ⚠️
- ⚠️ **Infinite loop in Toolbar component** - "Maximum update depth exceeded" error persists despite using individual selectors
  - Error occurs when opening a project
  - Affects: `Toolbar.tsx` component
  - Status: Under investigation
  - See "CURRENT STATUS" section above for details

## 8. Future Improvements

- Migrate remaining component test files incrementally
- Consider store cleanup when ref count reaches 0
- Add store persistence to localStorage (optional)
- Monitor store size and add limits if needed


