/**
 * Unit tests for actual cost operations
 * AC: #12-15 - Actual Cost Input
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateActualCost } from './bomService';
import type { BillOfMaterials, MaterialSpec } from '../types/material';
import * as bomService from './bomService';

// Mock Firebase
vi.mock('./firebase', () => ({
  firestore: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ seconds: Date.now() / 1000 })),
}));

describe('updateActualCost', () => {
  const mockProjectId = 'test-project';
  const mockUserId = 'test-user';
  const mockBOM: BillOfMaterials = {
    id: 'test-bom',
    projectName: 'Test Project',
    totalMaterials: [
      {
        id: 'mat-1',
        name: 'Material 1',
        category: 'framing',
        unit: 'piece',
        quantity: 10,
        priceUSD: 5.00,
      } as MaterialSpec,
      {
        id: 'mat-2',
        name: 'Material 2',
        category: 'surface',
        unit: 'square-feet',
        quantity: 100,
        priceUSD: 2.50,
      } as MaterialSpec,
    ],
    calculations: [],
    createdAt: Date.now(),
    createdBy: mockUserId,
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(bomService, 'getBOM').mockResolvedValue(mockBOM);
    vi.spyOn(bomService, 'saveBOM').mockResolvedValue();
  });

  it('should update actual cost for a material by ID', async () => {
    const updatedBOM = await updateActualCost(mockProjectId, 'mat-1', 4.50, mockUserId);

    expect(updatedBOM.totalMaterials[0].actualCostUSD).toBe(4.50);
    expect(updatedBOM.totalMaterials[0].actualCostEnteredAt).toBeDefined();
    expect(updatedBOM.totalMaterials[0].actualCostEnteredBy).toBe(mockUserId);
    expect(bomService.saveBOM).toHaveBeenCalledWith(mockProjectId, updatedBOM, mockUserId);
  });

  it('should update actual cost for a material by name', async () => {
    const updatedBOM = await updateActualCost(mockProjectId, 'Material 2', 2.25, mockUserId);

    expect(updatedBOM.totalMaterials[1].actualCostUSD).toBe(2.25);
    expect(updatedBOM.totalMaterials[1].actualCostEnteredBy).toBe(mockUserId);
  });

  it('should clear actual cost when null is passed', async () => {
    // First set an actual cost
    const bomWithCost = await updateActualCost(mockProjectId, 'mat-1', 4.50, mockUserId);
    vi.spyOn(bomService, 'getBOM').mockResolvedValue(bomWithCost);

    // Then clear it
    const updatedBOM = await updateActualCost(mockProjectId, 'mat-1', null, mockUserId);

    expect(updatedBOM.totalMaterials[0].actualCostUSD).toBeUndefined();
    expect(updatedBOM.totalMaterials[0].actualCostEnteredAt).toBeUndefined();
    expect(updatedBOM.totalMaterials[0].actualCostEnteredBy).toBeUndefined();
  });

  it('should throw error if BOM not found', async () => {
    vi.spyOn(bomService, 'getBOM').mockResolvedValue(null);

    await expect(updateActualCost(mockProjectId, 'mat-1', 4.50, mockUserId))
      .rejects.toThrow('BOM not found');
  });

  it('should throw error if material not found', async () => {
    await expect(updateActualCost(mockProjectId, 'nonexistent', 4.50, mockUserId))
      .rejects.toThrow('Material not found');
  });

  it('should allow incremental entry (not all at once)', async () => {
    // Update first material
    const bom1 = await updateActualCost(mockProjectId, 'mat-1', 4.50, mockUserId);
    vi.spyOn(bomService, 'getBOM').mockResolvedValue(bom1);

    // Update second material (incremental)
    const bom2 = await updateActualCost(mockProjectId, 'mat-2', 2.25, mockUserId);

    expect(bom2.totalMaterials[0].actualCostUSD).toBe(4.50);
    expect(bom2.totalMaterials[1].actualCostUSD).toBe(2.25);
  });

  it('should allow editing existing actual costs', async () => {
    // Set initial cost
    const bom1 = await updateActualCost(mockProjectId, 'mat-1', 4.50, mockUserId);
    vi.spyOn(bomService, 'getBOM').mockResolvedValue(bom1);

    // Edit the cost
    const bom2 = await updateActualCost(mockProjectId, 'mat-1', 5.00, mockUserId);

    expect(bom2.totalMaterials[0].actualCostUSD).toBe(5.00);
    expect(bom2.totalMaterials[0].actualCostEnteredAt).toBeDefined();
  });
});
