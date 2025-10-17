/**
 * Zustand store for canvas state management
 * Manages shapes, selection, locks, and presence data
 */

import { create } from 'zustand';
import type { Shape, Lock, Presence, User, SelectionBox, TransformControls } from '../types';
import type { ConnectionState } from '../services/offline';
import { isHarnessEnabled, registerHarnessApi } from '../utils/harness';

interface CanvasState {
  // Shapes
  shapes: Map<string, Shape>;
  createShape: (shape: Shape) => void;
  updateShapePosition: (id: string, x: number, y: number, updatedBy: string, clientUpdatedAt: number) => void;
  updateShapeProperty: (id: string, property: keyof Shape, value: unknown, updatedBy: string, clientUpdatedAt: number) => void;
  setShapes: (shapes: Shape[]) => void;
  setShapesFromMap: (shapes: Map<string, Shape>) => void;
  
  // Multi-Select
  selectedShapeIds: string[];
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  clearSelection: () => void;
  selectShapes: (ids: string[]) => void;
  
  // Bulk Operations
  deleteSelectedShapes: () => void;
  duplicateSelectedShapes: () => void;
  moveSelectedShapes: (deltaX: number, deltaY: number) => void;
  rotateSelectedShapes: (angle: number) => void;
  
  // Transform Controls
  transformControls: TransformControls;
  updateTransformControls: (controls: Partial<TransformControls>) => void;
  hideTransformControls: () => void;
  
  // Selection Box (for drag selection)
  selectionBox: SelectionBox | null;
  setSelectionBox: (box: SelectionBox | null) => void;
  
  // Legacy single selection (for backward compatibility)
  selectedShapeId: string | null;
  selectShape: (id: string) => void;
  deselectShape: () => void;
  
  // Locks
  locks: Map<string, Lock>;
  lockShape: (shapeId: string, userId: string, userName: string) => void;
  unlockShape: (shapeId: string) => void;
  setLocks: (locks: Array<{ shapeId: string; lock: Lock }>) => void;
  
  // Presence
  users: Map<string, Presence>;
  updatePresence: (userId: string, data: Presence) => void;
  removeUser: (userId: string) => void;
  setUsers: (users: Presence[]) => void;
  
  // Current User
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  
  // Offline State
  connectionState: ConnectionState;
  setConnectionState: (state: ConnectionState) => void;
  queuedUpdatesCount: number;
  setQueuedUpdatesCount: (count: number) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  // Shapes state
  shapes: new Map<string, Shape>(),
  
  createShape: (shape: Shape) =>
    set((state) => {
      const newShapes = new Map(state.shapes);
      newShapes.set(shape.id, shape);
      return { shapes: newShapes };
    }),

  updateShapePosition: (id: string, x: number, y: number, updatedBy: string, clientUpdatedAt: number) =>
    set((state) => {
      const shape = state.shapes.get(id);
      if (!shape) return state;
      
      const newShapes = new Map(state.shapes);
      newShapes.set(id, {
        ...shape,
        x,
        y,
        updatedAt: Date.now(),
        updatedBy,
        clientUpdatedAt,
      });
      return { shapes: newShapes };
    }),

  updateShapeProperty: (id: string, property: keyof Shape, value: unknown, updatedBy: string, clientUpdatedAt: number) =>
    set((state) => {
      const shape = state.shapes.get(id);
      if (!shape) return state;
      
      const newShapes = new Map(state.shapes);
      newShapes.set(id, {
        ...shape,
        [property]: value,
        updatedAt: Date.now(),
        updatedBy,
        clientUpdatedAt,
      });
      return { shapes: newShapes };
    }),
  
  setShapes: (shapes: Shape[]) =>
    set(() => ({
      shapes: new Map(shapes.map((shape) => [shape.id, shape])),
    })),

  setShapesFromMap: (incomingShapes: Map<string, Shape>) =>
    set(() => ({
      shapes: incomingShapes,
    })),
  
  // Multi-Select state
  selectedShapeIds: [],
  
  addToSelection: (id: string) =>
    set((state) => {
      if (state.selectedShapeIds.includes(id)) return state;
      return {
        selectedShapeIds: [...state.selectedShapeIds, id],
        selectedShapeId: id, // Update legacy single selection
      };
    }),
  
  removeFromSelection: (id: string) =>
    set((state) => {
      const newSelection = state.selectedShapeIds.filter(shapeId => shapeId !== id);
      return {
        selectedShapeIds: newSelection,
        selectedShapeId: newSelection.length > 0 ? newSelection[newSelection.length - 1] : null,
      };
    }),
  
  clearSelection: () =>
    set(() => ({
      selectedShapeIds: [],
      selectedShapeId: null,
      transformControls: {
        isVisible: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        resizeHandles: [],
      },
    })),
  
  selectShapes: (ids: string[]) =>
    set(() => ({
      selectedShapeIds: ids,
      selectedShapeId: ids.length > 0 ? ids[ids.length - 1] : null,
    })),
  
  // Bulk Operations
  deleteSelectedShapes: () =>
    set((state) => {
      const newShapes = new Map(state.shapes);
      state.selectedShapeIds.forEach(id => {
        newShapes.delete(id);
      });
      return {
        shapes: newShapes,
        selectedShapeIds: [],
        selectedShapeId: null,
        transformControls: {
          isVisible: false,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          rotation: 0,
          resizeHandles: [],
        },
      };
    }),
  
