# Story 4.4: Cost Data Seeding & Maintenance

Status: done

## Story

As a **developer (setting up the system)**,
I want **to seed Firestore with comprehensive mock cost data**,
so that **the estimation pipeline has realistic material costs, labor rates, and location data to work with during development and demo**.

## Acceptance Criteria

| AC# | Criterion | Verification |
|-----|-----------|--------------|
| 4.4.1 | Firestore `/costData/materials/` has 100+ documents | Count query |
| 4.4.2 | All MVP-scope CSI divisions have material data (03, 04, 05, 06, 07, 08, 09, 10, 22, 23, 26, 31, 32) | Query by division |
| 4.4.3 | Labor rates exist for all 8 trades across regions | Query count |
| 4.4.4 | Location factors exist for 50+ zip codes | Query count |
| 4.4.5 | Major metros covered (NYC, LA, Chicago, Houston, Phoenix, Denver, Atlanta, Seattle) | Specific document checks |
| 4.4.6 | Kitchen remodel BoQ can be fully costed from seeded data (100% coverage) | Integration test |
| 4.4.7 | Bathroom remodel BoQ can be fully costed from seeded data (100% coverage) | Integration test |
| 4.4.8 | Each material has RSMeans schema: unitCost, laborHours, crew, productivity, costLow/Likely/High | Schema validation |

## Tasks / Subtasks

- [x] **Task 1: Create Material Data** (AC: 4.4.1, 4.4.2, 4.4.8)
  - [x] 1.1 Create `functions/data/materials.json` with 100+ items
  - [x] 1.2 Include Division 03 - Concrete (footings, slabs, foundations)
  - [x] 1.3 Include Division 04 - Masonry (brick, block, stone)
  - [x] 1.4 Include Division 05 - Metals (structural steel, railings)
  - [x] 1.5 Include Division 06 - Wood & Plastics (framing, millwork, cabinets)
  - [x] 1.6 Include Division 07 - Thermal/Moisture (insulation, roofing, siding)
  - [x] 1.7 Include Division 08 - Doors & Windows
  - [x] 1.8 Include Division 09 - Finishes (drywall, flooring, paint, tile)
  - [x] 1.9 Include Division 10 - Specialties (fixtures, accessories)
  - [x] 1.10 Include Division 22 - Plumbing (fixtures, piping)
  - [x] 1.11 Include Division 23 - HVAC (equipment, ductwork)
  - [x] 1.12 Include Division 26 - Electrical (wiring, panels, fixtures)
  - [x] 1.13 Include Division 31 - Earthwork (excavation, grading)
  - [x] 1.14 Include Division 32 - Exterior (landscaping, paving)
  - [x] 1.15 Ensure each item has costLow, costLikely, costHigh for Monte Carlo

- [x] **Task 2: Create Labor Rate Data** (AC: 4.4.3)
  - [x] 2.1 Create `functions/data/labor_rates.json`
  - [x] 2.2 Include rates for all 8 trades: electrician, plumber, carpenter, hvac_tech, roofer, painter, tile_setter, general_labor
  - [x] 2.3 Include regional variations: northeast, midwest, south, west
  - [x] 2.4 Include benefits burden calculation (35% typical)

- [x] **Task 3: Create Location Data** (AC: 4.4.4, 4.4.5)
  - [x] 3.1 Create `functions/data/location_factors.json`
  - [x] 3.2 Include 50+ zip codes covering major metros
  - [x] 3.3 Include NYC (10001), LA (90001), Chicago (60601), Houston (77001)
  - [x] 3.4 Include Phoenix (85001), Denver (80202), Seattle (98101), Atlanta (30301)
  - [x] 3.5 Include suburban and rural examples for each region
  - [x] 3.6 Include union status, permit costs, weather factors for each

- [x] **Task 4: Create Sample BoQ Data** (AC: 4.4.6, 4.4.7)
  - [x] 4.1 Create `functions/data/sample_boq_kitchen.json` with ~50 line items
  - [x] 4.2 Create `functions/data/sample_boq_bathroom.json` with ~30 line items
  - [x] 4.3 Ensure all item codes reference existing materials

