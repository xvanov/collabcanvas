/**
 * Integration Tests for Annotation Tools
 * Tests polyline and polygon tools with scale, layers, and canvas integration
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasStore } from '../store/canvasStore';
import { createPolylineShape, createPolygonShape } from '../services/shapeService';
import { calculatePolylineLength, calculatePolygonArea, convertToRealWorld, convertAreaToRealWorld } from '../services/measurementService';
import type { CanvasScale } from '../types';

describe('Annotation Tools Integration', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useCanvasStore());
    act(() => {
      result.current.setShapes([]);
      result.current.clearSelection();
    });
  });

  describe('Scale Integration', () => {
    test('polyline measurements use active scale', () => {
      const mockScale: CanvasScale = {
        scaleLine: {
          id: 'scale-1',
          startX: 0,
          startY: 0,
          endX: 100,
          endY: 0,
          realWorldLength: 10,
          unit: 'feet',
          isVisible: true,
          createdAt: Date.now(),
          createdBy: 'user-1',
          updatedAt: Date.now(),
          updatedBy: 'user-1',
        },
        backgroundImage: null,
        isScaleMode: false,
        isImageUploadMode: false,
      };

      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ];
      const pixelLength = calculatePolylineLength(points);
      const realLength = convertToRealWorld(pixelLength, mockScale);

      expect(pixelLength).toBe(100);
      expect(realLength).toBe(10); // 100 pixels = 10 feet with our scale
    });

    test('polygon measurements use active scale', () => {
      const mockScale: CanvasScale = {
        scaleLine: {
          id: 'scale-1',
          startX: 0,
          startY: 0,
          endX: 100,
          endY: 0,
          realWorldLength: 10,
          unit: 'feet',
          isVisible: true,
          createdAt: Date.now(),
          createdBy: 'user-1',
          updatedAt: Date.now(),
          updatedBy: 'user-1',
        },
        backgroundImage: null,
        isScaleMode: false,
        isImageUploadMode: false,
      };

      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ];
      const pixelArea = calculatePolygonArea(points);
      const realArea = convertAreaToRealWorld(pixelArea, mockScale);

      expect(pixelArea).toBe(10000);
      expect(realArea).toBe(100); // 10,000 sq pixels = 100 sq feet
    });

    test('measurements return null when scale not set', () => {
      const mockScale: CanvasScale = {
        scaleLine: null,
        backgroundImage: null,
        isScaleMode: false,
        isImageUploadMode: false,
      };

      const pixelValue = 100;
      const realValue = convertToRealWorld(pixelValue, mockScale);

      expect(realValue).toBeNull();
    });

    test('measurements update when scale changes', () => {
      const scale1: CanvasScale = {
        scaleLine: {
          id: 'scale-1',
          startX: 0,
          startY: 0,
          endX: 100,
          endY: 0,
          realWorldLength: 10,
          unit: 'feet',
          isVisible: true,
          createdAt: Date.now(),
          createdBy: 'user-1',
          updatedAt: Date.now(),
          updatedBy: 'user-1',
        },
        backgroundImage: null,
        isScaleMode: false,
        isImageUploadMode: false,
      };

      const scale2: CanvasScale = {
        scaleLine: {
          id: 'scale-2',
          startX: 0,
          startY: 0,
          endX: 100,
          endY: 0,
          realWorldLength: 20, // Different scale: 100 pixels = 20 feet
          unit: 'feet',
          isVisible: true,
          createdAt: Date.now(),
          createdBy: 'user-1',
          updatedAt: Date.now(),
          updatedBy: 'user-1',
        },
        backgroundImage: null,
        isScaleMode: false,
        isImageUploadMode: false,
      };

      const pixelValue = 100;
      const realValue1 = convertToRealWorld(pixelValue, scale1);
      const realValue2 = convertToRealWorld(pixelValue, scale2);

      expect(realValue1).toBe(10);
      expect(realValue2).toBe(20);
    });
  });

  describe('Layer System Integration', () => {
    test('new polyline assigned to active layer', () => {
      const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
      const shape = createPolylineShape(points, '#3B82F6', 'user-1', 'layer-1');

      expect(shape.layerId).toBe('layer-1');
      expect(shape.type).toBe('polyline');
    });

    test('new polygon assigned to active layer', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 100 },
      ];
      const shape = createPolygonShape(points, '#10B981', 'user-1', 'layer-2');

      expect(shape.layerId).toBe('layer-2');
      expect(shape.type).toBe('polygon');
    });

    test('shapes inherit layer color', () => {
      const layerColor = '#FF5733';
      const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
      const shape = createPolylineShape(points, layerColor, 'user-1', 'layer-1');

      expect(shape.color).toBe(layerColor);
    });
  });

  describe('Shape Creation', () => {
    test('polyline shape created with correct properties', () => {
      const points = [
        { x: 10, y: 20 },
        { x: 50, y: 80 },
      ];
      const shape = createPolylineShape(points, '#3B82F6', 'user-1', 'layer-1');

      expect(shape.id).toBeDefined();
      expect(shape.type).toBe('polyline');
      // Points should be relative to bounding box (minX=10, minY=20)
      expect(shape.points).toEqual([0, 0, 40, 60]);
      expect(shape.color).toBe('#3B82F6');
      expect(shape.layerId).toBe('layer-1');
      expect(shape.createdBy).toBe('user-1');
      expect(shape.strokeWidth).toBe(2);
    });

    test('polygon shape created with correct properties', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 100 },
      ];
      const shape = createPolygonShape(points, '#10B981', 'user-1', 'layer-1');

      expect(shape.id).toBeDefined();
      expect(shape.type).toBe('polygon');
      // Points relative to minX=0, minY=0 (already at origin, so same)
      expect(shape.points).toEqual([0, 0, 100, 0, 50, 100]);
      expect(shape.color).toBe('#10B981');
      expect(shape.layerId).toBe('layer-1');
      expect(shape.createdBy).toBe('user-1');
    });

    test('shapes include creation timestamps', () => {
      const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
      const before = Date.now();
      const shape = createPolylineShape(points, '#3B82F6', 'user-1', 'layer-1');
      const after = Date.now();

      expect(shape.createdAt).toBeGreaterThanOrEqual(before);
      expect(shape.createdAt).toBeLessThanOrEqual(after);
      expect(shape.updatedAt).toBe(shape.createdAt);
      expect(shape.clientUpdatedAt).toBe(shape.createdAt);
    });
  });

  describe('Measurement Calculations', () => {
    test('complex polyline length calculation', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 30, y: 0 },
        { x: 30, y: 40 },
        { x: 0, y: 40 },
      ];
      // U-shape: 30 + 40 + 30 = 100 units
      const length = calculatePolylineLength(points);
      expect(length).toBe(100);
    });

    test('complex polygon area calculation - L-shape', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 50 },
        { x: 50, y: 50 },
        { x: 50, y: 100 },
        { x: 0, y: 100 },
      ];
      // L-shape area
      const area = calculatePolygonArea(points);
      expect(area).toBe(7500);
    });

    test('diagonal measurements calculated correctly', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 3, y: 4 }, // 5 units (3-4-5 triangle)
      ];
      const length = calculatePolylineLength(points);
      expect(length).toBe(5);
    });
  });

  describe('Different Unit Types', () => {
    test('measurements work with meters', () => {
      const mockScale: CanvasScale = {
        scaleLine: {
          id: 'scale-1',
          startX: 0,
          startY: 0,
          endX: 100,
          endY: 0,
          realWorldLength: 5,
          unit: 'meters',
          isVisible: true,
          createdAt: Date.now(),
          createdBy: 'user-1',
          updatedAt: Date.now(),
          updatedBy: 'user-1',
        },
        backgroundImage: null,
        isScaleMode: false,
        isImageUploadMode: false,
      };

      const pixelValue = 200;
      const realValue = convertToRealWorld(pixelValue, mockScale);
      expect(realValue).toBe(10); // 200 pixels = 10 meters
    });

    test('area measurements work with meters', () => {
      const mockScale: CanvasScale = {
        scaleLine: {
          id: 'scale-1',
          startX: 0,
          startY: 0,
          endX: 10,
          endY: 0,
          realWorldLength: 1,
          unit: 'meters',
          isVisible: true,
          createdAt: Date.now(),
          createdBy: 'user-1',
          updatedAt: Date.now(),
          updatedBy: 'user-1',
        },
        backgroundImage: null,
        isScaleMode: false,
        isImageUploadMode: false,
      };

      const pixelArea = 100;
      const realArea = convertAreaToRealWorld(pixelArea, mockScale);
      expect(realArea).toBe(1); // 100 sq pixels = 1 sq meter
    });
  });
});

