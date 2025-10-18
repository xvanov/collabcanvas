/**
 * Zustand store for canvas state management
 * Manages shapes, selection, locks, and presence data
 */

import { create } from 'zustand';
import type { Shape, Lock, Presence, User, SelectionBox, TransformControls, Layer, GridState, SnapIndicator } from '../types';
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
  
  // Layers Management
  layers: Layer[];
  activeLayerId: string;
  createLayer: (name: string, id?: string) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  deleteLayer: (layerId: string) => void;
  reorderLayers: (layerIds: string[]) => void;
  moveShapeToLayer: (shapeId: string, layerId: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  setActiveLayer: (layerId: string) => void;
  setLayers: (layers: Layer[]) => void;
  
  // Alignment Tools
  alignSelectedShapes: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeSelectedShapes: (direction: 'horizontal' | 'vertical') => void;
  
  // Grid and Snap
  gridState: GridState;
  snapIndicators: SnapIndicator[];
  toggleGrid: () => void;
  toggleSnap: () => void;
  updateGridSize: (size: number) => void;
  setSnapIndicators: (indicators: SnapIndicator[]) => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  // Shapes state
  shapes: new Map<string, Shape>(),
  
  createShape: (shape: Shape) =>
    set((state) => {
      const newShapes = new Map(state.shapes);
      
      console.log('🎨 Creating shape with activeLayerId:', state.activeLayerId);
      console.log('📋 Available layers:', state.layers.map(l => ({ id: l.id, name: l.name })));
      console.log('🔍 Current activeLayerId from store:', state.activeLayerId);
      
      // Ensure the active layer exists, if not create it
      let activeLayer = state.layers.find(layer => layer.id === state.activeLayerId);
      if (!activeLayer) {
        console.warn(`Active layer ${state.activeLayerId} not found, creating default layer`);
        activeLayer = {
          id: 'default-layer',
          name: 'Default Layer',
          shapes: [],
          visible: true,
          locked: false,
          order: 0,
        };
        // Add the default layer to the layers array
        state.layers = [activeLayer];
        // Update activeLayerId to ensure consistency
        state.activeLayerId = 'default-layer';
      }
      
      // Ensure we have a valid layerId
      const layerId = state.activeLayerId || 'default-layer';
      console.log('🎯 Assigning shape to layer:', layerId);
      
      // Assign shape to active layer
      const shapeWithLayer = { ...shape, layerId };
      newShapes.set(shape.id, shapeWithLayer);
      
      // Update the active layer's shapes array
      const updatedLayers = state.layers.map(layer => 
        layer.id === layerId 
          ? { ...layer, shapes: [...layer.shapes, shape.id] }
          : layer
      );
      
      console.log('✅ Shape created and assigned to layer:', layerId);
      
      return { 
        shapes: newShapes,
        layers: updatedLayers
      };
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
  
  // Layers Management
  layers: [],
  activeLayerId: 'default-layer',
  
  createLayer: (name: string, id?: string) =>
    set((state) => {
      const newLayer: Layer = {
        id: id || `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        shapes: [],
        visible: true,
        locked: false,
        order: state.layers.length,
      };
      
      console.log('🏗️ Creating new layer:', { id: newLayer.id, name: newLayer.name });
      console.log('🎯 Setting activeLayerId to:', newLayer.id);
      
      return {
        layers: [...state.layers, newLayer],
        activeLayerId: newLayer.id, // Make the new layer active
      };
    }),
  
  updateLayer: (layerId: string, updates: Partial<Layer>) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === layerId ? { ...layer, ...updates } : layer
      ),
    })),
  
  deleteLayer: (layerId: string) =>
    set((state) => {
      const layerToDelete = state.layers.find((layer) => layer.id === layerId);
      if (!layerToDelete) return state;
      
      // Move shapes to default layer
      const defaultLayer = state.layers.find((layer) => layer.id === 'default-layer');
      if (defaultLayer && layerToDelete.shapes.length > 0) {
        const newShapes = new Map(state.shapes);
        layerToDelete.shapes.forEach((shapeId) => {
          const shape = newShapes.get(shapeId);
          if (shape) {
            newShapes.set(shapeId, { ...shape, layerId: 'default-layer' });
          }
        });
        
        return {
          shapes: newShapes,
          layers: state.layers
            .filter((layer) => layer.id !== layerId)
            .map((layer) =>
              layer.id === 'default-layer'
                ? { ...layer, shapes: [...layer.shapes, ...layerToDelete.shapes] }
                : layer
            ),
        };
      }
      
      return {
        layers: state.layers.filter((layer) => layer.id !== layerId),
      };
    }),
  
  reorderLayers: (layerIds: string[]) =>
    set((state) => ({
      layers: layerIds.map((id, index) => {
        const layer = state.layers.find((l) => l.id === id);
        return layer ? { ...layer, order: index } : layer;
      }).filter(Boolean) as Layer[],
    })),
  
  moveShapeToLayer: (shapeId: string, layerId: string) =>
    set((state) => {
      const newShapes = new Map(state.shapes);
      const shape = newShapes.get(shapeId);
      if (!shape) return state;
      
      newShapes.set(shapeId, { ...shape, layerId });
      
      const newLayers = state.layers.map((layer) => ({
        ...layer,
        shapes: layer.shapes.filter((id) => id !== shapeId),
      }));
      
      const targetLayer = newLayers.find((layer) => layer.id === layerId);
      if (targetLayer) {
        targetLayer.shapes.push(shapeId);
      }
      
      return {
        shapes: newShapes,
        layers: newLayers,
      };
    }),
  
  toggleLayerVisibility: (layerId: string) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      ),
    })),
  
  setActiveLayer: (layerId: string) =>
    set((state) => {
      console.log(`🎯 Setting active layer to: ${layerId} (from ${state.activeLayerId})`);
      
      // Update Firestore asynchronously (don't await to avoid blocking UI)
      if (state.currentUser) {
        import('../services/firestore').then(({ updateActiveLayerId }) => {
          updateActiveLayerId(layerId, state.currentUser!.uid).catch((error) => {
            console.error('❌ Failed to update activeLayerId in Firestore:', error);
          });
        });
      }
      
      return { activeLayerId: layerId };
    }),
  
  toggleLayerLock: (layerId: string) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === layerId ? { ...layer, locked: !layer.locked } : layer
      ),
    })),
  
  setLayers: (layers: Layer[]) =>
    set(() => ({
      layers: layers,
    })),
  
  // Alignment Tools
  alignSelectedShapes: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') =>
    set((state) => {
      if (state.selectedShapeIds.length < 2) return state;
      
      const selectedShapes = state.selectedShapeIds
        .map((id) => state.shapes.get(id))
        .filter(Boolean) as Shape[];
      
      if (selectedShapes.length < 2) return state;
      
      const newShapes = new Map(state.shapes);
      
      // Helper function to get shape center
      const getShapeCenter = (shape: Shape) => {
        if (shape.type === 'circle') {
          return {
            x: shape.x + (shape.radius || shape.w / 2),
            y: shape.y + (shape.radius || shape.h / 2)
          };
        }
        return {
          x: shape.x + shape.w / 2,
          y: shape.y + shape.h / 2
        };
      };
      
      // Helper function to get shape bounds
      const getShapeBounds = (shape: Shape) => {
        if (shape.type === 'circle') {
          const radius = shape.radius || shape.w / 2;
          return {
            left: shape.x,
            right: shape.x + radius * 2,
            top: shape.y,
            bottom: shape.y + radius * 2,
            centerX: shape.x + radius,
            centerY: shape.y + radius
          };
        }
        return {
          left: shape.x,
          right: shape.x + shape.w,
          top: shape.y,
          bottom: shape.y + shape.h,
          centerX: shape.x + shape.w / 2,
          centerY: shape.y + shape.h / 2
        };
      };
      
      // Calculate alignment values
      let alignValue: number;
      switch (alignment) {
        case 'left':
          alignValue = Math.min(...selectedShapes.map((s) => getShapeBounds(s).left));
          selectedShapes.forEach((shape) => {
            const bounds = getShapeBounds(shape);
            const offset = alignValue - bounds.left;
            newShapes.set(shape.id, { ...shape, x: shape.x + offset });
          });
          break;
        case 'right':
          alignValue = Math.max(...selectedShapes.map((s) => getShapeBounds(s).right));
          selectedShapes.forEach((shape) => {
            const bounds = getShapeBounds(shape);
            const offset = alignValue - bounds.right;
            newShapes.set(shape.id, { ...shape, x: shape.x + offset });
          });
          break;
        case 'center': {
          const centers = selectedShapes.map(s => getShapeCenter(s));
          const minX = Math.min(...centers.map(c => c.x));
          const maxX = Math.max(...centers.map(c => c.x));
          alignValue = (minX + maxX) / 2;
          selectedShapes.forEach((shape) => {
            const center = getShapeCenter(shape);
            const offset = alignValue - center.x;
            newShapes.set(shape.id, { ...shape, x: shape.x + offset });
          });
          break;
        }
        case 'top':
          alignValue = Math.min(...selectedShapes.map((s) => getShapeBounds(s).top));
          selectedShapes.forEach((shape) => {
            const bounds = getShapeBounds(shape);
            const offset = alignValue - bounds.top;
            newShapes.set(shape.id, { ...shape, y: shape.y + offset });
          });
          break;
        case 'bottom':
          alignValue = Math.max(...selectedShapes.map((s) => getShapeBounds(s).bottom));
          selectedShapes.forEach((shape) => {
            const bounds = getShapeBounds(shape);
            const offset = alignValue - bounds.bottom;
            newShapes.set(shape.id, { ...shape, y: shape.y + offset });
          });
          break;
        case 'middle': {
          const centers = selectedShapes.map(s => getShapeCenter(s));
          const minY = Math.min(...centers.map(c => c.y));
          const maxY = Math.max(...centers.map(c => c.y));
          alignValue = (minY + maxY) / 2;
          selectedShapes.forEach((shape) => {
            const center = getShapeCenter(shape);
            const offset = alignValue - center.y;
            newShapes.set(shape.id, { ...shape, y: shape.y + offset });
          });
          break;
        }
      }
      
      return { shapes: newShapes };
    }),
  
  distributeSelectedShapes: (direction: 'horizontal' | 'vertical') =>
    set((state) => {
      if (state.selectedShapeIds.length < 3) return state;
      
      const selectedShapes = state.selectedShapeIds
        .map((id) => state.shapes.get(id))
        .filter(Boolean) as Shape[];
      
      if (selectedShapes.length < 3) return state;
      
      const newShapes = new Map(state.shapes);
      
      if (direction === 'horizontal') {
        // Sort by x position
        const sortedShapes = [...selectedShapes].sort((a, b) => a.x - b.x);
        const totalWidth = sortedShapes[sortedShapes.length - 1].x - sortedShapes[0].x;
        const spacing = totalWidth / (sortedShapes.length - 1);
        
        sortedShapes.forEach((shape, index) => {
          if (index > 0 && index < sortedShapes.length - 1) {
            newShapes.set(shape.id, { ...shape, x: sortedShapes[0].x + spacing * index });
          }
        });
      } else {
        // Sort by y position
        const sortedShapes = [...selectedShapes].sort((a, b) => a.y - b.y);
        const totalHeight = sortedShapes[sortedShapes.length - 1].y - sortedShapes[0].y;
        const spacing = totalHeight / (sortedShapes.length - 1);
        
        sortedShapes.forEach((shape, index) => {
          if (index > 0 && index < sortedShapes.length - 1) {
            newShapes.set(shape.id, { ...shape, y: sortedShapes[0].y + spacing * index });
          }
        });
      }
      
      return { shapes: newShapes };
    }),
  
  // Grid and Snap
  gridState: {
    isVisible: false,
    isSnapEnabled: false,
    size: 20,
    color: '#E5E7EB',
    opacity: 0.5,
  },
  
  snapIndicators: [],
  
  toggleGrid: () =>
    set((state) => ({
      gridState: { ...state.gridState, isVisible: !state.gridState.isVisible },
    })),
  
  toggleSnap: () =>
    set((state) => ({
      gridState: { ...state.gridState, isSnapEnabled: !state.gridState.isSnapEnabled },
    })),
  
  updateGridSize: (size: number) =>
    set((state) => ({
      gridState: { ...state.gridState, size },
    })),
  
  setSnapIndicators: (indicators: SnapIndicator[]) =>
    set(() => ({ snapIndicators: indicators })),
}));

if (typeof window !== 'undefined' && isHarnessEnabled()) {
  const storeApi = {
    getState: () => useCanvasStore.getState(),
  };

  (window as Window & { __canvasStore?: typeof storeApi }).__canvasStore = storeApi;
  registerHarnessApi('store', storeApi);
}
