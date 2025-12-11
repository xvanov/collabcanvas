# Epic: Price Intelligence Module

**Epic ID:** price-comparison
**Owner:** Dev 5 (Stretch Goals)
**Tech Spec:** `docs/price-comparison-tech-spec.md`
**Status:** Ready for Development

---

## Overview

Build a multi-retailer price comparison module that queries Home Depot, Lowe's, and Ace Hardware via Unwrangle API, uses LLM-based product matching to find equivalent products, and displays results in a comparison table.

## Goal

Enable users to compare construction material prices across multiple retailers with a single click, helping them find the best deals without manual research.

## Success Criteria

- User can click "Compare Prices" in Material Estimation Panel
- New tab opens with comparison results for all mock products
- Table shows matched products from all 3 retailers
- Best price is highlighted for each product
- Results are cached for 24 hours

## Stories

| Story | Title | Complexity | Dependencies |
|-------|-------|------------|--------------|
| PC-1 | Types and Mock Data Setup | Small | None |
| PC-2 | Unwrangle + LLM Cloud Function | Large | PC-1 |
| PC-3 | Frontend Service Layer | Medium | PC-2 |
| PC-4 | UI Components and Integration | Medium | PC-3 |
| PC-5 | Global Product Cache | Medium | PC-2 |

## Exclusive Files (No Conflict Zone)

**New Files (CREATE):**
```
src/types/priceComparison.ts
src/data/mockProducts.ts
src/services/priceComparisonService.ts
src/services/priceComparisonService.test.ts
src/components/PriceComparisonTable.tsx
src/components/PriceComparisonPage.tsx
functions/src/priceComparison.ts
functions/src/priceComparison.test.ts
```

**Minor Modifications:**
```
src/components/MaterialEstimationPanel.tsx  # Add button only
src/App.tsx                                  # Add route only
functions/src/index.ts                       # Add export only
```

## Technical Dependencies

- Unwrangle API key (user has)
- OpenAI API key (already in stack)
- Firebase Cloud Functions
- Firestore for caching

## Definition of Done

- [ ] All 5 stories completed
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing with mock data successful
- [ ] No modifications to existing types/services (except minimal integration points)
- [ ] Code follows existing conventions
