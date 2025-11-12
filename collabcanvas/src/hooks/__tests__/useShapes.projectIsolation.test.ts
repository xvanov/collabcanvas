/**
 * Tests for useShapes hook with project isolation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useShapes } from '../useShapes';
import { getProjectCanvasStoreApi, releaseProjectCanvasStore } from '../../store/projectCanvasStore';
import type { Shape } from '../../types';

// Mock dependencies
vi.mock('../useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'test-user' },
  }),
}));

// Mock firestore with hoisted functions to prevent infinite loops
const { mockSubscribeToShapesChanges } = vi.hoisted(() => {
  const mockUnsubscribe = vi.fn(() => {});
  const mockSubscribe = vi.fn((_projectId: string, _callback: (changes: unknown[]) => void) => {
    // Don't call the callback - this prevents infinite loops
    // The callback would trigger store updates which cause re-renders
    return mockUnsubscribe;
  });
  return { mockSubscribeToShapesChanges: mockSubscribe };
});

vi.mock('../../services/firestore', () => ({
  createShape: vi.fn((_projectId: string, ..._args: unknown[]) => Promise.resolve()),
  updateShapePosition: vi.fn((_projectId: string, ..._args: unknown[]) => Promise.resolve()),
  updateShapeProperty: vi.fn((_projectId: string, ..._args: unknown[]) => Promise.resolve()),
  deleteShape: vi.fn((_projectId: string, ..._args: unknown[]) => Promise.resolve()),
  subscribeToShapesChanges: mockSubscribeToShapesChanges,
}));

// Mock the scoped store to prevent infinite loops by using stable values
vi.mock('../../store/projectCanvasStore', async () => {
  const actual = await vi.importActual('../../store/projectCanvasStore') as {
    getProjectCanvasStoreApi: (projectId: string) => unknown;
    getDefaultState?: () => unknown;
    canvasStoreApi?: unknown;
  };
  const { getProjectCanvasStoreApi: actualGetProjectCanvasStoreApi } = actual;
  
  return {
    ...actual,
    useScopedCanvasStore: vi.fn((projectId: string | undefined, selector: (state: unknown) => unknown, _equalityFn?: unknown) => {
      // Use actual store but return stable selector result
      let store;
      if (projectId) {
        store = actualGetProjectCanvasStoreApi(projectId);
      } else {
        // For undefined projectId, use the default state with proper structure
        const getDefaultState = actual.getDefaultState;
        const defaultState = getDefaultState ? getDefaultState() : {
          shapes: new Map(),
          createShape: vi.fn(),
          updateShapePosition: vi.fn(),
          setShapesFromMap: vi.fn(),
        };
        return selector(defaultState);
      }
      const storeApi = store as { getState: () => unknown };
      const result = selector(storeApi.getState());
      // Return the result directly without subscribing to prevent infinite loops
      return result;
    }),
    useScopedCanvasStoreApi: vi.fn((projectId: string | undefined) => {
      return projectId ? actualGetProjectCanvasStoreApi(projectId) : actual.canvasStoreApi;
    }),
  };
});

describe('useShapes - Project Isolation', () => {
  const projectId1 = 'project-1';
  const projectId2 = 'project-2';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up project stores
    releaseProjectCanvasStore(projectId1);
    releaseProjectCanvasStore(projectId2);
  });

  it('should use project-scoped store when projectId is provided', () => {
    const { result } = renderHook(() => useShapes(projectId1));

    expect(result.current).toBeDefined();
    
    // Verify the hook returns functions
    expect(result.current.createShape).toBeDefined();
    expect(result.current.updateShapePosition).toBeDefined();
  });

  it('should isolate shapes between different projects', async () => {
    const { result: result1 } = renderHook(() => useShapes(projectId1));
    const { result: result2 } = renderHook(() => useShapes(projectId2));

    const shape1: Shape = {
      id: 'shape-1',
      type: 'rect',
      x: 100,
      y: 100,
      w: 50,
      h: 50,
      color: '#FF0000',
      createdAt: Date.now(),
      createdBy: 'user-1',
      updatedAt: Date.now(),
      updatedBy: 'user-1',
      clientUpdatedAt: Date.now(),
    };

    const shape2: Shape = {
      id: 'shape-2',
      type: 'circle',
      x: 200,
      y: 200,
      w: 50,
      h: 50,
      color: '#00FF00',
      createdAt: Date.now(),
      createdBy: 'user-1',
      updatedAt: Date.now(),
      updatedBy: 'user-1',
      clientUpdatedAt: Date.now(),
      radius: 25,
    };

    // Create shapes in different projects
    result1.current.createShape(shape1);
    result2.current.createShape(shape2);

    // Wait for state updates
    await waitFor(() => {
      const store1 = getProjectCanvasStoreApi(projectId1);
      const store2 = getProjectCanvasStoreApi(projectId2);

      // Verify isolation
      expect(store1.getState().shapes.has('shape-1')).toBe(true);
      expect(store1.getState().shapes.has('shape-2')).toBe(false);

      expect(store2.getState().shapes.has('shape-1')).toBe(false);
      expect(store2.getState().shapes.has('shape-2')).toBe(true);
    });
  });

  it('should fall back to global store when projectId is undefined', () => {
    const { result } = renderHook(() => useShapes(undefined));

    expect(result.current).toBeDefined();
    expect(result.current.createShape).toBeDefined();
  });
});

