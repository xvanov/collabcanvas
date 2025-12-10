# Story PC-4: UI Components and Integration

**Epic:** Price Intelligence Module
**Story ID:** PC-4
**Status:** drafted
**Complexity:** Medium
**Dependencies:** PC-3 (Frontend Service)

---

## User Story

**As a** user viewing the Material Estimation Panel
**I want** to click a button and see price comparisons in a new tab
**So that** I can find the best prices across retailers

---

## Description

Create UI components for displaying price comparison results:
1. Add "Compare Prices" button to MaterialEstimationPanel
2. Create PriceComparisonPage (full-page wrapper)
3. Create PriceComparisonTable (results table)
4. Add route to App.tsx

---

## Acceptance Criteria

- [ ] **AC1:** "Compare Prices" button visible in MaterialEstimationPanel (uses mock projectId)
- [ ] **AC2:** Clicking button opens new browser tab with `/compare-prices`
- [ ] **AC3:** Page subscribes to Firestore for real-time progress updates
- [ ] **AC4:** If status='complete' → table displays immediately
- [ ] **AC5:** If status='processing' → progress bar shows "Comparing X of Y products..."
- [ ] **AC6:** Results appear incrementally in table as products complete
- [ ] **AC7:** "Refresh Prices" button triggers new comparison (forceRefresh=true)
- [ ] **AC8:** Table displays all products with retailer columns
- [ ] **AC9:** Best price is highlighted with green background and badge
- [ ] **AC10:** "No match" cells show gray placeholder
- [ ] **AC11:** Product links open retailer pages in new tab
- [ ] **AC12:** Error state displays if status='error'

---

## Technical Details

### Files to Create

**1. `src/components/PriceComparisonPage.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { PriceComparisonTable } from './PriceComparisonTable'
import {
  startMockComparison,
  subscribeToComparison,
} from '../services/priceComparisonService'
import type { ComparisonProgress, ComparisonStatus } from '../types/priceComparison'

// Mock project ID for development (will be replaced with real projectId later)
const MOCK_PROJECT_ID = 'mock-project-001'

export function PriceComparisonPage() {
  const [progress, setProgress] = useState<ComparisonProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to Firestore for real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToComparison(
      MOCK_PROJECT_ID,
      (data) => {
        setProgress(data)
        if (data.status === 'error') {
          setError(data.error || 'Comparison failed')
        }
      },
      (err) => setError(err.message)
    )

    // Start comparison on mount (will use cached if available)
    startMockComparison(MOCK_PROJECT_ID, false).catch((err) => {
      setError(err.message)
    })

    return () => unsubscribe()
  }, [])

  async function handleRefresh() {
    setError(null)
    try {
      await startMockComparison(MOCK_PROJECT_ID, true) // forceRefresh = true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh')
    }
  }

  const status = progress?.status || 'idle'
  const isProcessing = status === 'processing'
  const isComplete = status === 'complete'

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Price Comparison</h1>
            {progress && (
              <p className="text-sm text-gray-500">
                {progress.results.length} products compared
              </p>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isProcessing}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isProcessing ? 'Comparing...' : 'Refresh Prices'}
          </button>
        </div>

        {/* Progress bar (while processing) */}
        {isProcessing && progress && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Comparing prices...</span>
              <span>{progress.completedProducts} of {progress.totalProducts} products</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${(progress.completedProducts / progress.totalProducts) * 100}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Loading skeleton (initial load, no data yet) */}
        {!progress && !error && (
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-red-600 p-4 bg-red-50 rounded mb-4">
            {error}
            <button
              onClick={handleRefresh}
              className="ml-4 text-blue-600 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Results table (shows incrementally as products complete) */}
        {progress && progress.results.length > 0 && (
          <PriceComparisonTable results={progress.results} />
        )}
      </div>
    </div>
  )
}
```

**2. `src/components/PriceComparisonTable.tsx`**

