/**
 * Test utilities for project-scoped canvas store
 * Provides helpers for creating mock stores in tests
 */

import { getProjectCanvasStoreApi, releaseProjectCanvasStore } from '../projectCanvasStore';
import type { StoreApi } from 'zustand';
import type { CanvasState } from '../canvasStore';

/**
 * Create a mock project store for testing
 * Returns a real project-scoped store instance
 */
export function createMockProjectStore(projectId: string): StoreApi<CanvasState> {
  return getProjectCanvasStoreApi(projectId);
}

/**
 * Clean up all project stores used in tests
 * Call this in beforeEach or afterEach to prevent test pollution
 */
export function cleanupProjectStores(projectIds: string[]): void {
  projectIds.forEach(id => {
    releaseProjectCanvasStore(id);
  });
}

/**
 * Reset a project store to initial state
 * Useful for test isolation
 */
export function resetProjectStore(projectId: string): void {
  const store = getProjectCanvasStoreApi(projectId);
  const state = store.getState();
  
  // Clear all mutable state
  state.shapes.clear();
  state.locks.clear();
  state.users.clear();
  
  // Reset other state
  store.setState({
    selectedShapeIds: [],
    selectedShapeId: null,
    currentUser: null,
    layers: [],
    activeLayerId: 'default-layer',
    materialDialogue: null,
    billOfMaterials: null,
    aiCommandHistory: [],
    commandQueue: [],
    isProcessingAICommand: false,
    aiStatus: {
      isProcessing: false,
      currentCommand: null,
      error: undefined,
    },
  });
}

