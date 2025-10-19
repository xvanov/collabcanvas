import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
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
const layersCollection = collection(firestore, 'boards', BOARD_ID, 'layers');
const boardDoc = doc(firestore, 'boards', BOARD_ID);

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

export interface FirestoreShapeChange {
  type: 'added' | 'modified' | 'removed';
  shape: FirestoreShape;
}

/**
 * Layer data structure for Firestore
 */
export interface FirestoreLayer {
  id: string;
  name: string;
  shapes: string[];
  visible: boolean;
  locked: boolean;
  order: number;
  createdAt: FieldValue | number; // serverTimestamp or timestamp
  createdBy: string;
  updatedAt: FieldValue | number; // serverTimestamp or timestamp
  updatedBy: string;
  clientUpdatedAt: number;
}

export interface FirestoreLayerChange {
  type: 'added' | 'modified' | 'removed';
  layer: FirestoreLayer;
}

/**
 * Board state structure for Firestore
 */
export interface FirestoreBoardState {
  activeLayerId: string;
  updatedAt: FieldValue | number;
  updatedBy: string;
}

/**
 * Create a new shape in Firestore
 */
export const createShape = async (
  shapeId: string,
  shapeType: 'rect' | 'circle' | 'text' | 'line',
  x: number,
  y: number,
  userId: string,
  layerId?: string
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
    layerId: layerId,
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

  console.log('🔥 Saving shape to Firestore:', { shapeId, shapeData });
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
 * Delete a shape from Firestore
 */
export const deleteShape = async (
  shapeId: string
): Promise<void> => {
  const shapeRef = doc(shapesCollection, shapeId);
  await deleteDoc(shapeRef);
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

/**
 * Layer Management Functions
 */

/**
 * Create a new layer in Firestore
 */
export const createLayer = async (
  layerId: string,
  name: string,
  userId: string,
  order: number = 0
): Promise<void> => {
  const layerRef = doc(layersCollection, layerId);
  
  const layerData: Omit<FirestoreLayer, 'id'> = {
    name,
    shapes: [],
    visible: true,
    locked: false,
    order,
    createdAt: serverTimestamp(),
    createdBy: userId,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
    clientUpdatedAt: Date.now(),
  };

  await setDoc(layerRef, layerData);
};

/**
 * Update a layer in Firestore
 */
export const updateLayer = async (
  layerId: string,
  updates: Partial<Omit<FirestoreLayer, 'id' | 'createdAt' | 'createdBy'>>,
  userId: string
): Promise<void> => {
  const layerRef = doc(layersCollection, layerId);
  
  const updateData = {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
    clientUpdatedAt: Date.now(),
  };

  await updateDoc(layerRef, updateData);
};

/**
 * Delete a layer from Firestore
 */
export const deleteLayer = async (layerId: string): Promise<void> => {
  const layerRef = doc(layersCollection, layerId);
  await deleteDoc(layerRef);
};

/**
 * Subscribe to all layers in the board
 * Returns an unsubscribe function
 */
export const subscribeToLayers = (
  callback: (layers: FirestoreLayer[]) => void
): Unsubscribe => {
  const q = query(layersCollection);
  
  return onSnapshot(q, (snapshot) => {
    const layers: FirestoreLayer[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      layers.push({
        id: doc.id,
        ...data,
      } as FirestoreLayer);
    });
    
    callback(layers);
  });
};

/**
 * Subscribe to layers using incremental document changes
 * Emits only added/modified/removed items per snapshot to minimize churn
 */
export const subscribeToLayersChanges = (
  onChanges: (changes: FirestoreLayerChange[]) => void
): Unsubscribe => {
  const q = query(layersCollection);
  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const changes: FirestoreLayerChange[] = snapshot.docChanges().map((change) => {
      const data = change.doc.data() as DocumentData;
      const layer: FirestoreLayer = {
        id: change.doc.id,
        ...data,
      } as FirestoreLayer;
      return { type: change.type, layer };
    });
    if (changes.length > 0) onChanges(changes);
  });
};

/**
 * Initialize the board document if it doesn't exist
 */
export const initializeBoard = async (userId: string): Promise<void> => {
  try {
    const boardState: FirestoreBoardState = {
      activeLayerId: 'default-layer',
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    };
    
    await setDoc(boardDoc, boardState, { merge: true });
    console.log('🎯 Board document initialized in Firestore');
  } catch (error) {
    console.error('❌ Failed to initialize board:', error);
    throw error;
  }
};

/**
 * Update the active layer ID in Firestore
 */
export const updateActiveLayerId = async (
  activeLayerId: string,
  userId: string
): Promise<void> => {
  try {
    const boardState: FirestoreBoardState = {
      activeLayerId,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    };
    
    await setDoc(boardDoc, boardState, { merge: true });
    console.log('🎯 Updated active layer ID in Firestore:', activeLayerId);
  } catch (error) {
    console.error('❌ Failed to update active layer ID:', error);
    throw error;
  }
};

/**
 * Subscribe to board state changes (including activeLayerId)
 */
export const subscribeToBoardState = (
  onStateChange: (state: FirestoreBoardState | null) => void
): Unsubscribe => {
  return onSnapshot(boardDoc, (doc) => {
    if (doc.exists()) {
      const state = doc.data() as FirestoreBoardState;
      onStateChange(state);
    } else {
      onStateChange(null);
    }
  });
};
