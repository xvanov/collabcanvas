/**
 * Zustand store for canvas state management
 * Manages shapes, selection, locks, and presence data
 */

import { create } from 'zustand';
import type { Shape, Lock, Presence, User, SelectionBox, TransformControls, HistoryState, CanvasAction, CreateActionData, UpdateActionData, MoveActionData, BulkDuplicateActionData, BulkMoveActionData, BulkRotateActionData } from '../types';
import type { ConnectionState } from '../services/offline';
import { isHarnessEnabled, registerHarnessApi } from '../utils/harness';
import { createHistoryService, createAction, type HistoryService } from '../services/historyService';
import { deleteShape as deleteShapeInFirestore, createShape as createShapeInFirestore } from '../services/firestore';

interface CanvasState {
  // Shapes
  shapes: Map<string, Shape>;
  createShape: (shape: Shape) => void;
  updateShapePosition: (id: string, x: number, y: number, updatedBy: string, clientUpdatedAt: number) => void;
  updateShapeProperty: (id: string, property: keyof Shape, value: unknown, updatedBy: string, clientUpdatedAt: number) => void;
  setShapes: (shapes: Shape[]) => void;
  setShapesFromMap: (shapes: Map<string, Shape>) => void;
  
  // History (Undo/Redo)
  history: HistoryState;
  historyService: HistoryService; // HistoryService instance
  pushAction: (action: CanvasAction) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  
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

export const useCanvasStore = create<CanvasState>((set, get) => {
  // Initialize history service
  const historyService = createHistoryService(50);
  
  // Set up history service callback
  historyService.setOnActionApplied(async (action: CanvasAction) => {
    const state = get();
    const currentUser = state.currentUser;
    
    if (!currentUser) return;
    
    // Apply the action to the store
    switch (action.type) {
      case 'CREATE':
        if (action.shapeId && action.data) {
          const newShapes = new Map(state.shapes);
          // Handle both direct shape data and wrapped shape data
          const shapeData = action.data as CreateActionData | Shape;
          const shape = 'shape' in shapeData ? shapeData.shape : shapeData;
          
          // Mark this shape as created by undo/redo to prevent Firestore conflicts
          const shapeWithUndoFlag = {
            ...shape,
            _isUndoRedoAction: true,
            updatedAt: Date.now(),
            updatedBy: currentUser.uid,
            clientUpdatedAt: Date.now(),
          };
          newShapes.set(action.shapeId, shapeWithUndoFlag);
          set({ shapes: newShapes });
          
          // Also sync the restored shape to Firestore so other clients know about it
          try {
            await createShapeInFirestore(shape.id, shape.type, shape.x, shape.y, currentUser.uid);
            console.log(`✅ Synced restored shape ${action.shapeId} to Firestore`);
          } catch (error) {
            console.error(`❌ Failed to sync restored shape ${action.shapeId} to Firestore:`, error);
          }
        }
        break;
        
      case 'DELETE':
        if (action.shapeId) {
          const newShapes = new Map(state.shapes);
          newShapes.delete(action.shapeId);
          set({ shapes: newShapes });
        }
        break;
        
      case 'UPDATE':
        if (action.shapeId && action.data) {
          const shape = state.shapes.get(action.shapeId);
          if (shape) {
            const newShapes = new Map(state.shapes);
            const updateData = action.data as UpdateActionData;
            newShapes.set(action.shapeId, {
              ...shape,
              [updateData.property]: updateData.newValue,
              updatedAt: Date.now(),
              updatedBy: currentUser.uid,
              clientUpdatedAt: Date.now(),
            });
            set({ shapes: newShapes });
          }
        }
        break;
        
      case 'MOVE':
        if (action.shapeId && action.data) {
          const shape = state.shapes.get(action.shapeId);
          if (shape) {
            const newShapes = new Map(state.shapes);
            const moveData = action.data as MoveActionData;
            newShapes.set(action.shapeId, {
              ...shape,
              x: moveData.x,
              y: moveData.y,
              updatedAt: Date.now(),
              updatedBy: currentUser.uid,
              clientUpdatedAt: Date.now(),
            });
            set({ shapes: newShapes });
          }
        }
        break;
        
      case 'BULK_DELETE':
        if (action.shapeIds) {
          const newShapes = new Map(state.shapes);
          action.shapeIds.forEach(id => newShapes.delete(id));
          set({ 
            shapes: newShapes,
            selectedShapeIds: [],
            selectedShapeId: null,
          });
        }
        break;
        
      case 'BULK_DUPLICATE':
        if (action.shapeIds && action.data) {
          const newShapes = new Map(state.shapes);
          const duplicatedIds: string[] = [];
          // Handle both direct shape array and wrapped shape data
          const duplicateData = action.data as BulkDuplicateActionData | Shape[];
          const shapes = 'duplicatedShapes' in duplicateData ? duplicateData.duplicatedShapes : duplicateData;
          
          shapes.forEach((shape: Shape) => {
            const duplicatedShape = {
              ...shape,
              id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              x: shape.x + 20,
              y: shape.y + 20,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              clientUpdatedAt: Date.now(),
            };
            newShapes.set(duplicatedShape.id, duplicatedShape);
            duplicatedIds.push(duplicatedShape.id);
          });
          
          set({
            shapes: newShapes,
            selectedShapeIds: duplicatedIds,
            selectedShapeId: duplicatedIds.length > 0 ? duplicatedIds[duplicatedIds.length - 1] : null,
          });
        }
        break;
        
      case 'BULK_MOVE':
        if (action.shapeIds && action.data) {
          const newShapes = new Map(state.shapes);
          const moveData = action.data as BulkMoveActionData;
          action.shapeIds.forEach(id => {
            const shape = state.shapes.get(id);
            if (shape) {
              newShapes.set(id, {
                ...shape,
                x: shape.x + moveData.deltaX,
                y: shape.y + moveData.deltaY,
                updatedAt: Date.now(),
                updatedBy: currentUser.uid,
                clientUpdatedAt: Date.now(),
              });
            }
          });
          set({ shapes: newShapes });
        }
        break;
        
      case 'BULK_ROTATE':
        if (action.shapeIds && action.data) {
          const newShapes = new Map(state.shapes);
          const rotateData = action.data as BulkRotateActionData;
          action.shapeIds.forEach(id => {
            const shape = state.shapes.get(id);
            if (shape) {
              const currentRotation = shape.rotation || 0;
              newShapes.set(id, {
                ...shape,
                rotation: currentRotation + rotateData.angle,
                updatedAt: Date.now(),
                updatedBy: currentUser.uid,
                clientUpdatedAt: Date.now(),
              });
            }
          });
          set({ shapes: newShapes });
        }
        break;
    }
  });

  return {
  // Shapes state
  shapes: new Map<string, Shape>(),
    
    // History state
    history: {
      past: [],
      present: null,
      future: [],
      maxHistorySize: 50,
    },
    historyService,
    
    pushAction: (action: CanvasAction) => {
      historyService.pushAction(action);
      set(() => ({
        history: historyService.getHistoryState(),
      }));
    },
    
    undo: () => {
      const undoneAction = historyService.undo();
      if (undoneAction) {
        set(() => ({
          history: historyService.getHistoryState(),
        }));
      }
    },
    
    redo: () => {
      const redoneAction = historyService.redo();
      if (redoneAction) {
        set(() => ({
          history: historyService.getHistoryState(),
        }));
      }
    },
    
    canUndo: () => historyService.canUndo(),
    canRedo: () => historyService.canRedo(),
    
    clearHistory: () => {
      historyService.clearHistory();
      set(() => ({
        history: historyService.getHistoryState(),
      }));
    },
  
  createShape: (shape: Shape) =>
    set((state) => {
      const newShapes = new Map(state.shapes);
      newShapes.set(shape.id, shape);
        
        // Push create action to history
        if (state.currentUser) {
          const action = createAction.create(shape.id, shape, state.currentUser.uid);
          historyService.pushAction(action);
        }
        
        return { 
          shapes: newShapes,
          history: historyService.getHistoryState(),
        };
    }),

  updateShapePosition: (id: string, x: number, y: number, updatedBy: string, clientUpdatedAt: number) =>
    set((state) => {
      const shape = state.shapes.get(id);
      if (!shape) return state;
      
      // Store previous position for undo
      const previousX = shape.x;
      const previousY = shape.y;
      
      const newShapes = new Map(state.shapes);
      newShapes.set(id, {
        ...shape,
        x,
        y,
        updatedAt: Date.now(),
        updatedBy,
        clientUpdatedAt,
      });
      
      // Push move action to history
      if (state.currentUser && (x !== previousX || y !== previousY)) {
        const action = createAction.move(id, x, y, previousX, previousY, state.currentUser.uid);
        historyService.pushAction(action);
      }
      
      return { 
        shapes: newShapes,
        history: historyService.getHistoryState(),
      };
    }),

  updateShapeProperty: (id: string, property: keyof Shape, value: unknown, updatedBy: string, clientUpdatedAt: number) =>
    set((state) => {
      const shape = state.shapes.get(id);
      if (!shape) return state;
      
      // Store previous value for undo
      const previousValue = shape[property];
      
      const newShapes = new Map(state.shapes);
      newShapes.set(id, {
        ...shape,
        [property]: value,
        updatedAt: Date.now(),
        updatedBy,
        clientUpdatedAt,
      });
      
      // Push update action to history
      if (state.currentUser && value !== previousValue) {
        const action = createAction.update(id, property, value, previousValue, state.currentUser.uid);
        historyService.pushAction(action);
      }
      
      return { 
        shapes: newShapes,
        history: historyService.getHistoryState(),
      };
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
      const deletedShapes: Shape[] = [];
      state.selectedShapeIds.forEach(id => {
        const shape = state.shapes.get(id);
        if (shape) {
          deletedShapes.push(shape);
        }
      });
      
      const newShapes = new Map(state.shapes);
      state.selectedShapeIds.forEach(id => {
        newShapes.delete(id);
      });
      
      // Push bulk delete action to history
      if (state.currentUser && deletedShapes.length > 0) {
        const action = createAction.bulkDelete(state.selectedShapeIds, deletedShapes, state.currentUser.uid);
        historyService.pushAction(action);
        
        // Also delete from Firestore to ensure sync
        state.selectedShapeIds.forEach(async (shapeId) => {
          try {
            await deleteShapeInFirestore(shapeId);
            console.log(`✅ Deleted shape ${shapeId} from Firestore`);
          } catch (error) {
            console.error(`❌ Failed to delete shape ${shapeId} from Firestore:`, error);
          }
        });
      }
      
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
        history: historyService.getHistoryState(),
      };
    }),
  
  duplicateSelectedShapes: () =>
    set((state) => {
      const newShapes = new Map(state.shapes);
      const duplicatedIds: string[] = [];
      const duplicatedShapes: Shape[] = [];
      
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
        duplicatedShapes.push(duplicatedShape);
      });
      
      // Push bulk duplicate action to history
      if (state.currentUser && duplicatedShapes.length > 0) {
        const action = createAction.bulkDuplicate(state.selectedShapeIds, duplicatedShapes, state.currentUser.uid);
        historyService.pushAction(action);
      }
      
      return {
        shapes: newShapes,
        selectedShapeIds: duplicatedIds,
        selectedShapeId: duplicatedIds.length > 0 ? duplicatedIds[duplicatedIds.length - 1] : null,
        history: historyService.getHistoryState(),
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
      
      // Push bulk move action to history
      if (state.currentUser && state.selectedShapeIds.length > 0) {
        const action = createAction.bulkMove(state.selectedShapeIds, deltaX, deltaY, state.currentUser.uid);
        historyService.pushAction(action);
      }
      
      return { 
        shapes: newShapes,
        history: historyService.getHistoryState(),
      };
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
      
      // Push bulk rotate action to history
      if (state.currentUser && state.selectedShapeIds.length > 0) {
        const action = createAction.bulkRotate(state.selectedShapeIds, angle, state.currentUser.uid);
        historyService.pushAction(action);
      }
      
      return { 
        shapes: newShapes,
        history: historyService.getHistoryState(),
      };
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
  };
});

if (typeof window !== 'undefined' && isHarnessEnabled()) {
  const storeApi = {
    getState: () => useCanvasStore.getState(),
  };

  (window as Window & { __canvasStore?: typeof storeApi }).__canvasStore = storeApi;
  registerHarnessApi('store', storeApi);
}