```tsx
import type { ComparisonResult, Retailer, RetailerProduct } from '../types/priceComparison'

interface Props {
  results: ComparisonResult[]
}

const RETAILER_LABELS: Record<Retailer, string> = {
  homeDepot: 'Home Depot',
  lowes: "Lowe's",
  aceHardware: 'Ace Hardware',
}

export function PriceComparisonTable({ results }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse bg-white rounded-lg shadow">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 text-left font-semibold">Product</th>
            <th className="p-3 text-left font-semibold">Home Depot</th>
            <th className="p-3 text-left font-semibold">Lowe's</th>
            <th className="p-3 text-left font-semibold">Ace Hardware</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.originalProductName} className="border-t">
              <td className="p-3 font-medium">{result.originalProductName}</td>
              {(['homeDepot', 'lowes', 'aceHardware'] as Retailer[]).map((retailer) => (
                <ProductCell
                  key={retailer}
                  match={result.matches[retailer]}
                  isBest={result.bestPrice?.retailer === retailer}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProductCell({
  match,
  isBest,
}: {
  match: { selectedProduct: RetailerProduct | null; confidence: number }
  isBest: boolean
}) {
  const product = match.selectedProduct

  if (!product) {
    return (
      <td className="p-3 bg-gray-50 text-gray-400">
        No match found
      </td>
    )
  }

  return (
    <td className={`p-3 ${isBest ? 'bg-green-50' : ''}`}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">${product.price.toFixed(2)}</span>
          {isBest && (
            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
              BEST
            </span>
          )}
        </div>
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline truncate"
        >
          {product.name}
        </a>
        {product.brand && (
          <span className="text-xs text-gray-500">{product.brand}</span>
        )}
      </div>
    </td>
  )
}
```

### Files to Modify

**3. `src/components/MaterialEstimationPanel.tsx`** (add button)

```tsx
// Add near existing "Refresh Prices" button
// Uses simple route - mock projectId is handled in PriceComparisonPage
<Button
  variant="outline"
  onClick={() => {
    window.open('/compare-prices', '_blank')
  }}
>
  Compare Prices
</Button>
```

**4. `src/App.tsx`** (add route)

```tsx
import { PriceComparisonPage } from './components/PriceComparisonPage'

// Simple route - projectId handled internally with mock
<Route path="/compare-prices" element={<PriceComparisonPage />} />
```

---

## UI Design

### Page Header Layout
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Price Comparison                                   [Refresh Prices]    │
│  12 products compared                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Progress Bar (while comparing)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Comparing prices...                              8 of 12 products      │
│  ████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  67%   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Table Layout
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Product         │ Home Depot      │ Lowe's          │ Ace Hardware    │
├─────────────────┼─────────────────┼─────────────────┼─────────────────┤
│ 2x4 lumber 8ft  │ $3.58 [BEST]    │ $3.79           │ $4.29           │
│                 │ 2x4x96 Stud     │ 2x4-8 SPF       │ 2x4 Premium     │
│                 │ (link)          │ (link)          │ (link)          │
├─────────────────┼─────────────────┼─────────────────┼─────────────────┤
│ drywall 4x8     │ $12.98          │ $11.97 [BEST]   │ No match found  │
│                 │ Sheetrock       │ Gold Bond       │                 │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### Visual States

| State | Styling |
|-------|---------|
| Initial load (no data) | Skeleton rows with pulse animation |
| Processing | Progress bar + "Comparing..." button text + partial table |
| Complete | Full table, "Refresh Prices" button enabled |
| Best Price | `bg-green-50` + green "BEST" badge |
| No Match | `bg-gray-50` + gray "No match found" text |
| Error | Red background with error message + "Try again" link |

---

## Testing

**Manual Testing Checklist:**
- [ ] Click "Compare Prices" → new tab opens with `/compare-prices`
- [ ] First load (no data) → skeleton shows
- [ ] Processing state → progress bar shows "X of Y products"
- [ ] Results appear incrementally in table as products complete
- [ ] Complete state → full table visible, button shows "Refresh Prices"
- [ ] Click "Refresh Prices" → progress bar reappears, new comparison starts
- [ ] Best price cells have green highlight
- [ ] Product links open in new tab
- [ ] Error state → red message with "Try again" link
- [ ] Works on mobile viewport

---

## Dev Notes

### Architecture Patterns and Constraints

