# Story 4.2: Cost Data & Monte Carlo Simulation

Status: done

## Story

As a **system (Cost Agent and Risk Agent)**,
I want **to retrieve material costs from the database and run Monte Carlo simulations on cost estimates**,
so that **estimates include accurate material pricing and probabilistic risk analysis with confidence intervals (P50/P80/P90)**.

## Acceptance Criteria

| AC# | Criterion | Verification |
|-----|-----------|--------------|
| 4.2.1 | `get_material_cost` returns unit cost, labor hours, crew for valid RSMeans item codes | Unit test with mock data |
| 4.2.2 | Monte Carlo simulation runs 1000+ iterations using triangular distributions | Unit test verifying iteration count |
| 4.2.3 | Simulation calculates P50, P80, P90 percentiles correctly (P50 < P80 < P90) | Unit test with known distribution |
| 4.2.4 | Recommended contingency is derived from P80-P50 spread using formula: `(P80-P50)/P50 * 100` | Formula validation test |
| 4.2.5 | Top 5 risk factors identified by variance contribution (sensitivity analysis) | Sensitivity analysis test |
| 4.2.6 | Simulation completes in < 2 seconds for 100 line items | Performance test |
| 4.2.7 | Histogram data returned in format suitable for chart visualization | Schema validation test |

## Tasks / Subtasks

- [x] **Task 1: Create Data Models** (AC: 4.2.1, 4.2.7)
  - [x] 1.1 Create `MaterialCost` dataclass with all RSMeans fields
  - [x] 1.2 Create `LaborRate` dataclass for trade-specific rates
  - [x] 1.3 Create `LineItemInput` dataclass for Monte Carlo input
  - [x] 1.4 Create `MonteCarloResult` dataclass with percentiles, risks, histogram
  - [x] 1.5 Create `RiskFactor` dataclass for top risk items
  - [x] 1.6 Create `HistogramBin` dataclass for distribution visualization
  - [x] 1.7 Add type hints and docstrings per Python conventions

- [x] **Task 2: Implement Cost Data Service Functions** (AC: 4.2.1)
  - [x] 2.1 Add to `functions/services/cost_data_service.py`
  - [x] 2.2 Implement `async def get_material_cost(item_code: str) -> MaterialCost`
  - [x] 2.3 Implement `async def get_labor_rate(trade: str, zip_code: str) -> LaborRate`
  - [x] 2.4 Implement `async def search_materials(query: str, csi_division: Optional[str], limit: int) -> List[MaterialCost]`
  - [x] 2.5 Add Firestore lookup from `/costData/materials/{itemCode}`
  - [x] 2.6 Raise `ItemNotFoundError` for missing items

- [x] **Task 3: Implement Monte Carlo Service** (AC: 4.2.2-4.2.7)
  - [x] 3.1 Create `functions/services/monte_carlo.py`
  - [x] 3.2 Implement `def run_simulation(line_items, iterations=1000, confidence_levels=[50,80,90]) -> MonteCarloResult`
  - [x] 3.3 Use `numpy.random.triangular(low, likely, high)` for each item
  - [x] 3.4 Aggregate totals across all iterations
  - [x] 3.5 Calculate percentiles using `numpy.percentile()`
  - [x] 3.6 Implement sensitivity analysis via correlation coefficients
  - [x] 3.7 Identify top 5 variance contributors
  - [x] 3.8 Calculate recommended contingency: `(p80 - p50) / p50 * 100`
  - [x] 3.9 Generate histogram bins for visualization

- [x] **Task 4: Add Structured Logging** (AC: all)
  - [x] 4.1 Log `monte_carlo_complete` with iterations, p50, p90, duration_ms
  - [x] 4.2 Log `material_not_found` errors with item_code
  - [x] 4.3 Log `material_lookup` with item_code, latency_ms

- [x] **Task 5: Write Unit Tests** (AC: 4.2.1-4.2.7)
  - [x] 5.1 Create `functions/tests/unit/test_cost_data_service.py`
  - [x] 5.2 Test: `get_material_cost` returns all required fields
  - [x] 5.3 Test: `get_material_cost` raises `ItemNotFoundError` for invalid code
  - [x] 5.4 Test: `search_materials` returns matching items
  - [x] 5.5 Create `functions/tests/unit/test_monte_carlo.py`
  - [x] 5.6 Test: Simulation runs 1000+ iterations
  - [x] 5.7 Test: P50 < P80 < P90 always holds
  - [x] 5.8 Test: Contingency formula is correctly applied
  - [x] 5.9 Test: Top 5 risks are sorted by impact descending
  - [x] 5.10 Test: Histogram bins sum to iteration count
  - [x] 5.11 Performance test: 100 items completes < 2 seconds

