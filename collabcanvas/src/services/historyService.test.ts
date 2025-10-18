/**
 * Tests for History Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CanvasHistoryService, createHistoryService, createAction } from '../services/historyService';
import type { CanvasAction, Shape } from '../types';

describe('CanvasHistoryService', () => {
  let historyService: CanvasHistoryService;
  let mockOnActionApplied: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnActionApplied = vi.fn();
    historyService = createHistoryService(10); // Small history for testing
    historyService.setOnActionApplied(mockOnActionApplied);
  });

  describe('pushAction', () => {
    it('should add action to history', () => {
      const action: CanvasAction = {
        type: 'CREATE',
        shapeId: 'shape1',
        data: { id: 'shape1', type: 'rect', x: 0, y: 0, w: 100, h: 100, color: '#3B82F6' },
        timestamp: Date.now(),
        userId: 'user1',
      };

      historyService.pushAction(action);

      expect(historyService.canUndo()).toBe(true);
      expect(historyService.canRedo()).toBe(false);
    });

    it('should clear future when new action is pushed', () => {
      const action1: CanvasAction = {
        type: 'CREATE',
        shapeId: 'shape1',
        data: { id: 'shape1', type: 'rect', x: 0, y: 0, w: 100, h: 100, color: '#3B82F6' },
        timestamp: Date.now(),
        userId: 'user1',
      };

      const action2: CanvasAction = {
        type: 'CREATE',
        shapeId: 'shape2',
        data: { id: 'shape2', type: 'circle', x: 50, y: 50, w: 50, h: 50, color: '#FF0000' },
        timestamp: Date.now(),
        userId: 'user1',
      };

      historyService.pushAction(action1);
      historyService.undo(); // Move to past
      historyService.pushAction(action2); // This should clear future

      expect(historyService.canRedo()).toBe(false);
    });

    it('should limit history size', () => {
      const actions: CanvasAction[] = [];
      for (let i = 0; i < 15; i++) {
        actions.push({
          type: 'CREATE',
          shapeId: `shape${i}`,
          data: { id: `shape${i}`, type: 'rect', x: i * 10, y: 0, w: 100, h: 100, color: '#3B82F6' },
          timestamp: Date.now(),
          userId: 'user1',
        });
      }

      actions.forEach(action => historyService.pushAction(action));

      const historyState = historyService.getHistoryState();
      expect(historyState.past.length).toBeLessThanOrEqual(10);
    });
  });

  describe('undo', () => {
    it('should undo the last action', () => {
      const action: CanvasAction = {
        type: 'CREATE',
        shapeId: 'shape1',
        data: { id: 'shape1', type: 'rect', x: 0, y: 0, w: 100, h: 100, color: '#3B82F6' },
        timestamp: Date.now(),
        userId: 'user1',
      };

      historyService.pushAction(action);
      const undoneAction = historyService.undo();

      expect(undoneAction).toEqual(action);
      expect(historyService.canUndo()).toBe(false);
      expect(historyService.canRedo()).toBe(true);
      expect(mockOnActionApplied).toHaveBeenCalledWith({
        type: 'DELETE',
        shapeId: 'shape1',
        data: { id: 'shape1', type: 'rect', x: 0, y: 0, w: 100, h: 100, color: '#3B82F6' },
        timestamp: expect.any(Number),
        userId: 'user1',
      });
    });

    it('should return null when no actions to undo', () => {
      const undoneAction = historyService.undo();
      expect(undoneAction).toBeNull();
    });
  });

  describe('redo', () => {
    it('should redo the next action', () => {
      const action: CanvasAction = {
        type: 'CREATE',
        shapeId: 'shape1',
        data: { id: 'shape1', type: 'rect', x: 0, y: 0, w: 100, h: 100, color: '#3B82F6' },
        timestamp: Date.now(),
        userId: 'user1',
      };

      historyService.pushAction(action);
      historyService.undo(); // Move to past
      const redoneAction = historyService.redo();

      expect(redoneAction).toEqual(action);
      expect(historyService.canUndo()).toBe(true);
      expect(historyService.canRedo()).toBe(false);
      expect(mockOnActionApplied).toHaveBeenCalledWith(action);
    });

    it('should return null when no actions to redo', () => {
      const redoneAction = historyService.redo();
      expect(redoneAction).toBeNull();
    });
  });

  describe('clearHistory', () => {
    it('should clear all history', () => {
      const action: CanvasAction = {
        type: 'CREATE',
        shapeId: 'shape1',
        data: { id: 'shape1', type: 'rect', x: 0, y: 0, w: 100, h: 100, color: '#3B82F6' },
        timestamp: Date.now(),
        userId: 'user1',
      };

      historyService.pushAction(action);
      historyService.clearHistory();

      expect(historyService.canUndo()).toBe(false);
      expect(historyService.canRedo()).toBe(false);
    });
  });

  describe('createAction helpers', () => {
    const mockShape: Shape = {
      id: 'shape1',
      type: 'rect',
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      color: '#3B82F6',
      createdAt: Date.now(),
      createdBy: 'user1',
      updatedAt: Date.now(),
      updatedBy: 'user1',
      clientUpdatedAt: Date.now(),
    };

    it('should create CREATE action', () => {
      const action = createAction.create('shape1', mockShape, 'user1');
      
      expect(action.type).toBe('CREATE');
      expect(action.shapeId).toBe('shape1');
      expect(action.data).toEqual(mockShape);
      expect(action.userId).toBe('user1');
    });

    it('should create DELETE action', () => {
      const action = createAction.delete('shape1', mockShape, 'user1');
      
      expect(action.type).toBe('DELETE');
      expect(action.shapeId).toBe('shape1');
      expect(action.data).toEqual(mockShape);
      expect(action.userId).toBe('user1');
    });

    it('should create UPDATE action', () => {
      const action = createAction.update('shape1', 'color', '#FF0000', '#3B82F6', 'user1');
      
      expect(action.type).toBe('UPDATE');
      expect(action.shapeId).toBe('shape1');
      expect(action.data.property).toBe('color');
      expect(action.data.newValue).toBe('#FF0000');
      expect(action.data.previousData).toEqual({ color: '#3B82F6' });
      expect(action.userId).toBe('user1');
    });

    it('should create MOVE action', () => {
      const action = createAction.move('shape1', 100, 200, 0, 0, 'user1');
      
      expect(action.type).toBe('MOVE');
      expect(action.shapeId).toBe('shape1');
      expect(action.data.x).toBe(100);
      expect(action.data.y).toBe(200);
      expect(action.data.previousX).toBe(0);
      expect(action.data.previousY).toBe(0);
      expect(action.userId).toBe('user1');
    });

    it('should create BULK_DELETE action', () => {
      const action = createAction.bulkDelete(['shape1', 'shape2'], [mockShape], 'user1');
      
      expect(action.type).toBe('BULK_DELETE');
      expect(action.shapeIds).toEqual(['shape1', 'shape2']);
      expect(action.data).toEqual([mockShape]);
      expect(action.userId).toBe('user1');
    });

    it('should create BULK_DUPLICATE action', () => {
      const action = createAction.bulkDuplicate(['shape1'], [mockShape], 'user1');
      
      expect(action.type).toBe('BULK_DUPLICATE');
      expect(action.shapeIds).toEqual(['shape1']);
      expect(action.data).toEqual([mockShape]);
      expect(action.userId).toBe('user1');
    });

    it('should create BULK_MOVE action', () => {
      const action = createAction.bulkMove(['shape1', 'shape2'], 10, 20, 'user1');
      
      expect(action.type).toBe('BULK_MOVE');
      expect(action.shapeIds).toEqual(['shape1', 'shape2']);
      expect(action.data.deltaX).toBe(10);
      expect(action.data.deltaY).toBe(20);
      expect(action.userId).toBe('user1');
    });

    it('should create BULK_ROTATE action', () => {
      const action = createAction.bulkRotate(['shape1'], 90, 'user1');
      
      expect(action.type).toBe('BULK_ROTATE');
      expect(action.shapeIds).toEqual(['shape1']);
      expect(action.data.angle).toBe(90);
      expect(action.userId).toBe('user1');
    });
  });
});
