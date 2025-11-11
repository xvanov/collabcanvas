/**
 * Unit tests for actual cost operations
 * AC: #12-15 - Actual Cost Input
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateActualCost } from './bomService';
import type { BillOfMaterials, MaterialSpec } from '../types/material';
import * as bomService from './bomService';
import { getDoc } from 'firebase/firestore';

// Mock Firebase
vi.mock('./firebase', () => ({
  firestore: {},
  functions: {},
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

  let getBOMSpy: ReturnType<typeof vi.spyOn>;
  let saveBOMSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock getBOM to return the mock BOM by default
    getBOMSpy = vi.spyOn(bomService, 'getBOM').mockResolvedValue(mockBOM);
    saveBOMSpy = vi.spyOn(bomService, 'saveBOM').mockResolvedValue(undefined);
    
    // Mock getDoc to return a proper DocumentSnapshot
    vi.mocked(getDoc).mockResolvedValue({
      exists: () => true,
      data: () => mockBOM,
      id: 'test-bom',
    } as unknown as ReturnType<typeof getDoc>);
  });

  it('should update actual cost for a material by ID', async () => {
    const updatedBOM = await updateActualCost(mockProjectId, 'mat-1', 4.50, mockUserId, mockBOM);

    expect(updatedBOM.totalMaterials[0].actualCostUSD).toBe(4.50);
    expect(updatedBOM.totalMaterials[0].actualCostEnteredAt).toBeDefined();
    expect(updatedBOM.totalMaterials[0].actualCostEnteredBy).toBe(mockUserId);
    // Note: saveBOM is called internally but can't be spied on since it's a direct call in the same module
  });

  it('should update actual cost for a material by name', async () => {
    // Create a BOM with a material that has no ID (only name)
    const bomWithoutId: BillOfMaterials = {
      ...mockBOM,
      totalMaterials: [
        {
          name: 'Material 2',
          category: 'surface',
          unit: 'square-feet',
          quantity: 100,
          priceUSD: 2.50,
        } as MaterialSpec,
      ],
    };
    const updatedBOM = await updateActualCost(mockProjectId, 'Material 2', 2.25, mockUserId, bomWithoutId);

    expect(updatedBOM.totalMaterials[0].actualCostUSD).toBe(2.25);
    expect(updatedBOM.totalMaterials[0].actualCostEnteredBy).toBe(mockUserId);
  });

  it('should clear actual cost when null is passed', async () => {
    // First set an actual cost
    const bomWithCost = await updateActualCost(mockProjectId, 'mat-1', 4.50, mockUserId, mockBOM);

    // Then clear it
    const updatedBOM = await updateActualCost(mockProjectId, 'mat-1', null, mockUserId, bomWithCost);

    expect(updatedBOM.totalMaterials[0].actualCostUSD).toBeUndefined();
    expect(updatedBOM.totalMaterials[0].actualCostEnteredAt).toBeUndefined();
    expect(updatedBOM.totalMaterials[0].actualCostEnteredBy).toBeUndefined();
  });

  it('should throw error if BOM not found', async () => {
    // When bom is not provided, updateActualCost calls getBOM internally
    // Since getBOM is called directly in the same module, we need to mock getDoc
    // to return a document that doesn't exist, which will make getBOM return null
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => false,
      data: () => null,
      id: '',
    } as unknown as ReturnType<typeof getDoc>);
    
    // Restore getBOM spy so it calls the real function which will use the mocked getDoc
    getBOMSpy.mockRestore();

    await expect(updateActualCost(mockProjectId, 'mat-1', 4.50, mockUserId))
      .rejects.toThrow('BOM not found');
  });

  it('should throw error if material not found', async () => {
    await expect(updateActualCost(mockProjectId, 'nonexistent', 4.50, mockUserId, mockBOM))
      .rejects.toThrow('Material not found');
  });

  it('should allow incremental entry (not all at once)', async () => {
    // Update first material
    const bom1 = await updateActualCost(mockProjectId, 'mat-1', 4.50, mockUserId, mockBOM);

    // Update second material (incremental) - pass bom1 so it includes the first update
    const bom2 = await updateActualCost(mockProjectId, 'mat-2', 2.25, mockUserId, bom1);

    expect(bom2.totalMaterials[0].actualCostUSD).toBe(4.50);
    expect(bom2.totalMaterials[1].actualCostUSD).toBe(2.25);
  });

  it('should allow editing existing actual costs', async () => {
    // Set initial cost
    const bom1 = await updateActualCost(mockProjectId, 'mat-1', 4.50, mockUserId, mockBOM);

    // Edit the cost - pass bom1 so it includes the first update
    const bom2 = await updateActualCost(mockProjectId, 'mat-1', 5.00, mockUserId, bom1);

    expect(bom2.totalMaterials[0].actualCostUSD).toBe(5.00);
    expect(bom2.totalMaterials[0].actualCostEnteredAt).toBeDefined();
  });
});
