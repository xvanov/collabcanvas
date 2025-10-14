import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePresence } from './usePresence';
import { useAuth } from './useAuth';
import { useCanvasStore } from '../store/canvasStore';
import { 
  setPresence, 
  updateCursor, 
  removePresence, 
  subscribeToPresence 
} from '../services/rtdb';

// Mock dependencies
vi.mock('./useAuth');
vi.mock('../store/canvasStore');
vi.mock('../services/rtdb', () => ({
  setPresence: vi.fn(),
  updateCursor: vi.fn(),
  removePresence: vi.fn(),
  subscribeToPresence: vi.fn(),
}));

// Type definitions for mocks
interface MockUseAuth {
  mockReturnValue: (value: { user: typeof mockUser | null }) => void;
}

interface MockUseCanvasStore {
  mockReturnValue: (value: { users: Map<string, unknown>; setUsers: ReturnType<typeof vi.fn> }) => void;
}

describe('usePresence Hook', () => {
  const mockUser = {
    uid: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    photoURL: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useAuth
    (useAuth as MockUseAuth).mockReturnValue({
      user: mockUser,
    });

    // Mock useCanvasStore
    const mockSetUsers = vi.fn();
    (useCanvasStore as MockUseCanvasStore).mockReturnValue({
      users: new Map(),
      setUsers: mockSetUsers,
    });

    // Mock RTDB functions
    vi.mocked(setPresence).mockResolvedValue(undefined);
    vi.mocked(updateCursor).mockResolvedValue(undefined);
    vi.mocked(removePresence).mockResolvedValue(undefined);
    vi.mocked(subscribeToPresence).mockReturnValue(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });


  it('should clean up presence on unmount', async () => {
    const { unmount } = renderHook(() => usePresence());

    // Wait for setup
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    unmount();

    expect(removePresence).toHaveBeenCalledWith(mockUser.uid);
  });

  it('should not set presence if user is not authenticated', () => {
    (useAuth as MockUseAuth).mockReturnValue({
      user: null,
    });

    renderHook(() => usePresence());

    expect(setPresence).not.toHaveBeenCalled();
  });
});
