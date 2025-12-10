# API Contracts

## Overview

CollabCanvas uses Firebase services for all backend operations. The application communicates with Firebase through SDK clients rather than REST APIs. This document describes the service interfaces and data contracts.

## Firebase Services

### Authentication (Firebase Auth)

**Service**: `firebase/auth`

**Methods Used**:
- `signInWithPopup(auth, googleProvider)` - Google OAuth sign-in
- `signOut(auth)` - Sign out current user
- `onAuthStateChanged(auth, callback)` - Listen to auth state changes

**User Data Structure**:
```typescript
interface User {
  uid: string;
  name: string;
  email: string | null;
  photoURL: string | null;
}
```

### Firestore (Persistent Data)

**Service**: `firebase/firestore`

**Collections**:

#### `/projects/{projectId}/shapes/{shapeId}`

**Note**: As of Story 2.1, shapes are project-scoped. The previous global board path `/boards/global/shapes` is no longer used.

**Document Structure**: `FirestoreShape`
```typescript
interface FirestoreShape {
  id: string;
  type: 'rect' | 'circle' | 'text' | 'line' | 'polyline' | 'polygon';
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  createdAt: FieldValue | number;
  createdBy: string;
  updatedAt: FieldValue | number;
  updatedBy: string;
  clientUpdatedAt: number;
  layerId?: string;
  // Type-specific properties
  text?: string;
  fontSize?: number;
  strokeWidth?: number;
  radius?: number;
  points?: number[];
  rotation?: number;
}
```

**Operations**:
- `createShape(projectId, shapeId, shapeType, x, y, userId, layerId?, additionalProps?)` - Create new shape (project-scoped)
- `updateShapePosition(projectId, shapeId, x, y, userId, clientTimestamp)` - Update position (project-scoped)
- `updateShapeProperty(projectId, shapeId, property, value, userId, clientTimestamp)` - Update any property (project-scoped)
- `deleteShape(projectId, shapeId)` - Delete shape (project-scoped)
- `subscribeToShapes(projectId, callback)` - Real-time subscription to all shapes (project-scoped)
- `subscribeToShapesChanges(projectId, onChanges)` - Incremental change subscription (project-scoped)

#### `/projects/{projectId}/layers/{layerId}`

**Note**: As of Story 2.1, layers are project-scoped. The previous global board path `/boards/global/layers` is no longer used.

**Document Structure**: `FirestoreLayer`
```typescript
interface FirestoreLayer {
  id: string;
  name: string;
  shapes: string[];
  visible: boolean;
  locked: boolean;
  order: number;
  color?: string;
  createdAt: FieldValue | number;
  createdBy: string;
  updatedAt: FieldValue | number;
  updatedBy: string;
  clientUpdatedAt: number;
}
```

**Operations**:
- `createLayer(projectId, layerId, name, userId, order)` - Create new layer (project-scoped)
- `updateLayer(projectId, layerId, updates, userId)` - Update layer properties (project-scoped)
- `deleteLayer(projectId, layerId)` - Delete layer (project-scoped)
- `subscribeToLayers(projectId, callback)` - Real-time subscription to all layers (project-scoped)
- `subscribeToLayersChanges(projectId, onChanges)` - Incremental change subscription (project-scoped)

#### `/projects/{projectId}/board/data`

**Note**: As of Story 2.1, board state is project-scoped. The previous global board path `/boards/global` is no longer used. The board document is stored in a `board` collection with a fixed `data` document ID, following the same pattern as `scope/data` and `bom/data`.

**Document Structure**: `FirestoreBoardState`
```typescript
interface FirestoreBoardState {
  activeLayerId: string;
  updatedAt: FieldValue | number;
  updatedBy: string;
  backgroundImage?: {
    url: string;
    width: number;
    height: number;
    uploadedAt: FieldValue | number;
    uploadedBy: string;
  };
  scaleLine?: {
    id: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    realWorldLength: number;
    unit: string;
    isVisible: boolean;
    createdAt: FieldValue | number;
    createdBy: string;
    updatedAt: FieldValue | number;
    updatedBy: string;
  };
}
```

