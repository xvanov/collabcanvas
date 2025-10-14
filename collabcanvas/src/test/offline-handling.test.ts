/**
 * Integration tests for offline handling and resync functionality
 * Tests offline queue, reconnection, and stale lock cleanup
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { offlineManager } from '../services/offline';
import { enableFirestoreNetwork, disableFirestoreNetwork, enableRTDBNetwork, disableRTDBNetwork } from '../services/firebase';

// Mock Firebase services
vi.mock('../services/firebase', () => ({
  enableFirestoreNetwork: vi.fn(),
  disableFirestoreNetwork: vi.fn(),
  enableRTDBNetwork: vi.fn(),
  disableRTDBNetwork: vi.fn(),
}));

vi.mock('../services/firestore', () => ({
  createShape: vi.fn(),
  updateShapePosition: vi.fn(),
  subscribeToShapes: vi.fn(),
}));

vi.mock('../services/rtdb', () => ({
  acquireLock: vi.fn(),
  releaseLock: vi.fn(),
  setPresence: vi.fn(),
  updateCursor: vi.fn(),
}));

describe('Offline Handling & Resync', () => {
  beforeEach(() => {
    // Clear all queued updates before each test
    offlineManager.clearQueuedUpdates();
    
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    offlineManager.clearQueuedUpdates();
  });

  describe('Connection State Management', () => {
    it('should track connection state changes', () => {
      const listener = vi.fn();
      const unsubscribe = offlineManager.addConnectionListener(listener);

      // Initial state should be online
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isOnline: true,
          isFirestoreOnline: true,
          isRTDBOnline: true,
        })
      );

      unsubscribe();
    });

    it('should handle offline simulation', async () => {
      const listener = vi.fn();
      const unsubscribe = offlineManager.addConnectionListener(listener);

      await offlineManager.simulateOffline();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isOnline: false,
          isFirestoreOnline: false,
          isRTDBOnline: false,
        })
      );

      unsubscribe();
    });

    it('should handle online simulation', async () => {
      const listener = vi.fn();
      const unsubscribe = offlineManager.addConnectionListener(listener);

      // First go offline
      await offlineManager.simulateOffline();
      
      // Then go online
      await offlineManager.simulateOnline();

      expect(listener).toHaveBeenLastCalledWith(
        expect.objectContaining({
          isOnline: true,
          isFirestoreOnline: true,
          isRTDBOnline: true,
        })
      );

      unsubscribe();
    });
  });

  describe('Queued Updates', () => {
    it('should queue shape creation when offline', () => {
      const shapeId = 'test-shape-1';
      const x = 100;
      const y = 200;
      const userId = 'user-123';

      offlineManager.queueCreateShape(shapeId, x, y, userId);

      expect(offlineManager.getQueuedUpdatesCount()).toBe(1);
      
      const updates = offlineManager.getQueuedUpdates();
      expect(updates).toHaveLength(1);
      expect(updates[0]).toEqual({
        type: 'createShape',
        shapeId,
        x,
        y,
        userId,
        timestamp: expect.any(Number),
      });
    });

    it('should queue position updates when offline', () => {
      const shapeId = 'test-shape-1';
      const x = 150;
      const y = 250;
      const userId = 'user-123';

      offlineManager.queueUpdatePosition(shapeId, x, y, userId);

      expect(offlineManager.getQueuedUpdatesCount()).toBe(1);
      
      const updates = offlineManager.getQueuedUpdates();
      expect(updates).toHaveLength(1);
      expect(updates[0]).toEqual({
        type: 'updatePosition',
        shapeId,
        x,
        y,
        userId,
        timestamp: expect.any(Number),
      });
    });

    it('should replace existing position updates for same shape', () => {
      const shapeId = 'test-shape-1';
      const userId = 'user-123';

      // Queue first position update
      offlineManager.queueUpdatePosition(shapeId, 100, 200, userId);
      expect(offlineManager.getQueuedUpdatesCount()).toBe(1);

      // Queue second position update for same shape
      offlineManager.queueUpdatePosition(shapeId, 150, 250, userId);
      expect(offlineManager.getQueuedUpdatesCount()).toBe(1); // Should still be 1

      const updates = offlineManager.getQueuedUpdates();
      expect(updates[0]).toEqual({
        type: 'updatePosition',
        shapeId,
        x: 150,
        y: 250,
        userId,
        timestamp: expect.any(Number),
      });
    });

    it('should queue lock operations when offline', () => {
      const shapeId = 'test-shape-1';
      const userId = 'user-123';
      const userName = 'Test User';

      offlineManager.queueLockOperation('acquireLock', shapeId, userId, userName);

      expect(offlineManager.getQueuedUpdatesCount()).toBe(1);
      
      const updates = offlineManager.getQueuedUpdates();
      expect(updates[0]).toEqual({
        type: 'acquireLock',
        shapeId,
        userId,
        userName,
        timestamp: expect.any(Number),
      });
    });

    it('should queue presence updates when offline', () => {
      const userId = 'user-123';
      const name = 'Test User';
      const color = '#FF0000';

      offlineManager.queuePresenceUpdate('setPresence', userId, { name, color });

      expect(offlineManager.getQueuedUpdatesCount()).toBe(1);
      
      const updates = offlineManager.getQueuedUpdates();
      expect(updates[0]).toEqual({
        type: 'setPresence',
        userId,
        name,
        color,
        timestamp: expect.any(Number),
      });
    });

    it('should queue cursor updates when offline', () => {
      const userId = 'user-123';
      const cursor = { x: 100, y: 200 };

      offlineManager.queuePresenceUpdate('updateCursor', userId, { cursor });

      expect(offlineManager.getQueuedUpdatesCount()).toBe(1);
      
      const updates = offlineManager.getQueuedUpdates();
      expect(updates[0]).toEqual({
        type: 'updateCursor',
        userId,
        cursor,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Offline Simulation', () => {
    it('should simulate offline mode', async () => {
      await offlineManager.simulateOffline();
      
      expect(disableFirestoreNetwork).toHaveBeenCalled();
      expect(disableRTDBNetwork).toHaveBeenCalled();
    });

    it('should simulate online mode', async () => {
      await offlineManager.simulateOnline();
      
      expect(enableFirestoreNetwork).toHaveBeenCalled();
      expect(enableRTDBNetwork).toHaveBeenCalled();
    });
  });

  describe('Queue Management', () => {
    it('should clear all queued updates', () => {
      // Add some updates
      offlineManager.queueCreateShape('shape-1', 100, 200, 'user-1');
      offlineManager.queueUpdatePosition('shape-2', 150, 250, 'user-1');
      offlineManager.queueLockOperation('acquireLock', 'shape-3', 'user-1', 'User');

      expect(offlineManager.getQueuedUpdatesCount()).toBe(3);

      // Clear all updates
      offlineManager.clearQueuedUpdates();

      expect(offlineManager.getQueuedUpdatesCount()).toBe(0);
      expect(offlineManager.getQueuedUpdates()).toHaveLength(0);
    });

    it('should track queued updates count correctly', () => {
      expect(offlineManager.getQueuedUpdatesCount()).toBe(0);

      offlineManager.queueCreateShape('shape-1', 100, 200, 'user-1');
      expect(offlineManager.getQueuedUpdatesCount()).toBe(1);

      offlineManager.queueUpdatePosition('shape-2', 150, 250, 'user-1');
      expect(offlineManager.getQueuedUpdatesCount()).toBe(2);

      offlineManager.queueLockOperation('acquireLock', 'shape-3', 'user-1', 'User');
      expect(offlineManager.getQueuedUpdatesCount()).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty queue processing', async () => {
      // Should not throw when processing empty queue
      await expect(offlineManager.simulateOnline()).resolves.not.toThrow();
    });

    it('should handle multiple rapid updates', () => {
      const shapeId = 'test-shape';
      const userId = 'user-123';

      // Add multiple rapid position updates
      for (let i = 0; i < 10; i++) {
        offlineManager.queueUpdatePosition(shapeId, i * 10, i * 20, userId);
      }

      // Should only have 1 update (latest position)
      expect(offlineManager.getQueuedUpdatesCount()).toBe(1);
      
      const updates = offlineManager.getQueuedUpdates();
      expect(updates[0]).toEqual({
        type: 'updatePosition',
        shapeId,
        x: 90, // Last update
        y: 180,
        userId,
        timestamp: expect.any(Number),
      });
    });

    it('should handle mixed update types', () => {
      const userId = 'user-123';

      // Add different types of updates
      offlineManager.queueCreateShape('shape-1', 100, 200, userId);
      offlineManager.queueUpdatePosition('shape-2', 150, 250, userId);
      offlineManager.queueLockOperation('acquireLock', 'shape-3', userId, 'User');
      offlineManager.queuePresenceUpdate('setPresence', userId, { name: 'User', color: '#FF0000' });

      expect(offlineManager.getQueuedUpdatesCount()).toBe(4);
      
      const updates = offlineManager.getQueuedUpdates();
      expect(updates).toHaveLength(4);
      expect(updates.map(u => u.type)).toEqual([
        'createShape',
        'updatePosition', 
        'acquireLock',
        'setPresence'
      ]);
    });
  });
});
