/**
 * Tests for useLocks hook
 * Tests shape locking functionality with RTDB integration
 */

import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useLocks } from '../hooks/useLocks';
import { useCanvasStore } from '../store/canvasStore';
import * as rtdb from '../services/rtdb';

// Mock the RTDB service
vi.mock('../services/rtdb');
const mockRtdb = rtdb as Record<string, unknown>;

// Mock the canvas store
vi.mock('../store/canvasStore');
const mockUseCanvasStore = useCanvasStore as (selector: (state: unknown) => unknown) => unknown;

describe('useLocks', () => {
  const mockUser = {
    uid: 'user1',
    name: 'Test User',
    email: 'test@example.com',
    photoURL: null,
  };

  const mockLock = {
    userId: 'user1',
    userName: 'Test User',
    lockedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock canvas store
    mockUseCanvasStore.mockImplementation((selector: (state: unknown) => unknown) => {
      const mockState = {
        currentUser: mockUser,
        locks: new Map([['shape1', mockLock]]),
        setLocks: vi.fn(),
        lockShape: vi.fn(),
        unlockShape: vi.fn(),
      };
      return selector(mockState);
    });

    // Mock RTDB functions
    mockRtdb.subscribeToLocks.mockReturnValue(vi.fn());
    mockRtdb.acquireLock.mockResolvedValue(true);
    mockRtdb.releaseLock.mockResolvedValue();
  });

  it('should clean up presence on unmount', () => {
    const unsubscribe = vi.fn();
    mockRtdb.subscribeToLocks.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useLocks());

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('should not set up locks if user is not authenticated', () => {
    mockUseCanvasStore.mockImplementation((selector: (state: unknown) => unknown) => {
      const mockState = {
        currentUser: null,
        locks: new Map(),
        setLocks: vi.fn(),
        lockShape: vi.fn(),
        unlockShape: vi.fn(),
      };
      return selector(mockState);
    });

    renderHook(() => useLocks());

    expect(mockRtdb.subscribeToLocks).not.toHaveBeenCalled();
  });

  it('should acquire lock successfully', async () => {
    const { result } = renderHook(() => useLocks());

    await act(async () => {
      const success = await result.current.acquireShapeLock('shape1');
      expect(success).toBe(true);
    });

    expect(mockRtdb.acquireLock).toHaveBeenCalledWith('shape1', 'user1', 'Test User');
  });

  it('should release lock successfully', async () => {
    const { result } = renderHook(() => useLocks());

    await act(async () => {
      await result.current.releaseShapeLock('shape1');
    });

    expect(mockRtdb.releaseLock).toHaveBeenCalledWith('shape1');
  });

  it('should check if shape is locked by current user', () => {
    const { result } = renderHook(() => useLocks());

    const isLocked = result.current.isShapeLockedByCurrentUser('shape1');
    expect(isLocked).toBe(true);
  });

  it('should check if shape is locked by other user', () => {
    mockUseCanvasStore.mockImplementation((selector: (state: unknown) => unknown) => {
      const mockState = {
        currentUser: mockUser,
        locks: new Map([['shape1', { ...mockLock, userId: 'user2' }]]),
        setLocks: vi.fn(),
        lockShape: vi.fn(),
        unlockShape: vi.fn(),
      };
      return selector(mockState);
    });

    const { result } = renderHook(() => useLocks());

    const isLocked = result.current.isShapeLockedByOtherUser('shape1');
    expect(isLocked).toBe(true);
  });

  it('should get lock info for a shape', () => {
    const { result } = renderHook(() => useLocks());

    const lock = result.current.getShapeLock('shape1');
    expect(lock).toEqual(mockLock);
  });
});
