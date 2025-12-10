# Story PC-2: Unwrangle + LLM Cloud Function

**Epic:** Price Intelligence Module
**Story ID:** PC-2
**Status:** drafted
**Complexity:** Large
**Dependencies:** PC-1 (Types)

---

## User Story

**As a** frontend application
**I want** a Cloud Function that fetches and matches products from multiple retailers
**So that** I can display price comparisons to users

---

## Description

Create a Firebase Cloud Function that:
1. Accepts a product name
2. Queries Unwrangle API for Home Depot, Lowe's, and Ace Hardware
3. Uses OpenAI to select the best matching product from each retailer
4. Caches results in Firestore
5. Returns normalized comparison results

---

## Acceptance Criteria

- [ ] **AC1:** Cloud Function `comparePrices` is callable from frontend
- [ ] **AC2:** Function accepts `projectId` as required parameter
- [ ] **AC3:** Function checks for existing `status: 'complete'` results in Firestore
- [ ] **AC4:** If complete results exist AND `forceRefresh` is false → return `{ cached: true }` immediately
- [ ] **AC5:** If no results OR `forceRefresh` is true → run full comparison with incremental writes
- [ ] **AC6:** Function writes progress to Firestore after EACH product completes (real-time updates)
- [ ] **AC7:** Function queries all 3 retailers via Unwrangle API in parallel (per product)
- [ ] **AC8:** OpenAI GPT-4o-mini selects best match per retailer with JSON sanitization
- [ ] **AC9:** LLM response parser handles markdown-wrapped JSON (strips ```json blocks)
- [ ] **AC10:** Function handles partial failures gracefully (1-2 retailers fail for a product)
- [ ] **AC11:** Firestore document includes `status` field: 'processing' | 'complete' | 'error'
- [ ] **AC12:** Timeout is set to 540 seconds (max for 2nd gen functions)
- [ ] **AC13:** CORS configured for localhost dev servers
- [ ] **AC14:** Unit tests with mocked API responses pass

---

## Technical Details

### File to Create

**`functions/src/priceComparison.ts`**

```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import OpenAI from 'openai'

// Types (duplicate for Cloud Functions - can't import from src/)
type Retailer = 'homeDepot' | 'lowes' | 'aceHardware'
type ComparisonStatus = 'processing' | 'complete' | 'error'

interface CompareRequest {
  projectId: string
  productNames: string[]
  forceRefresh?: boolean
  zipCode?: string
}

interface RetailerProduct {
  id: string
  name: string
  brand: string | null
  price: number
  currency: string
  url: string
  imageUrl?: string
  retailer: Retailer
}

interface MatchResult {
  selectedProduct: RetailerProduct | null
  confidence: number
  reasoning: string
  searchResultsCount: number
}

interface ComparisonResult {
  originalProductName: string
  matches: Record<Retailer, MatchResult>
  bestPrice: { retailer: Retailer; product: RetailerProduct; savings: number } | null
  comparedAt: number
}

const PLATFORMS = {
  homeDepot: 'homedepot_search',
  lowes: 'lowes_search',
  aceHardware: 'acehardware_search',
} as const

const RETAILERS: Retailer[] = ['homeDepot', 'lowes', 'aceHardware']

// ============ UNWRANGLE API ============

async function fetchFromUnwrangle(
  productName: string,
  platform: string,
  zipCode?: string
): Promise<unknown[]> {
  const apiKey = process.env.UNWRANGLE_API_KEY
  const params = new URLSearchParams({
    platform,
    search: productName,
    api_key: apiKey!,
  })
  if (zipCode) params.append('zipcode', zipCode)

  const url = `https://data.unwrangle.com/api/getter/?${params}`
  const res = await fetch(url)
  const data = await res.json()
  return data.results || []
}

// ============ JSON SANITIZATION ============

/**
 * Parse LLM response, handling markdown-wrapped JSON
 * GPT-4o-mini sometimes returns: ```json\n{...}\n```
 */
function parseMatchResult(content: string): { index: number; confidence: number; reasoning: string } {
  const cleaned = content
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)
    return {
      index: typeof parsed.index === 'number' ? parsed.index : 0,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      reasoning: parsed.reasoning || 'No reasoning provided',
    }
  } catch {
    // Fallback if JSON parsing fails
    return { index: 0, confidence: 0.5, reasoning: 'Fallback to first result (JSON parse failed)' }
  }
}

// ============ LLM MATCHING ============

async function selectBestMatch(
  productName: string,
  results: unknown[],
  retailer: Retailer
): Promise<{ index: number; confidence: number; reasoning: string }> {
  if (results.length === 0) {
    return { index: -1, confidence: 0, reasoning: 'No search results' }
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `Given the original product: "${productName}"
And these search results from ${retailer}:
${JSON.stringify(results.slice(0, 5), null, 2)}

Select the BEST matching product (index 0-4) based on:
1. Functional equivalence
2. Specification compatibility
3. Price competitiveness

Return ONLY JSON: { "index": number, "confidence": number (0-1), "reasoning": "brief" }`
    }],
    temperature: 0.1,
  })

  const content = response.choices[0]?.message?.content || '{}'
  return parseMatchResult(content)
}

