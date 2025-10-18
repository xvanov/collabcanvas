/**
 * Tests for gridService
 */

import { describe, it, expect } from 'vitest';
import { gridService } from '../services/gridService';

describe('gridService', () => {
  describe('snapToGrid', () => {
    it('should snap coordinates to grid', () => {
      const gridSize = 20;
      
      expect(gridService.snapToGrid(0, 0, gridSize)).toEqual({ x: 0, y: 0 });
      expect(gridService.snapToGrid(10, 10, gridSize)).toEqual({ x: 20, y: 20 });
      expect(gridService.snapToGrid(15, 15, gridSize)).toEqual({ x: 20, y: 20 });
      expect(gridService.snapToGrid(25, 25, gridSize)).toEqual({ x: 20, y: 20 });
      expect(gridService.snapToGrid(35, 35, gridSize)).toEqual({ x: 40, y: 40 });
    });

    it('should handle negative coordinates', () => {
      const gridSize = 20;
      
      expect(gridService.snapToGrid(-10, -10, gridSize)).toEqual({ x: 0, y: 0 });
      expect(gridService.snapToGrid(-15, -15, gridSize)).toEqual({ x: -20, y: -20 });
      expect(gridService.snapToGrid(-25, -25, gridSize)).toEqual({ x: -20, y: -20 });
    });
  });

  describe('calculateGridLines', () => {
    it('should calculate grid lines for viewport', () => {
      const viewport = {
        width: 800,
        height: 600,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      };
      const gridSize = 20;
      
      const result = gridService.calculateGridLines(viewport, gridSize);
      
      expect(result.verticalLines.length).toBeGreaterThan(0);
      expect(result.horizontalLines.length).toBeGreaterThan(0);
      
      // Check that lines are within viewport bounds
      result.verticalLines.forEach(line => {
        expect(line.x).toBeGreaterThanOrEqual(0);
        expect(line.x).toBeLessThanOrEqual(viewport.width);
        expect(line.y1).toBe(0);
        expect(line.y2).toBe(viewport.height);
      });
      
      result.horizontalLines.forEach(line => {
        expect(line.y).toBeGreaterThanOrEqual(0);
        expect(line.y).toBeLessThanOrEqual(viewport.height);
        expect(line.x1).toBe(0);
        expect(line.x2).toBe(viewport.width);
      });
    });

    it('should handle scaled viewport', () => {
      const viewport = {
        width: 800,
        height: 600,
        offsetX: 100,
        offsetY: 50,
        scale: 2,
      };
      const gridSize = 20;
      
      const result = gridService.calculateGridLines(viewport, gridSize);
      
      expect(result.verticalLines.length).toBeGreaterThan(0);
      expect(result.horizontalLines.length).toBeGreaterThan(0);
    });
  });

  describe('findSnapPoints', () => {
    it('should find snap points when near grid lines', () => {
      const gridSize = 20;
      const snapThreshold = 5;
      
      // Exactly on grid line
      const snapPoints1 = gridService.findSnapPoints(20, 20, gridSize, snapThreshold);
      expect(snapPoints1.length).toBe(1); // corner indicator
      expect(snapPoints1[0].type).toBe('corner');
      
      // Near grid line
      const snapPoints2 = gridService.findSnapPoints(22, 22, gridSize, snapThreshold);
      expect(snapPoints2.length).toBe(1); // corner indicator
      expect(snapPoints2[0].type).toBe('corner');
      
      // Corner snap
      const snapPoints3 = gridService.findSnapPoints(20, 20, gridSize, snapThreshold);
      expect(snapPoints3.some(p => p.type === 'corner')).toBe(true);
    });

    it('should not find snap points when far from grid lines', () => {
      const gridSize = 20;
      const snapThreshold = 5;
      
      const snapPoints = gridService.findSnapPoints(10, 10, gridSize, snapThreshold);
      expect(snapPoints.length).toBe(0);
    });

    it('should return correct snap indicator types', () => {
      const gridSize = 20;
      const snapThreshold = 5;
      
      // Only horizontal snap (vertical line indicator) - x near grid line, y far from grid line
      const horizontalSnap = gridService.findSnapPoints(20, 10, gridSize, snapThreshold);
      expect(horizontalSnap.some(p => p.type === 'vertical')).toBe(true);
      expect(horizontalSnap.some(p => p.type === 'horizontal')).toBe(false);
      
      // Only vertical snap (horizontal line indicator) - y near grid line, x far from grid line
      const verticalSnap = gridService.findSnapPoints(10, 20, gridSize, snapThreshold);
      expect(verticalSnap.some(p => p.type === 'horizontal')).toBe(true);
      expect(verticalSnap.some(p => p.type === 'vertical')).toBe(false);
    });
  });

  describe('isNearGridLine', () => {
    it('should return true when near grid line', () => {
      const gridSize = 20;
      const threshold = 5;
      
      expect(gridService.isNearGridLine(20, gridSize, threshold)).toBe(true);
      expect(gridService.isNearGridLine(22, gridSize, threshold)).toBe(true);
      expect(gridService.isNearGridLine(18, gridSize, threshold)).toBe(true);
    });

    it('should return false when far from grid line', () => {
      const gridSize = 20;
      const threshold = 5;
      
      expect(gridService.isNearGridLine(10, gridSize, threshold)).toBe(false);
      expect(gridService.isNearGridLine(30, gridSize, threshold)).toBe(false);
      expect(gridService.isNearGridLine(6, gridSize, threshold)).toBe(false);
    });

    it('should handle edge cases', () => {
      const gridSize = 20;
      const threshold = 5;
      
      expect(gridService.isNearGridLine(0, gridSize, threshold)).toBe(true);
      expect(gridService.isNearGridLine(-5, gridSize, threshold)).toBe(true);
      expect(gridService.isNearGridLine(-10, gridSize, threshold)).toBe(false);
    });
  });
});
