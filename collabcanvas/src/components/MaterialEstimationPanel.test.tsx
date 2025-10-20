/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { MaterialEstimationPanel } from './MaterialEstimationPanel';
import { useCanvasStore } from '../store/canvasStore';
import type { BillOfMaterials, MaterialSpec } from '../types/material';

vi.mock('../store/canvasStore');

const mockUseCanvasStore = vi.mocked(useCanvasStore);

describe('MaterialEstimationPanel - Pricing Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows unit price, per-item total, and grand total in USD when prices available', () => {
    const bom: BillOfMaterials = {
      id: 'bom-1',
      totalMaterials: [
        { id: 'm1', name: '2x4 Stud', category: 'framing', unit: 'piece', quantity: 10, priceUSD: 3.5 } as MaterialSpec,
        { id: 'm2', name: 'Drywall Sheet', category: 'surface', unit: 'sqft', quantity: 32, priceUSD: 1.25 } as MaterialSpec,
      ],
      calculations: [],
      createdAt: Date.now(),
      createdBy: 'user',
      updatedAt: Date.now(),
    };

    const setBill = vi.fn();
    mockUseCanvasStore.mockImplementation(((selector: any) => selector({ billOfMaterials: bom, setBillOfMaterials: setBill })) as unknown as typeof useCanvasStore);

    render(<MaterialEstimationPanel isVisible={true} onClose={vi.fn()} />);

    expect(screen.getByText('$3.50')).toBeInTheDocument();
    expect(screen.getByText('$1.25')).toBeInTheDocument();

    expect(screen.getByText('$35.00')).toBeInTheDocument(); // 10 * 3.5
    expect(screen.getByText('$40.00')).toBeInTheDocument(); // 32 * 1.25

    expect(screen.getByText('Grand Total:')).toBeInTheDocument();
    expect(screen.getByText('$75.00')).toBeInTheDocument();
  });

  it('shows N/A for items without price and computes grand total from priced items only', () => {
    const bom: BillOfMaterials = {
      id: 'bom-2',
      totalMaterials: [
        { id: 'm1', name: 'Primer', category: 'paint', unit: 'gallon', quantity: 2 } as MaterialSpec,
        { id: 'm2', name: '2x4 Stud', category: 'framing', unit: 'piece', quantity: 10, priceUSD: 3.5 } as MaterialSpec,
      ],
      calculations: [],
      createdAt: Date.now(),
      createdBy: 'user',
      updatedAt: Date.now(),
    };

    const setBill = vi.fn();
    mockUseCanvasStore.mockImplementation(((selector: any) => selector({ billOfMaterials: bom, setBillOfMaterials: setBill })) as unknown as typeof useCanvasStore);

    render(<MaterialEstimationPanel isVisible={true} onClose={vi.fn()} />);

    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);

    expect(screen.getByText('Grand Total:')).toBeInTheDocument();
    expect(screen.getByText('$35.00')).toBeInTheDocument();
  });
});