- [x] **Task 5: Implement Seeding Script** (AC: all)
  - [x] 5.1 Create `functions/scripts/seed_cost_data.py`
  - [x] 5.2 Load JSON data files
  - [x] 5.3 Write to Firestore `/costData/materials/{itemCode}`
  - [x] 5.4 Write to Firestore `/costData/laborRates/{rateId}`
  - [x] 5.5 Write to Firestore `/costData/locationFactors/{zipCode}`
  - [x] 5.6 Add `--dry-run` flag to preview without writing
  - [x] 5.7 Add `--verify` flag to check existing data
  - [x] 5.8 Add progress reporting during seeding

- [x] **Task 6: Create Verification Script** (AC: all)
  - [x] 6.1 Create `functions/scripts/verify_cost_data.py`
  - [x] 6.2 Count materials by CSI division
  - [x] 6.3 Count locations by region
  - [x] 6.4 Verify schema completeness for random samples
  - [x] 6.5 Test kitchen BoQ coverage (% of items found)
  - [x] 6.6 Test bathroom BoQ coverage (% of items found)
  - [x] 6.7 Print detailed coverage report

- [x] **Task 7: Write Unit Tests** (AC: 4.4.1, 4.4.2, 4.4.3, 4.4.4, 4.4.5, 4.4.8)
  - [x] 7.1 Create `functions/tests/unit/test_cost_data_schema.py`
  - [x] 7.2 Test: Materials count >= 100 (AC: 4.4.1)
  - [x] 7.3 Test: All 13 CSI divisions have data (AC: 4.4.2)
  - [x] 7.4 Test: Labor rates exist for all 8 trades x 4 regions (AC: 4.4.3)
  - [x] 7.5 Test: Location factors count >= 50 (AC: 4.4.4)
  - [x] 7.6 Test: All 8 major metros have documents (AC: 4.4.5)
  - [x] 7.7 Test: Material schema has all required fields (AC: 4.4.8)

- [x] **Task 8: Write Integration Tests** (AC: 4.4.6, 4.4.7)
  - [x] 8.1 Create `functions/tests/integration/test_cost_data_coverage.py`
  - [x] 8.2 Test: Kitchen BoQ 100% coverage (AC: 4.4.6)
  - [x] 8.3 Test: Bathroom BoQ 100% coverage (AC: 4.4.7)

## User Verification

After completing this story, run these commands to verify it works:

| Command | What You See |
|---------|--------------|
| `cd functions && python3 scripts/seed_cost_data.py --dry-run` | Preview of data to be seeded, no writes |
| `cd functions && python3 scripts/seed_cost_data.py` | Seeds Firestore, shows progress bar |
| `cd functions && python3 scripts/verify_cost_data.py` | Coverage report showing 100+ materials, 50+ locations |
| `cd functions && python3 -m pytest tests/unit/test_cost_data_schema.py -v` | Schema and count validation tests pass |
| `cd functions && python3 -m pytest tests/integration/test_cost_data_coverage.py -v` | BoQ coverage tests pass |

**Expected Console Output (seed_cost_data.py):**
```
============================================================
  Cost Data Seeding - TrueCost Estimation Database
============================================================

  Loading data files...
    [x] materials.json: 127 items
    [x] labor_rates.json: 32 rates (8 trades x 4 regions)
    [x] location_factors.json: 58 zip codes

  Seeding Firestore collections...

  Materials: [========================================] 127/127
  Labor Rates: [========================================] 32/32
  Locations: [========================================] 58/58

  Seeding Complete!
  -----------------
  Materials:  127 documents in /costData/materials/
  Labor:      32 documents in /costData/laborRates/
  Locations:  58 documents in /costData/locationFactors/

  Total: 217 documents written
  Time: 12.4 seconds
============================================================
```

