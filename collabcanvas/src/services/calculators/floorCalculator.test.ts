/**
 * Floor Calculator Tests
 * PR-4: Test floor material calculations
 */

import { describe, it, expect } from 'vitest';
import {
  calculateFloorMaterials,
  calculateEpoxyCoating,
  calculateTileFlooring,
  calculateFloorByType,
  calculateMultipleFloors,
} from './floorCalculator';
import { DEFAULT_FLOOR_ASSUMPTIONS } from '../../data/defaultAssumptions';

describe('floorCalculator', () => {
  describe('calculateFloorMaterials', () => {
    it('should calculate epoxy materials correctly', () => {
      const result = calculateFloorMaterials(500, {
        ...DEFAULT_FLOOR_ASSUMPTIONS,
        type: 'epoxy',
      });

      expect(result.materials.length).toBeGreaterThan(0);
      
      // Should have cleaner, etching, primer, base, top coat
      expect(result.materials.find(m => m.id === 'epoxy-cleaner')).toBeDefined();
      expect(result.materials.find(m => m.id === 'epoxy-etching')).toBeDefined();
      expect(result.materials.find(m => m.id === 'epoxy-primer')).toBeDefined();
      expect(result.materials.find(m => m.id === 'epoxy-base')).toBeDefined();
      expect(result.materials.find(m => m.id === 'epoxy-top')).toBeDefined();
    });

    it('should calculate tile materials correctly', () => {
      const result = calculateFloorMaterials(500, {
        ...DEFAULT_FLOOR_ASSUMPTIONS,
        type: 'tile',
      });

      expect(result.materials.find(m => m.id === 'tiles')).toBeDefined();
      expect(result.materials.find(m => m.id === 'thinset')).toBeDefined();
      expect(result.materials.find(m => m.id === 'grout')).toBeDefined();
    });

    it('should calculate carpet materials correctly', () => {
      const result = calculateFloorMaterials(500, {
        ...DEFAULT_FLOOR_ASSUMPTIONS,
        type: 'carpet',
      });

      expect(result.materials.find(m => m.id === 'carpet-rolls')).toBeDefined();
      expect(result.materials.find(m => m.id === 'carpet-padding')).toBeDefined();
      expect(result.materials.find(m => m.id === 'tack-strips')).toBeDefined();
    });

    it('should calculate hardwood materials correctly', () => {
      const result = calculateFloorMaterials(500, {
        ...DEFAULT_FLOOR_ASSUMPTIONS,
        type: 'hardwood',
      });

      expect(result.materials.find(m => m.id === 'hardwood-boxes')).toBeDefined();
      expect(result.materials.find(m => m.id === 'underlayment')).toBeDefined();
      expect(result.materials.find(m => m.id === 'flooring-nails')).toBeDefined();
    });
  });

  describe('calculateEpoxyCoating', () => {
    it('should include preparation materials by default', () => {
      const materials = calculateEpoxyCoating(500);

      expect(materials.find(m => m.id === 'epoxy-cleaner')).toBeDefined();
      expect(materials.find(m => m.id === 'epoxy-etching')).toBeDefined();
    });

    it('should exclude preparation materials when specified', () => {
      const materials = calculateEpoxyCoating(500, false);

      expect(materials.find(m => m.id === 'epoxy-cleaner')).toBeUndefined();
      expect(materials.find(m => m.id === 'epoxy-etching')).toBeUndefined();
      expect(materials.find(m => m.id === 'epoxy-base')).toBeDefined();
    });
  });

  describe('calculateTileFlooring', () => {
    it('should calculate different tile quantities for different sizes', () => {
      const tiles12x12 = calculateTileFlooring(500, '12x12');
      const tiles24x24 = calculateTileFlooring(500, '24x24');

      const count12 = tiles12x12.find(m => m.id === 'tiles')!.quantity;
      const count24 = tiles24x24.find(m => m.id === 'tiles')!.quantity;

      // 24x24 tiles are 4 sqft each vs 1 sqft for 12x12
      expect(count12).toBeGreaterThan(count24);
    });
  });

  describe('calculateFloorByType', () => {
    it('should route to correct calculator based on type', () => {
      const epoxy = calculateFloorByType(500, 'epoxy');
      const tile = calculateFloorByType(500, 'tile');
      const carpet = calculateFloorByType(500, 'carpet');
      const hardwood = calculateFloorByType(500, 'hardwood');

      expect(epoxy.find(m => m.id.includes('epoxy'))).toBeDefined();
      expect(tile.find(m => m.id === 'tiles')).toBeDefined();
      expect(carpet.find(m => m.id.includes('carpet'))).toBeDefined();
      expect(hardwood.find(m => m.id.includes('hardwood'))).toBeDefined();
    });

    it('should accept tile size option', () => {
      const result = calculateFloorByType(500, 'tile', { tileSize: '24x24' });
      
      const tiles = result.find(m => m.id === 'tiles');
      expect(tiles).toBeDefined();
      expect(tiles!.name).toContain('24x24');
    });
  });

  describe('calculateMultipleFloors', () => {
    it('should consolidate materials from multiple areas', () => {
      const areas = [
        { area: 250, type: 'epoxy' as const },
        { area: 250, type: 'epoxy' as const },
      ];

      const result = calculateMultipleFloors(areas);

      expect(result.materials.length).toBeGreaterThan(0);
      // Materials should be consolidated
      expect(result.materials.filter(m => m.id === 'epoxy-base').length).toBe(1);
    });

    it('should handle mixed floor types', () => {
      const areas = [
        { area: 250, type: 'epoxy' as const },
        { area: 250, type: 'tile' as const },
      ];

      const result = calculateMultipleFloors(areas);

      expect(result.materials.find(m => m.id.includes('epoxy'))).toBeDefined();
      expect(result.materials.find(m => m.id === 'tiles')).toBeDefined();
    });
  });
});

