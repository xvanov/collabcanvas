import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  deleteField,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import type { Unsubscribe, FieldValue } from 'firebase/firestore';
import { firestore } from './firebase';
import type { ShapeType, Shape } from '../types';

// Helper functions to get project-scoped collection references
function getShapesCollection(projectId: string) {
  return collection(firestore, 'projects', projectId, 'shapes');
}

function getLayersCollection(projectId: string) {
  return collection(firestore, 'projects', projectId, 'layers');
}

export function getBoardDoc(projectId: string) {
  return doc(firestore, 'projects', projectId, 'board', 'data');
}

/**
* Shape data structure for Firestore
*/
export interface FirestoreShape {
  id: string;
  type: ShapeType;
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
  // Bounding box properties
  itemType?: string; // For manual bounding boxes (e.g., "window", "door", "stove")
  confidence?: number; // For AI-generated bounding boxes (0.0-1.0)
  isAIGenerated?: boolean; // Flag to indicate AI-generated bounding box
  source?: 'ai' | 'manual'; // Source of the bounding box annotation
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
  color?: string;
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
  // Construction annotation tool data
  backgroundImage?: {
    url: string;
    width: number;
    height: number;
    uploadedAt: FieldValue | number;
    uploadedBy: string;
  };
  scaleLine?: {
    id: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    realWorldLength: number;
    unit: string;
    isVisible: boolean;
    createdAt: FieldValue | number;
    createdBy: string;
    updatedAt: FieldValue | number;
    updatedBy: string;
  };
}

/**
 * Create a new shape in Firestore
 */
export const createShape = async (
  projectId: string,
  shapeId: string,
  shapeType: ShapeType,
  x: number,
  y: number,
  userId: string,
  layerId?: string,
  additionalProps?: Partial<Shape>
): Promise<void> => {
  const shapeRef = doc(getShapesCollection(projectId), shapeId);
  
  const baseShapeData = {
    type: shapeType,
    x,
    y,
    w: additionalProps?.w ?? 100,
    h: additionalProps?.h ?? 100,
    color: additionalProps?.color ?? '#3B82F6',
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
        radius: additionalProps?.radius ?? 50,
      };
      break;
    case 'text':
      shapeData = {
        ...baseShapeData,
        text: additionalProps?.text ?? '',
        fontSize: additionalProps?.fontSize ?? 16,
        w: additionalProps?.w ?? 200,
        h: additionalProps?.h ?? 50,
      };
      break;
    case 'line':
      shapeData = {
        ...baseShapeData,
        strokeWidth: additionalProps?.strokeWidth ?? 2,
        points: additionalProps?.points ?? [0, 0, 100, 0],
        h: additionalProps?.h ?? 0,
      };
      break;
    case 'polyline':
      shapeData = {
        ...baseShapeData,
        strokeWidth: additionalProps?.strokeWidth ?? 2,
        points: additionalProps?.points ?? [0, 0, 100, 0],
      };
      break;
    case 'polygon':
      shapeData = {
        ...baseShapeData,
        strokeWidth: additionalProps?.strokeWidth ?? 2,
        points: additionalProps?.points ?? [0, 0, 100, 0, 50, 100],
      };
      break;
    case 'boundingbox':
      shapeData = {
        ...baseShapeData,
        itemType: additionalProps?.itemType || '',
        // Only include confidence if it's defined (for AI-generated boxes)
        ...(additionalProps?.confidence !== undefined ? { confidence: additionalProps.confidence } : {}),
        isAIGenerated: additionalProps?.isAIGenerated ?? false,
        source: additionalProps?.source ?? 'manual',
        strokeWidth: additionalProps?.strokeWidth ?? 2,
      };
      break;
    default: // rect
      shapeData = baseShapeData;
      break;
  }

  console.log('🔥 Saving shape to Firestore:', { shapeId, shapeType, shapeData });
  console.log('📋 Shape data details:', {
    type: shapeData.type,
    hasPoints: 'points' in shapeData,
    points: shapeData.points,
    pointsType: typeof shapeData.points,
    isArray: Array.isArray(shapeData.points),
    strokeWidth: 'strokeWidth' in shapeData ? shapeData.strokeWidth : 'missing',
    x: shapeData.x,
    y: shapeData.y,
    w: shapeData.w,
    h: shapeData.h,
    createdAt: shapeData.createdAt,
    updatedAt: shapeData.updatedAt,
  });
  await setDoc(shapeRef, shapeData);
};

