/**
 * Tests for alignmentService
 */

import { describe, it, expect } from 'vitest';
import { alignmentService } from '../services/alignmentService';
import type { Shape } from '../types';

describe('alignmentService', () => {
  const mockShapes: Shape[] = [
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

  describe('alignShapes', () => {
    it('should align shapes to left', () => {
      const alignedShapes = alignmentService.alignShapes(mockShapes, 'left');
      
      // All shapes should have the same x position (leftmost)
      const leftmostX = Math.min(...mockShapes.map(s => s.x));
      alignedShapes.forEach(shape => {
        expect(shape.x).toBe(leftmostX);
      });
    });

    it('should align shapes to right', () => {
      const alignedShapes = alignmentService.alignShapes(mockShapes, 'right');
      
      // All shapes should have the same right edge position
      const rightmostX = Math.max(...mockShapes.map(s => s.x + s.w));
      alignedShapes.forEach(shape => {
        expect(shape.x + shape.w).toBe(rightmostX);
      });
    });

    it('should align shapes to center', () => {
      const alignedShapes = alignmentService.alignShapes(mockShapes, 'center');
      
      // All shapes should be centered around the same point
      const minX = Math.min(...mockShapes.map(s => s.x));
      const maxX = Math.max(...mockShapes.map(s => s.x + s.w));
      const centerX = (minX + maxX) / 2;
      
      alignedShapes.forEach(shape => {
        const shapeCenterX = shape.x + shape.w / 2;
        expect(shapeCenterX).toBeCloseTo(centerX, 1);
      });
    });

    it('should align shapes to top', () => {
      const alignedShapes = alignmentService.alignShapes(mockShapes, 'top');
      
      // All shapes should have the same y position (topmost)
      const topmostY = Math.min(...mockShapes.map(s => s.y));
      alignedShapes.forEach(shape => {
        expect(shape.y).toBe(topmostY);
      });
    });

    it('should align shapes to bottom', () => {
      const alignedShapes = alignmentService.alignShapes(mockShapes, 'bottom');
      
      // All shapes should have the same bottom edge position
      const bottommostY = Math.max(...mockShapes.map(s => s.y + s.h));
      alignedShapes.forEach(shape => {
        expect(shape.y + shape.h).toBe(bottommostY);
      });
    });

    it('should align shapes to middle', () => {
      const alignedShapes = alignmentService.alignShapes(mockShapes, 'middle');
      
      // All shapes should be centered around the same vertical point
      const minY = Math.min(...mockShapes.map(s => s.y));
      const maxY = Math.max(...mockShapes.map(s => s.y + s.h));
      const centerY = (minY + maxY) / 2;
      
      alignedShapes.forEach(shape => {
        const shapeCenterY = shape.y + shape.h / 2;
        expect(shapeCenterY).toBeCloseTo(centerY, 1);
      });
    });

    it('should return original shapes if less than 2 shapes', () => {
      const singleShape = [mockShapes[0]];
      const alignedShapes = alignmentService.alignShapes(singleShape, 'left');
      
      expect(alignedShapes).toEqual(singleShape);
    });
  });

  describe('distributeShapes', () => {
    it('should distribute shapes horizontally', () => {
      const distributedShapes = alignmentService.distributeShapes(mockShapes, 'horizontal');
      
      // Sort by x position
      const sortedShapes = [...distributedShapes].sort((a, b) => a.x - b.x);
      
      // First and last shapes should remain in their original positions
      expect(sortedShapes[0].x).toBe(mockShapes[0].x);
      expect(sortedShapes[sortedShapes.length - 1].x).toBe(mockShapes[1].x);
      
      // Middle shapes should be evenly spaced
      const totalWidth = sortedShapes[sortedShapes.length - 1].x - sortedShapes[0].x;
      const expectedSpacing = totalWidth / (sortedShapes.length - 1);
      
      for (let i = 1; i < sortedShapes.length - 1; i++) {
        const expectedX = sortedShapes[0].x + expectedSpacing * i;
        expect(sortedShapes[i].x).toBeCloseTo(expectedX, 1);
      }
    });

    it('should distribute shapes vertically', () => {
      const distributedShapes = alignmentService.distributeShapes(mockShapes, 'vertical');
      
      // Sort by y position
      const sortedShapes = [...distributedShapes].sort((a, b) => a.y - b.y);
      
      // First and last shapes should remain in their original positions
      expect(sortedShapes[0].y).toBe(mockShapes[0].y);
      expect(sortedShapes[sortedShapes.length - 1].y).toBe(mockShapes[2].y);
      
      // Middle shapes should be evenly spaced
      const totalHeight = sortedShapes[sortedShapes.length - 1].y - sortedShapes[0].y;
      const expectedSpacing = totalHeight / (sortedShapes.length - 1);
      
      for (let i = 1; i < sortedShapes.length - 1; i++) {
        const expectedY = sortedShapes[0].y + expectedSpacing * i;
        expect(sortedShapes[i].y).toBeCloseTo(expectedY, 1);
      }
    });

    it('should return original shapes if less than 3 shapes', () => {
      const twoShapes = mockShapes.slice(0, 2);
      const distributedShapes = alignmentService.distributeShapes(twoShapes, 'horizontal');
      
      expect(distributedShapes).toEqual(twoShapes);
    });
  });

  describe('calculateAlignmentValue', () => {
    it('should calculate correct alignment values', () => {
      expect(alignmentService.calculateAlignmentValue(mockShapes, 'left')).toBe(0);
      expect(alignmentService.calculateAlignmentValue(mockShapes, 'right')).toBe(300);
      expect(alignmentService.calculateAlignmentValue(mockShapes, 'center')).toBe(150);
      expect(alignmentService.calculateAlignmentValue(mockShapes, 'top')).toBe(0);
      expect(alignmentService.calculateAlignmentValue(mockShapes, 'bottom')).toBe(300);
      expect(alignmentService.calculateAlignmentValue(mockShapes, 'middle')).toBe(150);
    });
  });

  describe('calculateDistributionSpacing', () => {
    it('should calculate correct horizontal spacing', () => {
      const spacing = alignmentService.calculateDistributionSpacing(mockShapes, 'horizontal');
      expect(spacing).toBe(100); // (200 - 0) / (3 - 1)
    });

    it('should calculate correct vertical spacing', () => {
      const spacing = alignmentService.calculateDistributionSpacing(mockShapes, 'vertical');
      expect(spacing).toBe(100); // (200 - 0) / (3 - 1)
    });

    it('should return 0 for less than 3 shapes', () => {
      const twoShapes = mockShapes.slice(0, 2);
      const spacing = alignmentService.calculateDistributionSpacing(twoShapes, 'horizontal');
      expect(spacing).toBe(0);
    });
  });
});
