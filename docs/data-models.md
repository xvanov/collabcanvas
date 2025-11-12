# Data Models

## Overview

CollabCanvas uses Firestore for persistent data storage and Realtime Database for ephemeral real-time data. This document describes all data models and their relationships.

## Firestore Collections

### Shapes Collection

**Path**: `/projects/{projectId}/shapes/{shapeId}`

**Note**: As of Story 2.1, shapes are project-scoped. The previous global board path `/boards/global/shapes` is no longer used.

**Document**: `FirestoreShape`

```typescript
interface FirestoreShape {
  id: string;                    // Document ID
  type: ShapeType;              // 'rect' | 'circle' | 'text' | 'line' | 'polyline' | 'polygon'
  x: number;                     // X position
  y: number;                     // Y position
  w: number;                     // Width
  h: number;                     // Height
  color: string;                 // Hex color code
  createdAt: FieldValue | number; // Server timestamp or number
  createdBy: string;            // User UID
  updatedAt: FieldValue | number; // Server timestamp or number
  updatedBy: string;            // User UID
  clientUpdatedAt: number;       // Client timestamp for conflict resolution
  layerId?: string;             // Optional layer assignment
  
  // Type-specific properties
  text?: string;                // For 'text' type
  fontSize?: number;            // For 'text' type
  strokeWidth?: number;        // For 'line', 'polyline', 'polygon'
  radius?: number;             // For 'circle' type
  points?: number[];           // For 'polyline', 'polygon' (flat array: [x1, y1, x2, y2, ...])
  rotation?: number;           // Rotation angle in degrees
}
```

**Shape Types**:
- `rect`: Rectangle shapes
- `circle`: Circle shapes
- `text`: Text elements
- `line`: Single line segments
- `polyline`: Multi-point lines (for wall measurements)
- `polygon`: Closed polygons (for room areas)

**Indexes**: None required (single board, small collection size)

### Layers Collection

**Path**: `/projects/{projectId}/layers/{layerId}`

**Note**: As of Story 2.1, layers are project-scoped. The previous global board path `/boards/global/layers` is no longer used.

**Document**: `FirestoreLayer`

```typescript
interface FirestoreLayer {
  id: string;                    // Document ID
  name: string;                  // Layer display name
  shapes: string[];              // Array of shape IDs in this layer
  visible: boolean;              // Visibility toggle
  locked: boolean;               // Lock toggle
  order: number;                 // Z-order for layer stacking
  color?: string;                // Default color for shapes in this layer
  createdAt: FieldValue | number;
  createdBy: string;
  updatedAt: FieldValue | number;
  updatedBy: string;
  clientUpdatedAt: number;
}
```

**Relationships**:
- Shapes reference layers via `layerId` field
- Layers contain arrays of shape IDs (denormalized for performance)

### Board Document

**Path**: `/projects/{projectId}/board/data`

**Note**: As of Story 2.1, board state is project-scoped. The previous global board path `/boards/global` is no longer used. The board document is stored in a `board` collection with a fixed `data` document ID, following the same pattern as `scope/data` and `bom/data`.

**Document**: `FirestoreBoardState`

```typescript
interface FirestoreBoardState {
  activeLayerId: string;         // Currently active layer ID
  updatedAt: FieldValue | number;
  updatedBy: string;
  
  // Construction annotation tool data
  backgroundImage?: {
    url: string;                  // Firebase Storage download URL
    width: number;                // Image width in pixels
    height: number;               // Image height in pixels
    uploadedAt: FieldValue | number;
    uploadedBy: string;
  };
  
  scaleLine?: {
    id: string;                   // Scale line shape ID
    startX: number;               // Start X coordinate
    startY: number;               // Start Y coordinate
    endX: number;                 // End X coordinate
    endY: number;                 // End Y coordinate
    realWorldLength: number;      // Real-world measurement value
    unit: string;                 // Unit type ('feet', 'meters', etc.)
    isVisible: boolean;          // Visibility toggle
    createdAt: FieldValue | number;
    createdBy: string;
    updatedAt: FieldValue | number;
    updatedBy: string;
  };
}
```

**Board ID**: Currently uses `'global'` as the single board ID

## Realtime Database Structure

### Presence Data

**Path**: `/presence/{userId}`

**Data**: `PresenceData`

```typescript
interface PresenceData {
  userId: string;                // User UID
  name: string;                  // Display name
  color: string;                 // User color (hex)
  cursor: {
    x: number;                   // Cursor X position
    y: number;                   // Cursor Y position
  };
  lastSeen: object | number;     // Server timestamp or number
  isActive: boolean;             // Active status
}
```

**Lifecycle**: Auto-deleted on user disconnect via `onDisconnect` handler

### Lock Data

**Path**: `/locks/{shapeId}`

**Data**: `LockData`

```typescript
interface LockData {
  userId: string;                // User UID who owns the lock
  userName: string;              // Display name
  lockedAt: object | number;     // Server timestamp or number
}
```

**Lifecycle**: Auto-deleted on user disconnect via `onDisconnect` handler

**Purpose**: Prevent concurrent editing conflicts on shapes

## Client-Side Data Models

### Shape Model

**Type**: `Shape` (extends FirestoreShape with client-side fields)

```typescript
interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  createdAt: number | null;      // Converted to number (null if pending)
  createdBy: string;
  updatedAt: number | null;      // Converted to number
  updatedBy: string;
  clientUpdatedAt: number | null;
  layerId?: string;
  // Type-specific properties same as FirestoreShape
}
```

### Layer Model

**Type**: `Layer` (matches FirestoreLayer)

### User Model

```typescript
interface User {
  uid: string;
  name: string;
  email: string | null;
  photoURL: string | null;
}
```

### Presence Model

```typescript
interface Presence {
  userId: string;
  name: string;
  color: string;
  cursor: {
    x: number;
    y: number;
  };
  lastSeen: number;
  isActive: boolean;
}
```

### Lock Model

```typescript
interface Lock {
  userId: string;
  userName: string;
  lockedAt: number;
}
```

## Material Estimation Models

### Material Calculation

```typescript
interface MaterialCalculation {
  id: string;
  category: 'framing' | 'surface' | 'finish' | 'flooring' | 'trim' | 'insulation';
  material: string;
  quantity: number;
  unit: 'piece' | 'linear-feet' | 'square-feet' | 'gallon' | 'box' | 'roll' | 'bag';
  cost: number;
  shapeIds: string[];           // Associated shape IDs
  layerId: string;              // Associated layer ID
}
```

### Bill of Materials

```typescript
interface BillOfMaterials {
  calculations: MaterialCalculation[];
  totalCost: number;
  lastUpdated: number;
}
```

## Data Flow

1. **Shape Creation**: Client → Firestore → All clients via subscription
2. **Shape Updates**: Client → Firestore → All clients via subscription
3. **Presence Updates**: Client → Realtime DB → All clients via subscription
4. **Lock Acquisition**: Client → Realtime DB → All clients via subscription
5. **Offline Queue**: Client → Local queue → Firestore when online

## Conflict Resolution

- **Client Timestamps**: `clientUpdatedAt` used for last-write-wins
- **Server Timestamps**: `createdAt`, `updatedAt` from Firestore serverTimestamp()
- **Lock Mechanism**: Prevents concurrent edits via Realtime DB locks

## Data Validation

### Firestore Rules

- Shape type validation
- Required field validation
- Type-specific property validation
- User authentication validation
- Update permission validation (only last updater)

### Realtime Database Rules

- Presence data validation (user can only write own presence)
- Lock data validation (user can acquire if not locked or owns lock)