/**
 * Update shape position in Firestore
 * Only updates x, y coordinates and metadata
 */
export const updateShapePosition = async (
  projectId: string,
  shapeId: string,
  x: number,
  y: number,
  userId: string,
  clientTimestamp: number
): Promise<void> => {
  const shapeRef = doc(getShapesCollection(projectId), shapeId);
  
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
  projectId: string,
  shapeId: string,
  property: keyof FirestoreShape,
  value: unknown,
  userId: string,
  clientTimestamp: number
): Promise<void> => {
  const shapeRef = doc(getShapesCollection(projectId), shapeId);
  
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
  projectId: string,
  shapeId: string
): Promise<void> => {
  const shapeRef = doc(getShapesCollection(projectId), shapeId);
  await deleteDoc(shapeRef);
};

/**
 * Subscribe to all shapes in the project
 * Returns an unsubscribe function
 */
export const subscribeToShapes = (
  projectId: string,
  callback: (shapes: FirestoreShape[]) => void
): Unsubscribe => {
  const q = query(getShapesCollection(projectId));
  
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
  projectId: string,
  onChanges: (changes: FirestoreShapeChange[]) => void
): Unsubscribe => {
  const q = query(getShapesCollection(projectId));
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
  projectId: string,
  layerId: string,
  name: string,
  userId: string,
  order: number = 0
): Promise<void> => {
  const layerRef = doc(getLayersCollection(projectId), layerId);
  
  const layerData: Omit<FirestoreLayer, 'id'> = {
    name,
    shapes: [],
    visible: true,
    locked: false,
    order,
    color: '#3B82F6',
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
  projectId: string,
  layerId: string,
  updates: Partial<Omit<FirestoreLayer, 'id' | 'createdAt' | 'createdBy'>>,
  userId: string
): Promise<void> => {
  const layerRef = doc(getLayersCollection(projectId), layerId);
  
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
export const deleteLayer = async (projectId: string, layerId: string): Promise<void> => {
  const layerRef = doc(getLayersCollection(projectId), layerId);
  await deleteDoc(layerRef);
};

/**
 * Subscribe to all layers in the project
 * Returns an unsubscribe function
 */
export const subscribeToLayers = (
  projectId: string,
  callback: (layers: FirestoreLayer[]) => void
): Unsubscribe => {
  const q = query(getLayersCollection(projectId));
  
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
  projectId: string,
  onChanges: (changes: FirestoreLayerChange[]) => void
): Unsubscribe => {
  const q = query(getLayersCollection(projectId));
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
 * This function is idempotent and will never overwrite existing data
 */
export const initializeBoard = async (projectId: string, userId: string): Promise<void> => {
  try {
    const boardDocRef = getBoardDoc(projectId);
    
    // Check if document already exists
    const docSnapshot = await getDoc(boardDocRef);
    
    if (docSnapshot.exists()) {
      // Document exists, only update activeLayerId if it's missing
      // Never overwrite scaleLine, backgroundImage, or other fields
      const existingData = docSnapshot.data() as FirestoreBoardState;
      if (!existingData.activeLayerId) {
        await updateDoc(boardDocRef, {
          activeLayerId: 'default-layer',
          updatedAt: serverTimestamp(),
          updatedBy: userId,
        });
        console.log('🎯 Board document updated with activeLayerId (preserving existing data)');
      } else {
        console.log('🎯 Board document already exists with all required fields, skipping initialization');
      }
    } else {
      // Document doesn't exist, create it with minimal required fields
      const boardState: FirestoreBoardState = {
        activeLayerId: 'default-layer',
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      };
      
      await setDoc(boardDocRef, boardState, { merge: true });
      console.log('🎯 Board document initialized in Firestore (new document)');
    }
  } catch (error) {
    console.error('❌ Failed to initialize board:', error);
    throw error;
  }
};

/**
 * Update the active layer ID in Firestore
 */
export const updateActiveLayerId = async (
  projectId: string,
  activeLayerId: string,
  userId: string
): Promise<void> => {
  try {
    const boardState: FirestoreBoardState = {
      activeLayerId,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    };
    
    await setDoc(getBoardDoc(projectId), boardState, { merge: true });
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
  projectId: string,
  onStateChange: (state: FirestoreBoardState | null) => void
): Unsubscribe => {
  const boardDocRef = getBoardDoc(projectId);
  console.log('📡 Subscribing to board state:', { projectId, path: boardDocRef.path });
  
  return onSnapshot(boardDocRef, (doc) => {
    if (doc.exists()) {
      const state = doc.data() as FirestoreBoardState;
      console.log('📥 Board state received from Firestore:', { 
        projectId, 
        hasScaleLine: !!state.scaleLine,
        scaleLine: state.scaleLine,
        hasBackgroundImage: !!state.backgroundImage 
      });
      onStateChange(state);
    } else {
      console.log('📥 Board document does not exist yet:', { projectId });
      onStateChange(null);
    }
  }, (error) => {
    console.error('❌ Error subscribing to board state:', error);
    onStateChange(null);
  });
};

/**
 * Construction Annotation Tool Functions
 */

/**
 * Save background image to Firestore
 */
export const saveBackgroundImage = async (
  backgroundImage: {
    url: string;
    width: number;
    height: number;
  },
  userId: string,
  projectId: string
): Promise<void> => {
  try {
    const boardState: Partial<FirestoreBoardState> = {
      backgroundImage: {
        ...backgroundImage,
        uploadedAt: serverTimestamp(),
        uploadedBy: userId,
      },
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    };
    
    await setDoc(getBoardDoc(projectId), boardState, { merge: true });
    console.log('🎯 Background image saved to Firestore');
  } catch (error) {
    console.error('❌ Failed to save background image:', error);
    throw error;
  }
};

/**
 * Save scale line to Firestore
 */
export const saveScaleLine = async (
  scaleLine: {
    id: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    realWorldLength: number;
    unit: string;
    isVisible: boolean;
  },
  userId: string,
  projectId: string
): Promise<void> => {
  try {
    const boardDocRef = getBoardDoc(projectId);
    console.log('💾 saveScaleLine called:', { projectId, scaleLine, userId, path: boardDocRef.path });
    
    // Use setDoc with merge to ensure document exists and preserve other fields
    await setDoc(boardDocRef, {
      scaleLine: {
        ...scaleLine,
        createdAt: serverTimestamp(),
        createdBy: userId,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      },
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    }, { merge: true });
    console.log('🎯 Scale line saved to Firestore');
  } catch (error) {
    console.error('❌ Failed to save scale line:', error);
    throw error;
  }
};

/**
 * Delete scale line from Firestore
 */
export const deleteScaleLineFromFirestore = async (userId: string, projectId: string): Promise<void> => {
  try {
    const boardDocRef = getBoardDoc(projectId);
    console.log('🗑️ deleteScaleLineFromFirestore called:', { projectId, userId, path: boardDocRef.path, stackTrace: new Error().stack });
    // Use updateDoc with deleteField() to properly remove the field from Firestore
    await updateDoc(boardDocRef, {
      scaleLine: deleteField(),
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });
    console.log('🎯 Scale line deleted from Firestore');
  } catch (error) {
    console.error('❌ Failed to delete scale line:', error);
    throw error;
  }
};

/**
 * Delete background image from Firestore
 */
export const deleteBackgroundImageFromFirestore = async (userId: string, projectId: string): Promise<void> => {
  try {
    // Use updateDoc with deleteField() to properly remove the field from Firestore
    await updateDoc(getBoardDoc(projectId), {
      backgroundImage: deleteField(),
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });
    console.log('🎯 Background image deleted from Firestore');
  } catch (error) {
    console.error('❌ Failed to delete background image:', error);
    throw error;
  }
};
