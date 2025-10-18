/**
 * Tests for canvasStore layers and alignment functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../store/canvasStore';
import type { Shape } from '../types';

describe('canvasStore - Layers and Alignment', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCanvasStore.setState({
      shapes: new Map(),
      layers: [
        {
          id: 'default-layer',
          name: 'Default Layer',
          shapes: [],
          visible: true,
          locked: false,
          order: 0,
        },
      ],
      selectedShapeIds: [],
      gridState: {
        isVisible: false,
        isSnapEnabled: false,
        size: 20,
        color: '#E5E7EB',
        opacity: 0.5,
      },
      snapIndicators: [],
    });
  });

  describe('Layer Management', () => {
    it('should create a new layer', () => {
      const { createLayer } = useCanvasStore.getState();
      
      createLayer('Test Layer');
      
      const updatedState = useCanvasStore.getState();
      expect(updatedState.layers).toHaveLength(2);
      expect(updatedState.layers[1].name).toBe('Test Layer');
      expect(updatedState.layers[1].visible).toBe(true);
      expect(updatedState.layers[1].locked).toBe(false);
    });

    it('should update layer properties', () => {
      const { createLayer, updateLayer } = useCanvasStore.getState();
      
      createLayer('Test Layer');
      const newLayer = useCanvasStore.getState().layers[1];
      
      updateLayer(newLayer.id, { name: 'Updated Layer', visible: false });
      
      const updatedState = useCanvasStore.getState();
      const updatedLayer = updatedState.layers.find(l => l.id === newLayer.id);
      expect(updatedLayer?.name).toBe('Updated Layer');
      expect(updatedLayer?.visible).toBe(false);
    });

    it('should delete layer and move shapes to default layer', () => {
      const { createLayer, createShape, deleteLayer } = useCanvasStore.getState();
      
      // Create a layer and add a shape to it
      createLayer('Test Layer');
      const newLayer = useCanvasStore.getState().layers[1];
      
      const testShape: Shape = {
        id: 'test-shape',
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
        layerId: newLayer.id,
      };
      
      createShape(testShape);
      
      // Update the layer to include the shape
      const { updateLayer } = useCanvasStore.getState();
      updateLayer(newLayer.id, { shapes: ['test-shape'] });
      
      // Delete the layer
      deleteLayer(newLayer.id);
      
      const updatedState = useCanvasStore.getState();
      expect(updatedState.layers).toHaveLength(1); // Only default layer remains
      
      const shape = updatedState.shapes.get('test-shape');
      expect(shape?.layerId).toBe('default-layer');
      
      const defaultLayer = updatedState.layers.find(l => l.id === 'default-layer');
      expect(defaultLayer?.shapes).toContain('test-shape');
    });

    it('should reorder layers', () => {
      const { createLayer, reorderLayers } = useCanvasStore.getState();
      
      createLayer('Layer 1');
      createLayer('Layer 2');
      
      const layers = useCanvasStore.getState().layers;
      const layerIds = layers.map(l => l.id);
      const reversedIds = [...layerIds].reverse();
      
      reorderLayers(reversedIds);
      
      const updatedState = useCanvasStore.getState();
      expect(updatedState.layers[0].id).toBe(reversedIds[0]);
      expect(updatedState.layers[1].id).toBe(reversedIds[1]);
    });

    it('should move shape to different layer', () => {
      const { createLayer, createShape, moveShapeToLayer } = useCanvasStore.getState();
      
      createLayer('Test Layer');
      const newLayer = useCanvasStore.getState().layers[1];
      
      const testShape: Shape = {
        id: 'test-shape',
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
        layerId: 'default-layer',
      };
      
      createShape(testShape);
      moveShapeToLayer('test-shape', newLayer.id);
      
      const updatedState = useCanvasStore.getState();
      const shape = updatedState.shapes.get('test-shape');
      expect(shape?.layerId).toBe(newLayer.id);
      
      const defaultLayer = updatedState.layers.find(l => l.id === 'default-layer');
      const targetLayer = updatedState.layers.find(l => l.id === newLayer.id);
      
      expect(defaultLayer?.shapes).not.toContain('test-shape');
      expect(targetLayer?.shapes).toContain('test-shape');
    });

    it('should toggle layer visibility', () => {
      const { createLayer, toggleLayerVisibility } = useCanvasStore.getState();
      
      createLayer('Test Layer');
      const newLayer = useCanvasStore.getState().layers[1];
      
      expect(newLayer.visible).toBe(true);
      
      toggleLayerVisibility(newLayer.id);
      
      const updatedState = useCanvasStore.getState();
      const updatedLayer = updatedState.layers.find(l => l.id === newLayer.id);
      expect(updatedLayer?.visible).toBe(false);
    });

    it('should toggle layer lock', () => {
      const { createLayer, toggleLayerLock } = useCanvasStore.getState();
      
      createLayer('Test Layer');
      const newLayer = useCanvasStore.getState().layers[1];
      
      expect(newLayer.locked).toBe(false);
      
      toggleLayerLock(newLayer.id);
      
      const updatedState = useCanvasStore.getState();
      const updatedLayer = updatedState.layers.find(l => l.id === newLayer.id);
      expect(updatedLayer?.locked).toBe(true);
    });
  });

  describe('Alignment Tools', () => {
    beforeEach(() => {
      // Create test shapes for alignment tests
      const { createShape, selectShapes } = useCanvasStore.getState();
      
      const shapes: Shape[] = [
        {
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
        },
        {
          id: 'shape2',
          type: 'rect',
          x: 200,
          y: 50,
          w: 100,
          h: 100,
          color: '#EF4444',
          createdAt: Date.now(),
          createdBy: 'user1',
          updatedAt: Date.now(),
          updatedBy: 'user1',
          clientUpdatedAt: Date.now(),
        },
        {
          id: 'shape3',
          type: 'rect',
          x: 100,
          y: 200,
          w: 100,
          h: 100,
          color: '#10B981',
          createdAt: Date.now(),
          createdBy: 'user1',
          updatedAt: Date.now(),
          updatedBy: 'user1',
          clientUpdatedAt: Date.now(),
        },
      ];
      
      shapes.forEach(shape => createShape(shape));
      selectShapes(['shape1', 'shape2', 'shape3']);
    });

    it('should align shapes to left', () => {
      const { alignSelectedShapes } = useCanvasStore.getState();
      
      alignSelectedShapes('left');
      
      const updatedState = useCanvasStore.getState();
      const shapes = Array.from(updatedState.shapes.values());
      
      // All shapes should have the same x position
      const xPositions = shapes.map(s => s.x);
      expect(xPositions.every(x => x === xPositions[0])).toBe(true);
    });

    it('should align shapes to right', () => {
      const { alignSelectedShapes } = useCanvasStore.getState();
      
      alignSelectedShapes('right');
      
      const updatedState = useCanvasStore.getState();
      const shapes = Array.from(updatedState.shapes.values());
      
      // All shapes should have the same right edge position
      const rightEdges = shapes.map(s => s.x + s.w);
      expect(rightEdges.every(x => x === rightEdges[0])).toBe(true);
    });

    it('should align shapes to center', () => {
      const { alignSelectedShapes } = useCanvasStore.getState();
      
      alignSelectedShapes('center');
      
      const updatedState = useCanvasStore.getState();
      const shapes = Array.from(updatedState.shapes.values());
      
      // All shapes should be centered around the same point
      const centers = shapes.map(s => s.x + s.w / 2);
      expect(centers.every(x => Math.abs(x - centers[0]) < 1)).toBe(true);
    });

    it('should distribute shapes horizontally', () => {
      const { distributeSelectedShapes } = useCanvasStore.getState();
      
      distributeSelectedShapes('horizontal');
      
      const updatedState = useCanvasStore.getState();
      const shapes = Array.from(updatedState.shapes.values()).sort((a, b) => a.x - b.x);
      
      // Check that shapes are evenly distributed
      const spacing = shapes[1].x - shapes[0].x;
      const lastSpacing = shapes[2].x - shapes[1].x;
      expect(Math.abs(spacing - lastSpacing)).toBeLessThan(1);
    });

    it('should distribute shapes vertically', () => {
      const { distributeSelectedShapes } = useCanvasStore.getState();
      
      distributeSelectedShapes('vertical');
      
      const updatedState = useCanvasStore.getState();
      const shapes = Array.from(updatedState.shapes.values()).sort((a, b) => a.y - b.y);
      
      // Check that shapes are evenly distributed
      const spacing = shapes[1].y - shapes[0].y;
      const lastSpacing = shapes[2].y - shapes[1].y;
      expect(Math.abs(spacing - lastSpacing)).toBeLessThan(1);
    });

    it('should not align if less than 2 shapes selected', () => {
      const { selectShapes, alignSelectedShapes } = useCanvasStore.getState();
      
      selectShapes(['shape1']);
      const originalShapes = useCanvasStore.getState().shapes;
      
      alignSelectedShapes('left');
      
      const updatedShapes = useCanvasStore.getState().shapes;
      expect(updatedShapes).toEqual(originalShapes);
    });

    it('should not distribute if less than 3 shapes selected', () => {
      const { selectShapes, distributeSelectedShapes } = useCanvasStore.getState();
      
      selectShapes(['shape1', 'shape2']);
      const originalShapes = useCanvasStore.getState().shapes;
      
      distributeSelectedShapes('horizontal');
      
      const updatedShapes = useCanvasStore.getState().shapes;
      expect(updatedShapes).toEqual(originalShapes);
    });
  });

  describe('Grid and Snap', () => {
    it('should toggle grid visibility', () => {
      const { toggleGrid, gridState } = useCanvasStore.getState();
      
      expect(gridState.isVisible).toBe(false);
      
      toggleGrid();
      
      const updatedState = useCanvasStore.getState();
      expect(updatedState.gridState.isVisible).toBe(true);
      
      toggleGrid();
      
      const finalState = useCanvasStore.getState();
      expect(finalState.gridState.isVisible).toBe(false);
    });

    it('should toggle snap functionality', () => {
      const { toggleSnap, gridState } = useCanvasStore.getState();
      
      expect(gridState.isSnapEnabled).toBe(false);
      
      toggleSnap();
      
      const updatedState = useCanvasStore.getState();
      expect(updatedState.gridState.isSnapEnabled).toBe(true);
      
      toggleSnap();
      
      const finalState = useCanvasStore.getState();
      expect(finalState.gridState.isSnapEnabled).toBe(false);
    });

    it('should update grid size', () => {
      const { updateGridSize } = useCanvasStore.getState();
      
      updateGridSize(40);
      
      const updatedState = useCanvasStore.getState();
      expect(updatedState.gridState.size).toBe(40);
    });

    it('should set snap indicators', () => {
      const { setSnapIndicators } = useCanvasStore.getState();
      
      const indicators = [
        {
          type: 'horizontal' as const,
          x: 100,
          y: 100,
          length: 20,
          visible: true,
        },
        {
          type: 'vertical' as const,
          x: 200,
          y: 200,
          length: 20,
          visible: true,
        },
      ];
      
      setSnapIndicators(indicators);
      
      const updatedState = useCanvasStore.getState();
      expect(updatedState.snapIndicators).toEqual(indicators);
    });
  });
});