**Expected Console Output (verify_cost_data.py):**
```
============================================================
  Cost Data Verification Report
============================================================

  Materials by CSI Division:
  --------------------------
    Division 03 (Concrete):     8 items
    Division 04 (Masonry):      6 items
    Division 05 (Metals):       5 items
    Division 06 (Wood/Plastic): 22 items
    Division 07 (Thermal):      12 items
    Division 08 (Doors/Win):    9 items
    Division 09 (Finishes):     28 items
    Division 10 (Specialties):  7 items
    Division 22 (Plumbing):     11 items
    Division 23 (HVAC):         8 items
    Division 26 (Electrical):   9 items
    Division 31 (Earthwork):    2 items
    --------------------------
    Total: 127 materials

  Locations by Region:
  --------------------
    Northeast: 14 zip codes
    Midwest:   12 zip codes
    South:     18 zip codes
    West:      14 zip codes
    --------------------
    Total: 58 locations

  Major Metros Covered:
    [x] NYC (10001)
    [x] LA (90001)
    [x] Chicago (60601)
    [x] Houston (77001)
    [x] Phoenix (85001)
    [x] Denver (80202)
    [x] Seattle (98101)
    [x] Atlanta (30301)

  BoQ Coverage Tests:
  -------------------
    Kitchen Remodel (50 items):  100% (50/50 found)
    Bathroom Remodel (30 items): 100% (30/30 found)

  Schema Validation:
    Materials with complete RSMeans schema: 127/127 (100%)

  VERIFICATION PASSED
============================================================
```

## Dev Notes

### Architecture Alignment

This story populates the **Firestore cost data collections** that are used by Stories 4.1 and 4.2. It should be completed before or in parallel with those stories.

**Ownership (Dev 4 Exclusive):**
- `functions/data/*.json` - Source data files
- `functions/scripts/seed_cost_data.py`
- `functions/scripts/verify_cost_data.py`
- Firestore `/costData/**` collections

### Firestore Collection Schema

```
firestore/
├── costData/
│   ├── materials/{itemCode}
│   │   └── {
│   │         description: string,
│   │         unit: string,
│   │         unitCost: number,
│   │         laborHours: number,
│   │         crew: string,
│   │         crewDailyOutput: number,
│   │         productivityFactor: number,
│   │         costLow: number,
│   │         costLikely: number,
│   │         costHigh: number,
│   │         csiDivision: string,
│   │         subdivision: string
│   │       }
│   │
│   ├── laborRates/{rateId}
│   │   └── {
│   │         trade: string,
│   │         region: string,
│   │         baseRate: number,
│   │         benefitsBurden: number,
│   │         totalRate: number
│   │       }
│   │
│   └── locationFactors/{zipCode}
│       └── {
│             regionCode: string,
│             city: string,
│             state: string,
│             laborRates: { trade: rate },
│             isUnion: boolean,
│             unionPremium: number,
│             permitCosts: { base, min, max, inspection },
│             weatherFactors: { winter, summer, rainy, outdoor }
│           }
```

### CSI Division Coverage (MVP Scope)

| Division | Name | Example Items |
|----------|------|---------------|
| 03 | Concrete | Footings, slabs, foundations |
| 04 | Masonry | Brick veneer, CMU walls |
| 05 | Metals | Structural steel, railings |
| 06 | Wood & Plastics | Framing lumber, cabinets, millwork |
| 07 | Thermal/Moisture | Insulation, roofing, siding |
| 08 | Doors & Windows | Entry doors, windows, hardware |
| 09 | Finishes | Drywall, flooring, paint, tile |
| 10 | Specialties | Bathroom accessories, mailboxes |
| 22 | Plumbing | Fixtures, piping, water heaters |
| 23 | HVAC | Furnaces, AC units, ductwork |
| 26 | Electrical | Wiring, panels, outlets, fixtures |
| 31 | Earthwork | Excavation, grading |
| 32 | Exterior | Landscaping, paving |

### Sample Kitchen Remodel BoQ Items

