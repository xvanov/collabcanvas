/**
 * Hook for managing shape locks using Firebase Realtime Database
 * Handles lock acquisition, release, and real-time sync
 */

import { useEffect, useCallback } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { acquireLock, releaseLock, subscribeToLocks } from '../services/rtdb';
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

  // Acquire lock on a shape
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
        return false;
      }
    },
    [currentUser, lockShape]
  );

  // Release lock on a shape
  const releaseShapeLock = useCallback(
    async (shapeId: string): Promise<void> => {
      try {
        await releaseLock(shapeId);
        unlockShape(shapeId);
      } catch (error) {
        console.error('Failed to release lock:', error);
      }
    },
    [unlockShape]
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
    isShapeLockedByCurrentUser,
    isShapeLockedByOtherUser,
    getShapeLock,
  };
}
