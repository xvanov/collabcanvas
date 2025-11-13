/**
 * Tests for project-scoped canvas store
 * Verifies complete project isolation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getProjectCanvasStoreApi, releaseProjectCanvasStore } from '../projectCanvasStore';
import type { Shape, User, AICommandResult, AICommand } from '../../types';

const { processCommandMock } = vi.hoisted(() => ({
  processCommandMock: vi.fn(),
}));

vi.mock('../../services/aiService', () => {
  return {
    AIService: vi.fn().mockImplementation(() => ({
      processCommand: processCommandMock,
    })),
  };
});

describe('Project Canvas Store', () => {
  const projectId1 = 'project-1';
  const projectId2 = 'project-2';

  beforeEach(() => {
    // Clean up stores between tests
    releaseProjectCanvasStore(projectId1);
    releaseProjectCanvasStore(projectId2);
    processCommandMock.mockReset();
  });

  describe('Store Isolation', () => {
    it('should create separate stores for different projects', () => {
      const store1 = getProjectCanvasStoreApi(projectId1);
      const store2 = getProjectCanvasStoreApi(projectId2);

      expect(store1).toBeDefined();
      expect(store2).toBeDefined();
      expect(store1).not.toBe(store2);
    });

    it('should isolate shapes between projects', () => {
      const store1 = getProjectCanvasStoreApi(projectId1);
      const store2 = getProjectCanvasStoreApi(projectId2);

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

      // Add shape to project 1
      store1.getState().createShape(shape1);

      // Verify shape exists in project 1
      expect(store1.getState().shapes.has('shape-1')).toBe(true);
      expect(store1.getState().shapes.get('shape-1')).toEqual(shape1);

      // Verify shape does NOT exist in project 2
      expect(store2.getState().shapes.has('shape-1')).toBe(false);
      expect(store2.getState().shapes.size).toBe(0);
    });

    it('should isolate layers between projects', () => {
      const store1 = getProjectCanvasStoreApi(projectId1);
      const store2 = getProjectCanvasStoreApi(projectId2);

      // Create layer in project 1
      store1.getState().createLayer('Layer 1', 'layer-1');

      // Verify layer exists in project 1
      expect(store1.getState().layers.length).toBe(1);
      expect(store1.getState().layers[0].id).toBe('layer-1');
      expect(store1.getState().layers[0].name).toBe('Layer 1');

      // Verify layer does NOT exist in project 2
      expect(store2.getState().layers.length).toBe(0);
    });

    it('should isolate selection between projects', () => {
      const store1 = getProjectCanvasStoreApi(projectId1);
      const store2 = getProjectCanvasStoreApi(projectId2);

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

      // Add shape and select it in project 1
      store1.getState().createShape(shape1);
      store1.getState().selectShapes(['shape-1']);

      // Verify selection in project 1
      expect(store1.getState().selectedShapeIds).toEqual(['shape-1']);

      // Verify no selection in project 2
      expect(store2.getState().selectedShapeIds).toEqual([]);
    });

    it('should isolate active layer between projects', () => {
      const store1 = getProjectCanvasStoreApi(projectId1);
      const store2 = getProjectCanvasStoreApi(projectId2);

      // Create layers in both projects
      store1.getState().createLayer('Layer 1', 'layer-1');
      store2.getState().createLayer('Layer 2', 'layer-2');

      // Set active layer in project 1
      store1.getState().setActiveLayer('layer-1', projectId1);

      // Verify active layer in project 1
      expect(store1.getState().activeLayerId).toBe('layer-1');

      // Set active layer in project 2
      store2.getState().setActiveLayer('layer-2', projectId2);

      // Verify active layer in project 2 is different
      expect(store2.getState().activeLayerId).toBe('layer-2');
    });
  });

  describe('AI Command Handling', () => {
    it('forwards user and view context separately to AIService', async () => {
      const store = getProjectCanvasStoreApi(projectId1);
      const user: User = {
        uid: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        photoURL: null,
      };

      store.getState().setCurrentUser(user);

      const mockResult: AICommandResult = {
        success: true,
        message: 'processed',
        executedCommands: [
          {
            type: 'noop' as AICommand['type'],
            action: 'noop',
            parameters: {} as AICommand['parameters'],
            confidence: 1,
            timestamp: Date.now(),
            userId: user.uid,
            commandId: 'cmd-1',
          },
        ],
      };

      processCommandMock.mockResolvedValue(mockResult);

      await store.getState().processAICommand('draw a wall', 'space');

      expect(processCommandMock).toHaveBeenCalledTimes(1);
      expect(processCommandMock).toHaveBeenCalledWith('draw a wall', user.uid, 'space');
    });
  });

  describe('Store Reuse', () => {
    it('should return the same store instance for the same projectId', () => {
      const store1 = getProjectCanvasStoreApi(projectId1);
      const store2 = getProjectCanvasStoreApi(projectId1);

      expect(store1).toBe(store2);
    });

    it('should maintain state when getting store multiple times', () => {
      const store1 = getProjectCanvasStoreApi(projectId1);
      
      const shape: Shape = {
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

      store1.getState().createShape(shape);

      // Get store again
      const store2 = getProjectCanvasStoreApi(projectId1);

      // Verify state is preserved
      expect(store2.getState().shapes.has('shape-1')).toBe(true);
    });
  });

  describe('Reference Counting', () => {
    it('should track store references', () => {
      const store1 = getProjectCanvasStoreApi(projectId1);
      const store2 = getProjectCanvasStoreApi(projectId1); // Same project, should increment ref count

      expect(store1).toBe(store2);

      // Release once
      releaseProjectCanvasStore(projectId1);
      
      // Store should still exist (ref count > 0)
      const store3 = getProjectCanvasStoreApi(projectId1);
      expect(store3).toBe(store1);
    });
  });

  describe('Multiple Projects', () => {
    it('should handle multiple projects simultaneously', () => {
      const store1 = getProjectCanvasStoreApi(projectId1);
      const store2 = getProjectCanvasStoreApi(projectId2);

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

      // Add different shapes to different projects
      store1.getState().createShape(shape1);
      store2.getState().createShape(shape2);

      // Verify isolation
      expect(store1.getState().shapes.size).toBe(1);
      expect(store1.getState().shapes.has('shape-1')).toBe(true);
      expect(store1.getState().shapes.has('shape-2')).toBe(false);

      expect(store2.getState().shapes.size).toBe(1);
      expect(store2.getState().shapes.has('shape-1')).toBe(false);
      expect(store2.getState().shapes.has('shape-2')).toBe(true);
    });
  });
});