// ============ SINGLE PRODUCT COMPARISON ============

async function compareOneProduct(
  productName: string,
  zipCode?: string
): Promise<ComparisonResult> {
  const matches: Record<Retailer, MatchResult> = {} as Record<Retailer, MatchResult>

  // Fetch from all retailers in parallel
  const retailerResults = await Promise.all(
    RETAILERS.map(async (retailer) => {
      try {
        const results = await fetchFromUnwrangle(productName, PLATFORMS[retailer], zipCode)
        const match = await selectBestMatch(productName, results, retailer)

        let selectedProduct: RetailerProduct | null = null
        if (match.index >= 0 && results[match.index]) {
          selectedProduct = normalizeProduct(results[match.index], retailer)
        }

        return {
          retailer,
          match: {
            selectedProduct,
            confidence: match.confidence,
            reasoning: match.reasoning,
            searchResultsCount: results.length,
          },
        }
      } catch (error) {
        return {
          retailer,
          match: {
            selectedProduct: null,
            confidence: 0,
            reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
            searchResultsCount: 0,
          },
        }
      }
    })
  )

  // Build matches record
  for (const { retailer, match } of retailerResults) {
    matches[retailer] = match
  }

  // Determine best price
  const bestPrice = determineBestPrice(matches)

  return {
    originalProductName: productName,
    matches,
    bestPrice,
    comparedAt: Date.now(),
  }
}

// ============ MAIN CLOUD FUNCTION ============

