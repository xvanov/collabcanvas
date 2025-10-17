import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  query,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import type { Unsubscribe, FieldValue } from 'firebase/firestore';
import { firestore } from './firebase';

// Collection reference for the global board
const BOARD_ID = 'global';
const shapesCollection = collection(firestore, 'boards', BOARD_ID, 'shapes');

/**
* Shape data structure for Firestore
*/
export interface FirestoreShape {
  id: string;
  type: 'rect' | 'circle' | 'text' | 'line';
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  createdAt: FieldValue | number; // serverTimestamp or timestamp
  createdBy: string;
  updatedAt: FieldValue | number; // serverTimestamp or timestamp
  updatedBy: string;
  clientUpdatedAt: number;
  // Optional properties for different shape types
  text?: string;
  fontSize?: number;
  strokeWidth?: number;
  radius?: number;
  points?: number[];
}

export interface FirestoreShapeChange {
  type: 'added' | 'modified' | 'removed';
  shape: FirestoreShape;
}

/**
 * Create a new shape in Firestore
 */
export const createShape = async (
  shapeId: string,
  shapeType: 'rect' | 'circle' | 'text' | 'line',
  x: number,
  y: number,
  userId: string
): Promise<void> => {
  const shapeRef = doc(shapesCollection, shapeId);
  
  const baseShapeData = {
    type: shapeType,
    x,
    y,
    w: 100,
    h: 100,
    color: '#3B82F6',
    createdAt: serverTimestamp(),
    createdBy: userId,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
    clientUpdatedAt: Date.now(),
  };

  // Add type-specific properties
  let shapeData: Omit<FirestoreShape, 'id'>;
  switch (shapeType) {
    case 'circle':
      shapeData = {
        ...baseShapeData,
        radius: 50,
      };
      break;
    case 'text':
      shapeData = {
        ...baseShapeData,
        text: '',
        fontSize: 16,
        w: 200,
        h: 50,
      };
      break;
    case 'line':
      shapeData = {
        ...baseShapeData,
        strokeWidth: 2,
        points: [0, 0, 100, 0],
        h: 0,
      };
      break;
    default: // rect
      shapeData = baseShapeData;
      break;
  }

  await setDoc(shapeRef, shapeData);
};

/**
 * Update shape position in Firestore
 * Only updates x, y coordinates and metadata
 */
export const updateShapePosition = async (
  shapeId: string,
  x: number,
  y: number,
  userId: string,
  clientTimestamp: number
): Promise<void> => {
  const shapeRef = doc(shapesCollection, shapeId);
  
  await updateDoc(shapeRef, {
    x,
    y,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
    clientUpdatedAt: clientTimestamp,
  });
};

/**
 * Update shape properties in Firestore
 * Updates any property of a shape (color, size, text, etc.)
 */
export const updateShapeProperty = async (
  shapeId: string,
  property: keyof FirestoreShape,
  value: unknown,
  userId: string,
  clientTimestamp: number
): Promise<void> => {
  const shapeRef = doc(shapesCollection, shapeId);
  
  await updateDoc(shapeRef, {
    [property]: value,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
    clientUpdatedAt: clientTimestamp,
  });
};

/**
 * Subscribe to all shapes in the board
 * Returns an unsubscribe function
 */
export const subscribeToShapes = (
  callback: (shapes: FirestoreShape[]) => void
): Unsubscribe => {
  const q = query(shapesCollection);
  
  return onSnapshot(q, (snapshot) => {
    const shapes: FirestoreShape[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      shapes.push({
        id: doc.id,
        ...data,
      } as FirestoreShape);
    });
    
    callback(shapes);
  });
};

/**
 * Subscribe to shapes using incremental document changes
 * Emits only added/modified/removed items per snapshot to minimize churn
 */
export const subscribeToShapesChanges = (
  onChanges: (changes: FirestoreShapeChange[]) => void
): Unsubscribe => {
  const q = query(shapesCollection);
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const changes: FirestoreShapeChange[] = snapshot.docChanges().map((change) => {
      const data = change.doc.data() as DocumentData;
      const shape: FirestoreShape = {
        ...(data as FirestoreShape),
        id: change.doc.id,
      };
      return { type: change.type, shape };
    });
    if (changes.length > 0) onChanges(changes);
  });
};
