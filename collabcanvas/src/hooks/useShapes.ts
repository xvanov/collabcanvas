/**
 * Custom hook for Firestore shapes synchronization
 * Handles real-time sync with optimistic updates and throttling
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { useScopedCanvasStore, getProjectCanvasStoreApi } from '../store/projectCanvasStore';
import { useAuth } from './useAuth';
import { 
  createShape as createShapeInFirestore, 
  updateShapePosition as updateShapePositionInFirestore,
  updateShapeProperty as updateShapePropertyInFirestore,
  deleteShape as deleteShapeInFirestore,
  subscribeToShapes,
  subscribeToShapesChanges,
  type FirestoreShape,
  type FirestoreShapeChange,
} from '../services/firestore';
import { offlineManager } from '../services/offline';
import { createAdaptiveThrottle, createCoalescingThrottle } from '../utils/throttle';
import type { Shape } from '../types';
import { perfMetrics, registerHarnessApi, isHarnessEnabled, timestampLikeToMillis } from '../utils/harness';

/**
 * Converts Firestore shape to local Shape type
 * Handles serverTimestamp conversion to numbers
 */
function convertFirestoreShape(firestoreShape: FirestoreShape): Shape {
  const createdAtMillis = timestampLikeToMillis(firestoreShape.createdAt as never) ?? Date.now();
  const updatedAtMillis = timestampLikeToMillis(firestoreShape.updatedAt as never) ?? createdAtMillis;
  const clientUpdatedAt =
    typeof (firestoreShape as { clientUpdatedAt?: unknown }).clientUpdatedAt === 'number'
      ? (firestoreShape as { clientUpdatedAt: number }).clientUpdatedAt
      : updatedAtMillis;

  return {
    id: firestoreShape.id,
    type: firestoreShape.type,
    x: firestoreShape.x,
    y: firestoreShape.y,
    w: firestoreShape.w,
    h: firestoreShape.h,
    color: firestoreShape.color,
    createdAt: createdAtMillis,
    createdBy: firestoreShape.createdBy,
    updatedAt: updatedAtMillis,
    updatedBy: firestoreShape.updatedBy,
    clientUpdatedAt,
    // Layer management
    layerId: firestoreShape.layerId,
    // Optional properties for different shape types
    text: firestoreShape.text,
    fontSize: firestoreShape.fontSize,
    strokeWidth: firestoreShape.strokeWidth,
    radius: firestoreShape.radius,
    points: firestoreShape.points,
    // Transform properties
    rotation: firestoreShape.rotation,
  };
}

/**
 * Hook for managing Firestore shapes synchronization
 * Provides real-time sync with optimistic updates and throttling
 */
