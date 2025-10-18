/**
 * History service for undo/redo functionality
 * Manages command history and provides undo/redo operations
 */

import type { CanvasAction, HistoryState, Shape, UpdateActionData, MoveActionData, BulkMoveActionData, BulkRotateActionData } from '../types';

export interface HistoryService {
  pushAction: (action: CanvasAction) => void;
  undo: () => CanvasAction | null;
  redo: () => CanvasAction | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  getHistoryState: () => HistoryState;
}

/**
 * Default history configuration
 */
export const DEFAULT_HISTORY_CONFIG = {
  maxHistorySize: 50,
};

/**
 * History service implementation
 */
export class CanvasHistoryService implements HistoryService {
  private history: HistoryState;
  private onActionApplied?: (action: CanvasAction) => void;

  constructor(maxHistorySize: number = DEFAULT_HISTORY_CONFIG.maxHistorySize) {
    this.history = {
      past: [],
      present: null,
      future: [],
      maxHistorySize,
    };
  }

  /**
   * Set callback for when actions are applied
   */
  setOnActionApplied(callback: (action: CanvasAction) => void): void {
    this.onActionApplied = callback;
  }

  /**
   * Push a new action to history
   */
  pushAction(action: CanvasAction): void {
    // Clear future when new action is pushed
    this.history.future = [];
    
    // Add current present to past if it exists
    if (this.history.present) {
      this.history.past.push(this.history.present);
    }

    // Set new action as present
    this.history.present = action;

    // Limit history size
    if (this.history.past.length > this.history.maxHistorySize) {
      this.history.past = this.history.past.slice(-this.history.maxHistorySize);
    }
  }

  /**
   * Undo the last action
   */
  undo(): CanvasAction | null {
    if (!this.canUndo()) {
      return null;
    }

    const currentAction = this.history.present;
    if (!currentAction) {
      return null;
    }

    // Move current action to future
    this.history.future.unshift(currentAction);

    // Get previous action from past
    const previousAction = this.history.past.pop() || null;
    this.history.present = previousAction;

    // Apply the undo action
    if (this.onActionApplied) {
      this.onActionApplied(this.createUndoAction(currentAction));
    }

    return currentAction;
  }

  /**
   * Redo the next action
   */
  redo(): CanvasAction | null {
    if (!this.canRedo()) {
      return null;
    }

    const nextAction = this.history.future.shift();
    if (!nextAction) {
      return null;
    }

    // Move current present to past if it exists
    if (this.history.present) {
      this.history.past.push(this.history.present);
    }

    // Set next action as present
    this.history.present = nextAction;

    // Apply the redo action
    if (this.onActionApplied) {
      this.onActionApplied(nextAction);
    }

    return nextAction;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.history.present !== null;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.history.future.length > 0;
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.history = {
      past: [],
      present: null,
      future: [],
      maxHistorySize: this.history.maxHistorySize,
    };
  }

  /**
   * Get current history state
   */
  getHistoryState(): HistoryState {
    return { ...this.history };
  }

  /**
   * Create undo action from original action
   */
  private createUndoAction(originalAction: CanvasAction): CanvasAction {
    switch (originalAction.type) {
      case 'CREATE':
        return {
          type: 'DELETE',
          shapeId: originalAction.shapeId,
          data: originalAction.data,
          timestamp: Date.now(),
          userId: originalAction.userId,
        };
      
      case 'DELETE':
        return {
          type: 'CREATE',
          shapeId: originalAction.shapeId,
          data: originalAction.data,
          timestamp: Date.now(),
          userId: originalAction.userId,
        };
      
      case 'UPDATE':
        return {
          type: 'UPDATE',
          shapeId: originalAction.shapeId,
          data: (originalAction.data as UpdateActionData).previousData,
          timestamp: Date.now(),
          userId: originalAction.userId,
        };
      
      case 'MOVE':
        return {
          type: 'MOVE',
          shapeId: originalAction.shapeId,
          data: {
            x: (originalAction.data as MoveActionData).previousX,
            y: (originalAction.data as MoveActionData).previousY,
          },
          timestamp: Date.now(),
          userId: originalAction.userId,
        };
      
      case 'BULK_DELETE':
        return {
          type: 'BULK_DUPLICATE',
          shapeIds: originalAction.shapeIds,
          data: originalAction.data, // Data is already the array of deleted shapes
          timestamp: Date.now(),
          userId: originalAction.userId,
        };
      
      case 'BULK_DUPLICATE':
        return {
          type: 'BULK_DELETE',
          shapeIds: originalAction.shapeIds,
          data: originalAction.data,
          timestamp: Date.now(),
          userId: originalAction.userId,
        };
      
      case 'BULK_MOVE':
        return {
          type: 'BULK_MOVE',
          shapeIds: originalAction.shapeIds,
          data: {
            deltaX: -(originalAction.data as BulkMoveActionData).deltaX,
            deltaY: -(originalAction.data as BulkMoveActionData).deltaY,
          },
          timestamp: Date.now(),
          userId: originalAction.userId,
        };
      
      case 'BULK_ROTATE':
        return {
          type: 'BULK_ROTATE',
          shapeIds: originalAction.shapeIds,
          data: {
            angle: -(originalAction.data as BulkRotateActionData).angle,
          },
          timestamp: Date.now(),
          userId: originalAction.userId,
        };
      
      default:
        return originalAction;
    }
  }
}

/**
 * Create history service instance
 */
export const createHistoryService = (maxHistorySize?: number): CanvasHistoryService => {
  return new CanvasHistoryService(maxHistorySize);
};

/**
 * Helper functions for creating common actions
 */
export const createAction = {
  create: (shapeId: string, shape: Shape, userId: string): CanvasAction => ({
    type: 'CREATE',
    shapeId,
    data: shape,
    timestamp: Date.now(),
    userId,
  }),

  delete: (shapeId: string, shape: Shape, userId: string): CanvasAction => ({
    type: 'DELETE',
    shapeId,
    data: shape,
    timestamp: Date.now(),
    userId,
  }),

  update: (shapeId: string, property: string, newValue: unknown, previousValue: unknown, userId: string): CanvasAction => ({
    type: 'UPDATE',
    shapeId,
    data: {
      property,
      newValue,
      previousData: { [property]: previousValue },
    },
    timestamp: Date.now(),
    userId,
  }),

  move: (shapeId: string, newX: number, newY: number, previousX: number, previousY: number, userId: string): CanvasAction => ({
    type: 'MOVE',
    shapeId,
    data: {
      x: newX,
      y: newY,
      previousX,
      previousY,
    },
    timestamp: Date.now(),
    userId,
  }),

  bulkDelete: (shapeIds: string[], deletedShapes: Shape[], userId: string): CanvasAction => ({
    type: 'BULK_DELETE',
    shapeIds,
    data: deletedShapes,
    timestamp: Date.now(),
    userId,
  }),

  bulkDuplicate: (shapeIds: string[], duplicatedShapes: Shape[], userId: string): CanvasAction => ({
    type: 'BULK_DUPLICATE',
    shapeIds,
    data: duplicatedShapes,
    timestamp: Date.now(),
    userId,
  }),

  bulkMove: (shapeIds: string[], deltaX: number, deltaY: number, userId: string): CanvasAction => ({
    type: 'BULK_MOVE',
    shapeIds,
    data: { deltaX, deltaY },
    timestamp: Date.now(),
    userId,
  }),

  bulkRotate: (shapeIds: string[], angle: number, userId: string): CanvasAction => ({
    type: 'BULK_ROTATE',
    shapeIds,
    data: { angle },
    timestamp: Date.now(),
    userId,
  }),
};
