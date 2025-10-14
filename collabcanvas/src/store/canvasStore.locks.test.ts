/**
 * Tests for canvasStore lock management
 * Tests lock state management in Zustand store
 */

import { act } from '@testing-library/react';
import { useCanvasStore } from '../store/canvasStore';

describe('canvasStore lock management', () => {
  beforeEach(() => {
    // Reset store state
    useCanvasStore.setState({
      locks: new Map(),
      selectedShapeId: null,
      shapes: new Map(),
      users: new Map(),
      currentUser: null,
    });
  });

  it('should lock a shape', () => {
    const { lockShape } = useCanvasStore.getState();

    act(() => {
      lockShape('shape1', 'user1', 'Test User');
    });

    const { locks } = useCanvasStore.getState();
    const lock = locks.get('shape1');
    
    expect(lock).toBeDefined();
    expect(lock?.userId).toBe('user1');
    expect(lock?.userName).toBe('Test User');
    expect(lock?.lockedAt).toBeCloseTo(Date.now(), -2); // Within 100ms
  });

  it('should unlock a shape', () => {
    const { lockShape, unlockShape } = useCanvasStore.getState();

    act(() => {
      lockShape('shape1', 'user1', 'Test User');
    });

    act(() => {
      unlockShape('shape1');
    });

    const { locks } = useCanvasStore.getState();
    expect(locks.has('shape1')).toBe(false);
  });

  it('should overwrite existing lock', () => {
    const { lockShape } = useCanvasStore.getState();

    act(() => {
      lockShape('shape1', 'user1', 'Test User');
    });

    act(() => {
      lockShape('shape1', 'user2', 'Another User');
    });

    const { locks } = useCanvasStore.getState();
    const lock = locks.get('shape1');
    
    expect(lock?.userId).toBe('user2');
    expect(lock?.userName).toBe('Another User');
  });

  it('should set multiple locks', () => {
    const { setLocks } = useCanvasStore.getState();

    const locksData = [
      { shapeId: 'shape1', lock: { userId: 'user1', userName: 'User 1', lockedAt: Date.now() } },
      { shapeId: 'shape2', lock: { userId: 'user2', userName: 'User 2', lockedAt: Date.now() } },
    ];

    act(() => {
      setLocks(locksData);
    });

    const { locks } = useCanvasStore.getState();
    expect(locks.size).toBe(2);
    expect(locks.get('shape1')?.userName).toBe('User 1');
    expect(locks.get('shape2')?.userName).toBe('User 2');
  });

  it('should clear all locks when setting empty array', () => {
    const { lockShape, setLocks } = useCanvasStore.getState();

    act(() => {
      lockShape('shape1', 'user1', 'Test User');
    });

    act(() => {
      setLocks([]);
    });

    const { locks } = useCanvasStore.getState();
    expect(locks.size).toBe(0);
  });

  it('should handle lock operations with multiple shapes', () => {
    const { lockShape, unlockShape } = useCanvasStore.getState();

    act(() => {
      lockShape('shape1', 'user1', 'User 1');
      lockShape('shape2', 'user2', 'User 2');
      lockShape('shape3', 'user3', 'User 3');
    });

    const { locks } = useCanvasStore.getState();
    expect(locks.size).toBe(3);

    act(() => {
      unlockShape('shape2');
    });

    const { locks: updatedLocks } = useCanvasStore.getState();
    expect(updatedLocks.size).toBe(2);
    expect(updatedLocks.has('shape1')).toBe(true);
    expect(updatedLocks.has('shape2')).toBe(false);
    expect(updatedLocks.has('shape3')).toBe(true);
  });
});
