/**
 * Unit tests for BOMTable component
 * AC: #10 - BOM Modification
 * AC: #12-15 - Actual Cost Input
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BOMTable } from './BOMTable';
import type { BillOfMaterials } from '../../types/material';
// useScopedCanvasStore and useProjectId are mocked below

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ projectId: 'test-project' }),
  };
});

// Mock useAuth
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'test-user' },
  }),
}));

// Mock scoped canvas store
const mockSetBillOfMaterials = vi.fn();
vi.mock('../../store/projectCanvasStore', () => ({
  useScopedCanvasStore: (_projectId: string | undefined, selector: (state: { setBillOfMaterials: typeof mockSetBillOfMaterials }) => unknown) => {
    const mockState = {
      setBillOfMaterials: mockSetBillOfMaterials,
    };
    return selector(mockState);
  },
}));

vi.mock('../../contexts/ProjectContext', () => ({
  useProjectId: vi.fn(() => 'test-project'),
}));

// Mock bomService
const mockSaveBOM = vi.fn();
const mockRecalculateMargin = vi.fn();
const mockUpdateActualCost = vi.fn();
vi.mock('../../services/bomService', () => ({
  saveBOM: (..._args: unknown[]) => mockSaveBOM(..._args),
  recalculateMargin: (..._args: unknown[]) => mockRecalculateMargin(..._args),
  updateActualCost: (..._args: unknown[]) => mockUpdateActualCost(..._args),
}));

// Mock errorHandler
vi.mock('../../utils/errorHandler', () => ({
  formatErrorForDisplay: (error: unknown) => ({
    title: 'Error',
    message: error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unknown error',
    canRetry: true,
  }),
  retryWithBackoff: async (fn: () => Promise<unknown>) => fn(),
}));

// Mock alert
global.alert = vi.fn();

describe('BOMTable', () => {
  const createMockBOM = (): BillOfMaterials => ({
    id: 'test-bom',
    projectName: 'Test Project',
    totalMaterials: [
      {
        id: '1',
        name: 'Material 1',
        category: 'framing',
        unit: 'piece',
        quantity: 10,
        priceUSD: 5.00,
      },
      {
        id: '2',
        name: 'Material 2',
        category: 'surface',
        unit: 'square-feet',
        quantity: 100,
        priceUSD: 2.50,
        actualCostUSD: 240.00,
      },
      {
        id: '3',
        name: 'Material 3',
        category: 'finish',
        unit: 'gallon',
        quantity: 5,
        // No price
      },
    ],
    calculations: [],
    createdAt: Date.now(),
    createdBy: 'test-user',
    updatedAt: Date.now(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveBOM.mockResolvedValue(undefined);
    mockRecalculateMargin.mockImplementation((projectId, bom) => Promise.resolve(bom));
    mockUpdateActualCost.mockResolvedValue(createMockBOM());
  });

  it('should render BOM table with materials', () => {
    const bom = createMockBOM();
    render(
      <MemoryRouter>
        <BOMTable bom={bom} />
      </MemoryRouter>
    );

    expect(screen.getByText('Material')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Quantity')).toBeInTheDocument();
    expect(screen.getByText('Unit Price')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Actual Cost')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('should display material names and categories', () => {
    const bom = createMockBOM();
    render(
      <MemoryRouter>
        <BOMTable bom={bom} />
      </MemoryRouter>
    );

    expect(screen.getByText('Material 1')).toBeInTheDocument();
    expect(screen.getByText('Material 2')).toBeInTheDocument();
    expect(screen.getByText('Material 3')).toBeInTheDocument();
    expect(screen.getByText('framing')).toBeInTheDocument();
    expect(screen.getByText('surface')).toBeInTheDocument();
    expect(screen.getByText('finish')).toBeInTheDocument();
  });

  it('should display quantities and units', () => {
    const bom = createMockBOM();
    render(
      <MemoryRouter>
        <BOMTable bom={bom} />
      </MemoryRouter>
    );

    // Text is split across elements, so check for parts
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('piece')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('square-feet')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('gallon')).toBeInTheDocument();
  });

  it('should display prices when available', () => {
    const bom = createMockBOM();
    render(
      <MemoryRouter>
        <BOMTable bom={bom} />
      </MemoryRouter>
    );

    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(screen.getByText('$2.50')).toBeInTheDocument();
  });

  it('should display "N/A" for materials without prices', () => {
    const bom = createMockBOM();
    render(
      <MemoryRouter>
        <BOMTable bom={bom} />
      </MemoryRouter>
    );

    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
  });

  it('should display actual costs when entered', () => {
    const bom = createMockBOM();
    render(
      <MemoryRouter>
        <BOMTable bom={bom} />
      </MemoryRouter>
    );

    expect(screen.getByText('$240.00')).toBeInTheDocument();
  });

  it('should display "Enter" button for materials without actual costs', () => {
    const bom = createMockBOM();
    render(
      <MemoryRouter>
        <BOMTable bom={bom} />
      </MemoryRouter>
    );

    const enterButtons = screen.getAllByText('Enter');
    expect(enterButtons.length).toBeGreaterThan(0);
  });

  it('should allow editing quantity', async () => {
    const bom = createMockBOM();
    render(
      <MemoryRouter>
        <BOMTable bom={bom} />
      </MemoryRouter>
    );

    // Find button containing "10" and "piece"
    const quantityButtons = screen.getAllByText('10');
    const quantityButton = quantityButtons.find(btn => btn.textContent?.includes('piece')) || quantityButtons[0];
    fireEvent.click(quantityButton);

    const input = screen.getByDisplayValue('10');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '15' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockSaveBOM).toHaveBeenCalled();
    });
  });

  it('should allow editing price', async () => {
    const bom = createMockBOM();
    render(
      <MemoryRouter>
        <BOMTable bom={bom} />
      </MemoryRouter>
    );

    const priceButton = screen.getByText('$5.00');
    fireEvent.click(priceButton);

    const input = screen.getByDisplayValue('5');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '6' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockRecalculateMargin).toHaveBeenCalled();
      expect(mockSaveBOM).toHaveBeenCalled();
    });
  });

  it('should allow entering actual cost', async () => {
    const bom = createMockBOM();
    render(
      <MemoryRouter>
        <BOMTable bom={bom} />
      </MemoryRouter>
    );

    const enterButtons = screen.getAllByText('Enter');
    fireEvent.click(enterButtons[0]);

    const input = screen.getByPlaceholderText('0.00');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '50' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockUpdateActualCost).toHaveBeenCalled();
    });
  });

  it('should allow editing existing actual cost', async () => {
    const bom = createMockBOM();
    render(
      <MemoryRouter>
        <BOMTable bom={bom} />
      </MemoryRouter>
    );

    const actualCostButton = screen.getByText('$240.00');
    fireEvent.click(actualCostButton);

    const input = screen.getByDisplayValue('240');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '250' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockUpdateActualCost).toHaveBeenCalled();
    });
  });

  it('should allow editing notes', async () => {
    const bom = createMockBOM();
    render(
      <MemoryRouter>
        <BOMTable bom={bom} />
      </MemoryRouter>
    );

    const notesButtons = screen.getAllByText(/Click to add notes|Add notes/);
    fireEvent.click(notesButtons[0]);

    const input = screen.getByPlaceholderText('Add notes...');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Test notes' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockSaveBOM).toHaveBeenCalled();
    });
  });

  it('should calculate and display totals correctly', () => {
    const bom = createMockBOM();
    render(
      <MemoryRouter>
        <BOMTable bom={bom} />
      </MemoryRouter>
    );

    // Material 1: 10 * $5 = $50
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    // Material 2: 100 * $2.50 = $250
    expect(screen.getByText('$250.00')).toBeInTheDocument();
  });

  it('should handle price error display', () => {
    const bom = createMockBOM();
    // Material needs to not have a price for priceError to show
    bom.totalMaterials[0].priceUSD = undefined;
    bom.totalMaterials[0].priceError = 'Price unavailable';
    render(
      <MemoryRouter>
        <BOMTable bom={bom} />
      </MemoryRouter>
    );

    // Text might be split, so check for parts
    expect(screen.getByText('Enter price')).toBeInTheDocument();
    expect(screen.getByText('Price unavailable')).toBeInTheDocument();
  });

  it('should call onBOMUpdate callback when BOM is updated', async () => {
    const bom = createMockBOM();
    const onBOMUpdate = vi.fn();
    render(
      <MemoryRouter>
        <BOMTable bom={bom} onBOMUpdate={onBOMUpdate} />
      </MemoryRouter>
    );

    // Find button containing "10" and "piece"
    const quantityButtons = screen.getAllByText('10');
    const quantityButton = quantityButtons.find(btn => btn.textContent?.includes('piece')) || quantityButtons[0];
    fireEvent.click(quantityButton);

    const input = screen.getByDisplayValue('10');
    fireEvent.change(input, { target: { value: '15' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(onBOMUpdate).toHaveBeenCalled();
    });
  });
});