- [x] **Task 6: Create Demo Script for User Verification** (AC: all)
  - [x] 6.1 Create `functions/demo_monte_carlo.py`
  - [x] 6.2 Define sample 20-item kitchen remodel estimate with cost ranges
  - [x] 6.3 Run Monte Carlo simulation on sample data
  - [x] 6.4 Print P50/P80/P90 results to console with formatted output
  - [x] 6.5 Print top 5 risk factors with impact amounts
  - [x] 6.6 Generate `monte_carlo_results.html` with Chart.js histogram
  - [x] 6.7 Print recommended contingency percentage

## User Verification

After completing this story, run these commands to verify it works:

| Command | What You See |
|---------|--------------|
| `cd functions && python3 demo_monte_carlo.py` | Console output with P50/P80/P90, top risks, contingency % |
| Open `functions/monte_carlo_results.html` in browser | Interactive histogram chart showing cost distribution |
| `cd functions && python3 -m pytest tests/unit/test_monte_carlo.py -v` | All tests pass, performance test < 2s |
| `cd functions && python3 -m pytest tests/unit/test_cost_data_service.py -v` | Material lookup tests pass |

**Expected Console Output:**
```
============================================================
  Monte Carlo Simulation Results - Kitchen Remodel Estimate
============================================================

  Iterations: 1,000
  Line Items: 20

  Cost Percentiles:
    P50 (Median):     $45,230
    P80 (Likely):     $49,850
    P90 (Conservative): $52,100

  Recommended Contingency: 10.2%
  (Based on P80-P50 spread)

  Top 5 Risk Factors:
    1. Cabinet installation    +$2,400 impact (high labor variance)
    2. Countertop materials    +$1,800 impact (stone price volatility)
    3. Electrical rough-in     +$1,200 impact (union labor)
    4. Plumbing fixtures       +$950 impact (supply chain)
    5. Appliance allowance     +$800 impact (specification TBD)

  Histogram saved to: monte_carlo_results.html
============================================================
```

## Dev Notes

### Architecture Alignment

This story implements the **Cost Data Service** and **Monte Carlo Simulation** components of Epic 4. The Cost Data Service is called by the Cost Agent (Epic 2), and Monte Carlo is called by the Risk Agent (Epic 2).

**Ownership (Dev 4 Exclusive):**
- `functions/services/cost_data_service.py` (shared with Story 4.1)
- `functions/services/monte_carlo.py`
- Firestore `/costData/materials/{itemCode}` collection

**Architecture Decisions:**
- **ADR-005**: Firestore for cost data storage
- **ADR-007**: NumPy for Monte Carlo (standard library, efficient vectorized ops)

### Data Model Reference

```python
@dataclass
class MaterialCost:
    item_code: str  # RSMeans-style code, e.g., "092900"
    description: str
    unit: str  # "sf", "lf", "each", etc.
    unit_cost: float
    labor_hours: float
    crew: str  # e.g., "2 Carpenters + 1 Laborer"
    crew_daily_output: float
    productivity_factor: float
    cost_low: float  # Optimistic
    cost_likely: float  # Most likely
    cost_high: float  # Pessimistic
    csi_division: str  # "09" for Finishes
    subdivision: str  # "09 29 00" for Gypsum Board

@dataclass
class MonteCarloResult:
    iterations: int
    p50: float
    p80: float
    p90: float
    mean: float
    std_dev: float
    min_value: float
    max_value: float
    recommended_contingency: float  # Percentage
    top_risks: List[RiskFactor]
    histogram: List[HistogramBin]

@dataclass
class RiskFactor:
    item: str
    impact: float  # Dollar impact
    probability: float
    sensitivity: float  # Correlation coefficient

@dataclass
class HistogramBin:
    range_low: float
    range_high: float
    count: int
    percentage: float
```

### API Interface

```python
async def get_material_cost(item_code: str) -> MaterialCost:
    """Retrieve cost data for a material item."""

def run_simulation(
    line_items: List[LineItemInput],
    iterations: int = 1000,
    confidence_levels: List[int] = [50, 80, 90]
) -> MonteCarloResult:
    """Run Monte Carlo simulation on cost estimate."""
```

### Monte Carlo Algorithm

```python
# Pseudocode
totals = []
for i in range(iterations):
    total = 0
    for item in line_items:
        sample = np.random.triangular(item.low, item.likely, item.high)
        total += sample * item.quantity
    totals.append(total)

p50 = np.percentile(totals, 50)
p80 = np.percentile(totals, 80)
p90 = np.percentile(totals, 90)
contingency = (p80 - p50) / p50 * 100
```

### Performance Requirements

