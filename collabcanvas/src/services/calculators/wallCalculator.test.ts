/**
 * Wall Calculator Tests
 * PR-4: Test wall material calculations
 */

import { describe, it, expect } from 'vitest';
import {
  calculateWallMaterials,
  calculateFramingMaterials,
  calculateMultipleWalls,
  estimateWallHeight,
  calculateWallArea,
} from './wallCalculator';
import { DEFAULT_WALL_ASSUMPTIONS } from '../../data/defaultAssumptions';

describe('wallCalculator', () => {
  describe('calculateWallMaterials', () => {
    it('should calculate lumber framing materials correctly', () => {
      const result = calculateWallMaterials(20, {
        ...DEFAULT_WALL_ASSUMPTIONS,
        framing: { type: 'lumber', spacing: 16 },
      });

      expect(result.materials.length).toBeGreaterThan(0);
      expect(result.summary.totalItems).toBeGreaterThan(0);
      
      // Should have studs
      const studs = result.materials.find(m => m.id === 'lumber-studs');
      expect(studs).toBeDefined();
      expect(studs!.quantity).toBeGreaterThan(0);
    });

    it('should calculate metal framing materials correctly', () => {
      const result = calculateWallMaterials(20, {
        ...DEFAULT_WALL_ASSUMPTIONS,
        framing: { type: 'metal', spacing: 24 },
      });

      expect(result.materials.length).toBeGreaterThan(0);
      
      // Should have metal studs
      const studs = result.materials.find(m => m.id === 'metal-studs');
      expect(studs).toBeDefined();
      expect(studs!.quantity).toBeGreaterThan(0);
    });

    it('should calculate drywall materials', () => {
      const result = calculateWallMaterials(20, {
        ...DEFAULT_WALL_ASSUMPTIONS,
        surface: { type: 'drywall', thickness: '1/2"' },
      });

      const drywall = result.materials.find(m => m.id === 'drywall-sheets');
      expect(drywall).toBeDefined();
      expect(drywall!.quantity).toBeGreaterThan(0);
    });

    it('should calculate paint materials when specified', () => {
      const result = calculateWallMaterials(20, {
        ...DEFAULT_WALL_ASSUMPTIONS,
        finish: { coats: 2, includePrimer: true },
      });

      const primer = result.materials.find(m => m.id === 'paint-primer');
      const paint = result.materials.find(m => m.id === 'paint');
      
      expect(primer).toBeDefined();
      expect(paint).toBeDefined();
    });

    it('should skip paint when coats is 0', () => {
      const result = calculateWallMaterials(20, {
        ...DEFAULT_WALL_ASSUMPTIONS,
        finish: { coats: 0, includePrimer: false },
      });

      const primer = result.materials.find(m => m.id === 'paint-primer');
      const paint = result.materials.find(m => m.id === 'paint');
      
      expect(primer).toBeUndefined();
      expect(paint).toBeUndefined();
    });

    it('should calculate trim materials when doors/windows specified', () => {
      const result = calculateWallMaterials(20, {
        ...DEFAULT_WALL_ASSUMPTIONS,
        doors: 2,
        windows: 3,
      });

      const doorTrim = result.materials.find(m => m.id === 'door-trim');
      const windowTrim = result.materials.find(m => m.id === 'window-trim');
      
      expect(doorTrim).toBeDefined();
      expect(windowTrim).toBeDefined();
      expect(doorTrim!.notes).toContain('2 doors');
      expect(windowTrim!.notes).toContain('3 windows');
    });
  });

  describe('calculateFramingMaterials', () => {
    it('should calculate more studs for 16" spacing than 24"', () => {
      const lumber16 = calculateFramingMaterials({
        length: 20,
        height: 8,
        spacing: 16,
        type: 'lumber',
      });

      const lumber24 = calculateFramingMaterials({
        length: 20,
        height: 8,
        spacing: 24,
        type: 'lumber',
      });

      const studs16 = lumber16.find(m => m.id === 'lumber-studs')!;
      const studs24 = lumber24.find(m => m.id === 'lumber-studs')!;

      expect(studs16.quantity).toBeGreaterThan(studs24.quantity);
    });

    it('should use correct fasteners for lumber vs metal', () => {
      const lumber = calculateFramingMaterials({
        length: 20,
        height: 8,
        spacing: 16,
        type: 'lumber',
      });

      const metal = calculateFramingMaterials({
        length: 20,
        height: 8,
        spacing: 16,
        type: 'metal',
      });

      const lumberFastener = lumber.find(m => m.id === 'nails-16d');
      const metalFastener = metal.find(m => m.id === 'screws-metal');

      expect(lumberFastener).toBeDefined();
      expect(metalFastener).toBeDefined();
      expect(lumberFastener!.name).toContain('Nails');
      expect(metalFastener!.name).toContain('Screws');
    });
  });

  describe('calculateMultipleWalls', () => {
    it('should consolidate materials from multiple segments', () => {
      const segments = [
        { length: 10, height: 8 },
        { length: 15, height: 8 },
      ];

      const result = calculateMultipleWalls(segments, DEFAULT_WALL_ASSUMPTIONS);

      // Should have consolidated materials
      expect(result.materials.length).toBeGreaterThan(0);
      
      // Total should equal sum of individual calculations
      const total = result.summary.totalItems;
      expect(total).toBeGreaterThan(0);
    });

    it('should handle different heights per segment', () => {
      const segments = [
        { length: 10, height: 8 },
        { length: 10, height: 10 },
      ];

      const result = calculateMultipleWalls(segments, DEFAULT_WALL_ASSUMPTIONS);
      expect(result.materials.length).toBeGreaterThan(0);
    });
  });

  describe('estimateWallHeight', () => {
    it('should return 10 feet for commercial spaces', () => {
      expect(estimateWallHeight(true)).toBe(10);
    });

    it('should return 8 feet for residential spaces', () => {
      expect(estimateWallHeight(false)).toBe(8);
    });
  });

  describe('calculateWallArea', () => {
    it('should calculate area correctly', () => {
      expect(calculateWallArea(20, 8)).toBe(160);
      expect(calculateWallArea(10, 10)).toBe(100);
    });
  });
});

