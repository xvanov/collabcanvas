/**
 * Material Service Tests
 * PR-4: Test material service orchestration
 */

import { describe, it, expect } from 'vitest';
import {
  calculateWallEstimate,
  calculateFloorEstimate,
  compareMaterialCalculations,
  generateBOMExport,
  bomToCSV,
  mergeMaterialCalculations,
} from './materialService';
import { DEFAULT_WALL_ASSUMPTIONS, DEFAULT_FLOOR_ASSUMPTIONS } from '../data/defaultAssumptions';
import type { BillOfMaterials } from '../types/material';

describe('materialService', () => {
  const mockUserId = 'test-user-123';

  describe('calculateWallEstimate', () => {
    it('should generate complete wall estimate', () => {
      const result = calculateWallEstimate(20, DEFAULT_WALL_ASSUMPTIONS, mockUserId);

      expect(result.totalLength).toBe(20);
      expect(result.totalArea).toBe(160); // 20 * 8
      expect(result.materials.length).toBeGreaterThan(0);
      expect(result.assumptions).toBeDefined();
      expect(result.calculatedBy).toBe(mockUserId);
    });

    it('should apply custom assumptions', () => {
      const customAssumptions = {
        ...DEFAULT_WALL_ASSUMPTIONS,
        framing: { type: 'metal' as const, spacing: 24 as const },
      };

      const result = calculateWallEstimate(20, customAssumptions, mockUserId);

      expect(result.assumptions.framing.type).toBe('metal');
      expect(result.assumptions.framing.spacing).toBe(24);
    });
  });

  describe('calculateFloorEstimate', () => {
    it('should generate complete floor estimate', () => {
      const result = calculateFloorEstimate(500, DEFAULT_FLOOR_ASSUMPTIONS, mockUserId);

      expect(result.totalArea).toBe(500);
      expect(result.materials.length).toBeGreaterThan(0);
      expect(result.assumptions).toBeDefined();
      expect(result.calculatedBy).toBe(mockUserId);
    });

    it('should apply custom floor type', () => {
      const customAssumptions = {
        ...DEFAULT_FLOOR_ASSUMPTIONS,
        type: 'tile' as const,
      };

      const result = calculateFloorEstimate(500, customAssumptions, mockUserId);

      expect(result.materials.find(m => m.id === 'tiles')).toBeDefined();
    });
  });

  describe('compareMaterialCalculations', () => {
    it('should identify material quantity changes', () => {
      const calc1 = calculateWallEstimate(20, DEFAULT_WALL_ASSUMPTIONS, mockUserId);
      const calc2 = calculateWallEstimate(20, {
        ...DEFAULT_WALL_ASSUMPTIONS,
        framing: { type: 'metal' as const, spacing: 24 as const },
      }, mockUserId);

      const comparison = compareMaterialCalculations(calc1, calc2);

      expect(comparison.length).toBeGreaterThan(0);
      
      // Should show changes in materials
      comparison.forEach(change => {
        expect(change.difference).not.toBe(0);
      });
    });

    it('should calculate percentage changes correctly', () => {
      const calc1 = calculateWallEstimate(20, DEFAULT_WALL_ASSUMPTIONS, mockUserId);
      const calc2 = calculateWallEstimate(40, DEFAULT_WALL_ASSUMPTIONS, mockUserId);

      const comparison = compareMaterialCalculations(calc1, calc2);

      // Doubling length should roughly double materials
      comparison.forEach(change => {
        if (change.previousQuantity > 0) {
          expect(Math.abs(change.percentageChange)).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('generateBOMExport', () => {
    it('should generate CSV export data', () => {
      const mockBom: BillOfMaterials = {
        id: 'test-bom',
        calculations: [],
        totalMaterials: [
          {
            id: 'test-material',
            name: 'Test Material',
            category: 'framing',
            unit: 'piece',
            quantity: 10,
          },
        ],
        createdAt: Date.now(),
        createdBy: mockUserId,
        updatedAt: Date.now(),
      };

      const exportData = generateBOMExport(mockBom, 'Test Project');

      expect(exportData.headers).toContain('Category');
      expect(exportData.headers).toContain('Item');
      expect(exportData.headers).toContain('Quantity');
      expect(exportData.rows.length).toBe(1);
      expect(exportData.metadata.projectName).toBe('Test Project');
    });
  });

  describe('bomToCSV', () => {
    it('should convert export data to CSV string', () => {
      const exportData = {
        headers: ['Category', 'Item', 'Quantity'],
        rows: [
          ['framing', 'Studs', '50'],
          ['surface', 'Drywall', '20'],
        ],
        metadata: {
          projectName: 'Test',
          generatedAt: Date.now(),
          generatedBy: mockUserId,
        },
      };

      const csv = bomToCSV(exportData);

      expect(csv).toContain('Category,Item,Quantity');
      expect(csv).toContain('framing,Studs,50');
      expect(csv).toContain('surface,Drywall,20');
      expect(csv).toContain('# Project: Test');
    });

    it('should escape commas in cell values', () => {
      const exportData = {
        headers: ['Item'],
        rows: [
          ['Material, 2x4'],
        ],
        metadata: {
          projectName: 'Test',
          generatedAt: Date.now(),
          generatedBy: mockUserId,
        },
      };

      const csv = bomToCSV(exportData);

      expect(csv).toContain('"Material, 2x4"');
    });
  });

  describe('mergeMaterialCalculations', () => {
    it('should merge multiple calculations', () => {
      const calc1 = calculateWallEstimate(20, DEFAULT_WALL_ASSUMPTIONS, mockUserId);
      const calc2 = calculateWallEstimate(30, DEFAULT_WALL_ASSUMPTIONS, mockUserId);

      const merged = mergeMaterialCalculations([calc1, calc2]);

      expect(merged.totalLength).toBe(50); // 20 + 30
      expect(merged.materials.length).toBeGreaterThan(0);
    });

    it('should consolidate duplicate materials', () => {
      const calc1 = calculateWallEstimate(20, DEFAULT_WALL_ASSUMPTIONS, mockUserId);
      const calc2 = calculateWallEstimate(20, DEFAULT_WALL_ASSUMPTIONS, mockUserId);

      const merged = mergeMaterialCalculations([calc1, calc2]);

      // Each material should appear only once with combined quantity
      const materialIds = merged.materials.map(m => m.id);
      const uniqueIds = new Set(materialIds);
      expect(materialIds.length).toBe(uniqueIds.size);
    });

    it('should throw error for empty array', () => {
      expect(() => mergeMaterialCalculations([])).toThrow();
    });

    it('should return single calculation unchanged', () => {
      const calc = calculateWallEstimate(20, DEFAULT_WALL_ASSUMPTIONS, mockUserId);
      const merged = mergeMaterialCalculations([calc]);

      expect(merged).toEqual(calc);
    });
  });
});

