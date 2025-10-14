import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  query,
  Unsubscribe,
  DocumentData,
} from 'firebase/firestore';
import { firestore } from './firebase';

// Collection reference for the global board
const BOARD_ID = 'global';
const shapesCollection = collection(firestore, 'boards', BOARD_ID, 'shapes');

/**
 * Shape data structure for Firestore
 */
export interface FirestoreShape {
  id: string;
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  createdAt: any; // serverTimestamp
  createdBy: string;
  updatedAt: any; // serverTimestamp
  updatedBy: string;
}

/**
 * Create a new shape in Firestore
 */
export const createShape = async (
  shapeId: string,
  x: number,
  y: number,
  userId: string
): Promise<void> => {
  const shapeRef = doc(shapesCollection, shapeId);
  
  const shapeData: Omit<FirestoreShape, 'id'> = {
    type: 'rect',
    x,
    y,
    w: 100, // Fixed width
    h: 100, // Fixed height
    color: '#3B82F6', // Fixed blue color
    createdAt: serverTimestamp(),
    createdBy: userId,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  };

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
  userId: string
): Promise<void> => {
  const shapeRef = doc(shapesCollection, shapeId);
  
  await updateDoc(shapeRef, {
    x,
    y,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
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

