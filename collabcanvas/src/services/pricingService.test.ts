/**
 * Unit tests for Automatic Price Fetching
 * Tests AC: #5 - Automatic Price Fetching
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPricesForBOM } from './pricingService';
import type { BillOfMaterials } from '../../types/material';
import { httpsCallable } from 'firebase/functions';

// Mock Firebase Functions
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}));

vi.mock('../firebase', () => ({
  functions: {},
}));

describe('PricingService - Automatic Price Fetching', () => {
  let mockGetHomeDepotPrice: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHomeDepotPrice = vi.fn();
    vi.mocked(httpsCallable).mockReturnValue(mockGetHomeDepotPrice);
  });

  describe('fetchPricesForBOM', () => {
    it('should fetch prices for all materials in parallel', async () => {
      const bom: BillOfMaterials = {
        id: 'bom-1',
        totalMaterials: [
          { id: 'mat-1', name: 'Drywall', category: 'surface', unit: 'square-feet', quantity: 100 },
          { id: 'mat-2', name: 'Paint', category: 'finish', unit: 'gallon', quantity: 5 },
          { id: 'mat-3', name: 'Lumber', category: 'framing', unit: 'piece', quantity: 20 },
        ],
        calculations: [],
        createdAt: Date.now(),
        createdBy: 'user1',
        updatedAt: Date.now(),
      };

      // Mock successful price fetches
      mockGetHomeDepotPrice.mockResolvedValue({
        data: { success: true, priceUSD: 10.50, link: 'https://example.com/drywall' },
      });
      mockGetHomeDepotPrice.mockResolvedValueOnce({
        data: { success: true, priceUSD: 25.99, link: 'https://example.com/paint' },
      });
      mockGetHomeDepotPrice.mockResolvedValueOnce({
        data: { success: true, priceUSD: 8.75, link: 'https://example.com/lumber' },
      });

      const result = await fetchPricesForBOM(bom);

      expect(result.bom.totalMaterials).toHaveLength(3);
      expect(result.bom.totalMaterials[0].priceUSD).toBe(10.50);
      expect(result.bom.totalMaterials[1].priceUSD).toBe(25.99);
      expect(result.bom.totalMaterials[2].priceUSD).toBe(8.75);
      expect(result.stats.successful).toBe(3);
      expect(result.stats.successRate).toBe(100);
    });

    it('should handle partial price fetch failures', async () => {
      const bom: BillOfMaterials = {
        id: 'bom-1',
        totalMaterials: [
          { id: 'mat-1', name: 'Drywall', category: 'surface', unit: 'square-feet', quantity: 100 },
          { id: 'mat-2', name: 'Unknown Material', category: 'finish', unit: 'gallon', quantity: 5 },
        ],
        calculations: [],
        createdAt: Date.now(),
        createdBy: 'user1',
        updatedAt: Date.now(),
      };

      mockGetHomeDepotPrice.mockResolvedValueOnce({
        data: { success: true, priceUSD: 10.50, link: 'https://example.com/drywall' },
      });
      mockGetHomeDepotPrice.mockResolvedValueOnce({
        data: { success: false, priceUSD: null, link: null, error: 'Material not found' },
      });

      const result = await fetchPricesForBOM(bom);

      expect(result.bom.totalMaterials[0].priceUSD).toBe(10.50);
      expect(result.bom.totalMaterials[0].priceError).toBeUndefined();
      expect(result.bom.totalMaterials[1].priceUSD).toBeUndefined();
      expect(result.bom.totalMaterials[1].priceError).toBe('Material not found');
      expect(result.stats.successful).toBe(1);
      expect(result.stats.failed).toBe(1);
      expect(result.stats.successRate).toBe(50);
    });

    it('should handle timeout errors', async () => {
      const bom: BillOfMaterials = {
        id: 'bom-1',
        totalMaterials: [
          { id: 'mat-1', name: 'Slow Material', category: 'surface', unit: 'square-feet', quantity: 100 },
        ],
        calculations: [],
        createdAt: Date.now(),
        createdBy: 'user1',
        updatedAt: Date.now(),
      };

      // Mock timeout error
      mockGetHomeDepotPrice.mockRejectedValue(new Error('Request timeout after 30000ms'));

      const result = await fetchPricesForBOM(bom);

      expect(result.bom.totalMaterials[0].priceUSD).toBeUndefined();
      expect(result.bom.totalMaterials[0].priceError).toContain('timeout');
      expect(result.stats.successful).toBe(0);
      expect(result.stats.failed).toBe(1);
      expect(result.stats.successRate).toBe(0);
    });

    it('should call progress callback with statistics', async () => {
      const bom: BillOfMaterials = {
        id: 'bom-1',
        totalMaterials: [
          { id: 'mat-1', name: 'Material 1', category: 'surface', unit: 'square-feet', quantity: 100 },
          { id: 'mat-2', name: 'Material 2', category: 'finish', unit: 'gallon', quantity: 5 },
        ],
        calculations: [],
        createdAt: Date.now(),
        createdBy: 'user1',
        updatedAt: Date.now(),
      };

      mockGetHomeDepotPrice.mockResolvedValue({
        data: { success: true, priceUSD: 10.50 },
      });

      const progressCallback = vi.fn();
      await fetchPricesForBOM(bom, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0];
      expect(lastCall.total).toBe(2);
      expect(lastCall.successful).toBe(2);
      expect(lastCall.successRate).toBe(100);
    });

    it('should execute price fetches in parallel', async () => {
      const bom: BillOfMaterials = {
        id: 'bom-1',
        totalMaterials: [
          { id: 'mat-1', name: 'Material 1', category: 'surface', unit: 'square-feet', quantity: 100 },
          { id: 'mat-2', name: 'Material 2', category: 'finish', unit: 'gallon', quantity: 5 },
        ],
        calculations: [],
        createdAt: Date.now(),
        createdBy: 'user1',
        updatedAt: Date.now(),
      };

      const startTimes: number[] = [];
      mockGetHomeDepotPrice.mockImplementation(async () => {
        startTimes.push(Date.now());
        await new Promise(resolve => setTimeout(resolve, 50));
        return { data: { success: true, priceUSD: 10.50 } };
      });

      await fetchPricesForBOM(bom);

      // Both should start within 10ms of each other (parallel execution)
      const timeDiff = Math.abs(startTimes[0] - startTimes[1]);
      expect(timeDiff).toBeLessThan(50); // Allow margin for test execution
    });

    it('should track success rate correctly', async () => {
      const bom: BillOfMaterials = {
        id: 'bom-1',
        totalMaterials: [
          { id: 'mat-1', name: 'Success 1', category: 'surface', unit: 'square-feet', quantity: 100 },
          { id: 'mat-2', name: 'Success 2', category: 'finish', unit: 'gallon', quantity: 5 },
          { id: 'mat-3', name: 'Fail 1', category: 'framing', unit: 'piece', quantity: 10 },
          { id: 'mat-4', name: 'Fail 2', category: 'framing', unit: 'piece', quantity: 10 },
        ],
        calculations: [],
        createdAt: Date.now(),
        createdBy: 'user1',
        updatedAt: Date.now(),
      };

      mockGetHomeDepotPrice
        .mockResolvedValueOnce({ data: { success: true, priceUSD: 10.50 } })
        .mockResolvedValueOnce({ data: { success: true, priceUSD: 25.99 } })
        .mockResolvedValueOnce({ data: { success: false, priceUSD: null, error: 'Not found' } })
        .mockResolvedValueOnce({ data: { success: false, priceUSD: null, error: 'Not found' } });

      const result = await fetchPricesForBOM(bom);

      expect(result.stats.total).toBe(4);
      expect(result.stats.successful).toBe(2);
      expect(result.stats.failed).toBe(2);
      expect(result.stats.successRate).toBe(50);
    });

    it('should handle API unavailability with clear error message', async () => {
      const bom: BillOfMaterials = {
        id: 'bom-1',
        totalMaterials: [
          { id: 'mat-1', name: 'Material', category: 'surface', unit: 'square-feet', quantity: 100 },
        ],
        calculations: [],
        createdAt: Date.now(),
        createdBy: 'user1',
        updatedAt: Date.now(),
      };

      mockGetHomeDepotPrice.mockRejectedValue(new Error('ECONNREFUSED - Service unavailable'));

      const result = await fetchPricesForBOM(bom);

      expect(result.bom.totalMaterials[0].priceError).toContain('Price API unavailable');
      expect(result.bom.totalMaterials[0].priceError).toContain('enter price manually');
    });

    it('should retry failed price fetches when retryFailed is true', async () => {
      const bom: BillOfMaterials = {
        id: 'bom-1',
        totalMaterials: [
          { id: 'mat-1', name: 'Material', category: 'surface', unit: 'square-feet', quantity: 100 },
        ],
        calculations: [],
        createdAt: Date.now(),
        createdBy: 'user1',
        updatedAt: Date.now(),
      };

      // First call fails, retry succeeds
      mockGetHomeDepotPrice
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({ data: { success: true, priceUSD: 10.50 } });

      const result = await fetchPricesForBOM(bom, undefined, true); // retryFailed = true

      expect(mockGetHomeDepotPrice).toHaveBeenCalledTimes(2); // Initial + retry
      expect(result.bom.totalMaterials[0].priceUSD).toBe(10.50);
      expect(result.stats.successful).toBe(1);
    });

    it('should handle multiple price fetch failures gracefully', async () => {
      const bom: BillOfMaterials = {
        id: 'bom-1',
        totalMaterials: [
          { id: 'mat-1', name: 'Material 1', category: 'surface', unit: 'square-feet', quantity: 100 },
          { id: 'mat-2', name: 'Material 2', category: 'finish', unit: 'gallon', quantity: 5 },
          { id: 'mat-3', name: 'Material 3', category: 'framing', unit: 'piece', quantity: 10 },
        ],
        calculations: [],
        createdAt: Date.now(),
        createdBy: 'user1',
        updatedAt: Date.now(),
      };

      mockGetHomeDepotPrice.mockResolvedValue({
        data: { success: false, priceUSD: null, error: 'Material not found' },
      });

      const result = await fetchPricesForBOM(bom);

      expect(result.bom.totalMaterials.every(m => m.priceError)).toBe(true);
      expect(result.stats.successful).toBe(0);
      expect(result.stats.failed).toBe(3);
      expect(result.stats.successRate).toBe(0);
    });
  });
});
