# Story PC-3: Frontend Service Layer

**Epic:** Price Intelligence Module
**Story ID:** PC-3
**Status:** drafted
**Complexity:** Medium
**Dependencies:** PC-2 (Cloud Function)

---

## User Story

**As a** UI component
**I want** a service layer to call the price comparison Cloud Function
**So that** I can display comparison results with progress updates

---

## Description

Create a frontend service that:
1. Calls the `comparePrices` Cloud Function to start comparison
2. Subscribes to Firestore document for real-time progress updates
3. Handles errors gracefully
4. Returns unsubscribe function for cleanup

---

## Acceptance Criteria

- [ ] **AC1:** `priceComparisonService.ts` exports `startComparison()` function
- [ ] **AC2:** `priceComparisonService.ts` exports `subscribeToComparison()` function
- [ ] **AC3:** `startComparison()` accepts `projectId` and `forceRefresh` parameters
- [ ] **AC4:** `startComparison()` returns `Promise<{ cached: boolean }>`
- [ ] **AC5:** `subscribeToComparison()` accepts callback for `ComparisonProgress` updates
- [ ] **AC6:** `subscribeToComparison()` returns unsubscribe function for cleanup
- [ ] **AC7:** Real-time updates fire as each product completes in Firestore
- [ ] **AC8:** Network errors are caught and passed to error callback
- [ ] **AC9:** Unit tests pass with mocked Firestore and Cloud Function

---

## Technical Details

### File to Create

**`src/services/priceComparisonService.ts`**

```typescript
import { httpsCallable } from 'firebase/functions'
import { doc, onSnapshot } from 'firebase/firestore'
import { functions, db } from './firebase'
import type {
  ComparisonProgress,
  CompareRequest,
} from '../types/priceComparison'
import { MOCK_PRODUCTS } from '../data/mockProducts'

const compareProductsFn = httpsCallable(functions, 'comparePrices')

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
  const docRef = doc(db, 'projects', projectId, 'priceComparison', 'latest')

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
```

### Test File

**`src/services/priceComparisonService.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { startComparison, subscribeToComparison } from './priceComparisonService'

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() => vi.fn()),
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  onSnapshot: vi.fn((ref, onNext, onError) => {
    // Return mock unsubscribe function
    return vi.fn()
  }),
}))

vi.mock('./firebase', () => ({
  functions: {},
  db: {},
}))

describe('priceComparisonService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('startComparison', () => {
    it('calls Cloud Function with correct parameters', async () => {
      // Mock implementation...
    })

    it('returns { cached: true } when results exist', async () => {
      // Mock implementation...
    })

    it('returns { cached: false } for fresh comparison', async () => {
      // Mock implementation...
    })
  })

  describe('subscribeToComparison', () => {
    it('returns unsubscribe function', () => {
      const unsubscribe = subscribeToComparison(
        'test-project',
        vi.fn(),
        vi.fn()
      )
      expect(typeof unsubscribe).toBe('function')
    })

    it('calls onUpdate when document changes', () => {
      // Mock implementation...
    })

    it('calls onError on subscription error', () => {
      // Mock implementation...
    })
  })
})
```

---

## Testing

1. `startComparison()` calls Cloud Function with projectId, productNames, forceRefresh
2. `startComparison()` returns `{ cached: true }` when existing results found
3. `startComparison()` returns `{ cached: false }` for fresh comparison
4. `subscribeToComparison()` returns unsubscribe function
5. `subscribeToComparison()` fires onUpdate when Firestore document updates
6. `subscribeToComparison()` fires onError on subscription failure
7. `startMockComparison()` uses MOCK_PRODUCTS array

---

## Dev Notes

### Architecture Patterns and Constraints

- Follow existing service pattern from `src/services/pricingService.ts` (Lines 57-130)
- Use `httpsCallable` from Firebase for Cloud Function calls
- Use `onSnapshot` for Firestore real-time subscriptions
- Return unsubscribe function for cleanup in React useEffect
- Import types from `src/types/priceComparison.ts` (created in PC-1)
- Don't modify existing services
- [Source: docs/price-comparison-tech-spec.md, "Frontend Service Pattern"]

### References

- [Source: docs/price-comparison-tech-spec.md, "Frontend Service Pattern (Subscription-based)"]
- [Source: docs/price-comparison-tech-spec.md, "Integration Points"]
- [Source: docs/sprint-artifacts/story-pc-1-types-mock-data.md, "Types"]
- [Source: docs/sprint-artifacts/story-pc-2-cloud-function.md, "Firestore Structure"]

### Implementation Notes

- `startComparison()` triggers Cloud Function, returns `{ cached: boolean }`
- `subscribeToComparison()` sets up Firestore listener for real-time progress
- `startMockComparison()` convenience function uses MOCK_PRODUCTS from PC-1
- Firestore path: `projects/{projectId}/priceComparison/latest`
- Error handling: catch and pass to error callback, log to console

### Learnings from Previous Story

- PC-2 Cloud Function writes to `projects/{projectId}/priceComparison/latest`
- PC-2 returns `{ cached: true }` when results exist, `{ cached: false }` for fresh comparison
- PC-2 updates Firestore incrementally after each product completes

---

## Tasks

- [ ] **Task 1 (AC: #1, #3, #4):** Implement `startComparison()` function
  - [ ] Create `src/services/priceComparisonService.ts`
  - [ ] Use `httpsCallable` to call `comparePrices` Cloud Function
  - [ ] Accept `projectId`, `productNames`, `forceRefresh`, `zipCode` parameters
  - [ ] Return `Promise<{ cached: boolean }>`
- [ ] **Task 2 (AC: #2, #5, #6, #7):** Implement `subscribeToComparison()` function
  - [ ] Use `onSnapshot` for Firestore real-time listener
  - [ ] Accept callback for `ComparisonProgress` updates
  - [ ] Return unsubscribe function for cleanup
- [ ] **Task 3 (AC: #8):** Implement error handling
  - [ ] Catch network errors
  - [ ] Pass errors to error callback
  - [ ] Log errors to console
- [ ] **Task 4:** Implement `startMockComparison()` convenience function
  - [ ] Use `MOCK_PRODUCTS` from PC-1
  - [ ] Wrap `startComparison()` with mock data
- [ ] **Task 5 (AC: #9):** Write unit tests
  - [ ] Mock `httpsCallable` and `onSnapshot`
  - [ ] Test `startComparison()` parameters and return values
  - [ ] Test `subscribeToComparison()` returns unsubscribe function
  - [ ] Test error callback invocation

---

## Dev Agent Record

### Context Reference
- Depends on PC-1 for types (`ComparisonProgress`, `CompareRequest`)
- Depends on PC-2 for Cloud Function (`comparePrices`) and Firestore structure
- [Source: docs/sprint-artifacts/story-pc-1-types-mock-data.md]
- [Source: docs/sprint-artifacts/story-pc-2-cloud-function.md]

### Agent Model Used
- TBD

### Debug Log References
- N/A

### Completion Notes List
- [ ] Pending

### File List
- NEW: `src/services/priceComparisonService.ts`
- NEW: `src/services/priceComparisonService.test.ts`

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-10 | Initial draft | SM |
| 2025-12-10 | Added Dev Notes, Dev Agent Record, Tasks | SM (auto-improve) |