export function useShapes(projectId: string | undefined) {
  const { user } = useAuth();
  
  // Use project-scoped store when projectId is provided, otherwise use global store
  const shapes = useScopedCanvasStore(projectId, (state) => state.shapes);
  const createShapeInStore = useScopedCanvasStore(projectId, (state) => state.createShape);
  const updateShapePositionInStore = useScopedCanvasStore(projectId, (state) => state.updateShapePosition);
  const setShapesFromMap = useScopedCanvasStore(projectId, (state) => state.setShapesFromMap);

  // Stable refs for user id and shapes to avoid resubscribing listeners on state changes
  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    userIdRef.current = user?.uid ?? null;
  }, [user]);

  const shapesRef = useRef<Map<string, Shape>>(new Map());
  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);

  // Track pending updates to prevent conflicts
  const pendingUpdates = useRef<Map<string, { x: number; y: number; clientTimestamp: number }>>(new Map());
  const pendingFlushRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestShapesRef = useRef<Map<string, Shape> | null>(null);
  const shapesFrameRef = useRef<number | null>(null);
  
  // Track if we're currently syncing to prevent loops
  const isSyncing = useRef(false);
  
  // Track shapes we're currently updating to ignore our own updates from Firestore
  const updatingShapes = useRef<Set<string>>(new Set());
  
  // Track shapes we've locally deleted to prevent them from being re-added by Firestore
  const locallyDeletedShapes = useRef<Set<string>>(new Set());
  
  // Track pending writes to prevent duplicates (LWW semantics)
  const pendingWrites = useRef<Map<string, { timestamp: number; promise: Promise<void> }>>(new Map());

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
    perfMetrics.markEvent('shapeCreateLocal');

    if (!projectId) {
      console.warn('Cannot create shape: projectId is required');
      return;
    }

    try {
      // Sync to Firestore - ensure layerId is valid
      const layerId = shape.layerId || 'default-layer';
      
      // Prepare additional props for type-specific properties
      const additionalProps: Partial<Shape> = {
        color: shape.color,
        w: shape.w,
        h: shape.h,
        ...(shape.type === 'polyline' || shape.type === 'polygon' || shape.type === 'line' ? {
          points: shape.points,
          strokeWidth: shape.strokeWidth,
        } : {}),
        ...(shape.type === 'circle' ? {
          radius: shape.radius,
        } : {}),
        ...(shape.type === 'text' ? {
          text: shape.text,
          fontSize: shape.fontSize,
        } : {}),
        ...(shape.type === 'boundingbox' ? {
          itemType: shape.itemType,
          confidence: shape.confidence,
          isAIGenerated: shape.isAIGenerated,
          source: shape.source,
          strokeWidth: shape.strokeWidth,
        } : {}),
      };
      
      await createShapeInFirestore(projectId, shape.id, shape.type, shape.x, shape.y, user.uid, layerId, additionalProps);
    } catch (error) {
      console.error('❌ Failed to create shape in Firestore:', error);
      
      // Queue for offline sync - ensure layerId is valid
      const layerId = shape.layerId || 'default-layer';
      offlineManager.queueCreateShape(projectId, shape.id, shape.type, shape.x, shape.y, user.uid, layerId);
      console.log(`📝 Queued shape creation for offline sync: ${shape.id}`);
    }
  }, [user, projectId, createShapeInStore]);

  /**
   * Update shape position with throttling and optimistic updates
   */
  /**
   * Adaptive throttled function for Firestore position updates with offline handling
   * Starts at 16ms (60Hz) and adapts up to 100ms (10Hz) based on network conditions
   * Uses coalescing to batch rapid updates
   */
  const throttledFirestoreUpdate = useMemo(
    () => createCoalescingThrottle(
      createAdaptiveThrottle(async (shapeId: string, x: number, y: number, userId: string, clientTimestamp: number) => {
        // Check for duplicate writes (LWW semantics)
        const existingWrite = pendingWrites.current.get(shapeId);
        if (existingWrite && existingWrite.timestamp >= clientTimestamp) {
          console.log(`Skipping duplicate write for ${shapeId}: existing=${existingWrite.timestamp}, new=${clientTimestamp}`);
          return;
        }

        // Track this write
        const writePromise = (async () => {
          if (!projectId) {
            throw new Error('projectId is required');
          }
          try {
            await updateShapePositionInFirestore(projectId, shapeId, x, y, userId, clientTimestamp);
            perfMetrics.markEvent('shapeUpdateSuccess');
          } catch (error) {
            console.error('❌ Failed to update shape position in Firestore:', error);
            perfMetrics.markEvent('shapeUpdateFailure');
            
            // Queue for offline sync
            offlineManager.queueUpdatePosition(projectId, shapeId, x, y, userId, clientTimestamp);
            console.log(`📝 Queued position update for offline sync: ${shapeId}`);
            throw error; // Re-throw to trigger adaptive throttling
          } finally {
            // Clean up pending write
            pendingWrites.current.delete(shapeId);
          }
        })();

        pendingWrites.current.set(shapeId, { timestamp: clientTimestamp, promise: writePromise });
        await writePromise;
      }, 16, 100), // Base 16ms, max 100ms
      16 // Coalescing interval
    ),
    [projectId]
  );

  /**
   * Process pending updates and sync to Firestore
   */
  const processPendingUpdates = useCallback(() => {
    if (!user || !projectId || pendingUpdates.current.size === 0) return;

    const updates = Array.from(pendingUpdates.current.entries());
    pendingUpdates.current.clear();

    // Process each pending update
    updates.forEach(([shapeId, update]) => {
      throttledFirestoreUpdate(shapeId, update.x, update.y, user.uid, update.clientTimestamp);
      perfMetrics.markEvent('shapeUpdateFlush');
      // Clear the updating flag after we've sent the update
      updatingShapes.current.delete(shapeId);
    });
  }, [user, projectId, throttledFirestoreUpdate]);

  const scheduleShapesCommit = useCallback(() => {
    if (!latestShapesRef.current) return;

    const scheduleViaRaf = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function';

    if (scheduleViaRaf) {
      if (shapesFrameRef.current !== null) return;
      shapesFrameRef.current = window.requestAnimationFrame(() => {
        shapesFrameRef.current = null;
        if (!latestShapesRef.current) return;
        setShapesFromMap(new Map(latestShapesRef.current));
        latestShapesRef.current = null;
      });
    } else {
      if (shapesFrameRef.current !== null) return;
      shapesFrameRef.current = window.setTimeout(() => {
        shapesFrameRef.current = null;
        if (!latestShapesRef.current) return;
        setShapesFromMap(new Map(latestShapesRef.current));
        latestShapesRef.current = null;
      }, 16);
    }
  }, [setShapesFromMap]);

  const schedulePendingFlush = useCallback(() => {
    if (!user || !projectId) return;
    if (pendingUpdates.current.size === 0) return;

    const scheduleViaRaf = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function';

    if (scheduleViaRaf) {
      if (pendingFlushRef.current !== null) return;
      pendingFlushRef.current = window.requestAnimationFrame(() => {
        pendingFlushRef.current = null;
        processPendingUpdates();
        if (pendingUpdates.current.size > 0) {
          schedulePendingFlush();
        }
      });
    } else {
      if (fallbackTimerRef.current) return;
      fallbackTimerRef.current = setTimeout(() => {
        fallbackTimerRef.current = null;
        processPendingUpdates();
        if (pendingUpdates.current.size > 0) {
          schedulePendingFlush();
        }
      }, 16);
    }
  }, [processPendingUpdates, user, projectId]);

  useEffect(() => {
    return () => {
      if (pendingFlushRef.current !== null && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(pendingFlushRef.current);
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
      if (shapesFrameRef.current !== null) {
        if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
          window.cancelAnimationFrame(shapesFrameRef.current);
        } else {
          clearTimeout(shapesFrameRef.current);
        }
      }
    };
  }, []);

  const updateShapePosition = useCallback(async (
    id: string,
    x: number,
    y: number
  ) => {
    if (!user || !projectId) {
      console.warn('Cannot update shape: user not authenticated or projectId missing');
      return;
    }

    // Mark this shape as being updated by us
    updatingShapes.current.add(id);

    // Store the pending update
    const clientTimestamp = Date.now();
    pendingUpdates.current.set(id, { x, y, clientTimestamp });

    // Optimistic update - update store immediately
    updateShapePositionInStore(id, x, y, user.uid, clientTimestamp);
    perfMetrics.markEvent('shapeUpdateRequest');
    
    // Track shape update for performance metrics
    if (perfMetrics.enabled) {
      perfMetrics.trackShapeUpdate(id, clientTimestamp, false); // false = local update
    }

    schedulePendingFlush();
  }, [schedulePendingFlush, updateShapePositionInStore, user, projectId]);

  /**
   * Handle incoming Firestore updates
   * Applies Last-Write-Wins conflict resolution
   * Ignores updates from the current user to prevent visual glitches
   */
  const handleFirestoreUpdate = useCallback((firestoreShapes: FirestoreShape[]) => {
    if (isSyncing.current || !userIdRef.current) return;
    console.log(`📥 Firestore update received: ${firestoreShapes.length} shapes`);
    isSyncing.current = true;
    try {
      if (perfMetrics.enabled) {
        firestoreShapes.forEach((rawShape) => {
          const isRemoteUpdate = userIdRef.current ? rawShape.updatedBy !== userIdRef.current : true;
          const clientTimestamp = typeof (rawShape as { clientUpdatedAt?: unknown }).clientUpdatedAt === 'number'
            ? (rawShape as { clientUpdatedAt: number }).clientUpdatedAt
            : timestampLikeToMillis(rawShape.updatedAt as never);
          perfMetrics.trackShapeUpdate(rawShape.id, clientTimestamp ?? null, isRemoteUpdate);
        });
      }
      // Build layer color map - use project-scoped store if projectId is available
      const storeApi = projectId 
        ? getProjectCanvasStoreApi(projectId)
        : useCanvasStore;
      const layerColorById = storeApi.getState().layers.reduce((acc, l) => {
        acc[l.id] = l.color || '#3B82F6';
        return acc;
      }, {} as Record<string, string>);
      // Convert Firestore shapes to local format and enforce inheritance
      const localShapes = firestoreShapes.map((fs) => {
        let s = convertFirestoreShape(fs);
        const lid = s.layerId || 'default-layer';
        const lc = layerColorById[lid];
        if (lc && s.color === '#3B82F6' && lc !== '#3B82F6') s = { ...s, color: lc };
        return s;
      });
      const mergedShapes = new Map<string, Shape>();
      shapesRef.current.forEach((shape, id) => { mergedShapes.set(id, shape); });
      localShapes.forEach((firestoreShape) => {
        const localShape = mergedShapes.get(firestoreShape.id);
        if (locallyDeletedShapes.current.has(firestoreShape.id)) {
          console.log(`🚫 Ignoring Firestore update for locally deleted shape: ${firestoreShape.id}`);
          return;
        }
        if (!localShape) {
          mergedShapes.set(firestoreShape.id, firestoreShape);
        } else {
          if (updatingShapes.current.has(firestoreShape.id)) return;
          const localUpdatedAt = localShape.updatedAt || 0;
          const firestoreUpdatedAt = firestoreShape.updatedAt || 0;
          if (firestoreUpdatedAt > localUpdatedAt) {
            mergedShapes.set(firestoreShape.id, firestoreShape);
          }
        }
      });
      latestShapesRef.current = mergedShapes;
      scheduleShapesCommit();
    } finally {
      isSyncing.current = false;
    }
  }, [scheduleShapesCommit, projectId]);

  /**
   * Incremental Firestore change handler (added/modified/removed)
   * Merges changes into a copy of the current shapes map and schedules a batched commit.
   */
  const handleFirestoreDocChanges = useCallback((changes: FirestoreShapeChange[]) => {
    if (!userIdRef.current) return;
    const merged = new Map(shapesRef.current);
    // Build layer color map - use project-scoped store if projectId is available
    const storeApi = projectId 
      ? getProjectCanvasStoreApi(projectId)
      : useCanvasStore;
    const layerColorById = storeApi.getState().layers.reduce((acc, l) => {
      acc[l.id] = l.color || '#3B82F6';
      return acc;
    }, {} as Record<string, string>);
    for (const change of changes) {
      const raw = change.shape;
      let local = convertFirestoreShape(raw);
      const lid = local.layerId || 'default-layer';
      const lc = layerColorById[lid];
      if (lc && local.color === '#3B82F6' && lc !== '#3B82F6') local = { ...local, color: lc };
      if (change.type === 'removed') {
        merged.delete(local.id);
        locallyDeletedShapes.current.delete(local.id);
        continue;
      }
      if (locallyDeletedShapes.current.has(local.id)) {
        console.log(`🚫 Ignoring Firestore ${change.type} for locally deleted shape: ${local.id}`);
        continue;
      }
      if (change.type === 'modified' && updatingShapes.current.has(local.id)) {
        continue;
      }
      const existing = merged.get(local.id);
      if (!existing) {
        merged.set(local.id, local);
      } else if ((local.updatedAt || 0) > (existing.updatedAt || 0)) {
        merged.set(local.id, local);
      }
    }
    latestShapesRef.current = merged;
    scheduleShapesCommit();
  }, [scheduleShapesCommit, projectId]);

  /**
   * Reload all shapes from Firestore (useful for page refresh or reconnection)
   */
  const reloadShapesFromFirestore = useCallback(async () => {
    if (!userIdRef.current) return;

    // Only log in development or when explicitly debugging
    if (import.meta.env.DEV) {
      console.log('🔄 Reloading all shapes from Firestore...');
    }
    
    if (!projectId) return;

    try {
      // Set up a one-time listener to get all current shapes
      const unsubscribe = subscribeToShapes(projectId, (firestoreShapes) => {
        console.log(`📥 Loaded ${firestoreShapes.length} shapes from Firestore`);
        handleFirestoreUpdate(firestoreShapes);
        unsubscribe(); // Unsubscribe after first load
      });
    } catch (error) {
      console.error('❌ Failed to reload shapes from Firestore:', error);
    }
  }, [handleFirestoreUpdate, projectId]);

  /**
   * Set up Firestore listener for real-time sync
   */
  // Set up one stable Firestore listener per authenticated session
  const userUid = user?.uid ?? null;
  useEffect(() => {
    if (!userUid || !projectId) return;
    console.log('🔄 Setting up Firestore shapes listener (incremental)');
    const unsubscribe = subscribeToShapesChanges(projectId, handleFirestoreDocChanges);
    return () => {
      console.log('🔄 Cleaning up Firestore shapes listener');
      unsubscribe();
    };
  }, [handleFirestoreDocChanges, userUid, projectId]);

  useEffect(() => {
    if (!isHarnessEnabled()) return;
    registerHarnessApi('shapes', {
      createShape,
      updateShapePosition,
      reloadShapesFromFirestore,
    });
  }, [createShape, updateShapePosition, reloadShapesFromFirestore]);

  const updateShapeProperty = useCallback(async (
    id: string,
    property: keyof Shape,
    value: unknown
  ) => {
    if (!user) {
      console.warn('Cannot update shape property: user not authenticated');
      return;
    }

    // Get the current shape
    const currentShape = shapes.get(id);
    if (!currentShape) {
      console.warn(`Shape ${id} not found`);
      return;
    }

    // Update the shape in the store
    const clientTimestamp = Date.now();
    
    // Update store optimistically - use project-scoped store if projectId is available
    const storeApi = projectId 
      ? getProjectCanvasStoreApi(projectId)
      : useCanvasStore;
    const { updateShapeProperty: updateShapePropertyInStore } = storeApi.getState();
    updateShapePropertyInStore(id, property, value, user.uid, clientTimestamp);

    if (!projectId) {
      console.warn('Cannot update shape property: projectId is required');
      return;
    }

    try {
      // Sync to Firestore
      await updateShapePropertyInFirestore(projectId, id, property, value, user.uid, clientTimestamp);
      console.log(`✅ Updated shape ${id} property ${property} to ${value}`);
    } catch (error) {
      console.error('❌ Failed to update shape property in Firestore:', error);
      // Note: We could queue this for offline sync if needed
    }
  }, [user, projectId, shapes]);

  /**
   * Delete multiple shapes with optimistic updates and offline handling
   */
  const deleteShapes = useCallback(async (shapeIds: string[]) => {
    if (!user || !projectId) {
      console.warn('Cannot delete shapes: user not authenticated or projectId missing');
      return;
    }

    if (shapeIds.length === 0) return;

    console.log(`🗑️ Deleting ${shapeIds.length} shapes:`, shapeIds);

    // Track these shapes as locally deleted to prevent them from reappearing
    shapeIds.forEach(shapeId => {
      locallyDeletedShapes.current.add(shapeId);
    });

    // Optimistic update - remove from store immediately - use project-scoped store if projectId is available
    const storeApi = projectId 
      ? getProjectCanvasStoreApi(projectId)
      : useCanvasStore;
    const { shapes: currentShapes, setShapesFromMap, selectedShapeIds, clearSelection } = storeApi.getState();
    const newShapes = new Map(currentShapes);
    shapeIds.forEach(shapeId => {
      newShapes.delete(shapeId);
    });
    setShapesFromMap(newShapes);
    
    // Clear selection if any of the deleted shapes were selected
    const deletedShapesWereSelected = shapeIds.some(id => selectedShapeIds.includes(id));
    if (deletedShapesWereSelected) {
      clearSelection();
    }
    
    perfMetrics.markEvent('shapesDeleteLocal');
    console.log('✅ Optimistic update: shapes removed from store');

    // Delete from Firestore
    const deletePromises = shapeIds.map(async (shapeId) => {
      try {
        await deleteShapeInFirestore(projectId, shapeId);
        console.log(`✅ Deleted shape ${shapeId}`);
        // Remove from locally deleted set since Firestore confirms the deletion
        locallyDeletedShapes.current.delete(shapeId);
      } catch (error) {
        console.error(`❌ Failed to delete shape ${shapeId} in Firestore:`, error);
        
        // Queue for offline sync
        offlineManager.queueDeleteShape(projectId, shapeId, user.uid);
        console.log(`📝 Queued shape deletion for offline sync: ${shapeId}`);
        throw error;
      }
    });

    try {
      await Promise.all(deletePromises);
      console.log(`✅ Successfully deleted ${shapeIds.length} shapes`);
    } catch (error) {
      console.error('❌ Some shape deletions failed:', error);
    }
  }, [user, projectId]);

  /**
   * Duplicate multiple shapes with optimistic updates and offline handling
   */
  const duplicateShapes = useCallback(async (shapeIds: string[]) => {
    if (!user) {
      console.warn('Cannot duplicate shapes: user not authenticated');
      return;
    }

    if (shapeIds.length === 0) return;

    // Get the shapes to duplicate
    const shapesToDuplicate = shapeIds
      .map(id => shapes.get(id))
      .filter((shape): shape is Shape => shape !== undefined);

    if (shapesToDuplicate.length === 0) return;

    // Create duplicated shapes with new IDs and offset positions
    const duplicatedShapes: Shape[] = [];
    const createPromises: Promise<void>[] = [];

    shapesToDuplicate.forEach((shape, index) => {
      const duplicatedShape: Shape = {
        ...shape,
        id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        x: shape.x + 20 + (index * 5), // Offset by 20px + small additional offset per shape
        y: shape.y + 20 + (index * 5),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        clientUpdatedAt: Date.now(),
        createdBy: user.uid,
        updatedBy: user.uid,
      };

      duplicatedShapes.push(duplicatedShape);

      if (!projectId) {
        console.warn('Cannot duplicate shapes: projectId is required');
        return;
      }

      // Create in Firestore
      const createPromise = createShapeInFirestore(
        projectId,
        duplicatedShape.id,
        duplicatedShape.type,
        duplicatedShape.x,
        duplicatedShape.y,
        user.uid,
        duplicatedShape.layerId
      ).catch(error => {
        console.error(`❌ Failed to create duplicated shape ${duplicatedShape.id} in Firestore:`, error);
        
        // Queue for offline sync
        offlineManager.queueCreateShape(
          projectId,
          duplicatedShape.id,
          duplicatedShape.type,
          duplicatedShape.x,
          duplicatedShape.y,
          user.uid,
          duplicatedShape.layerId
        );
        console.log(`📝 Queued duplicated shape creation for offline sync: ${duplicatedShape.id}`);
        throw error;
      });

      createPromises.push(createPromise);
    });

    // Optimistic update - add duplicated shapes to store immediately
    duplicatedShapes.forEach(shape => {
      createShapeInStore(shape);
    });
    perfMetrics.markEvent('shapesDuplicateLocal');

    try {
      await Promise.all(createPromises);
      console.log(`✅ Successfully duplicated ${duplicatedShapes.length} shapes`);
    } catch (error) {
      console.error('❌ Some shape duplications failed:', error);
    }
  }, [user, projectId, shapes, createShapeInStore]);

  /**
   * Update shape rotation with Firestore sync
   */
  const updateShapeRotation = useCallback(async (
    id: string,
    rotation: number
  ) => {
    if (!user) {
      console.warn('Cannot update shape rotation: user not authenticated');
      return;
    }

    // Get the current shape
    const currentShape = shapes.get(id);
    if (!currentShape) {
      console.warn(`Shape ${id} not found`);
      return;
    }

    // Update the shape in the store
    const clientTimestamp = Date.now();
    
    // Update store optimistically - use project-scoped store if projectId is available
    const storeApi = projectId 
      ? getProjectCanvasStoreApi(projectId)
      : useCanvasStore;
    const { updateShapeProperty: updateShapePropertyInStore } = storeApi.getState();
    updateShapePropertyInStore(id, 'rotation', rotation, user.uid, clientTimestamp);

    if (!projectId) {
      console.warn('Cannot update shape rotation: projectId is required');
      return;
    }

    try {
      // Sync to Firestore
      await updateShapePropertyInFirestore(projectId, id, 'rotation', rotation, user.uid, clientTimestamp);
      console.log(`✅ Updated shape ${id} rotation to ${rotation}`);
    } catch (error) {
      console.error('❌ Failed to update shape rotation in Firestore:', error);
      // Note: We could queue this for offline sync if needed
    }
  }, [user, projectId, shapes]);

  return {
    createShape,
    updateShapePosition,
    updateShapeProperty,
    updateShapeRotation,
    deleteShapes,
    duplicateShapes,
    reloadShapesFromFirestore,
    shapes: Array.from(shapes.values()),
  };
}
