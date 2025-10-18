/**
 * Tests for layerService
 */

import { describe, it, expect } from 'vitest';
import { layerService } from '../services/layerService';
import type { Layer, Shape } from '../types';

describe('layerService', () => {
  const mockShapes = new Map<string, Shape>([
    ['shape1', {
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
      layerId: 'layer1',
    }],
    ['shape2', {
      id: 'shape2',
      type: 'circle',
      x: 100,
      y: 100,
      w: 50,
      h: 50,
      color: '#EF4444',
      createdAt: Date.now(),
      createdBy: 'user1',
      updatedAt: Date.now(),
      updatedBy: 'user1',
      clientUpdatedAt: Date.now(),
      layerId: 'layer2',
    }],
  ]);

  const mockLayers: Layer[] = [
    {
      id: 'default-layer',
      name: 'Default Layer',
      shapes: [],
      visible: true,
      locked: false,
      order: 0,
    },
    {
      id: 'layer1',
      name: 'Layer 1',
      shapes: ['shape1'],
      visible: true,
      locked: false,
      order: 1,
    },
    {
      id: 'layer2',
      name: 'Layer 2',
      shapes: ['shape2'],
      visible: true,
      locked: false,
      order: 2,
    },
  ];

  describe('createLayer', () => {
    it('should create a new layer with correct properties', () => {
      const newLayer = layerService.createLayer('Test Layer', mockLayers);
      
      expect(newLayer.name).toBe('Test Layer');
      expect(newLayer.shapes).toEqual([]);
      expect(newLayer.visible).toBe(true);
      expect(newLayer.locked).toBe(false);
      expect(newLayer.order).toBe(mockLayers.length);
      expect(newLayer.id).toMatch(/^layer-\d+-[a-z0-9]+$/);
    });
  });

  describe('updateLayer', () => {
    it('should update layer properties', () => {
      const updatedLayers = layerService.updateLayer('layer1', { name: 'Updated Layer' }, mockLayers);
      
      const updatedLayer = updatedLayers.find(l => l.id === 'layer1');
      expect(updatedLayer?.name).toBe('Updated Layer');
      expect(updatedLayer?.visible).toBe(true); // Other properties should remain unchanged
    });

    it('should not affect other layers', () => {
      const updatedLayers = layerService.updateLayer('layer1', { visible: false }, mockLayers);
      
      const layer1 = updatedLayers.find(l => l.id === 'layer1');
      const layer2 = updatedLayers.find(l => l.id === 'layer2');
      
      expect(layer1?.visible).toBe(false);
      expect(layer2?.visible).toBe(true);
    });
  });

  describe('deleteLayer', () => {
    it('should delete layer and move shapes to default layer', () => {
      const result = layerService.deleteLayer('layer1', mockLayers, mockShapes);
      
      expect(result.layers.find(l => l.id === 'layer1')).toBeUndefined();
      
      const defaultLayer = result.layers.find(l => l.id === 'default-layer');
      expect(defaultLayer?.shapes).toContain('shape1');
      
      const shape1 = result.shapes.get('shape1');
      expect(shape1?.layerId).toBe('default-layer');
    });

    it('should not affect shapes in other layers', () => {
      const result = layerService.deleteLayer('layer1', mockLayers, mockShapes);
      
      const shape2 = result.shapes.get('shape2');
      expect(shape2?.layerId).toBe('layer2');
    });
  });

  describe('reorderLayers', () => {
    it('should reorder layers based on provided order', () => {
      const newOrder = ['layer2', 'layer1', 'default-layer'];
      const reorderedLayers = layerService.reorderLayers(newOrder, mockLayers);
      
      expect(reorderedLayers[0].id).toBe('layer2');
      expect(reorderedLayers[0].order).toBe(0);
      expect(reorderedLayers[1].id).toBe('layer1');
      expect(reorderedLayers[1].order).toBe(1);
      expect(reorderedLayers[2].id).toBe('default-layer');
      expect(reorderedLayers[2].order).toBe(2);
    });
  });

  describe('moveShapeToLayer', () => {
    it('should move shape from one layer to another', () => {
      const result = layerService.moveShapeToLayer('shape1', 'layer2', mockLayers, mockShapes);
      
      const layer1 = result.layers.find(l => l.id === 'layer1');
      const layer2 = result.layers.find(l => l.id === 'layer2');
      
      expect(layer1?.shapes).not.toContain('shape1');
      expect(layer2?.shapes).toContain('shape1');
      
      const shape1 = result.shapes.get('shape1');
      expect(shape1?.layerId).toBe('layer2');
    });
  });

  describe('getShapesInLayer', () => {
    it('should return shapes in specified layer', () => {
      const shapesInLayer1 = layerService.getShapesInLayer('layer1', mockShapes);
      
      expect(shapesInLayer1).toHaveLength(1);
      expect(shapesInLayer1[0].id).toBe('shape1');
    });

    it('should return empty array for layer with no shapes', () => {
      const shapesInDefault = layerService.getShapesInLayer('default-layer', mockShapes);
      
      expect(shapesInDefault).toHaveLength(0);
    });
  });

  describe('getLayerForShape', () => {
    it('should return layer containing the shape', () => {
      const layer = layerService.getLayerForShape('shape1', mockLayers);
      
      expect(layer?.id).toBe('layer1');
    });

    it('should return null for shape not in any layer', () => {
      const layer = layerService.getLayerForShape('nonexistent', mockLayers);
      
      expect(layer).toBeNull();
    });
  });
});
