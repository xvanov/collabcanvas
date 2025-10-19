/**
 * Tests for Measurement Service
 */

import { describe, test, expect } from 'vitest';
import {
  calculateDistance,
  calculatePolylineLength,
  calculatePolygonArea,
  convertToRealWorld,
  convertAreaToRealWorld,
  formatMeasurement,
  getUnitAbbreviation,
} from './measurementService';
import type { CanvasScale } from '../types';

describe('Measurement Service', () => {
  describe('calculateDistance', () => {
    test('calculates Euclidean distance between two points', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 3, y: 4 };
      expect(calculateDistance(p1, p2)).toBe(5); // 3-4-5 triangle
    });

    test('handles points at same location (0 distance)', () => {
      const p1 = { x: 10, y: 20 };
      const p2 = { x: 10, y: 20 };
      expect(calculateDistance(p1, p2)).toBe(0);
    });

    test('handles negative coordinates', () => {
      const p1 = { x: -10, y: -10 };
      const p2 = { x: -7, y: -6 };
      expect(calculateDistance(p1, p2)).toBe(5); // 3-4-5 triangle
    });

    test('returns correct precision', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 1, y: 1 };
      const result = calculateDistance(p1, p2);
      expect(result).toBeCloseTo(Math.sqrt(2), 10);
    });

    test('handles horizontal line', () => {
      const p1 = { x: 0, y: 5 };
      const p2 = { x: 10, y: 5 };
      expect(calculateDistance(p1, p2)).toBe(10);
    });

    test('handles vertical line', () => {
      const p1 = { x: 5, y: 0 };
      const p2 = { x: 5, y: 10 };
      expect(calculateDistance(p1, p2)).toBe(10);
    });
  });

  describe('calculatePolylineLength', () => {
    test('calculates total length of multi-segment line', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 3, y: 0 },
        { x: 3, y: 4 },
      ];
      // 3 + 4 = 7
      expect(calculatePolylineLength(points)).toBe(7);
    });

    test('handles 2-point line (single segment)', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ];
      expect(calculatePolylineLength(points)).toBe(10);
    });

    test('handles closed polyline correctly', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ];
      // 10 + 10 + 10 = 30 (not closed, so doesn't include last segment back to start)
      expect(calculatePolylineLength(points)).toBe(30);
    });

    test('returns 0 for single point', () => {
      const points = [{ x: 5, y: 5 }];
      expect(calculatePolylineLength(points)).toBe(0);
    });

    test('returns 0 for empty array', () => {
      expect(calculatePolylineLength([])).toBe(0);
    });

    test('handles complex path with diagonal segments', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 3, y: 4 }, // 5 units
        { x: 6, y: 0 }, // 5 units (3-4-5 triangle mirrored)
      ];
      expect(calculatePolylineLength(points)).toBe(10);
    });
  });

  describe('calculatePolygonArea', () => {
    test('calculates area using shoelace formula - rectangle', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 5 },
        { x: 0, y: 5 },
      ];
      expect(calculatePolygonArea(points)).toBe(50);
    });

    test('handles triangle (3 points)', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 10 },
      ];
      // Triangle area = 0.5 * base * height = 0.5 * 10 * 10 = 50
      expect(calculatePolygonArea(points)).toBe(50);
    });

    test('handles square correctly', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ];
      expect(calculatePolygonArea(points)).toBe(100);
    });

    test('handles complex polygon shapes - L-shape', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 50 },
        { x: 50, y: 50 },
        { x: 50, y: 100 },
        { x: 0, y: 100 },
      ];
      // L-shape: (100 * 50) + (50 * 50) = 5000 + 2500 = 7500
      expect(calculatePolygonArea(points)).toBe(7500);
    });

    test('returns absolute value (no negative areas)', () => {
      // Same rectangle but clockwise vs counter-clockwise should give same area
      const clockwise = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ];
      const counterClockwise = [
        { x: 0, y: 0 },
        { x: 0, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 0 },
      ];
      expect(calculatePolygonArea(clockwise)).toBe(calculatePolygonArea(counterClockwise));
      expect(calculatePolygonArea(clockwise)).toBe(100);
    });

    test('handles clockwise vs counter-clockwise points', () => {
      const points1 = [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 5 },
        { x: 0, y: 5 },
      ];
      const points2 = [
        { x: 0, y: 0 },
        { x: 0, y: 5 },
        { x: 5, y: 5 },
        { x: 5, y: 0 },
      ];
      expect(calculatePolygonArea(points1)).toBe(25);
      expect(calculatePolygonArea(points2)).toBe(25);
    });

    test('returns 0 for less than 3 points', () => {
      expect(calculatePolygonArea([])).toBe(0);
      expect(calculatePolygonArea([{ x: 0, y: 0 }])).toBe(0);
      expect(calculatePolygonArea([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0);
    });
  });

  describe('convertToRealWorld', () => {
    const createMockScale = (
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      realLength: number,
      unit: 'feet' | 'meters' = 'feet'
    ): CanvasScale => ({
      scaleLine: {
        id: 'test-scale',
        startX,
        startY,
        endX,
        endY,
        realWorldLength: realLength,
        unit,
        isVisible: true,
        createdAt: Date.now(),
        createdBy: 'test-user',
        updatedAt: Date.now(),
        updatedBy: 'test-user',
      },
      backgroundImage: null,
      isScaleMode: false,
      isImageUploadMode: false,
    });

    test('converts pixels to feet using scale ratio', () => {
      // Scale line: 100 pixels = 10 feet
      const scale = createMockScale(0, 0, 100, 0, 10, 'feet');
      const result = convertToRealWorld(50, scale);
      expect(result).toBe(5); // 50 pixels = 5 feet
    });

    test('converts pixels to meters using scale ratio', () => {
      // Scale line: 100 pixels = 5 meters
      const scale = createMockScale(0, 0, 100, 0, 5, 'meters');
      const result = convertToRealWorld(200, scale);
      expect(result).toBe(10); // 200 pixels = 10 meters
    });

    test('handles different scale line angles', () => {
      // Diagonal scale line: distance = 5 (3-4-5 triangle), represents 10 feet
      const scale = createMockScale(0, 0, 3, 4, 10, 'feet');
      const result = convertToRealWorld(5, scale);
      expect(result).toBe(10); // 5 pixels = 10 feet
    });

    test('handles missing scale gracefully (returns null)', () => {
      const scale: CanvasScale = {
        scaleLine: null,
        backgroundImage: null,
        isScaleMode: false,
        isImageUploadMode: false,
      };
      expect(convertToRealWorld(100, scale)).toBeNull();
    });

    test('handles zero scale (returns null)', () => {
      const scale = createMockScale(0, 0, 100, 0, 0, 'feet');
      expect(convertToRealWorld(100, scale)).toBeNull();
    });

    test('handles zero pixel length scale line (returns null)', () => {
      const scale = createMockScale(5, 5, 5, 5, 10, 'feet');
      expect(convertToRealWorld(100, scale)).toBeNull();
    });
  });

  describe('convertAreaToRealWorld', () => {
    const createMockScale = (
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      realLength: number,
      unit: 'feet' | 'meters' = 'feet'
    ): CanvasScale => ({
      scaleLine: {
        id: 'test-scale',
        startX,
        startY,
        endX,
        endY,
        realWorldLength: realLength,
        unit,
        isVisible: true,
        createdAt: Date.now(),
        createdBy: 'test-user',
        updatedAt: Date.now(),
        updatedBy: 'test-user',
      },
      backgroundImage: null,
      isScaleMode: false,
      isImageUploadMode: false,
    });

    test('converts square pixels to square feet', () => {
      // Scale line: 100 pixels = 10 feet
      // So 1 pixel = 0.1 feet
      // 1 square pixel = 0.01 square feet
      const scale = createMockScale(0, 0, 100, 0, 10, 'feet');
      const result = convertAreaToRealWorld(100, scale);
      expect(result).toBe(1); // 100 sq pixels = 1 sq foot
    });

    test('converts square pixels to square meters', () => {
      // Scale line: 100 pixels = 10 meters
      // 1 pixel = 0.1 meters
      // 1 sq pixel = 0.01 sq meters
      const scale = createMockScale(0, 0, 100, 0, 10, 'meters');
      const result = convertAreaToRealWorld(100, scale);
      expect(result).toBe(1); // 100 sq pixels = 1 sq meter
    });

    test('handles unit conversion correctly', () => {
      // Scale: 10 pixels = 1 foot
      // Pixel area 100 should = 1 sq foot
      const scale = createMockScale(0, 0, 10, 0, 1, 'feet');
      const result = convertAreaToRealWorld(100, scale);
      expect(result).toBe(1);
    });

    test('handles missing scale (returns null)', () => {
      const scale: CanvasScale = {
        scaleLine: null,
        backgroundImage: null,
        isScaleMode: false,
        isImageUploadMode: false,
      };
      expect(convertAreaToRealWorld(100, scale)).toBeNull();
    });
  });

  describe('formatMeasurement', () => {
    test('formats to 2 decimal places', () => {
      expect(formatMeasurement(10.5, 'feet')).toBe('10.50 ft');
      expect(formatMeasurement(10.123, 'feet')).toBe('10.12 ft');
      expect(formatMeasurement(10.999, 'feet')).toBe('11.00 ft');
    });

    test('adds unit abbreviation for linear measurements', () => {
      expect(formatMeasurement(10, 'feet')).toBe('10.00 ft');
      expect(formatMeasurement(10, 'meters')).toBe('10.00 m');
      expect(formatMeasurement(10, 'inches')).toBe('10.00 in');
    });

    test('adds unit abbreviation for area measurements', () => {
      expect(formatMeasurement(100, 'feet', true)).toBe('100.00 sq ft');
      expect(formatMeasurement(50, 'meters', true)).toBe('50.00 sq m');
      expect(formatMeasurement(25, 'inches', true)).toBe('25.00 sq in');
    });

    test('adds commas for thousands', () => {
      expect(formatMeasurement(1000, 'feet')).toBe('1,000.00 ft');
      expect(formatMeasurement(10000.5, 'feet')).toBe('10,000.50 ft');
      expect(formatMeasurement(1234567.89, 'meters')).toBe('1,234,567.89 m');
    });

    test('handles very small numbers', () => {
      expect(formatMeasurement(0.01, 'feet')).toBe('0.01 ft');
      expect(formatMeasurement(0.001, 'meters')).toBe('0.00 m');
    });

    test('handles very large numbers', () => {
      expect(formatMeasurement(999999.99, 'feet')).toBe('999,999.99 ft');
      expect(formatMeasurement(1000000, 'meters', true)).toBe('1,000,000.00 sq m');
    });

    test('handles all unit types', () => {
      expect(formatMeasurement(10, 'feet')).toContain('ft');
      expect(formatMeasurement(10, 'inches')).toContain('in');
      expect(formatMeasurement(10, 'meters')).toContain('m');
      expect(formatMeasurement(10, 'centimeters')).toContain('cm');
      expect(formatMeasurement(10, 'millimeters')).toContain('mm');
      expect(formatMeasurement(10, 'yards')).toContain('yd');
    });
  });

  describe('getUnitAbbreviation', () => {
    test('returns correct linear abbreviations', () => {
      expect(getUnitAbbreviation('feet')).toBe('ft');
      expect(getUnitAbbreviation('inches')).toBe('in');
      expect(getUnitAbbreviation('meters')).toBe('m');
      expect(getUnitAbbreviation('centimeters')).toBe('cm');
      expect(getUnitAbbreviation('millimeters')).toBe('mm');
      expect(getUnitAbbreviation('yards')).toBe('yd');
    });

    test('returns correct area abbreviations', () => {
      expect(getUnitAbbreviation('feet', true)).toBe('sq ft');
      expect(getUnitAbbreviation('inches', true)).toBe('sq in');
      expect(getUnitAbbreviation('meters', true)).toBe('sq m');
      expect(getUnitAbbreviation('centimeters', true)).toBe('sq cm');
      expect(getUnitAbbreviation('millimeters', true)).toBe('sq mm');
      expect(getUnitAbbreviation('yards', true)).toBe('sq yd');
    });
  });
});

