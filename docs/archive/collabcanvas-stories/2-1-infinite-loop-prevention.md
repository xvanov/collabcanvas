# Story 2.1: Infinite Loop Prevention - Code Review Response

## Issue Summary

Code review identified potential infinite loop issues in `useShapes.ts` and `useLayers.ts`, specifically:
1. A 5000ms timeout workaround in `useLayers.ts` suggesting race condition issues
2. Complex dependency chains in `useShapes.ts` that could cause re-render loops

## Fixes Applied

### 1. Removed 5000ms Timeout Workaround in `useLayers.ts`

**Previous Implementation** (Code Smell):
```typescript
isCreatingLayerRef.current = true;
// ... create layer ...
setTimeout(() => {
  isCreatingLayerRef.current = false;
}, 5000); // Arbitrary timeout - code smell
```

**New Implementation** (Deterministic):
```typescript
creatingLayerIdRef.current = layerId; // Track specific layer ID
// ... create layer ...
// Clear flag when Firestore write completes
creatingLayerIdRef.current = null;
// OR clear when subscription confirms layer added
if (creatingLayerIdRef.current === layer.id) {
  creatingLayerIdRef.current = null;
}
```

**Benefits**:
- Deterministic: Flag clears when layer creation is confirmed, not after arbitrary timeout
- Faster: No 5-second delay
- More reliable: Works regardless of network latency
- Better error handling: Clears on error after 1s (vs 5s)

### 2. Verified Dependency Arrays

**useShapes.ts**:
- `scheduleShapesCommit` depends on `setShapesFromMap` (stable from Zustand store)
- `handleFirestoreDocChanges` depends on `scheduleShapesCommit` (memoized with useCallback)
- Subscription effect depends on `handleFirestoreDocChanges` (stable callback)
- ✅ No infinite loops: All dependencies are stable or properly memoized

**useLayers.ts**:
- `activeLayerId` intentionally excluded from dependency array to prevent race conditions
- Comment added explaining the exclusion
- ✅ Race condition handled deterministically via `creatingLayerIdRef`

## Testing

### Unit Tests
- ✅ `useShapes.projectIsolation.test.ts` - All tests passing
- ✅ `projectIsolation.integration.test.ts` - All tests passing

### Manual Verification
- ✅ No infinite loops observed in development
- ✅ Subscription cleanup works correctly when switching projects
- ✅ Layer creation works without race conditions

## Prevention Mechanisms

1. **Stable Refs**: `shapesRef`, `layersRef`, `userIdRef` prevent re-subscriptions on state changes
2. **Memoized Callbacks**: `useCallback` with proper dependencies prevents function recreation
3. **Deterministic Flags**: `creatingLayerIdRef` tracks specific operations, not arbitrary timeouts
4. **Subscription Cleanup**: Proper `unsubscribe()` calls in `useEffect` cleanup functions
5. **Store Isolation**: Project-scoped stores prevent cross-project state leakage

## Related Files

- `collabcanvas/src/hooks/useShapes.ts` - Shapes hook with infinite loop prevention
- `collabcanvas/src/hooks/useLayers.ts` - Layers hook with deterministic race condition handling
- `collabcanvas/src/store/projectCanvasStore.ts` - Project-scoped store implementation

