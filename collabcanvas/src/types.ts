/**
 * Shared TypeScript types for CollabCanvas
 */

/**
 * Shape types
 */
export interface Shape {
  id: string;
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  createdAt: number | null;
  createdBy: string;
  updatedAt: number | null;
  updatedBy: string;
}

/**
 * User data
 */
export interface User {
  uid: string;
  name: string;
  email: string | null;
  photoURL: string | null;
}

/**
 * Presence data (ephemeral, from RTDB)
 */
export interface Presence {
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

/**
 * Lock data (ephemeral, from RTDB)
 */
export interface Lock {
  userId: string;
  userName: string;
  lockedAt: number;
}

/**
 * Canvas viewport state
 */
export interface ViewportState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

