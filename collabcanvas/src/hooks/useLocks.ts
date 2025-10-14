/**
 * Hook for managing shape locks using Firebase Realtime Database
 * Handles lock acquisition, release, and real-time sync
 */

import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { acquireLock, releaseLock, subscribeToLocks } from '../services/rtdb';
import { offlineManager } from '../services/offline';
import type { LockData } from '../services/rtdb';
import type { Lock } from '../types';

export function useLocks() {
  const currentUser = useCanvasStore((state) => state.currentUser);
  const locks = useCanvasStore((state) => state.locks);
  const setLocks = useCanvasStore((state) => state.setLocks);
  const lockShape = useCanvasStore((state) => state.lockShape);
  const unlockShape = useCanvasStore((state) => state.unlockShape);

  // Subscribe to locks changes
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToLocks((locksMap: Record<string, LockData>) => {
      // Convert RTDB data to Lock array
      const locksArray: Array<{ shapeId: string; lock: Lock }> = Object.entries(locksMap).map(
        ([shapeId, lockData]) => ({
          shapeId,
          lock: {
            userId: lockData.userId,
            userName: lockData.userName,
            lockedAt: typeof lockData.lockedAt === 'object' ? Date.now() : lockData.lockedAt,
          } as Lock,
        })
      );

      // Update store with all locks
      setLocks(locksArray);

      // Clean up expired locks (older than 30 seconds)
      const now = Date.now();
      const expiredLocks = locksArray.filter(
        ({ lock }) => now - lock.lockedAt > 30000 // 30 seconds
      );

      // Release expired locks
      expiredLocks.forEach(({ shapeId }) => {
        releaseLock(shapeId).catch(console.error);
      });
    });

    return unsubscribe;
  }, [currentUser, setLocks]);

  // Acquire lock on a shape with offline handling
  const acquireShapeLock = useCallback(
    async (shapeId: string): Promise<boolean> => {
      if (!currentUser) return false;

      try {
        const success = await acquireLock(shapeId, currentUser.uid, currentUser.name);
        if (success) {
          lockShape(shapeId, currentUser.uid, currentUser.name);
        }
        return success;
      } catch (error) {
        console.error('Failed to acquire lock:', error);
        
        // Queue for offline sync
        offlineManager.queueLockOperation('acquireLock', shapeId, currentUser.uid, currentUser.name);
        console.log('📝 Queued lock acquisition for offline sync');
        
        // Optimistically update local state
        lockShape(shapeId, currentUser.uid, currentUser.name);
        return true; // Return true for optimistic update
      }
    },
    [currentUser, lockShape]
  );

  // Release lock on a shape with offline handling
  const releaseShapeLock = useCallback(
    async (shapeId: string): Promise<void> => {
      try {
        await releaseLock(shapeId);
        unlockShape(shapeId);
      } catch (error) {
        console.error('Failed to release lock:', error);
        
        // Queue for offline sync
        if (currentUser) {
          offlineManager.queueLockOperation('releaseLock', shapeId, currentUser.uid);
          console.log('📝 Queued lock release for offline sync');
        }
        
        // Optimistically update local state
        unlockShape(shapeId);
      }
    },
    [unlockShape, currentUser]
  );

  // Check if a shape is locked by current user
  const isShapeLockedByCurrentUser = useCallback(
    (shapeId: string): boolean => {
      const lock = locks.get(shapeId);
      return lock !== undefined && lock.userId === currentUser?.uid;
    },
    [locks, currentUser]
  );

  // Check if a shape is locked by another user
  const isShapeLockedByOtherUser = useCallback(
    (shapeId: string): boolean => {
      const lock = locks.get(shapeId);
      return lock !== undefined && lock.userId !== currentUser?.uid;
    },
    [locks, currentUser]
  );

  // Clear stale locks on reconnect
  const clearStaleLocks = useCallback(async () => {
    if (!currentUser) return;

    console.log('🧹 Clearing stale locks on reconnect...');
    
    const now = Date.now();
    const staleLocks: string[] = [];
    
    // Find locks older than 30 seconds
    locks.forEach((lock, shapeId) => {
      if (now - lock.lockedAt > 30000) { // 30 seconds
        staleLocks.push(shapeId);
      }
    });
    
    // Release stale locks
    for (const shapeId of staleLocks) {
      try {
        await releaseLock(shapeId);
        unlockShape(shapeId);
        console.log(`🧹 Released stale lock for shape: ${shapeId}`);
      } catch (error) {
        console.error(`Failed to release stale lock for ${shapeId}:`, error);
      }
    }
    
    if (staleLocks.length > 0) {
      console.log(`✅ Cleared ${staleLocks.length} stale locks`);
    }
  }, [currentUser, locks, unlockShape]);

  // Get lock info for a shape
  const getShapeLock = useCallback(
    (shapeId: string) => {
      return locks.get(shapeId);
    },
    [locks]
  );

  return {
    locks,
    acquireShapeLock,
    releaseShapeLock,
    clearStaleLocks,
    isShapeLockedByCurrentUser,
    isShapeLockedByOtherUser,
    getShapeLock,
  };
}
