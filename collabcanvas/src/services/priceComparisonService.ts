import { httpsCallable } from 'firebase/functions'
import { doc, onSnapshot } from 'firebase/firestore'
import { functions, firestore } from './firebase'
import type {
  ComparisonProgress,
  CompareRequest,
} from '../types/priceComparison'
import { MOCK_PRODUCTS } from '../data/mockProducts'

/**
 * Start a price comparison for products
 * This triggers the Cloud Function which writes progress to Firestore
 * Use subscribeToComparison() to get real-time updates
 */
export async function startComparison(
  projectId: string,
  productNames: string[],
  forceRefresh: boolean = false,
  zipCode?: string
): Promise<{ cached: boolean }> {
  try {
    const compareProductsFn = httpsCallable(functions, 'comparePrices')
    const response = await compareProductsFn({
      request: {
        projectId,
        productNames,
        forceRefresh,
        zipCode,
      } as CompareRequest,
    })

    return response.data as { cached: boolean }
  } catch (error) {
    console.error('[COMPARE] Error starting comparison:', error)
    throw error
  }
}

/**
 * Subscribe to real-time comparison progress updates
 * Returns an unsubscribe function for cleanup
 */
export function subscribeToComparison(
  projectId: string,
  onUpdate: (progress: ComparisonProgress) => void,
  onError: (error: Error) => void
): () => void {
  const docRef = doc(firestore, 'projects', projectId, 'priceComparison', 'latest')

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as ComparisonProgress)
      }
    },
    (error) => {
      console.error('[COMPARE] Subscription error:', error)
      onError(error)
    }
  )
}

/**
 * Start comparison with mock products (for development/testing)
 */
export async function startMockComparison(
  projectId: string,
  forceRefresh: boolean = false
): Promise<{ cached: boolean }> {
  return startComparison(projectId, MOCK_PRODUCTS, forceRefresh)
}