| Metric | Target | Implementation |
|--------|--------|----------------|
| Monte Carlo (1000 iter, 100 items) | < 2 seconds | NumPy vectorized ops |
| Material cost lookup | < 200ms | Firestore single-doc read |

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| numpy | 1.26.x | Monte Carlo simulation, statistics |
| firebase-admin | 6.x | Firestore access |
| structlog | 23.x | Structured logging |

### Project Structure Notes

- Extend existing `functions/services/cost_data_service.py` from Story 4.1
- New file: `functions/services/monte_carlo.py`
- Tests: `functions/tests/unit/test_cost_data_service.py`, `functions/tests/unit/test_monte_carlo.py`
- Uses `structlog` for structured logging (per architecture.md)
- Follow async/await patterns established in Story 4.1

### Learnings from Previous Story

**From Story 4-1-location-intelligence-service (Status: done)**

- **Service Location Created**: `functions/services/cost_data_service.py` already exists (~650 lines) - EXTEND this file for cost data functions
- **Dataclass Patterns**: Follow the same dataclass patterns with type hints and docstrings (LocationFactors, PermitCosts, WeatherFactors)
- **Caching Approach**: LocationCache class with LRU eviction and 24-hour TTL - consider similar caching for frequently accessed materials
- **Structlog Integration**: Logging patterns established - use same `structlog.get_logger()` approach
- **Testing Patterns**: 34 unit tests in `test_location_service.py` - follow similar comprehensive test structure
- **Firestore Path**: `/costData/locationFactors/{zipCode}` established - align `/costData/materials/{itemCode}` path style
- **Demo Script Pattern**: `demo_location_service.py` with command-line args and formatted output - follow for `demo_monte_carlo.py`
- **Advisory Note**: Cache thread safety consideration noted in review - apply Lock if needed for production hardening
- **Package Init Files**: `functions/__init__.py`, `functions/services/__init__.py`, `functions/tests/__init__.py` already created

