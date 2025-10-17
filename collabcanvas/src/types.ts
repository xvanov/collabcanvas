/**
 * Shared TypeScript types for CollabCanvas
 */

/**
 * Shape types
 */
export type ShapeType = 'rect' | 'circle' | 'text' | 'line';

export interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  createdAt: number | null;
  createdBy: string;
  updatedAt: number | null;
  updatedBy: string;
  clientUpdatedAt: number | null;
  // Optional properties for different shape types
  text?: string;
  fontSize?: number;
  strokeWidth?: number;
  radius?: number;
  points?: number[];
  // Transform properties
  rotation?: number;
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

/**
 * Selection box for drag selection
 */
export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Transform operation types
 */
export type TransformOperation = 'move' | 'resize' | 'rotate';

/**
 * Resize handle positions
 */
export type ResizeHandle = 
  | 'nw' | 'n' | 'ne'
  | 'w' | 'e'
  | 'sw' | 's' | 'se';

/**
 * Transform controls state
 */
export interface TransformControls {
  isVisible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  resizeHandles: ResizeHandle[];
}