  duplicateSelectedShapes: () =>
    set((state) => {
      const newShapes = new Map(state.shapes);
      const duplicatedIds: string[] = [];
      
      state.selectedShapeIds.forEach(id => {
        const shape = state.shapes.get(id);
        if (!shape) return;
        
        const duplicatedShape = {
          ...shape,
          id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          x: shape.x + 20, // Offset by 20px
          y: shape.y + 20,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          clientUpdatedAt: Date.now(),
        };
        
        newShapes.set(duplicatedShape.id, duplicatedShape);
        duplicatedIds.push(duplicatedShape.id);
      });
      
      return {
        shapes: newShapes,
        selectedShapeIds: duplicatedIds,
        selectedShapeId: duplicatedIds.length > 0 ? duplicatedIds[duplicatedIds.length - 1] : null,
      };
    }),
  
  moveSelectedShapes: (deltaX: number, deltaY: number) =>
    set((state) => {
      const newShapes = new Map(state.shapes);
      
      state.selectedShapeIds.forEach(id => {
        const shape = state.shapes.get(id);
        if (!shape) return;
        
        newShapes.set(id, {
          ...shape,
          x: shape.x + deltaX,
          y: shape.y + deltaY,
          updatedAt: Date.now(),
          clientUpdatedAt: Date.now(),
        });
      });
      
      return { shapes: newShapes };
    }),
  
  rotateSelectedShapes: (angle: number) =>
    set((state) => {
      const newShapes = new Map(state.shapes);
      
      state.selectedShapeIds.forEach(id => {
        const shape = state.shapes.get(id);
        if (!shape) return;
        
        const currentRotation = shape.rotation || 0;
        const newRotation = currentRotation + angle;
        
        newShapes.set(id, {
          ...shape,
          rotation: newRotation,
          updatedAt: Date.now(),
          clientUpdatedAt: Date.now(),
        });
      });
      
      return { shapes: newShapes };
    }),
  
  // Transform Controls
  transformControls: {
    isVisible: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    resizeHandles: [],
  },
  
  updateTransformControls: (controls: Partial<TransformControls>) =>
    set((state) => ({
      transformControls: { ...state.transformControls, ...controls },
    })),
  
  hideTransformControls: () =>
    set((state) => ({
      transformControls: { ...state.transformControls, isVisible: false },
    })),
  
  // Selection Box
  selectionBox: null,
  
  setSelectionBox: (box: SelectionBox | null) =>
    set(() => ({ selectionBox: box })),
  
  // Legacy single selection (for backward compatibility)
  selectedShapeId: null,
  
  selectShape: (id: string) =>
    set(() => ({
      selectedShapeId: id,
      selectedShapeIds: [id],
    })),
  
  deselectShape: () =>
    set(() => ({
      selectedShapeId: null,
      selectedShapeIds: [],
      transformControls: {
        isVisible: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        resizeHandles: [],
      },
    })),
  
  // Locks state
  locks: new Map<string, Lock>(),
  
  lockShape: (shapeId: string, userId: string, userName: string) =>
    set((state) => {
      const newLocks = new Map(state.locks);
      newLocks.set(shapeId, {
        userId,
        userName,
        lockedAt: Date.now(),
      });
      return { locks: newLocks };
    }),
  
  unlockShape: (shapeId: string) =>
    set((state) => {
      const newLocks = new Map(state.locks);
      newLocks.delete(shapeId);
      return { locks: newLocks };
    }),
  
  setLocks: (locks: Array<{ shapeId: string; lock: Lock }>) =>
    set(() => ({
      locks: new Map(locks.map(({ shapeId, lock }) => [shapeId, lock])),
    })),
  
  // Presence state
  users: new Map<string, Presence>(),
  
  updatePresence: (userId: string, data: Presence) =>
    set((state) => {
      const newUsers = new Map(state.users);
      newUsers.set(userId, data);
      return { users: newUsers };
    }),
  
  removeUser: (userId: string) =>
    set((state) => {
      const newUsers = new Map(state.users);
      newUsers.delete(userId);
      return { users: newUsers };
    }),
  
  setUsers: (users: Presence[]) =>
    set(() => ({
      users: new Map(users.map((user) => [user.userId, user])),
    })),
  
  // Current user state
  currentUser: null,
  
  setCurrentUser: (user: User | null) =>
    set(() => ({
      currentUser: user,
    })),
  
  // Offline state
  connectionState: {
    isOnline: navigator.onLine,
    isFirestoreOnline: true,
    isRTDBOnline: true,
    lastOnlineTime: null,
  },
  
  setConnectionState: (state: ConnectionState) =>
    set(() => ({
      connectionState: state,
    })),
  
  queuedUpdatesCount: 0,
  
  setQueuedUpdatesCount: (count: number) =>
    set(() => ({
      queuedUpdatesCount: count,
    })),
}));

if (typeof window !== 'undefined' && isHarnessEnabled()) {
  const storeApi = {
    getState: () => useCanvasStore.getState(),
  };

  (window as Window & { __canvasStore?: typeof storeApi }).__canvasStore = storeApi;
  registerHarnessApi('store', storeApi);
}