[Source: docs/sprint-artifacts/4-1-location-intelligence-service.md#Dev-Agent-Record]

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Story-4.2:-Cost-Data-&-Monte-Carlo-Simulation]
- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Data-Models-and-Contracts]
- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#APIs-and-Interfaces]
- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Monte-Carlo-Simulation-Flow]
- [Source: docs/epics.md#Story-4.2:-Cost-Data-&-Monte-Carlo-Simulation]
- [Source: docs/architecture.md#Data-Architecture]
- [Source: docs/architecture.md#Novel-Pattern-Designs]
- [Source: docs/prd.md#FR48-51]

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/4-2-cost-data-monte-carlo.context.xml

### Agent Model Used

- Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Implementation approach: Extended existing cost_data_service.py with MaterialCost dataclass and functions, created new monte_carlo.py for simulation logic
- Fixed edge case: NumPy triangular distribution requires low != high, added handling for zero-variance items

### Completion Notes List

- ✅ All 6 tasks completed with 88 unit tests passing
- ✅ MaterialCost dataclass follows RSMeans schema with all required fields (unit_cost, labor_hours, crew, cost_low/likely/high)
- ✅ Monte Carlo uses NumPy triangular distributions for efficient vectorized sampling
- ✅ Sensitivity analysis identifies top 5 risk factors via correlation coefficients
- ✅ Contingency calculation formula: (P80-P50)/P50 * 100
- ✅ Performance: 100 items with 1000 iterations completes in ~0.3s (well under 2s target)
- ✅ Demo script generates interactive HTML histogram with Chart.js

### File List

**New Files:**
- functions/services/monte_carlo.py (Monte Carlo simulation service)
- functions/tests/unit/test_cost_data_service.py (20 tests for cost data service)
- functions/tests/unit/test_monte_carlo.py (34 tests for Monte Carlo service)
- functions/demo_monte_carlo.py (Demo script with 20-item kitchen remodel)
- functions/monte_carlo_results.html (Generated histogram visualization)

**Modified Files:**
- functions/services/cost_data_service.py (Added MaterialCost, ItemNotFoundError, get_material_cost, get_labor_rate, search_materials, MATERIAL_DATA)
- functions/services/__init__.py (Added exports for new modules)
- functions/requirements.txt (Uncommented numpy dependency)
- docs/sprint-artifacts/sprint-status.yaml (Updated story status)

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-12-10 | PM Agent (John) | Initial story creation with user verification tasks |
| 2025-12-10 | Dev Agent (Claude Opus 4.5) | Implemented all tasks: data models, cost data service, Monte Carlo simulation, logging, unit tests, demo script |
| 2025-12-10 | Senior Dev Review (xvanov) | Code review completed - APPROVED |

---

## Senior Developer Review (AI)

### Reviewer
xvanov

### Date
2025-12-10

### Outcome
**APPROVE** ✅

All acceptance criteria fully implemented with evidence. All tasks verified complete. No blocking issues found.

### Summary
Story 4.2 implements the Cost Data Service and Monte Carlo Simulation components for TrueCost. The implementation follows architecture patterns (ADR-007 NumPy), uses proper dataclass patterns from Story 4.1, and includes comprehensive unit tests (54 passing). Performance exceeds requirements (~27ms vs <2s target).

### Key Findings

**No HIGH or MEDIUM severity issues found.**

**LOW Severity (Advisory):**
- Note: Consider adding integration tests with Firestore emulator (referenced in tech spec)
- Note: Cache thread safety consideration from Story 4.1 review applies for production hardening

### Acceptance Criteria Coverage

| AC# | Description | Status | Evidence |
|-----|-------------|--------|----------|
| 4.2.1 | `get_material_cost` returns unit cost, labor hours, crew for valid RSMeans item codes | ✅ IMPLEMENTED | `cost_data_service.py:1291-1346` |
| 4.2.2 | Monte Carlo simulation runs 1000+ iterations using triangular distributions | ✅ IMPLEMENTED | `monte_carlo.py:204` uses `np.random.triangular()` |
| 4.2.3 | Simulation calculates P50, P80, P90 percentiles correctly (P50 < P80 < P90) | ✅ IMPLEMENTED | `monte_carlo.py:209-212` uses `np.percentile()` |
| 4.2.4 | Recommended contingency derived from P80-P50 spread | ✅ IMPLEMENTED | `monte_carlo.py:222-225` formula: `(p80-p50)/p50*100` |
| 4.2.5 | Top 5 risk factors identified by variance contribution (sensitivity analysis) | ✅ IMPLEMENTED | `monte_carlo.py:263-314` correlation-based analysis |
| 4.2.6 | Simulation completes in < 2 seconds for 100 line items | ✅ IMPLEMENTED | Performance test passes, demo runs in ~27ms |
| 4.2.7 | Histogram data returned in format suitable for chart visualization | ✅ IMPLEMENTED | `monte_carlo.py:317-347` returns `List[HistogramBin]` |

**Summary: 7 of 7 acceptance criteria fully implemented**

### Task Completion Validation

| Task | Marked | Verified | Evidence |
|------|--------|----------|----------|
| Task 1: Create Data Models (7 subtasks) | ✅ | ✅ | All dataclasses in `cost_data_service.py:73-124`, `monte_carlo.py:34-121` |
| Task 2: Implement Cost Data Service Functions (6 subtasks) | ✅ | ✅ | `cost_data_service.py:1219-1442` |
| Task 3: Implement Monte Carlo Service (9 subtasks) | ✅ | ✅ | `monte_carlo.py:129-347` |
| Task 4: Add Structured Logging (3 subtasks) | ✅ | ✅ | Both files use `structlog.get_logger()` |
| Task 5: Write Unit Tests (11 subtasks) | ✅ | ✅ | 54 tests in `test_monte_carlo.py` (34) and `test_cost_data_service.py` (20) |
| Task 6: Create Demo Script (7 subtasks) | ✅ | ✅ | `demo_monte_carlo.py` generates console output + HTML histogram |

**Summary: 38 of 38 completed tasks verified, 0 questionable, 0 falsely marked complete**

### Test Coverage and Gaps

**Tests Present:**
- `test_monte_carlo.py`: 34 tests covering all Monte Carlo ACs
- `test_cost_data_service.py`: 20 tests covering material cost and labor rate functions

**Test Quality:**
- AC-aligned test naming
- Edge cases covered (empty input, zero variance, single item)
- Performance tests included
- Async tests properly decorated

**Gaps:**
- Integration tests with Firestore emulator (recommended for future)

### Architectural Alignment

| Requirement | Status | Evidence |
|-------------|--------|----------|
| ADR-007: NumPy for Monte Carlo | ✅ | `monte_carlo.py:22` |
| RSMeans schema for MaterialCost | ✅ | `cost_data_service.py:91-124` |
| Firestore path `/costData/materials/{itemCode}` | ✅ | `cost_data_service.py:1269` |
| Structured logging with structlog | ✅ | Both files |
| Dataclass patterns from Story 4.1 | ✅ | Consistent usage |

### Security Notes
No security issues identified. Read-only data operations, no user input handling, math operations use safe NumPy functions.

### Best-Practices and References
- NumPy Monte Carlo best practices followed
- Python async/await patterns correctly applied
- Triangular distribution appropriate for cost estimation uncertainty

### Action Items

**Code Changes Required:**
(None - all requirements met)

**Advisory Notes:**
- Note: Consider adding integration tests with Firestore emulator for Story 4.4 or production readiness
- Note: Cache thread safety consideration from Story 4.1 review applies when moving to production