Key items to include for 100% coverage:
- Cabinets (base, wall, island)
- Countertops (granite, quartz, laminate)
- Appliances (range, refrigerator, dishwasher)
- Flooring (tile, hardwood, LVP)
- Electrical (outlets, lighting, panel upgrade)
- Plumbing (sink, faucet, disposal)
- Drywall and paint
- Backsplash tile
- Demo and disposal

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| firebase-admin | 6.x | Firestore writes |
| tqdm | 4.x | Progress bars (optional) |

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Story-4.4] - Authoritative ACs and data model contracts
- [Source: docs/epics.md#Epic-4] - Epic-level context and story sequencing
- [Source: docs/architecture.md#ADR-005] - Firestore for cost data storage decision
- [RSMeans Data Structure](https://www.rsmeans.com/) - Industry standard schema reference
- [CSI MasterFormat Divisions](https://www.csiresources.org/standards/masterformat) - Division code standards

## Dev Agent Record

### Context Reference

- **Context File:** `docs/sprint-artifacts/4-4-cost-data-seeding.context.xml`
- **Generated:** 2025-12-10
- **Key Code References:**
  - `functions/services/cost_data_service.py` (MaterialCost, LocationFactors, LaborRate schemas)
  - `functions/tests/unit/test_cost_data_service.py` (test patterns)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Implemented all 8 tasks sequentially with continuous verification
- All acceptance criteria validated through unit and integration tests
- Verification script confirms data completeness and schema compliance

### Completion Notes List

- Created 130 materials across 15 CSI divisions (13 required + 02 Demolition + 11 Equipment)
- Created 32 labor rates (8 trades x 4 regions) with 35% benefits burden
- Created 53 location factors covering all 8 required major metros
- Sample BoQ files achieve 100% coverage for kitchen (50 items) and bathroom (30 items)
- 23 unit tests and 14 integration tests all passing (37 new tests total)
- Scripts support --dry-run and --verify flags for safe operation

### File List

**New Files Created:**
- `functions/data/materials.json` - 130 material items with RSMeans schema
- `functions/data/labor_rates.json` - 32 labor rates (8 trades x 4 regions)
- `functions/data/location_factors.json` - 53 location entries
- `functions/data/sample_boq_kitchen.json` - 50 line item kitchen remodel BoQ
- `functions/data/sample_boq_bathroom.json` - 30 line item bathroom remodel BoQ
- `functions/scripts/seed_cost_data.py` - Firestore seeding script
- `functions/scripts/verify_cost_data.py` - Data verification script
- `functions/tests/unit/test_cost_data_schema.py` - 23 unit tests
- `functions/tests/integration/test_cost_data_coverage.py` - 14 integration tests

## Code Review

### Review Date
2025-12-10

### Reviewer
Senior Dev Agent (Claude Opus 4.5)

### Review Outcome
**PASS**

### AC Validation Summary

| AC# | Criterion | Status | Evidence |
|-----|-----------|--------|----------|
| 4.4.1 | Materials >= 100 | PASS | 130 materials in materials.json |
| 4.4.2 | All MVP CSI divisions covered | PASS | All 13 required divisions + 02, 11 bonus |
| 4.4.3 | Labor rates for 8 trades x 4 regions | PASS | 32 rates verified |
| 4.4.4 | Location factors >= 50 zip codes | PASS | 53 locations verified |
| 4.4.5 | Major metros covered | PASS | All 8 metros have documents |
| 4.4.6 | Kitchen BoQ 100% coverage | PASS | 50/50 items found |
| 4.4.7 | Bathroom BoQ 100% coverage | PASS | 30/30 items found |
| 4.4.8 | RSMeans schema complete | PASS | 130/130 schema compliant |

### Test Results
- **Unit tests**: 23/23 passing
- **Integration tests**: 14/14 passing
- **Total**: 37/37 passing (100%)

### Code Quality Assessment

**Strengths:**
- Comprehensive test coverage for all acceptance criteria
- Clear documentation with proper docstrings and usage examples
- Graceful degradation (tqdm fallback)
- Safe defaults with `--dry-run` flag
- RSMeans schema compliance with valid Monte Carlo ranges
- Well-organized JSON data with consistent field naming

**Minor Observations (non-blocking):**
- Story documentation mentions 127 materials but actual count is 130 (exceeds requirement)
- Includes bonus CSI divisions 02 (Demolition) and 11 (Equipment) beyond MVP scope

### Risk Assessment
- **Security**: No vulnerabilities identified
- **Performance**: Data seeding uses batch-friendly patterns
- **Maintainability**: Code is well-structured and documented
- **Technical Debt**: None identified

### Action Items
None - story is approved for merge.

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-12-10 | PM Agent (John) | Initial story creation with user verification tasks |
| 2025-12-10 | SM Agent (Bob) | Added unit test task (Task 7), split integration tests to Task 8, added epics.md and architecture.md citations |
| 2025-12-10 | BMAD Story Context | Generated context file with 6 code refs, 8 interfaces, 9 constraints, 8 test ideas |
| 2025-12-10 | Dev Agent (Claude Opus 4.5) | Implemented all 8 tasks, created 9 new files, 37 tests passing, all ACs satisfied |
| 2025-12-10 | Senior Dev Agent (Claude Opus 4.5) | Code review PASSED - all ACs validated, 37/37 tests passing |
