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
import type { BillOfMaterials, MaterialSpec } from '../types/material';

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
          } as MaterialSpec,
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

  describe('BOM Export with Pricing (CSV columns)', () => {
    it('should include Price, Link (Home Depot), and Total headers', () => {
      const mockBom: BillOfMaterials = {
        id: 'bom-1',
        calculations: [],
        totalMaterials: [
          {
            id: 'mat-1',
            name: '2x4 Stud',
            category: 'framing',
            unit: 'piece',
            quantity: 10,
          } as MaterialSpec,
        ],
        createdAt: Date.now(),
        createdBy: mockUserId,
        updatedAt: Date.now(),
      };

      const exportData = generateBOMExport(mockBom, 'Project X');

      expect(exportData.headers).toContain('Price');
      expect(exportData.headers).toContain('Link (Home Depot)');
      expect(exportData.headers).toContain('Total');
    });

    it('should output numeric price/link/total in rows when price available', () => {
      const mockBom: BillOfMaterials = {
        id: 'bom-2',
        calculations: [],
        totalMaterials: [
          {
            id: 'mat-1',
            name: 'Drywall Sheet',
            category: 'surface',
            unit: 'sqft',
            quantity: 32,
            priceUSD: 1.25,
            homeDepotLink: 'https://www.homedepot.com/p/123',
          } as MaterialSpec,
        ],
        createdAt: Date.now(),
        createdBy: mockUserId,
        updatedAt: Date.now(),
      };

      const exportData = generateBOMExport(mockBom, 'Project Y');

      const row = exportData.rows.find(r => r.includes('Drywall Sheet'))!;
      expect(row).toContain('1.25');
      expect(row).toContain('https://www.homedepot.com/p/123');
      expect(row).toContain((32 * 1.25).toFixed(2));

      const csv = bomToCSV(exportData);
      expect(csv).toContain('Price');
      expect(csv).toContain('Link (Home Depot)');
      expect(csv).toContain('Total');
      expect(csv).toContain('1.25');
      expect(csv).toContain((32 * 1.25).toFixed(2));
    });

    it('should leave empty cells when price not available', () => {
      const mockBom: BillOfMaterials = {
        id: 'bom-3',
        calculations: [],
        totalMaterials: [
          {
            id: 'mat-2',
            name: 'Primer',
            category: 'paint',
            unit: 'gallon',
            quantity: 2,
          } as MaterialSpec,
        ],
        createdAt: Date.now(),
        createdBy: mockUserId,
        updatedAt: Date.now(),
      };

      const exportData = generateBOMExport(mockBom, 'Project Z');
      const csv = bomToCSV(exportData);
      expect(csv).toContain('Primer');
      expect(csv).not.toMatch(/Primer.*,[0-9]+\.[0-9]{2}/);
    });

    it('should convert API links (apionline.homedepot.com) to public links (www.homedepot.com) in CSV export', () => {
      const mockBom: BillOfMaterials = {
        id: 'bom-4',
        calculations: [],
        totalMaterials: [
          {
            id: 'mat-3',
            name: 'Epoxy Primer',
            category: 'finish',
            unit: 'gallon',
            quantity: 1,
            priceUSD: 48.48,
            // API link format from SerpAPI
            homeDepotLink: 'https://apionline.homedepot.com/p/Rust-Oleum-1-gal-Gloss-Clear-Concrete-and-Garage-Floor-Finish-Topcoat-320202/301068197',
          } as MaterialSpec,
        ],
        createdAt: Date.now(),
        createdBy: mockUserId,
        updatedAt: Date.now(),
      };

      const exportData = generateBOMExport(mockBom, 'Project W');
      const csv = bomToCSV(exportData);

      // Should convert apionline.homedepot.com to www.homedepot.com
      expect(csv).toContain('www.homedepot.com');
      expect(csv).not.toContain('apionline.homedepot.com');
      expect(csv).toContain('https://www.homedepot.com/p/Rust-Oleum-1-gal-Gloss-Clear-Concrete-and-Garage-Floor-Finish-Topcoat-320202/301068197');
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

