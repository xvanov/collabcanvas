import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { httpsCallable } from 'firebase/functions'
import { doc, onSnapshot } from 'firebase/firestore'

// Mock Firebase modules before importing service
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn(),
}))

vi.mock('./firebase', () => ({
  functions: { app: { name: 'mock-app' } },
  firestore: { app: { name: 'mock-app' } },
}))

vi.mock('../data/mockProducts', () => ({
  MOCK_PRODUCTS: ['mock-product-1', 'mock-product-2', 'mock-product-3'],
}))

// Import after mocks are set up
import { startComparison, subscribeToComparison, startMockComparison } from './priceComparisonService'
import { MOCK_PRODUCTS } from '../data/mockProducts'

describe('priceComparisonService', () => {
  let mockCallable: Mock
  let mockUnsubscribe: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    mockCallable = vi.fn()
    mockUnsubscribe = vi.fn()
    ;(httpsCallable as Mock).mockReturnValue(mockCallable)
    ;(onSnapshot as Mock).mockReturnValue(mockUnsubscribe)
    ;(doc as Mock).mockReturnValue({ id: 'latest', path: 'projects/test/priceComparison/latest' })
  })

  describe('startComparison', () => {
    it('calls Cloud Function with correct parameters', async () => {
      mockCallable.mockResolvedValue({ data: { cached: false } })

      await startComparison('test-project', ['product1', 'product2'], false, '12345')

      expect(httpsCallable).toHaveBeenCalledWith(
        expect.objectContaining({ app: { name: 'mock-app' } }),
        'comparePrices'
      )
      expect(mockCallable).toHaveBeenCalledWith({
        request: {
          projectId: 'test-project',
          productNames: ['product1', 'product2'],
          forceRefresh: false,
          zipCode: '12345',
        },
      })
    })

    it('returns { cached: true } when results exist', async () => {
      mockCallable.mockResolvedValue({ data: { cached: true } })

      const result = await startComparison('test-project', ['product1'], false)

      expect(result).toEqual({ cached: true })
    })

    it('returns { cached: false } for fresh comparison', async () => {
      mockCallable.mockResolvedValue({ data: { cached: false } })

      const result = await startComparison('test-project', ['product1'], true)

      expect(result).toEqual({ cached: false })
    })

    it('accepts forceRefresh parameter and passes it to Cloud Function', async () => {
      mockCallable.mockResolvedValue({ data: { cached: false } })

      await startComparison('test-project', ['product1'], true)

      expect(mockCallable).toHaveBeenCalledWith({
        request: expect.objectContaining({
          forceRefresh: true,
        }),
      })
    })

    it('accepts projectId parameter and passes it to Cloud Function', async () => {
      mockCallable.mockResolvedValue({ data: { cached: false } })

      await startComparison('my-project-id', ['product1'], false)

      expect(mockCallable).toHaveBeenCalledWith({
        request: expect.objectContaining({
          projectId: 'my-project-id',
        }),
      })
    })

    it('uses default forceRefresh=false when not provided', async () => {
      mockCallable.mockResolvedValue({ data: { cached: false } })

      await startComparison('test-project', ['product1'])

      expect(mockCallable).toHaveBeenCalledWith({
        request: expect.objectContaining({
          forceRefresh: false,
        }),
      })
    })

    it('handles optional zipCode parameter', async () => {
      mockCallable.mockResolvedValue({ data: { cached: false } })

      await startComparison('test-project', ['product1'], false, '90210')

      expect(mockCallable).toHaveBeenCalledWith({
        request: expect.objectContaining({
          zipCode: '90210',
        }),
      })
    })

    it('catches network errors and re-throws them', async () => {
      const networkError = new Error('Network error: Failed to fetch')
      mockCallable.mockRejectedValue(networkError)

      await expect(startComparison('test-project', ['product1'])).rejects.toThrow('Network error: Failed to fetch')
    })

    it('logs errors to console when Cloud Function fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Cloud Function error')
      mockCallable.mockRejectedValue(error)

      await expect(startComparison('test-project', ['product1'])).rejects.toThrow()

      expect(consoleSpy).toHaveBeenCalledWith('[COMPARE] Error starting comparison:', error)
      consoleSpy.mockRestore()
    })
  })

  describe('subscribeToComparison', () => {
    it('returns unsubscribe function', () => {
      const unsubscribe = subscribeToComparison('test-project', vi.fn(), vi.fn())

      expect(typeof unsubscribe).toBe('function')
      expect(unsubscribe).toBe(mockUnsubscribe)
    })

    it('creates doc reference with correct Firestore path', () => {
      subscribeToComparison('my-project', vi.fn(), vi.fn())

      expect(doc).toHaveBeenCalledWith(
        expect.objectContaining({ app: { name: 'mock-app' } }),
        'projects',
        'my-project',
        'priceComparison',
        'latest'
      )
    })

    it('calls onUpdate when document changes', () => {
      const onUpdate = vi.fn()
      const onError = vi.fn()
      const mockProgress = {
        status: 'processing',
        totalProducts: 10,
        completedProducts: 5,
        results: [],
        startedAt: Date.now(),
      }

      // Capture the snapshot callback
      ;(onSnapshot as Mock).mockImplementation((ref, onNext) => {
        // Simulate a snapshot with data
        onNext({
          exists: () => true,
          data: () => mockProgress,
        })
        return mockUnsubscribe
      })

      subscribeToComparison('test-project', onUpdate, onError)

      expect(onUpdate).toHaveBeenCalledWith(mockProgress)
      expect(onError).not.toHaveBeenCalled()
    })

    it('does not call onUpdate when document does not exist', () => {
      const onUpdate = vi.fn()
      const onError = vi.fn()

      ;(onSnapshot as Mock).mockImplementation((ref, onNext) => {
        onNext({
          exists: () => false,
          data: () => null,
        })
        return mockUnsubscribe
      })

      subscribeToComparison('test-project', onUpdate, onError)

      expect(onUpdate).not.toHaveBeenCalled()
    })

    it('calls onError on subscription error', () => {
      const onUpdate = vi.fn()
      const onError = vi.fn()
      const subscriptionError = new Error('Permission denied')

      ;(onSnapshot as Mock).mockImplementation((ref, onNext, onErrorCallback) => {
        onErrorCallback(subscriptionError)
        return mockUnsubscribe
      })

      subscribeToComparison('test-project', onUpdate, onError)

      expect(onError).toHaveBeenCalledWith(subscriptionError)
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it('logs subscription errors to console', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const onUpdate = vi.fn()
      const onError = vi.fn()
      const subscriptionError = new Error('Subscription failed')

      ;(onSnapshot as Mock).mockImplementation((ref, onNext, onErrorCallback) => {
        onErrorCallback(subscriptionError)
        return mockUnsubscribe
      })

      subscribeToComparison('test-project', onUpdate, onError)

      expect(consoleSpy).toHaveBeenCalledWith('[COMPARE] Subscription error:', subscriptionError)
      consoleSpy.mockRestore()
    })

    it('accepts callback for ComparisonProgress updates', () => {
      const progressCallback = vi.fn()
      const mockProgress = {
        status: 'complete' as const,
        totalProducts: 12,
        completedProducts: 12,
        results: [{ originalProductName: 'test', matches: {}, bestPrice: null, comparedAt: Date.now(), cached: false }],
        startedAt: Date.now(),
        completedAt: Date.now(),
      }

      ;(onSnapshot as Mock).mockImplementation((ref, onNext) => {
        onNext({
          exists: () => true,
          data: () => mockProgress,
        })
        return mockUnsubscribe
      })

      subscribeToComparison('test-project', progressCallback, vi.fn())

      expect(progressCallback).toHaveBeenCalledWith(expect.objectContaining({
        status: 'complete',
        totalProducts: 12,
        completedProducts: 12,
      }))
    })
  })

  describe('startMockComparison', () => {
    it('calls startComparison with MOCK_PRODUCTS array', async () => {
      mockCallable.mockResolvedValue({ data: { cached: false } })

      await startMockComparison('test-project')

      expect(mockCallable).toHaveBeenCalledWith({
        request: expect.objectContaining({
          productNames: MOCK_PRODUCTS,
        }),
      })
    })

    it('passes projectId to startComparison', async () => {
      mockCallable.mockResolvedValue({ data: { cached: false } })

      await startMockComparison('my-project-id')

      expect(mockCallable).toHaveBeenCalledWith({
        request: expect.objectContaining({
          projectId: 'my-project-id',
        }),
      })
    })

    it('passes forceRefresh to startComparison', async () => {
      mockCallable.mockResolvedValue({ data: { cached: false } })

      await startMockComparison('test-project', true)

      expect(mockCallable).toHaveBeenCalledWith({
        request: expect.objectContaining({
          forceRefresh: true,
        }),
      })
    })

    it('uses default forceRefresh=false when not provided', async () => {
      mockCallable.mockResolvedValue({ data: { cached: false } })

      await startMockComparison('test-project')

      expect(mockCallable).toHaveBeenCalledWith({
        request: expect.objectContaining({
          forceRefresh: false,
        }),
      })
    })

    it('returns { cached: boolean } from Cloud Function', async () => {
      mockCallable.mockResolvedValue({ data: { cached: true } })

      const result = await startMockComparison('test-project')

      expect(result).toEqual({ cached: true })
    })
  })
})
