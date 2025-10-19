/**
 * Tests for Shape Service
 */

import { describe, test, expect } from 'vitest';
import {
  createPolylineShape,
  createPolygonShape,
  updatePolylinePoints,
  updatePolygonPoints,
  flatPointsToPoints,
  pointsToFlatPoints,
} from './shapeService';

describe('Shape Service', () => {
  const mockUserId = 'test-user-123';
  const mockLayerId = 'layer-456';
  const mockColor = '#FF0000';

  describe('createPolylineShape', () => {
    test('creates shape with correct type', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ];
      const shape = createPolylineShape(points, mockColor, mockUserId, mockLayerId);
      expect(shape.type).toBe('polyline');
    });

    test('assigns unique ID', () => {
      const points = [{ x: 0, y: 0 }, { x: 10, y: 10 }];
      const shape1 = createPolylineShape(points, mockColor, mockUserId, mockLayerId);
      const shape2 = createPolylineShape(points, mockColor, mockUserId, mockLayerId);
      expect(shape1.id).not.toBe(shape2.id);
      expect(shape1.id).toMatch(/^shape-/);
    });

    test('sets points array correctly (relative to bounding box)', () => {
      const points = [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
        { x: 50, y: 60 },
      ];
      const shape = createPolylineShape(points, mockColor, mockUserId, mockLayerId);
      // Points should be relative to minX=10, minY=20
      expect(shape.points).toEqual([0, 0, 20, 20, 40, 40]);
    });

    test('assigns to specified layer', () => {
      const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
      const shape = createPolylineShape(points, mockColor, mockUserId, mockLayerId);
      expect(shape.layerId).toBe(mockLayerId);
    });

    test('includes creation metadata', () => {
      const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
      const before = Date.now();
      const shape = createPolylineShape(points, mockColor, mockUserId, mockLayerId);
      const after = Date.now();
      
      expect(shape.createdBy).toBe(mockUserId);
      expect(shape.updatedBy).toBe(mockUserId);
      expect(shape.createdAt).toBeGreaterThanOrEqual(before);
      expect(shape.createdAt).toBeLessThanOrEqual(after);
      expect(shape.updatedAt).toBe(shape.createdAt);
      expect(shape.clientUpdatedAt).toBe(shape.createdAt);
    });

    test('sets correct color', () => {
      const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
      const shape = createPolylineShape(points, mockColor, mockUserId, mockLayerId);
      expect(shape.color).toBe(mockColor);
    });

    test('sets stroke width', () => {
      const points = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
      const shape = createPolylineShape(points, mockColor, mockUserId, mockLayerId);
      expect(shape.strokeWidth).toBe(2);
    });

    test('calculates correct bounding box', () => {
      const points = [
        { x: 10, y: 20 },
        { x: 50, y: 80 },
        { x: 30, y: 40 },
      ];
      const shape = createPolylineShape(points, mockColor, mockUserId, mockLayerId);
      expect(shape.x).toBe(10); // min x
      expect(shape.y).toBe(20); // min y
      expect(shape.w).toBe(40); // 50 - 10
      expect(shape.h).toBe(60); // 80 - 20
    });

    test('handles single point polyline', () => {
      const points = [{ x: 5, y: 10 }];
      const shape = createPolylineShape(points, mockColor, mockUserId, mockLayerId);
      expect(shape.x).toBe(5);
      expect(shape.y).toBe(10);
      expect(shape.w).toBe(0);
      expect(shape.h).toBe(0);
      // Single point becomes (0, 0) relative to itself
      expect(shape.points).toEqual([0, 0]);
    });
  });

  describe('createPolygonShape', () => {
    test('creates polygon shape with points (relative coordinates)', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 100 },
      ];
      const shape = createPolygonShape(points, mockColor, mockUserId, mockLayerId);
      expect(shape.type).toBe('polygon');
      // Points relative to minX=0, minY=0
      expect(shape.points).toEqual([0, 0, 100, 0, 50, 100]);
    });

    test('sets semi-transparent fill color', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 50, y: 100 },
      ];
      const shape = createPolygonShape(points, mockColor, mockUserId, mockLayerId);
      expect(shape.color).toBe(mockColor);
    });

    test('calculates bounding box for polygon', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 50 },
        { x: 0, y: 50 },
      ];
      const shape = createPolygonShape(points, mockColor, mockUserId, mockLayerId);
      expect(shape.x).toBe(0);
      expect(shape.y).toBe(0);
      expect(shape.w).toBe(100);
      expect(shape.h).toBe(50);
    });

    test('handles triangle correctly', () => {
      const points = [
        { x: 10, y: 10 },
        { x: 50, y: 10 },
        { x: 30, y: 40 },
      ];
      const shape = createPolygonShape(points, mockColor, mockUserId, mockLayerId);
      expect(shape.x).toBe(10);
      expect(shape.y).toBe(10);
      expect(shape.w).toBe(40); // 50 - 10
      expect(shape.h).toBe(30); // 40 - 10
    });
  });

  describe('updatePolylinePoints', () => {
    test('adds new point to existing polyline', () => {
      const initialPoints = [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ];
      const shape = createPolylineShape(initialPoints, mockColor, mockUserId, mockLayerId);
      const updatedShape = updatePolylinePoints(shape, { x: 20, y: 20 }, mockUserId);
      
      // Points should be relative to bounding box origin (0, 0)
      expect(updatedShape.points).toEqual([0, 0, 10, 10, 20, 20]);
    });

    test('updates total bounding box', () => {
      const initialPoints = [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ];
      const shape = createPolylineShape(initialPoints, mockColor, mockUserId, mockLayerId);
      const updatedShape = updatePolylinePoints(shape, { x: 50, y: 50 }, mockUserId);
      
      expect(updatedShape.w).toBe(50);
      expect(updatedShape.h).toBe(50);
    });

    test('maintains shape integrity', () => {
      const initialPoints = [{ x: 0, y: 0 }];
      const shape = createPolylineShape(initialPoints, mockColor, mockUserId, mockLayerId);
      const updatedShape = updatePolylinePoints(shape, { x: 10, y: 10 }, mockUserId);
      
      expect(updatedShape.id).toBe(shape.id);
      expect(updatedShape.type).toBe(shape.type);
      expect(updatedShape.color).toBe(shape.color);
      expect(updatedShape.layerId).toBe(shape.layerId);
    });

    test('updates metadata timestamps', () => {
      const initialPoints = [{ x: 0, y: 0 }];
      const shape = createPolylineShape(initialPoints, mockColor, mockUserId, mockLayerId);
      const originalUpdatedAt = shape.updatedAt;
      
      // Wait a tiny bit to ensure timestamp changes
      const updatedShape = updatePolylinePoints(shape, { x: 10, y: 10 }, mockUserId);
      
      expect(updatedShape.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
      expect(updatedShape.updatedBy).toBe(mockUserId);
    });
  });

  describe('updatePolygonPoints', () => {
    test('adds vertex to polygon', () => {
      const initialPoints = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ];
      const shape = createPolygonShape(initialPoints, mockColor, mockUserId, mockLayerId);
      const updatedShape = updatePolygonPoints(shape, { x: 0, y: 10 }, mockUserId);
      
      // Points relative to bounding box origin (0, 0)
      expect(updatedShape.points).toEqual([0, 0, 10, 0, 10, 10, 0, 10]);
    });

    test('updates bounding box with new vertex', () => {
      const initialPoints = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ];
      const shape = createPolygonShape(initialPoints, mockColor, mockUserId, mockLayerId);
      const updatedShape = updatePolygonPoints(shape, { x: 5, y: 20 }, mockUserId);
      
      expect(updatedShape.h).toBe(20);
    });
  });

  describe('flatPointsToPoints', () => {
    test('converts flat array to Point objects', () => {
      const flatPoints = [10, 20, 30, 40, 50, 60];
      const points = flatPointsToPoints(flatPoints);
      
      expect(points).toEqual([
        { x: 10, y: 20 },
        { x: 30, y: 40 },
        { x: 50, y: 60 },
      ]);
    });

    test('handles empty array', () => {
      const points = flatPointsToPoints([]);
      expect(points).toEqual([]);
    });

    test('handles single point', () => {
      const points = flatPointsToPoints([5, 10]);
      expect(points).toEqual([{ x: 5, y: 10 }]);
    });

    test('handles odd-length array gracefully', () => {
      // Should only process complete pairs
      const points = flatPointsToPoints([10, 20, 30]);
      expect(points).toEqual([{ x: 10, y: 20 }]);
    });
  });

  describe('pointsToFlatPoints', () => {
    test('converts Point objects to flat array', () => {
      const points = [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
        { x: 50, y: 60 },
      ];
      const flatPoints = pointsToFlatPoints(points);
      
      expect(flatPoints).toEqual([10, 20, 30, 40, 50, 60]);
    });

    test('handles empty array', () => {
      const flatPoints = pointsToFlatPoints([]);
      expect(flatPoints).toEqual([]);
    });

    test('handles single point', () => {
      const flatPoints = pointsToFlatPoints([{ x: 5, y: 10 }]);
      expect(flatPoints).toEqual([5, 10]);
    });

    test('round-trip conversion preserves data', () => {
      const original = [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 5, y: 6 },
      ];
      const flat = pointsToFlatPoints(original);
      const converted = flatPointsToPoints(flat);
      
      expect(converted).toEqual(original);
    });
  });
});

