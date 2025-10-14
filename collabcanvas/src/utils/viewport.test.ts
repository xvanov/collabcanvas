import { describe, it, expect } from 'vitest';
import {
  clamp,
  clampZoom,
  isWithinBounds,
  constrainToBounds,
  calculateZoomScale,
} from './viewport';

describe('viewport utilities', () => {
  describe('clamp', () => {
    it('should return value when within bounds', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it('should clamp to min when below', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(-100, 0, 10)).toBe(0);
    });

    it('should clamp to max when above', () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(100, 0, 10)).toBe(10);
    });
  });

  describe('clampZoom', () => {
    it('should return scale when within default bounds', () => {
      expect(clampZoom(1)).toBe(1);
      expect(clampZoom(2.5)).toBe(2.5);
      expect(clampZoom(0.5)).toBe(0.5);
    });

    it('should clamp to minimum scale (0.1)', () => {
      expect(clampZoom(0.05)).toBe(0.1);
      expect(clampZoom(0)).toBe(0.1);
      expect(clampZoom(-1)).toBe(0.1);
    });

    it('should clamp to maximum scale (5)', () => {
      expect(clampZoom(6)).toBe(5);
      expect(clampZoom(10)).toBe(5);
      expect(clampZoom(100)).toBe(5);
    });

    it('should respect custom min and max', () => {
      expect(clampZoom(0.5, 1, 3)).toBe(1); // Below custom min
      expect(clampZoom(2, 1, 3)).toBe(2); // Within custom bounds
      expect(clampZoom(4, 1, 3)).toBe(3); // Above custom max
    });
  });

  describe('isWithinBounds', () => {
    const viewportWidth = 1000;
    const viewportHeight = 800;

    it('should return true when point is within bounds', () => {
      expect(isWithinBounds(500, 400, viewportWidth, viewportHeight)).toBe(true);
      expect(isWithinBounds(0, 0, viewportWidth, viewportHeight)).toBe(true);
      expect(isWithinBounds(1000, 800, viewportWidth, viewportHeight)).toBe(true);
    });

    it('should return false when point is outside bounds', () => {
      expect(isWithinBounds(-10, 400, viewportWidth, viewportHeight)).toBe(false);
      expect(isWithinBounds(500, -10, viewportWidth, viewportHeight)).toBe(false);
      expect(isWithinBounds(1100, 400, viewportWidth, viewportHeight)).toBe(false);
      expect(isWithinBounds(500, 900, viewportWidth, viewportHeight)).toBe(false);
    });
  });

  describe('constrainToBounds', () => {
    const viewportWidth = 1000;
    const viewportHeight = 800;
    const shapeWidth = 100;
    const shapeHeight = 100;

    it('should not modify position when shape is within bounds', () => {
      const result = constrainToBounds(
        400,
        300,
        shapeWidth,
        shapeHeight,
        viewportWidth,
        viewportHeight
      );
      expect(result).toEqual({ x: 400, y: 300 });
    });

    it('should constrain shape to left edge', () => {
      const result = constrainToBounds(
        -50,
        300,
        shapeWidth,
        shapeHeight,
        viewportWidth,
        viewportHeight
      );
      expect(result).toEqual({ x: 0, y: 300 });
    });

    it('should constrain shape to right edge', () => {
      const result = constrainToBounds(
        950,
        300,
        shapeWidth,
        shapeHeight,
        viewportWidth,
        viewportHeight
      );
      expect(result).toEqual({ x: 900, y: 300 }); // viewportWidth - shapeWidth
    });

    it('should constrain shape to top edge', () => {
      const result = constrainToBounds(
        400,
        -50,
        shapeWidth,
        shapeHeight,
        viewportWidth,
        viewportHeight
      );
      expect(result).toEqual({ x: 400, y: 0 });
    });

    it('should constrain shape to bottom edge', () => {
      const result = constrainToBounds(
        400,
        750,
        shapeWidth,
        shapeHeight,
        viewportWidth,
        viewportHeight
      );
      expect(result).toEqual({ x: 400, y: 700 }); // viewportHeight - shapeHeight
    });

    it('should constrain shape to corner when outside both axes', () => {
      const result = constrainToBounds(
        -50,
        -50,
        shapeWidth,
        shapeHeight,
        viewportWidth,
        viewportHeight
      );
      expect(result).toEqual({ x: 0, y: 0 });

      const result2 = constrainToBounds(
        1100,
        900,
        shapeWidth,
        shapeHeight,
        viewportWidth,
        viewportHeight
      );
      expect(result2).toEqual({ x: 900, y: 700 });
    });

    it('should handle different shape sizes', () => {
      const largeWidth = 200;
      const largeHeight = 150;
      
      const result = constrainToBounds(
        900,
        700,
        largeWidth,
        largeHeight,
        viewportWidth,
        viewportHeight
      );
      expect(result).toEqual({ 
        x: 800, // viewportWidth - largeWidth
        y: 650  // viewportHeight - largeHeight
      });
    });
  });

  describe('calculateZoomScale', () => {
    it('should zoom in when delta is negative', () => {
      const currentScale = 1;
      const newScale = calculateZoomScale(currentScale, -100);
      expect(newScale).toBeGreaterThan(currentScale);
      expect(newScale).toBeLessThanOrEqual(5); // Max zoom
    });

    it('should zoom out when delta is positive', () => {
      const currentScale = 1;
      const newScale = calculateZoomScale(currentScale, 100);
      expect(newScale).toBeLessThan(currentScale);
      expect(newScale).toBeGreaterThanOrEqual(0.1); // Min zoom
    });

    it('should clamp to minimum zoom (0.1)', () => {
      const currentScale = 0.1;
      const newScale = calculateZoomScale(currentScale, 1000);
      expect(newScale).toBe(0.1);
    });

    it('should clamp to maximum zoom (5)', () => {
      const currentScale = 5;
      const newScale = calculateZoomScale(currentScale, -1000);
      expect(newScale).toBe(5);
    });

    it('should return a value clamped between 0.1 and 5', () => {
      for (let i = 0; i < 100; i++) {
        const scale = Math.random() * 10; // Random scale 0-10
        const delta = (Math.random() - 0.5) * 200; // Random delta -100 to 100
        const result = calculateZoomScale(scale, delta);
        
        expect(result).toBeGreaterThanOrEqual(0.1);
        expect(result).toBeLessThanOrEqual(5);
      }
    });
  });
});

