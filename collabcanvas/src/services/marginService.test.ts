/**
 * Unit tests for margin calculation service
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMaterialCost,
  calculateLaborCost,
  calculateMarginDollars,
  calculateMarginTimeSlack,
  calculateMargin,
  formatMargin,
} from './marginService';
import type { BillOfMaterials, MaterialSpec } from '../types/material';
import type { CPM, CPMTask } from '../types/cpm';

describe('marginService', () => {
  const createMockBOM = (materials: MaterialSpec[]): BillOfMaterials => ({
    id: 'test-bom',
    projectName: 'Test Project',
    totalMaterials: materials,
    calculations: [],
    createdAt: Date.now(),
    createdBy: 'test-user',
    updatedAt: Date.now(),
  });

  const createMockCPM = (totalDurationDays: number, tasks: CPMTask[]): CPM => ({
    id: 'test-cpm',
    projectId: 'test-project',
    tasks,
    criticalPath: [],
    totalDuration: totalDurationDays,
    createdAt: Date.now(),
    createdBy: 'test-user',
    updatedAt: Date.now(),
  });

  describe('calculateMaterialCost', () => {
    it('should calculate material cost from BOM with prices', () => {
      const bom = createMockBOM([
        { id: '1', name: 'Material 1', category: 'framing', unit: 'piece', quantity: 10, priceUSD: 5.00 },
        { id: '2', name: 'Material 2', category: 'surface', unit: 'square-feet', quantity: 100, priceUSD: 2.50 },
      ]);

      const cost = calculateMaterialCost(bom);
      expect(cost).toBe(300); // (10 * 5) + (100 * 2.5) = 50 + 250 = 300
    });

    it('should ignore materials without prices', () => {
      const bom = createMockBOM([
        { id: '1', name: 'Material 1', category: 'framing', unit: 'piece', quantity: 10, priceUSD: 5.00 },
        { id: '2', name: 'Material 2', category: 'surface', unit: 'square-feet', quantity: 100 }, // No price
      ]);

      const cost = calculateMaterialCost(bom);
      expect(cost).toBe(50); // Only Material 1 counted
    });

    it('should return 0 for empty BOM', () => {
      const bom = createMockBOM([]);
      const cost = calculateMaterialCost(bom);
      expect(cost).toBe(0);
    });

    it('should ignore materials with zero or negative prices', () => {
      const bom = createMockBOM([
        { id: '1', name: 'Material 1', category: 'framing', unit: 'piece', quantity: 10, priceUSD: 5.00 },
        { id: '2', name: 'Material 2', category: 'surface', unit: 'square-feet', quantity: 100, priceUSD: 0 },
        { id: '3', name: 'Material 3', category: 'finish', unit: 'gallon', quantity: 5, priceUSD: -10 },
      ]);

      const cost = calculateMaterialCost(bom);
      expect(cost).toBe(50); // Only Material 1 counted
    });
  });

  describe('calculateLaborCost', () => {
    it('should calculate labor cost from CPM duration', () => {
      const cpm = createMockCPM(10, []); // 10 days
      const cost = calculateLaborCost(cpm, 50, 8); // $50/hour, 8 hours/day
      expect(cost).toBe(4000); // 10 days * 8 hours/day * $50/hour = 4000
    });

    it('should return 0 if CPM is null or undefined', () => {
      expect(calculateLaborCost(null)).toBe(0);
      expect(calculateLaborCost(undefined)).toBe(0);
    });

    it('should return 0 if CPM has zero duration', () => {
      const cpm = createMockCPM(0, []);
      const cost = calculateLaborCost(cpm);
      expect(cost).toBe(0);
    });

    it('should use custom labor rate and hours per day', () => {
      const cpm = createMockCPM(5, []); // 5 days
      const cost = calculateLaborCost(cpm, 75, 10); // $75/hour, 10 hours/day
      expect(cost).toBe(3750); // 5 * 10 * 75 = 3750
    });
  });

  describe('calculateMarginDollars', () => {
    it('should calculate margin in dollars', () => {
      const margin = calculateMarginDollars(1000, 0.20); // 20% margin
      expect(margin).toBe(200);
    });

    it('should handle different margin percentages', () => {
      expect(calculateMarginDollars(1000, 0.15)).toBe(150); // 15%
      expect(calculateMarginDollars(1000, 0.25)).toBe(250); // 25%
      expect(calculateMarginDollars(1000, 0.30)).toBe(300); // 30%
    });
  });

  describe('calculateMarginTimeSlack', () => {
    it('should calculate margin time slack', () => {
      const slack = calculateMarginTimeSlack(10, 0.20); // 10 days, 20% margin
      expect(slack).toBe(2); // 10 * 0.20 = 2 days
    });

    it('should handle different durations and percentages', () => {
      expect(calculateMarginTimeSlack(20, 0.15)).toBe(3); // 20 * 0.15 = 3 days
      expect(calculateMarginTimeSlack(5, 0.25)).toBe(1.25); // 5 * 0.25 = 1.25 days
    });
  });

  describe('calculateMargin', () => {
    it('should calculate complete margin breakdown', () => {
      const bom = createMockBOM([
        { id: '1', name: 'Material 1', category: 'framing', unit: 'piece', quantity: 10, priceUSD: 5.00 },
        { id: '2', name: 'Material 2', category: 'surface', unit: 'square-feet', quantity: 100, priceUSD: 2.50 },
      ]);
      const cpm = createMockCPM(10, []); // 10 days

      const margin = calculateMargin({ bom, cpm, marginPercentage: 0.20 });

      expect(margin.materialCost).toBe(300); // (10 * 5) + (100 * 2.5) = 300
      expect(margin.laborCost).toBe(4000); // 10 days * 8 hours * $50 = 4000
      expect(margin.subtotal).toBe(4300); // 300 + 4000
      expect(margin.marginPercentage).toBe(0.20);
      expect(margin.marginDollars).toBe(860); // 4300 * 0.20 = 860
      expect(margin.marginTimeSlack).toBe(2); // 10 * 0.20 = 2 days
      expect(margin.total).toBe(5160); // 4300 + 860
    });

    it('should use default margin percentage if not provided', () => {
      const bom = createMockBOM([
        { id: '1', name: 'Material 1', category: 'framing', unit: 'piece', quantity: 10, priceUSD: 10.00 },
      ]);
      const cpm = createMockCPM(5, []);

      const margin = calculateMargin({ bom, cpm });

      expect(margin.marginPercentage).toBe(0.20); // Default 20%
    });

    it('should handle BOM without CPM (labor cost = 0)', () => {
      const bom = createMockBOM([
        { id: '1', name: 'Material 1', category: 'framing', unit: 'piece', quantity: 10, priceUSD: 10.00 },
      ]);

      const margin = calculateMargin({ bom, cpm: null });

      expect(margin.materialCost).toBe(100);
      expect(margin.laborCost).toBe(0);
      expect(margin.subtotal).toBe(100);
      expect(margin.marginDollars).toBe(20); // 100 * 0.20
      expect(margin.total).toBe(120);
    });

    it('should handle custom margin percentage and labor rate', () => {
      const bom = createMockBOM([
        { id: '1', name: 'Material 1', category: 'framing', unit: 'piece', quantity: 10, priceUSD: 10.00 },
      ]);
      const cpm = createMockCPM(10, []);

      const margin = calculateMargin({
        bom,
        cpm,
        marginPercentage: 0.25, // 25%
        laborRatePerHour: 75, // $75/hour
        hoursPerDay: 10, // 10 hours/day
      });

      expect(margin.marginPercentage).toBe(0.25);
      expect(margin.laborCost).toBe(7500); // 10 * 10 * 75
      expect(margin.subtotal).toBe(7600); // 100 + 7500
      expect(margin.marginDollars).toBe(1900); // 7600 * 0.25
      expect(margin.marginTimeSlack).toBe(2.5); // 10 * 0.25
    });
  });

  describe('formatMargin', () => {
    it('should format margin values for display', () => {
      const margin = {
        materialCost: 300,
        laborCost: 4000,
        subtotal: 4300,
        marginPercentage: 0.20,
        marginDollars: 860,
        marginTimeSlack: 2,
        total: 5160,
      };

      const formatted = formatMargin(margin);

      expect(formatted.materialCost).toBe('$300.00');
      expect(formatted.laborCost).toBe('$4,000.00');
      expect(formatted.subtotal).toBe('$4,300.00');
      expect(formatted.marginDollars).toBe('$860.00');
      expect(formatted.marginTimeSlack).toBe('2.0 days');
      expect(formatted.total).toBe('$5,160.00');
      expect(formatted.marginPercentage).toBe('20.0%');
    });
  });
});

