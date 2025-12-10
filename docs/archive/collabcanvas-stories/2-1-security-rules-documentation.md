# Story 2.1: Firestore Security Rules Documentation

## Overview

As part of Story 2.1 (Project Isolation), Firestore security rules were updated to enforce project-level access control for canvas data (shapes, layers, and board state).

## Changes Made

### Previous Structure (Global Board)
- `/boards/global/shapes/{shapeId}`
- `/boards/global/layers/{layerId}`
- `/boards/global` (board document)

### New Structure (Project-Scoped)
- `/projects/{projectId}/shapes/{shapeId}`
- `/projects/{projectId}/layers/{layerId}`
- `/projects/{projectId}/board/data` (board collection with fixed `data` document ID)

## Security Rules

### Shapes Collection
```javascript
match /projects/{projectId}/shapes/{shapeId} {
  allow read: if isOwnerOrCollaborator(projectId);
  allow create, update, delete: if isOwnerOrEditor(projectId) 
    && request.resource.data.keys().hasAll(['id', 'type', 'x', 'y', 'w', 'h', 'color', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'clientUpdatedAt']);
}
```

### Layers Collection
```javascript
match /projects/{projectId}/layers/{layerId} {
  allow read: if isOwnerOrCollaborator(projectId);
  allow create, update, delete: if isOwnerOrEditor(projectId)
    && request.resource.data.keys().hasAll(['id', 'name', 'shapes', 'visible', 'locked', 'order', 'createdAt', 'createdBy', 'updatedAt', 'updatedBy', 'clientUpdatedAt']);
}
```

### Board Collection
```javascript
match /projects/{projectId}/board/{boardDocId} {
  allow read: if isOwnerOrCollaborator(projectId);
  allow create, update: if isOwnerOrEditor(projectId)
    && request.resource.data.updatedBy == request.auth.uid;
  allow delete: if isOwner(projectId);
}
```

**Note**: The board document uses a fixed document ID `data` (e.g., `/projects/{projectId}/board/data`), following the same pattern as `scope/data` and `bom/data`.

## Helper Functions

The rules use existing helper functions:
- `isOwnerOrCollaborator(projectId)`: Checks if user is project owner or collaborator
- `isOwnerOrEditor(projectId)`: Checks if user is project owner or has editor role
- `isOwner(projectId)`: Checks if user is project owner

## Testing Status

**Status**: ⚠️ Manual testing required

**Note**: Firebase emulator tests for security rules should be run manually using:
```bash
firebase emulators:start --only firestore
# Then run security rules tests
```

**Recommended Tests**:
1. Verify owner can read/write shapes, layers, and board state
2. Verify collaborator can read shapes, layers, and board state
3. Verify collaborator with editor role can write shapes, layers, and board state
4. Verify non-collaborator cannot access project data
5. Verify schema validation works for shapes and layers

## Migration Notes

- **No migration required**: Existing global board data can be lost per user request
- New projects will use project-scoped collections automatically
- Old `/boards/global/*` paths are no longer used

## Related Files

- `collabcanvas/firestore.rules` - Security rules file
- `docs/stories/2-1-project-isolation-canvas-bom-per-project.md` - Story documentation

