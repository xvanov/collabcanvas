/**
 * Zustand store for canvas state management
 * Manages shapes, selection, locks, and presence data
 */

import { create } from 'zustand';
import type { Shape, Lock, Presence, User } from '../types';
import type { ConnectionState } from '../services/offline';
import { isHarnessEnabled, registerHarnessApi } from '../utils/harness';

interface CanvasState {
  // Shapes
  shapes: Map<string, Shape>;
  createShape: (shape: Shape) => void;
  updateShapePosition: (id: string, x: number, y: number, updatedBy: string, clientUpdatedAt: number) => void;
  setShapes: (shapes: Shape[]) => void;
  setShapesFromMap: (shapes: Map<string, Shape>) => void;
  
  // Selection
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
  
  setShapes: (shapes: Shape[]) =>
    set(() => ({
      shapes: new Map(shapes.map((shape) => [shape.id, shape])),
    })),

  setShapesFromMap: (incomingShapes: Map<string, Shape>) =>
    set(() => ({
      shapes: incomingShapes,
    })),
  
  // Selection state
  selectedShapeId: null,
  
  selectShape: (id: string) =>
    set(() => ({
      selectedShapeId: id,
    })),
  
  deselectShape: () =>
    set(() => ({
      selectedShapeId: null,
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
