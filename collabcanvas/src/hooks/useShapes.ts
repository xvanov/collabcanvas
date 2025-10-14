/**
 * Custom hook for Firestore shapes synchronization
 * Handles real-time sync with optimistic updates and throttling
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useAuth } from './useAuth';
import { 
  createShape as createShapeInFirestore, 
  updateShapePosition as updateShapePositionInFirestore,
  subscribeToShapes,
  type FirestoreShape 
} from '../services/firestore';
import { offlineManager } from '../services/offline';
import { createDragThrottle } from '../utils/throttle';
import type { Shape } from '../types';

/**
 * Converts Firestore shape to local Shape type
 * Handles serverTimestamp conversion to numbers
 */
function convertFirestoreShape(firestoreShape: FirestoreShape): Shape {
  return {
    id: firestoreShape.id,
    type: firestoreShape.type,
    x: firestoreShape.x,
    y: firestoreShape.y,
    w: firestoreShape.w,
    h: firestoreShape.h,
    color: firestoreShape.color,
    createdAt: typeof firestoreShape.createdAt === 'number' 
      ? firestoreShape.createdAt 
      : Date.now(),
    createdBy: firestoreShape.createdBy,
    updatedAt: typeof firestoreShape.updatedAt === 'number' 
      ? firestoreShape.updatedAt 
      : Date.now(),
    updatedBy: firestoreShape.updatedBy,
  };
}

/**
 * Hook for managing Firestore shapes synchronization
 * Provides real-time sync with optimistic updates and throttling
 */