**Operations**:
- `initializeBoard(projectId, userId)` - Initialize board document (project-scoped)
- `updateActiveLayerId(projectId, activeLayerId, userId)` - Update active layer (project-scoped)
- `saveBackgroundImage(projectId, image, userId)` - Save background image metadata (project-scoped)
- `saveScaleLine(projectId, scaleLine, userId)` - Save scale line configuration (project-scoped)
- `deleteBackgroundImageFromFirestore(projectId, userId)` - Remove background image (project-scoped)
- `deleteScaleLineFromFirestore(projectId, userId)` - Remove scale line (project-scoped)
- `subscribeToBoardState(projectId, onStateChange)` - Real-time board state subscription (project-scoped)

### Realtime Database (Ephemeral Data)

**Service**: `firebase/database`

**Paths**:

#### `/presence/{userId}`

**Data Structure**: `PresenceData`
```typescript
interface PresenceData {
  userId: string;
  name: string;
  color: string;
  cursor: {
    x: number;
    y: number;
  };
  lastSeen: object | number;
  isActive: boolean;
}
```

**Operations**:
- `setPresence(userId, name, color)` - Set user presence (auto-cleanup on disconnect)
- `updateCursor(userId, x, y)` - Update cursor position (throttled)
- `removePresence(userId)` - Remove user presence
- `subscribeToPresence(callback)` - Real-time presence subscription

#### `/locks/{shapeId}`

**Data Structure**: `LockData`
```typescript
interface LockData {
  userId: string;
  userName: string;
  lockedAt: object | number;
}
```

**Operations**:
- `acquireLock(shapeId, userId, userName)` - Acquire lock on shape (auto-cleanup on disconnect)
- `releaseLock(shapeId)` - Release lock
- `subscribeToLocks(callback)` - Real-time locks subscription
- `subscribeToLock(shapeId, callback)` - Subscribe to specific lock

### Cloud Functions

**Service**: `firebase/functions`

**Functions**:

#### `aiCommand(commandText, userId)`

**Purpose**: Process natural language commands for canvas manipulation

**Request**:
```typescript
{
  commandText: string;
  userId: string;
}
```

**Response**: `AICommandResult`
```typescript
interface AICommandResult {
  success: boolean;
  message: string;
  executedCommands: AICommand[];
  createdShapeIds?: string[];
  modifiedShapeIds?: string[];
  deletedShapeIds?: string[];
  error?: string;
  clarificationNeeded?: {
    question: string;
    options: Array<{
      label: string;
      value: string;
      shapeIds?: string[];
    }>;
  };
}
```

**Supported Commands**:
- CREATE: Create shapes (circle, rectangle, text, line, polyline, polygon)
- MOVE: Move shapes to positions
- RESIZE: Resize shapes
- ROTATE: Rotate shapes
- DELETE: Delete shapes
- ALIGN: Align shapes
- EXPORT: Export canvas
- LAYER: Layer operations
- COLOR: Change shape colors
- DUPLICATE: Duplicate shapes

#### `materialEstimateCommand(request, userId)`

**Purpose**: Calculate material estimates for construction annotations

**Request**: Material request with wall/floor specifications

**Response**: Material calculation results with BOM (Bill of Materials)

#### `getHomeDepotPrice(materialId)`

**Purpose**: Fetch pricing data from Home Depot API

**Request**: Material identifier

**Response**: Pricing information

### Firebase Storage

**Service**: `firebase/storage`

**Usage**: Store background images for construction plans

**Operations**:
- Upload PNG/JPG images
- Generate download URLs
- Delete images

## Security Rules

### Firestore Rules

- **Authentication Required**: All operations require authenticated user
- **Shape Validation**: Type-specific validation, metadata validation
- **Layer Validation**: Basic name and creator validation
- **Update Restrictions**: Only last updater can update again

### Realtime Database Rules

- **Authentication Required**: All operations require authenticated user
- **Presence Validation**: User can only write their own presence data
- **Lock Validation**: User can acquire lock if not locked or if they own the lock

## Error Handling

All Firebase operations include error handling:
- Network errors → Offline queue
- Permission errors → User feedback
- Validation errors → Console warnings
- Timeout errors → Retry logic (cursor updates)

## Rate Limiting

- **AI Commands**: 10 commands per minute (configurable)
- **Cursor Updates**: Throttled to prevent excessive writes
- **Shape Updates**: Client-side throttling for position updates

