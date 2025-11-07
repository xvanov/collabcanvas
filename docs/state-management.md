# State Management

## Overview

CollabCanvas uses Zustand for state management. The application has a single centralized store (`canvasStore`) that manages all application state including shapes, layers, selection, locks, presence, and AI commands.

## Store Architecture

### Main Store: `canvasStore`

**Location**: `src/store/canvasStore.ts`

**Store Hook**: `useCanvasStore`

**State Interface**: `CanvasState`

## State Categories

### Shapes State

**Data Structure**: `Map<string, Shape>`

**Actions**:
- `createShape(shape: Shape)` - Create new shape
- `updateShapePosition(id, x, y, updatedBy, clientUpdatedAt)` - Update shape position
- `updateShapeProperty(id, property, value, updatedBy, clientUpdatedAt)` - Update any shape property
- `setShapes(shapes: Shape[])` - Replace all shapes
- `setShapesFromMap(shapes: Map<string, Shape>)` - Replace shapes from Map
- `deleteShape(id)` - Delete single shape
- `deleteShapes(ids: string[])` - Delete multiple shapes
- `duplicateShapes(ids: string[], duplicatedBy: string)` - Duplicate shapes

**Sync**: Real-time sync with Firestore via `subscribeToShapesChanges`

### History State (Undo/Redo)

**Data Structure**: `HistoryState`

```typescript
interface HistoryState {
  past: CanvasAction[];
  present: CanvasAction | null;
  future: CanvasAction[];
  maxHistorySize: number;
}
```

**Actions**:
- `pushAction(action: CanvasAction)` - Add action to history
- `undo()` - Undo last action
- `redo()` - Redo undone action
- `canUndo()` - Check if undo is possible
- `canRedo()` - Check if redo is possible
- `clearHistory()` - Clear history

**Service**: Uses `HistoryService` for action management

### Selection State

**Multi-Select Support**:
- `selectedShapeIds: string[]` - Array of selected shape IDs
- `addToSelection(id)` - Add shape to selection
- `removeFromSelection(id)` - Remove shape from selection
- `clearSelection()` - Clear all selections
- `selectShapes(ids: string[])` - Set selection to specific shapes

**Legacy Single Selection** (for backward compatibility):
- `selectedShapeId: string | null` - Single selected shape ID
- `selectShape(id)` - Select single shape
- `deselectShape()` - Deselect shape

**Transform Controls**:
- `transformControls: TransformControls` - Transform control state
- `updateTransformControls(controls)` - Update transform controls
- `hideTransformControls()` - Hide transform controls

**Selection Box**:
- `selectionBox: SelectionBox | null` - Drag selection box
- `setSelectionBox(box)` - Set selection box

### Bulk Operations

**Actions**:
- `deleteSelectedShapes()` - Delete all selected shapes
- `duplicateSelectedShapes()` - Duplicate all selected shapes
- `moveSelectedShapes(deltaX, deltaY)` - Move all selected shapes
- `rotateSelectedShapes(angle)` - Rotate all selected shapes

### Locks State

**Data Structure**: `Map<string, Lock>`

**Actions**:
- `lockShape(shapeId, userId, userName)` - Acquire lock on shape
- `unlockShape(shapeId)` - Release lock
- `setLocks(locks)` - Set locks from array

**Sync**: Real-time sync with Realtime Database via `subscribeToLocks`

### Presence State

**Data Structure**: `Map<string, Presence>`

**Actions**:
- `updatePresence(userId, data)` - Update user presence
- `removeUser(userId)` - Remove user presence
- `setUsers(users)` - Set users from array

**Sync**: Real-time sync with Realtime Database via `subscribeToPresence`

### Current User State

**Data Structure**: `User | null`

**Actions**:
- `setCurrentUser(user)` - Set current authenticated user

### Offline State

**Data Structure**:
- `connectionState: ConnectionState` - Connection status
- `queuedUpdatesCount: number` - Number of queued updates

**Actions**:
- `setConnectionState(state)` - Update connection state
- `setQueuedUpdatesCount(count)` - Update queued count

### Layers State

**Data Structure**: `Layer[]`

**Actions**:
- `layers: Layer[]` - Array of layers
- `activeLayerId: string` - Currently active layer ID
- `createLayer(name, id?)` - Create new layer
- `updateLayer(id, updates)` - Update layer properties
- `deleteLayer(id)` - Delete layer
- `reorderLayers(layerIds)` - Reorder layers
- `moveShapeToLayer(shapeId, layerId)` - Move shape to layer
- `toggleLayerVisibility(id)` - Toggle layer visibility
- `toggleLayerLock(id)` - Toggle layer lock
- `setActiveLayer(id)` - Set active layer
- `setLayers(layers)` - Replace all layers