export function useShapes() {
  const { user } = useAuth();
  const {
    shapes,
    createShape: createShapeInStore,
    updateShapePosition: updateShapePositionInStore,
    setShapes,
  } = useCanvasStore();

  // Track pending updates to prevent conflicts
  const pendingUpdates = useRef<Map<string, { x: number; y: number; timestamp: number }>>(new Map());
  
  // Track if we're currently syncing to prevent loops
  const isSyncing = useRef(false);
  
  // Track shapes we're currently updating to ignore our own updates from Firestore
  const updatingShapes = useRef<Set<string>>(new Set());

  /**
   * Create a new shape with optimistic updates and offline handling
   */
  const createShape = useCallback(async (shape: Shape) => {
    if (!user) {
      console.warn('Cannot create shape: user not authenticated');
      return;
    }

    // Optimistic update - add to store immediately
    createShapeInStore(shape);

    try {
      // Sync to Firestore
      await createShapeInFirestore(shape.id, shape.x, shape.y, user.uid);
      console.log(`✅ Shape ${shape.id} created in Firestore`);
    } catch (error) {
      console.error('❌ Failed to create shape in Firestore:', error);
      
      // Queue for offline sync
      offlineManager.queueCreateShape(shape.id, shape.x, shape.y, user.uid);
      console.log(`📝 Queued shape creation for offline sync: ${shape.id}`);
    }
  }, [user, createShapeInStore]);

  /**
   * Update shape position with throttling and optimistic updates
   */
  const updateShapePosition = useCallback(async (
    id: string, 
    x: number, 
    y: number
  ) => {
    if (!user) {
      console.warn('Cannot update shape: user not authenticated');
      return;
    }

    // Mark this shape as being updated by us
    updatingShapes.current.add(id);

    // Store the pending update
    pendingUpdates.current.set(id, { x, y, timestamp: Date.now() });

    // Optimistic update - update store immediately
    updateShapePositionInStore(id, x, y, user.uid);

    // Throttled Firestore update will be handled by the throttled function
  }, [user, updateShapePositionInStore]);

  /**
   * Throttled function for Firestore position updates with offline handling
   * Only executes at most once every 16ms (60 FPS)
   */
  const throttledFirestoreUpdate = useMemo(
    () => createDragThrottle(async (shapeId: string, x: number, y: number, userId: string) => {
      try {
        await updateShapePositionInFirestore(shapeId, x, y, userId);
        console.log(`✅ Shape ${shapeId} position updated in Firestore`);
      } catch (error) {
        console.error('❌ Failed to update shape position in Firestore:', error);
        
        // Queue for offline sync
        offlineManager.queueUpdatePosition(shapeId, x, y, userId);
        console.log(`📝 Queued position update for offline sync: ${shapeId}`);
      }
    }),
    []
  );

  /**
   * Process pending updates and sync to Firestore
   */
  const processPendingUpdates = useCallback(() => {
    if (!user || pendingUpdates.current.size === 0) return;

    const updates = Array.from(pendingUpdates.current.entries());
    pendingUpdates.current.clear();

    // Process each pending update
    updates.forEach(([shapeId, update]) => {
      throttledFirestoreUpdate(shapeId, update.x, update.y, user.uid);
      // Clear the updating flag after we've sent the update
      updatingShapes.current.delete(shapeId);
    });
  }, [user, throttledFirestoreUpdate]);

  // Process pending updates every 16ms
  useEffect(() => {
    const interval = setInterval(processPendingUpdates, 16);
    return () => clearInterval(interval);
  }, [processPendingUpdates]);

  /**
   * Handle incoming Firestore updates
   * Applies Last-Write-Wins conflict resolution
   * Ignores updates from the current user to prevent visual glitches
   */
  const handleFirestoreUpdate = useCallback((firestoreShapes: FirestoreShape[]) => {
    if (isSyncing.current || !user) return;
    
    isSyncing.current = true;
    
    try {
      // Convert Firestore shapes to local format
      const localShapes = firestoreShapes.map(convertFirestoreShape);
      
      // Apply Last-Write-Wins: if a shape exists locally and remotely,
      // use the one with the more recent updatedAt timestamp
      const mergedShapes = new Map<string, Shape>();
      
      // Add all local shapes first
      shapes.forEach((shape, id) => {
        mergedShapes.set(id, shape);
      });
      
      // Merge with Firestore shapes, applying LWW
      localShapes.forEach((firestoreShape) => {
        const localShape = mergedShapes.get(firestoreShape.id);
        
        if (!localShape) {
          // New shape from Firestore
          mergedShapes.set(firestoreShape.id, firestoreShape);
        } else {
          // Skip updates for shapes we're currently updating to prevent visual glitches
          if (updatingShapes.current.has(firestoreShape.id)) {
            // This shape is being updated by us, keep the local version
            return;
          }
          
          // Conflict resolution: use the shape with more recent updatedAt
          const localUpdatedAt = localShape.updatedAt || 0;
          const firestoreUpdatedAt = firestoreShape.updatedAt || 0;
          
          if (firestoreUpdatedAt > localUpdatedAt) {
            // Firestore version is newer, use it
            mergedShapes.set(firestoreShape.id, firestoreShape);
          } else if (firestoreUpdatedAt < localUpdatedAt) {
            // Local version is newer, keep it
            // This prevents visual glitches from our own older updates
          } else {
            // Same timestamp - prefer local version to avoid unnecessary updates
            // This handles the case where we get our own update back
          }
        }
      });
      
      // Update store with merged shapes
      setShapes(Array.from(mergedShapes.values()));
      
    } finally {
      isSyncing.current = false;
    }
  }, [shapes, setShapes, user]);

  /**
   * Reload all shapes from Firestore (useful for page refresh or reconnection)
   */
  const reloadShapesFromFirestore = useCallback(async () => {
    if (!user) return;

    console.log('🔄 Reloading all shapes from Firestore...');
    
    try {
      // Set up a one-time listener to get all current shapes
      const unsubscribe = subscribeToShapes((firestoreShapes) => {
        console.log(`📥 Loaded ${firestoreShapes.length} shapes from Firestore`);
        handleFirestoreUpdate(firestoreShapes);
        unsubscribe(); // Unsubscribe after first load
      });
    } catch (error) {
      console.error('❌ Failed to reload shapes from Firestore:', error);
    }
  }, [user, handleFirestoreUpdate]);

  /**
   * Set up Firestore listener for real-time sync
   */
  useEffect(() => {
    if (!user) return;

    console.log('🔄 Setting up Firestore shapes listener');
    
    const unsubscribe = subscribeToShapes(handleFirestoreUpdate);
    
    return () => {
      console.log('🔄 Cleaning up Firestore shapes listener');
      unsubscribe();
    };
  }, [user, handleFirestoreUpdate]);

  return {
    createShape,
    updateShapePosition,
    reloadShapesFromFirestore,
    shapes: Array.from(shapes.values()),
  };
}