- Use Tailwind CSS for styling (existing in project)
- Follow existing component patterns in `src/components/`
- Keep `MaterialEstimationPanel.tsx` changes minimal (just add button)
- Use `window.open()` for new tab behavior
- Use React hooks pattern with `useEffect` for subscription cleanup
- [Source: docs/price-comparison-tech-spec.md, "UI Components"]

### References

- [Source: docs/price-comparison-tech-spec.md, "UX/UI Considerations"]
- [Source: docs/price-comparison-tech-spec.md, "Visual States"]
- [Source: docs/price-comparison-tech-spec.md, "Integration Points"]
- [Source: docs/sprint-artifacts/story-pc-3-frontend-service.md, "Service Functions"]

### Implementation Notes

- Mock projectId (`mock-project-001`) hardcoded in PriceComparisonPage for now
- Real projectId integration will be done by other developer later
- `subscribeToComparison()` returns unsubscribe function - must cleanup in useEffect
- "Refresh Prices" button passes `forceRefresh: true` to startMockComparison
- Route: `/compare-prices` (simple route, projectId handled internally)
- **Note:** Tech spec suggests `/projects/:projectId/compare-prices` but story uses simpler `/compare-prices` with mock projectId

### Learnings from Previous Story

- PC-3 provides `startComparison()`, `subscribeToComparison()`, `startMockComparison()`
- `subscribeToComparison()` fires callback with `ComparisonProgress` on each update
- Must return unsubscribe function from useEffect for cleanup

---

## Tasks

- [ ] **Task 1 (AC: #3, #4, #5, #6):** Create `PriceComparisonPage.tsx`
  - [ ] Create `src/components/PriceComparisonPage.tsx`
  - [ ] Subscribe to Firestore on mount
  - [ ] Handle `status: 'complete'` (show table)
  - [ ] Handle `status: 'processing'` (show progress bar)
  - [ ] Handle `status: 'error'` (show error state)
  - [ ] Cleanup subscription on unmount
- [ ] **Task 2 (AC: #7):** Implement refresh functionality
  - [ ] Add "Refresh Prices" button
  - [ ] Call `startMockComparison(projectId, true)` on click
- [ ] **Task 3 (AC: #8, #9, #10, #11):** Create `PriceComparisonTable.tsx`
  - [ ] Create `src/components/PriceComparisonTable.tsx`
  - [ ] Display all products with retailer columns
  - [ ] Highlight best price with green background and badge
  - [ ] Show "No match found" for null matches
  - [ ] Make product names clickable links (open in new tab)
- [ ] **Task 4 (AC: #12):** Implement error state
  - [ ] Display error message in red
  - [ ] Add "Try again" link
- [ ] **Task 5 (AC: #1):** Add button to MaterialEstimationPanel
  - [ ] Add "Compare Prices" button
  - [ ] Use mock projectId for now
- [ ] **Task 6 (AC: #2):** Add route to App.tsx
  - [ ] Import `PriceComparisonPage`
  - [ ] Add route for `/compare-prices`
  - [ ] Button opens new tab with `window.open()`
- [ ] **Task 7:** Manual testing
  - [ ] Run through manual testing checklist

---

## Dev Agent Record

### Context Reference
- Depends on PC-1 for types (`ComparisonProgress`, `ComparisonResult`, `Retailer`)
- Depends on PC-3 for service functions (`startMockComparison`, `subscribeToComparison`)
- [Source: docs/sprint-artifacts/story-pc-1-types-mock-data.md]
- [Source: docs/sprint-artifacts/story-pc-3-frontend-service.md]

### Agent Model Used
- TBD

### Debug Log References
- N/A

### Completion Notes List
- [ ] Pending

### File List
- NEW: `src/components/PriceComparisonPage.tsx`
- NEW: `src/components/PriceComparisonTable.tsx`
- MODIFIED: `src/components/MaterialEstimationPanel.tsx` (add button)
- MODIFIED: `src/App.tsx` (add route)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-10 | Initial draft | SM |
| 2025-12-10 | Added Dev Notes, Dev Agent Record, Tasks | SM (auto-improve) |