**Sync**: Real-time sync with Firestore via `subscribeToLayersChanges`

### Alignment Tools

**Actions**:
- `alignSelectedShapes(alignment)` - Align selected shapes
- `distributeSelectedShapes(direction)` - Distribute selected shapes

**Alignment Types**: `'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-horizontal' | 'distribute-vertical'`

### Grid and Snap State

**Data Structure**: `GridState`

```typescript
interface GridState {
  isVisible: boolean;
  isSnapEnabled: boolean;
  size: number;
  color: string;
  opacity: number;
}
```

**Actions**:
- `toggleGrid()` - Toggle grid visibility
- `toggleSnap()` - Toggle snap to grid
- `updateGridSize(size)` - Update grid size
- `setSnapIndicators(indicators)` - Set snap indicators

**Snap Indicators**: `SnapIndicator[]` - Visual feedback for snapping

### AI Canvas Agent State

**Data Structures**:
- `aiCommands: AICommand[]` - Queue of AI commands
- `aiStatus: AIStatus` - Current AI processing status
- `aiCommandHistory: AICommandHistory[]` - Command history
- `commandQueue: AICommand[]` - Pending commands
- `isProcessingAICommand: boolean` - Processing flag

**Actions**:
- `processAICommand(commandText)` - Process natural language command
- `executeAICommand(command)` - Execute AI command
- `clearAIHistory()` - Clear command history
- `getAIStatus()` - Get current AI status
- `addToCommandQueue(command)` - Add command to queue
- `processCommandQueue()` - Process queued commands
- `setAIStatus(status)` - Update AI status

### Construction Annotation Tool State

**Data Structure**: `CanvasScale`

```typescript
interface CanvasScale {
  scaleLine: ScaleLine | null;
  backgroundImage: BackgroundImage | null;
  isScaleMode: boolean;
  isImageUploadMode: boolean;
}
```

**Actions**:
- `setBackgroundImage(image)` - Set background image
- `setScaleLine(scaleLine)` - Set scale line
- `updateScaleLine(updates)` - Update scale line properties
- `deleteScaleLine()` - Delete scale line
- `setIsScaleMode(isScaleMode)` - Toggle scale mode
- `setIsImageUploadMode(isImageUploadMode)` - Toggle image upload mode
- `initializeBoardStateSubscription()` - Initialize board state sync

**Sync**: Real-time sync with Firestore board document

### Material Estimation State

**Data Structures**:
- `materialDialogue: DialogueContext | null` - Active material dialogue
- `billOfMaterials: BillOfMaterials | null` - Current BOM
- `userMaterialPreferences: UserMaterialPreferences | null` - User preferences
- `isAccumulatingBOM: boolean` - Accumulation mode flag

**Actions**:
- `startMaterialDialogue(request)` - Start material estimation dialogue
- `updateMaterialDialogue(updates)` - Update dialogue context
- `clearMaterialDialogue()` - Clear dialogue
- `setBillOfMaterials(bom)` - Set BOM
- `addMaterialCalculation(calculation, forceAccumulate?)` - Add calculation to BOM
- `setUserMaterialPreferences(preferences)` - Set user preferences
- `setIsAccumulatingBOM(isAccumulating)` - Set accumulation mode

## State Synchronization

### Firestore Sync

- **Shapes**: `subscribeToShapesChanges` - Incremental updates
- **Layers**: `subscribeToLayersChanges` - Incremental updates
- **Board State**: `subscribeToBoardState` - Background image, scale line

### Realtime Database Sync

- **Presence**: `subscribeToPresence` - User presence and cursors
- **Locks**: `subscribeToLocks` - Shape locks

### Offline Queue

- Queued operations stored locally
- Synced to Firestore when connection restored
- Operations: Create, Update Position, Delete, Lock

## State Updates Flow

1. **User Action** → Store Action
2. **Store Action** → Firestore/RTDB Write
3. **Firestore/RTDB** → Subscription Callback
4. **Subscription Callback** → Store Update
5. **Store Update** → Component Re-render

## Performance Optimizations

- **Map-based Storage**: O(1) shape lookups
- **Incremental Updates**: Only changed items processed
- **Selective Subscriptions**: Components subscribe to specific slices
- **Imperative Updates**: Canvas operations use refs to avoid re-renders
- **Throttled Writes**: Position updates throttled to prevent excessive writes

## State Persistence

- **Firestore**: Persistent data (shapes, layers, board state)
- **Realtime DB**: Ephemeral data (presence, locks) - auto-cleanup on disconnect
- **Local Storage**: User preferences, diagnostics HUD state
- **Session Storage**: Not used