export const comparePrices = onCall<{ request: CompareRequest }>({
  cors: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  maxInstances: 10,
  memory: '1GiB',
  timeoutSeconds: 540,  // Max for 2nd gen - handles large product lists
}, async (req) => {
  const { projectId, productNames, forceRefresh, zipCode } = req.data.request
  const db = getFirestore()
  const docRef = db.collection('projects').doc(projectId)
    .collection('priceComparison').doc('latest')

  // 1. Check for existing complete results (unless forceRefresh)
  if (!forceRefresh) {
    const existingDoc = await docRef.get()
    if (existingDoc.exists && existingDoc.data()?.status === 'complete') {
      return { cached: true }
    }
  }

  // 2. Initialize progress document
  await docRef.set({
    status: 'processing' as ComparisonStatus,
    totalProducts: productNames.length,
    completedProducts: 0,
    results: [],
    startedAt: Date.now(),
    createdBy: req.auth?.uid || 'anonymous',
  })

  const results: ComparisonResult[] = []

  try {
    // 3. Process each product and update Firestore incrementally
    for (const productName of productNames) {
      const result = await compareOneProduct(productName, zipCode)
      results.push(result)

      // Update progress - frontend sees this via onSnapshot
      await docRef.update({
        completedProducts: results.length,
        results: results,
      })
    }

    // 4. Mark complete
    await docRef.update({
      status: 'complete' as ComparisonStatus,
      completedAt: Date.now(),
    })

    return { cached: false }

  } catch (error) {
    // Handle errors gracefully
    await docRef.update({
      status: 'error' as ComparisonStatus,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw new HttpsError('internal', 'Price comparison failed')
  }
})
```

### Unwrangle API Details

| Retailer | Platform | Endpoint |
|----------|----------|----------|
| Home Depot | `homedepot_search` | `https://data.unwrangle.com/api/getter/` |
| Lowe's | `lowes_search` | `https://data.unwrangle.com/api/getter/` |
| Ace Hardware | `acehardware_search` | `https://data.unwrangle.com/api/getter/` |

### Firestore Structure (Project-Scoped, Real-time)

```
Firestore: projects/{projectId}/priceComparison/latest
{
  status: 'processing' | 'complete' | 'error',  // Real-time status
  totalProducts: number,              // Total products to compare
  completedProducts: number,          // Products completed so far
  results: ComparisonResult[],        // Results array (grows incrementally)
  startedAt: number,                  // Timestamp when started
  completedAt?: number,               // Timestamp when finished
  createdBy: string,                  // User ID
  error?: string,                     // Error message if status='error'
}
```

**Key Behavior:**
- Results saved PER PROJECT, not globally
- Document updated after EACH product completes
- Frontend subscribes via `onSnapshot` for real-time updates
- `status` field drives UI state (loading/complete/error)
- Overwritten on "Refresh Prices" (forceRefresh=true)

### Error Handling

| Scenario | Response |
|----------|----------|
| Unwrangle timeout | Return null for that retailer |
| No results | Return empty match for that retailer |
| LLM invalid JSON | Fallback to first result |
| All retailers fail | Return error response |

---

## Testing

**Unit Tests (`functions/src/priceComparison.test.ts`):**

1. Complete results exist (status='complete'), forceRefresh=false → returns `{ cached: true }` immediately
2. Complete results exist, forceRefresh=true → runs full comparison, overwrites
3. No existing results → initializes with status='processing', processes all products
4. `parseMatchResult()` handles clean JSON
5. `parseMatchResult()` handles markdown-wrapped JSON (```json blocks)
6. `parseMatchResult()` returns fallback on invalid JSON
7. Mock Unwrangle responses for all 3 retailers
8. Mock OpenAI response
9. Test partial failure (1-2 retailers fail for a product) → other retailers still work
10. Test complete failure → status set to 'error' with message
11. Verify Firestore document updated after each product (incremental writes)
12. Verify final status is 'complete' with completedAt timestamp

---

## Environment Variables

Add to `functions/.env`:
```
UNWRANGLE_API_KEY=your_key_here
# OPENAI_API_KEY already exists
```

---

## Dev Notes

### Architecture Patterns and Constraints

- Follow existing Cloud Function pattern from `functions/src/pricing.ts` (Lines 226-365)
- Use `onCall` pattern with CORS configuration for localhost dev servers
- Use `Promise.all` for parallel API calls to all 3 retailers
- Incremental Firestore writes after each product (real-time updates pattern)
- Types duplicated in Cloud Function (can't import from `src/`)
- [Source: docs/price-comparison-tech-spec.md, "Existing Patterns to Follow"]

### References

- [Source: docs/price-comparison-tech-spec.md, "Cloud Function Structure"]
- [Source: docs/price-comparison-tech-spec.md, "Technical Approach"]
- [Source: docs/price-comparison-tech-spec.md, "Unwrangle API Integration"]
- [Source: docs/sprint-artifacts/epic-price-comparison.md, "Technical Dependencies"]

### Implementation Notes

- Timeout set to 540s (max for 2nd gen functions) to handle large product lists
- LLM response parser must handle markdown-wrapped JSON (`\`\`\`json` blocks)
- `normalizeProduct()` helper needed to convert Unwrangle response to `RetailerProduct`
- `determineBestPrice()` helper needed to find lowest price across retailers
- Log all API calls for debugging
- Don't forget to export from `functions/src/index.ts`

### Learnings from Previous Story

- PC-1 provides types that must be duplicated in Cloud Function
- Ensure type definitions match exactly between `src/types/priceComparison.ts` and function

---

## Tasks

- [ ] **Task 1 (AC: #1, #12, #13):** Set up Cloud Function scaffold
  - [ ] Create `functions/src/priceComparison.ts`
  - [ ] Configure `onCall` with CORS, memory, timeout
  - [ ] Export from `functions/src/index.ts`
- [ ] **Task 2 (AC: #2, #3, #4, #5):** Implement caching logic
  - [ ] Check for existing `status: 'complete'` results
  - [ ] Handle `forceRefresh` parameter
  - [ ] Return `{ cached: true }` when appropriate
- [ ] **Task 3 (AC: #6, #11):** Implement progress tracking
  - [ ] Initialize Firestore document with `status: 'processing'`
  - [ ] Update after each product completes
  - [ ] Set `status: 'complete'` or `status: 'error'` on finish
- [ ] **Task 4 (AC: #7):** Implement Unwrangle API integration
  - [ ] Create `fetchFromUnwrangle()` function
  - [ ] Query all 3 retailers in parallel per product
  - [ ] Handle API errors gracefully
- [ ] **Task 5 (AC: #8, #9):** Implement LLM matching
  - [ ] Create `selectBestMatch()` with OpenAI
  - [ ] Create `parseMatchResult()` with JSON sanitization
  - [ ] Handle markdown-wrapped JSON responses
- [ ] **Task 6 (AC: #10):** Implement error handling
  - [ ] Handle partial failures (1-2 retailers fail)
  - [ ] Ensure other retailers still return results
- [ ] **Task 7 (AC: #14):** Write unit tests
  - [ ] Test caching logic
  - [ ] Test `parseMatchResult()` with various inputs
  - [ ] Mock Unwrangle and OpenAI responses
  - [ ] Test partial and complete failures

---

## Dev Agent Record

### Context Reference
- Depends on PC-1 for type definitions (duplicate in function)
- [Source: docs/sprint-artifacts/story-pc-1-types-mock-data.md]

### Agent Model Used
- TBD

### Debug Log References
- N/A

### Completion Notes List
- [ ] Pending

### File List
- NEW: `functions/src/priceComparison.ts`
- NEW: `functions/src/priceComparison.test.ts`
- MODIFIED: `functions/src/index.ts` (add export)
- MODIFIED: `functions/.env` (add UNWRANGLE_API_KEY)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-10 | Initial draft | SM |
| 2025-12-10 | Added Dev Notes, Dev Agent Record, Tasks | SM (auto-improve) |
