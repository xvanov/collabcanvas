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
  // Layer management
  layerId?: string;
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

/**
 * Layer management types
 */
export interface Layer {
  id: string;
  name: string;
  shapes: string[];
  visible: boolean;
  locked: boolean;
  order: number;
}

/**
 * Alignment operation types
 */
export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-horizontal' | 'distribute-vertical';

/**
 * Alignment tools state
 */
export interface AlignmentTools {
  alignLeft: () => void;
  alignCenter: () => void;
  alignRight: () => void;
  alignTop: () => void;
  alignMiddle: () => void;
  alignBottom: () => void;
  distributeHorizontally: () => void;
  distributeVertically: () => void;
}

/**
 * Grid state
 */
export interface GridState {
  isVisible: boolean;
  isSnapEnabled: boolean;
  size: number;
  color: string;
  opacity: number;
}

/**
 * Snap indicators for visual feedback
 */
export interface SnapIndicator {
  type: 'horizontal' | 'vertical' | 'corner';
  x: number;
  y: number;
  length: number;
  visible: boolean;
}
