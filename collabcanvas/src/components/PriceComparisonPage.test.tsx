/**
 * Price Comparison Page Tests
 * Story: PC-4
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PriceComparisonPage } from './PriceComparisonPage'
import * as priceComparisonService from '../services/priceComparisonService'
import type { ComparisonProgress, ComparisonResult, RetailerProduct } from '../types/priceComparison'

// Mock the service
vi.mock('../services/priceComparisonService', () => ({
  subscribeToComparison: vi.fn(),
  startMockComparison: vi.fn(),
}))

// Helper to create mock data
function createMockProduct(retailer: 'homeDepot' | 'lowes' | 'aceHardware', price: number): RetailerProduct {
  return {
    id: `${retailer}-1`,
    name: `Test Product ${retailer}`,
    brand: 'Test Brand',
    price,
    currency: 'USD',
    url: `https://${retailer}.com/product`,
    retailer,
  }
}

function createMockResult(productName: string): ComparisonResult {
  const homeDepotProduct = createMockProduct('homeDepot', 10.99)
  const lowesProduct = createMockProduct('lowes', 9.99)
  const aceProduct = createMockProduct('aceHardware', 11.99)

  return {
    originalProductName: productName,
    matches: {
      homeDepot: { selectedProduct: homeDepotProduct, confidence: 0.9, reasoning: 'Good', searchResultsCount: 5 },
      lowes: { selectedProduct: lowesProduct, confidence: 0.85, reasoning: 'Good', searchResultsCount: 4 },
      aceHardware: { selectedProduct: aceProduct, confidence: 0.8, reasoning: 'Good', searchResultsCount: 3 },
    },
    bestPrice: { retailer: 'lowes', product: lowesProduct, savings: 2 },
    comparedAt: Date.now(),
    cached: false,
  }
}

describe('PriceComparisonPage', () => {
  let mockUnsubscribe: ReturnType<typeof vi.fn>
  let subscribeCallback: ((progress: ComparisonProgress) => void) | null = null

  beforeEach(() => {
    mockUnsubscribe = vi.fn()
    subscribeCallback = null

    // Capture the callback when subscribeToComparison is called
    vi.mocked(priceComparisonService.subscribeToComparison).mockImplementation(
      (_projectId, onUpdate, _onError) => {
        subscribeCallback = onUpdate
        return mockUnsubscribe
      }
    )

    vi.mocked(priceComparisonService.startMockComparison).mockResolvedValue({ cached: false })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('subscribes to comparison on mount', () => {
    render(<PriceComparisonPage />)

    expect(priceComparisonService.subscribeToComparison).toHaveBeenCalledWith(
      'mock-project-001',
      expect.any(Function),
      expect.any(Function)
    )
  })

  it('unsubscribes on unmount', () => {
    const { unmount } = render(<PriceComparisonPage />)
    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('shows loading skeleton initially', () => {
    render(<PriceComparisonPage />)

    // Should show skeleton (animate-pulse class)
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('displays table when status is complete', async () => {
    render(<PriceComparisonPage />)

    // Simulate receiving complete status
    const progress: ComparisonProgress = {
      status: 'complete',
      totalProducts: 2,
      completedProducts: 2,
      results: [createMockResult('Product 1'), createMockResult('Product 2')],
      startedAt: Date.now(),
      completedAt: Date.now(),
    }

    // Trigger the subscription callback
    subscribeCallback?.(progress)

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument()
      expect(screen.getByText('Product 2')).toBeInTheDocument()
    })
  })

  it('shows progress bar when status is processing', async () => {
    render(<PriceComparisonPage />)

    const progress: ComparisonProgress = {
      status: 'processing',
      totalProducts: 10,
      completedProducts: 5,
      results: [createMockResult('Product 1')],
      startedAt: Date.now(),
    }

    subscribeCallback?.(progress)

    await waitFor(() => {
      expect(screen.getByText('Comparing prices...')).toBeInTheDocument()
      expect(screen.getByText('5 of 10 products')).toBeInTheDocument()
    })
  })

  it('displays error state with Try again link', async () => {
    render(<PriceComparisonPage />)

    const progress: ComparisonProgress = {
      status: 'error',
      totalProducts: 10,
      completedProducts: 0,
      results: [],
      startedAt: Date.now(),
      error: 'Test error message',
    }

    subscribeCallback?.(progress)

    await waitFor(() => {
      expect(screen.getByText('Test error message')).toBeInTheDocument()
      expect(screen.getByText('Try again')).toBeInTheDocument()
    })
  })

  it('calls startMockComparison with forceRefresh=true when Refresh button clicked', async () => {
    render(<PriceComparisonPage />)

    // First, set status to complete so button shows "Refresh Prices"
    const progress: ComparisonProgress = {
      status: 'complete',
      totalProducts: 2,
      completedProducts: 2,
      results: [createMockResult('Product 1')],
      startedAt: Date.now(),
      completedAt: Date.now(),
    }

    subscribeCallback?.(progress)

    await waitFor(() => {
      expect(screen.getByText('Refresh Prices')).toBeInTheDocument()
    })

    // Click refresh button
    fireEvent.click(screen.getByText('Refresh Prices'))

    expect(priceComparisonService.startMockComparison).toHaveBeenCalledWith(
      'mock-project-001',
      true // forceRefresh
    )
  })

  it('disables refresh button while processing', async () => {
    render(<PriceComparisonPage />)

    const progress: ComparisonProgress = {
      status: 'processing',
      totalProducts: 10,
      completedProducts: 5,
      results: [],
      startedAt: Date.now(),
    }

    subscribeCallback?.(progress)

    await waitFor(() => {
      const button = screen.getByText('Comparing...')
      expect(button).toBeDisabled()
    })
  })

  it('shows results incrementally as products complete', async () => {
    render(<PriceComparisonPage />)

    // First update with 1 result
    const progress1: ComparisonProgress = {
      status: 'processing',
      totalProducts: 3,
      completedProducts: 1,
      results: [createMockResult('Product 1')],
      startedAt: Date.now(),
    }

    subscribeCallback?.(progress1)

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument()
    })

    // Second update with 2 results
    const progress2: ComparisonProgress = {
      status: 'processing',
      totalProducts: 3,
      completedProducts: 2,
      results: [createMockResult('Product 1'), createMockResult('Product 2')],
      startedAt: Date.now(),
    }

    subscribeCallback?.(progress2)

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument()
      expect(screen.getByText('Product 2')).toBeInTheDocument()
    })
  })

  it('displays product count in header', async () => {
    render(<PriceComparisonPage />)

    const progress: ComparisonProgress = {
      status: 'complete',
      totalProducts: 5,
      completedProducts: 5,
      results: [
        createMockResult('Product 1'),
        createMockResult('Product 2'),
        createMockResult('Product 3'),
      ],
      startedAt: Date.now(),
      completedAt: Date.now(),
    }

    subscribeCallback?.(progress)

    await waitFor(() => {
      expect(screen.getByText('3 products compared')).toBeInTheDocument()
    })
  })
})
