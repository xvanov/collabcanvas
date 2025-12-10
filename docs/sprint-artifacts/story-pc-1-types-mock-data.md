# Story PC-1: Types and Mock Data Setup

**Epic:** Price Intelligence Module
**Story ID:** PC-1
**Status:** complete
**Complexity:** Small
**Dependencies:** None

---

## User Story

**As a** developer working on price comparison
**I want** type definitions and mock data in place
**So that** I can build the feature with proper typing and test data

---

## Description

Create the foundational TypeScript types for the price comparison feature and a mock product array that simulates BOM output. This enables parallel development of other stories.

---

## Acceptance Criteria

- [x] **AC1:** `src/types/priceComparison.ts` exists with all interfaces:
  - `Retailer` type union
  - `RetailerProduct` interface
  - `MatchResult` interface
  - `ComparisonResult` interface
  - `CompareRequest` interface (with `projectId` and `forceRefresh`)
  - `ComparisonProgress` interface (for real-time Firestore updates)
  - `ComparisonStatus` type union

- [x] **AC2:** `src/data/mockProducts.ts` exists with:
  - `MOCK_PRODUCTS` array of 10-15 construction material names
  - Realistic product names that match what Unwrangle can find

- [x] **AC3:** Types compile without errors (`npm run typecheck`)

- [x] **AC4:** Mock data is exportable and usable in other files

---

## Technical Details

### Files to Create

**1. `src/types/priceComparison.ts`**
```typescript
export type Retailer = 'homeDepot' | 'lowes' | 'aceHardware'

export interface RetailerProduct {
  id: string
  name: string
  brand: string | null
  price: number
  priceReduced?: number | null
  currency: string
  url: string
  imageUrl?: string
  rating?: number | null
  totalReviews?: number | null
  inStock?: boolean
  retailer: Retailer
}

export interface MatchResult {
  selectedProduct: RetailerProduct | null
  confidence: number
  reasoning: string
  searchResultsCount: number
}

export interface ComparisonResult {
  originalProductName: string
  matches: Record<Retailer, MatchResult>
  bestPrice: {
    retailer: Retailer
    product: RetailerProduct
    savings: number
  } | null
  comparedAt: number
  cached: boolean
}

export interface CompareRequest {
  projectId: string              // Required - which project to save results to
  productNames: string[]
  forceRefresh?: boolean         // If true, skip saved results and re-fetch
  storeNumber?: string
  zipCode?: string
}

/**
 * Status of the comparison process
 */
export type ComparisonStatus = 'idle' | 'processing' | 'complete' | 'error'

/**
 * Real-time progress tracked in Firestore
 * Frontend subscribes to this document for live updates
 */
export interface ComparisonProgress {
  status: ComparisonStatus
  totalProducts: number
  completedProducts: number
  results: ComparisonResult[]
  startedAt: number
  completedAt?: number
  error?: string
}
```

**2. `src/data/mockProducts.ts`**
```typescript
export const MOCK_PRODUCTS: string[] = [
  '2x4 lumber 8ft',
  'drywall 4x8 1/2 inch',
  'interior latex paint gallon white',
  'R-13 fiberglass insulation roll',
  'construction screws 3 inch 1lb',
  'joint compound 5 gallon',
  'drywall tape 500ft',
  'wood stud 2x4x96',
  'primer sealer gallon',
  'electrical outlet 15amp',
  'romex wire 12-2 250ft',
  'pvc pipe 2 inch 10ft',
]
```

---

## Testing

- TypeScript compilation check
- Import test in another file

---

## Dev Notes

### Architecture Patterns and Constraints

- Follow existing naming conventions: no semicolons, single quotes, 2-space indentation
- Types file follows pattern of existing `src/types/material.ts`
- Mock data follows pattern of constants in the codebase (UPPER_SNAKE_CASE)
- These types should NOT modify existing `MaterialSpec` or `BillOfMaterials`
- [Source: docs/price-comparison-tech-spec.md, "Existing Conventions (Brownfield)"]

### References

- [Source: docs/price-comparison-tech-spec.md, "New Type Definitions"]
- [Source: docs/price-comparison-tech-spec.md, "Mock Data"]
- [Source: docs/sprint-artifacts/epic-price-comparison.md, "Exclusive Files"]

### Implementation Notes

- Mock products chosen to be realistic construction materials that Unwrangle API can find
- Types must align exactly with what Cloud Function (PC-2) will use
- `ComparisonProgress` interface enables real-time Firestore subscription pattern

---

## Tasks

- [x] **Task 1 (AC: #1):** Create `src/types/priceComparison.ts` with all interfaces
  - [x] Define `Retailer` type union
  - [x] Define `RetailerProduct` interface
  - [x] Define `MatchResult` interface
  - [x] Define `ComparisonResult` interface
  - [x] Define `CompareRequest` interface
  - [x] Define `ComparisonProgress` interface
  - [x] Define `ComparisonStatus` type union
- [x] **Task 2 (AC: #2):** Create `src/data/mockProducts.ts`
  - [x] Export `MOCK_PRODUCTS` array with 10-15 items
  - [x] Ensure product names are realistic and searchable
- [x] **Task 3 (AC: #3, #4):** Verify compilation and exports
  - [x] Run `npm run typecheck`
  - [x] Test import in another file

---

## Dev Agent Record

### Context Reference
- First story in epic, no previous story context

### Agent Model Used
- Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- N/A

### Completion Notes List
- [x] Created `collabcanvas/src/types/priceComparison.ts` with 7 type definitions
- [x] Created `collabcanvas/src/data/mockProducts.ts` with 12 mock product names
- [x] TypeScript compilation verified (tsc --noEmit passes)
- [x] Import test verified exports are usable

### File List
- NEW: `src/types/priceComparison.ts`
- NEW: `src/data/mockProducts.ts`

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-10 | Initial draft | SM |
| 2025-12-10 | Added Dev Notes, Dev Agent Record, Tasks | SM (auto-improve) |
