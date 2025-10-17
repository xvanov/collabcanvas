/**
 * Unit tests for multi-select and transform operations in canvas store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../store/canvasStore';
import type { Shape } from '../types';

describe('Canvas Store - Multi-Select Operations', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCanvasStore.setState({
      shapes: new Map(),
      selectedShapeIds: [],
      selectedShapeId: null,
      transformControls: {
        isVisible: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        resizeHandles: [],
      },
      selectionBox: null,
    });
  });

  describe('Multi-Select State Management', () => {
    it('should add shape to selection', () => {
      const { addToSelection } = useCanvasStore.getState();
      
      addToSelection('shape1');
      addToSelection('shape2');
      
      const { selectedShapeIds, selectedShapeId } = useCanvasStore.getState();
      expect(selectedShapeIds).toEqual(['shape1', 'shape2']);
      expect(selectedShapeId).toBe('shape2'); // Last selected becomes primary
    });

    it('should not add duplicate shapes to selection', () => {
      const { addToSelection } = useCanvasStore.getState();
      
      addToSelection('shape1');
      addToSelection('shape1'); // Duplicate
      
      const { selectedShapeIds } = useCanvasStore.getState();
      expect(selectedShapeIds).toEqual(['shape1']);
    });

    it('should remove shape from selection', () => {
      const { addToSelection, removeFromSelection } = useCanvasStore.getState();
      
      addToSelection('shape1');
      addToSelection('shape2');
      removeFromSelection('shape1');
      
      const { selectedShapeIds, selectedShapeId } = useCanvasStore.getState();
      expect(selectedShapeIds).toEqual(['shape2']);
      expect(selectedShapeId).toBe('shape2');
    });

    it('should clear selection', () => {
      const { addToSelection, clearSelection } = useCanvasStore.getState();
      
      addToSelection('shape1');
      addToSelection('shape2');
      clearSelection();
      
      const { selectedShapeIds, selectedShapeId, transformControls } = useCanvasStore.getState();
      expect(selectedShapeIds).toEqual([]);
      expect(selectedShapeId).toBeNull();
      expect(transformControls.isVisible).toBe(false);
    });

    it('should select multiple shapes at once', () => {
      const { selectShapes } = useCanvasStore.getState();
      
      selectShapes(['shape1', 'shape2', 'shape3']);
      
      const { selectedShapeIds, selectedShapeId } = useCanvasStore.getState();
      expect(selectedShapeIds).toEqual(['shape1', 'shape2', 'shape3']);
      expect(selectedShapeId).toBe('shape3'); // Last selected becomes primary
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(() => {
      // Set up test shapes
      const shapes = new Map<string, Shape>();
      shapes.set('shape1', {
        id: 'shape1',
        type: 'rect',
        x: 10,
        y: 10,
        w: 100,
        h: 100,
        color: '#3B82F6',
        createdAt: Date.now(),
        createdBy: 'user1',
        updatedAt: Date.now(),
        updatedBy: 'user1',
        clientUpdatedAt: Date.now(),
      });
      shapes.set('shape2', {
        id: 'shape2',
        type: 'circle',
        x: 50,
        y: 50,
        w: 80,
        h: 80,
        color: '#EF4444',
        createdAt: Date.now(),
        createdBy: 'user1',
        updatedAt: Date.now(),
        updatedBy: 'user1',
        clientUpdatedAt: Date.now(),
      });
      
      useCanvasStore.setState({ shapes });
    });

    it('should delete selected shapes', () => {
      const { selectShapes, deleteSelectedShapes } = useCanvasStore.getState();
      
      selectShapes(['shape1', 'shape2']);
      deleteSelectedShapes();
      
      const { shapes, selectedShapeIds, selectedShapeId } = useCanvasStore.getState();
      expect(shapes.size).toBe(0);
      expect(selectedShapeIds).toEqual([]);
      expect(selectedShapeId).toBeNull();
    });

    it('should duplicate selected shapes', () => {
      const { selectShapes, duplicateSelectedShapes } = useCanvasStore.getState();

      selectShapes(['shape1']);
      duplicateSelectedShapes();

      const { shapes, selectedShapeIds } = useCanvasStore.getState();
      expect(shapes.size).toBe(3); // shape1, shape2, and duplicate
      expect(selectedShapeIds.length).toBe(1); // Duplicated shape selected

      // Check that duplicate has offset position
      const duplicatedShape = Array.from(shapes.values()).find(s => s.id !== 'shape1' && s.id !== 'shape2');
      expect(duplicatedShape?.x).toBe(30); // 10 + 20 offset
      expect(duplicatedShape?.y).toBe(30); // 10 + 20 offset
    });

    it('should move selected shapes', () => {
      const { selectShapes, moveSelectedShapes } = useCanvasStore.getState();
      
      selectShapes(['shape1']);
      moveSelectedShapes(10, 20);
      
      const { shapes } = useCanvasStore.getState();
      const shape1 = shapes.get('shape1');
      expect(shape1?.x).toBe(20); // 10 + 10
      expect(shape1?.y).toBe(30); // 10 + 20
    });

    it('should rotate selected shapes', () => {
      const { selectShapes, rotateSelectedShapes } = useCanvasStore.getState();
      
      selectShapes(['shape1']);
      rotateSelectedShapes(90);
      
      const { shapes } = useCanvasStore.getState();
      const shape1 = shapes.get('shape1');
      expect(shape1?.rotation).toBe(90);
    });
  });

  describe('Transform Controls', () => {
    it('should update transform controls', () => {
      const { updateTransformControls } = useCanvasStore.getState();
      
      updateTransformControls({
        isVisible: true,
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        rotation: 45,
        resizeHandles: ['nw', 'ne', 'sw', 'se'],
      });
      
      const { transformControls } = useCanvasStore.getState();
      expect(transformControls.isVisible).toBe(true);
      expect(transformControls.x).toBe(100);
      expect(transformControls.y).toBe(100);
      expect(transformControls.width).toBe(200);
      expect(transformControls.height).toBe(150);
      expect(transformControls.rotation).toBe(45);
      expect(transformControls.resizeHandles).toEqual(['nw', 'ne', 'sw', 'se']);
    });

    it('should hide transform controls', () => {
      const { updateTransformControls, hideTransformControls } = useCanvasStore.getState();
      
      updateTransformControls({ isVisible: true });
      hideTransformControls();
      
      const { transformControls } = useCanvasStore.getState();
      expect(transformControls.isVisible).toBe(false);
    });
  });

  describe('Selection Box', () => {
    it('should set selection box', () => {
      const { setSelectionBox } = useCanvasStore.getState();
      
      setSelectionBox({
        x: 50,
        y: 50,
        width: 100,
        height: 100,
      });
      
      const { selectionBox } = useCanvasStore.getState();
      expect(selectionBox).toEqual({
        x: 50,
        y: 50,
        width: 100,
        height: 100,
      });
    });

    it('should clear selection box', () => {
      const { setSelectionBox } = useCanvasStore.getState();
      
      setSelectionBox({
        x: 50,
        y: 50,
        width: 100,
        height: 100,
      });
      setSelectionBox(null);
      
      const { selectionBox } = useCanvasStore.getState();
      expect(selectionBox).toBeNull();
    });
  });

  describe('Legacy Single Selection Compatibility', () => {
    it('should maintain backward compatibility with single selection', () => {
      const { selectShape, deselectShape } = useCanvasStore.getState();
      
      selectShape('shape1');
      
      const { selectedShapeIds, selectedShapeId } = useCanvasStore.getState();
      expect(selectedShapeIds).toEqual(['shape1']);
      expect(selectedShapeId).toBe('shape1');
      
      deselectShape();
      
      const { selectedShapeIds: clearedIds, selectedShapeId: clearedId } = useCanvasStore.getState();
      expect(clearedIds).toEqual([]);
      expect(clearedId).toBeNull();
    });
  });
});
