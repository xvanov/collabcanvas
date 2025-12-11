# Epic Technical Specification: Data Services & PDF Output

Date: 2025-12-10
Author: xvanov
Epic ID: 4
Status: Draft

---

## Overview

Epic 4 delivers the foundational **data services layer** and **PDF report generation** capabilities for TrueCost. This epic provides the backend services that power the estimation pipeline:

1. **Location Intelligence Service** - Retrieves zip-code-specific labor rates, permit costs, union/non-union market status, and weather/seasonal factors
2. **Cost Data Service with Monte Carlo Simulation** - Provides RSMeans-schema compatible cost data and runs probabilistic risk simulations to calculate confidence intervals (P50/P80/P90)
3. **PDF Report Generation** - Produces professional, client-ready estimate reports using WeasyPrint and Jinja2 templates
4. **Cost Data Seeding** - Populates Firestore with comprehensive mock data covering all residential project types

These services are **independent** and can be developed in parallel with the agent pipeline (Epic 2) and UI (Epic 1). They expose well-defined interfaces that agents call during estimate processing.

## Objectives and Scope

### In-Scope

- **FR37-40**: Location Intelligence Service
  - Zip-code based labor rate lookup for all trades (electrician, plumber, carpenter, HVAC tech, roofer, painter, tile setter, general labor)
  - Union vs. non-union market determination
  - Permit cost estimation (percentage of project value or fixed amounts)
  - Weather/seasonal factor retrieval

- **FR48-51**: Risk Analysis (Monte Carlo)
  - Run 1000+ iteration Monte Carlo simulation with triangular distributions
  - Calculate P50, P80, P90 confidence intervals
  - Recommend contingency percentage based on P80-P50 spread
  - Identify top 5 risk factors driving cost uncertainty

- **FR59-61, FR63-64, FR75**: PDF Report Generation
  - Professional PDF estimate report with all sections
  - Annotated CAD plan inclusion
  - Customizable section selection
  - Client-ready simplified output option
  - Firebase Storage persistence

- **FR42-46 (Data Foundation)**: Cost Data Seeding
  - RSMeans-schema mock data for materials and labor
  - Coverage for all MVP-scope CSI divisions
  - 50+ major US metro location factors

### Out-of-Scope

- Live RSMeans API integration (post-MVP)
- Real-time material pricing from Home Depot/Lowe's (Epic 5 handles price comparison)
- Agent orchestration logic (Epic 2)
- Frontend UI components (Epic 1)
- CAD parsing and Clarification Agent (Epic 3)

## System Architecture Alignment

This epic implements the **Data/PDF Services** layer from the TrueCost architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│              PYTHON CLOUD FUNCTIONS (2nd Gen)                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 Deep Agents Pipeline                    │    │
│  │  Clarification → CAD → Location → Scope → Cost → Risk → Final │
│  └─────────────────────────────────────────────────────────┘    │
│         │              │              │              │          │
│         ▼              ▼              ▼              ▼          │
│    ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐    │
│    │ OpenAI  │   │ Firestore│   │ Firebase │   │ WeasyPrint│   │
│    │ GPT-4.1 │   │  Writes  │   │ Storage  │   │   PDF    │    │
│    └─────────┘   └──────────┘   └──────────┘   └──────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │
              ┌───────────────┴───────────────┐
              │     Epic 4: Data Services     │
              │  ┌─────────────────────────┐  │
              │  │ cost_data_service.py    │  │
              │  │ monte_carlo.py          │  │
              │  │ pdf_generator.py        │  │
              │  │ /costData/** (Firestore)│  │
              │  └─────────────────────────┘  │
              └───────────────────────────────┘
```

**Architecture Decisions Affecting Epic 4:**
- **ADR-005**: Firestore for cost data storage (auto-scaling, Firebase-native)
- **ADR-006**: WeasyPrint + Jinja2 for PDF generation (CSS-based styling, Python native)
- **ADR-007**: NumPy for Monte Carlo (standard library, efficient)

**Exclusive Files (Dev 4 Ownership):**
- `functions/services/cost_data_service.py`
- `functions/services/monte_carlo.py`
- `functions/services/pdf_generator.py`
- `functions/templates/**`
- Firestore `/costData/**` collections

## Detailed Design

### Services and Modules

| Service | File | Responsibility | Called By |
|---------|------|----------------|-----------|
| Location Intelligence | `cost_data_service.py` | Zip-code lookups, labor rates, permit costs, weather factors | Location Agent (Epic 2) |
| Cost Data | `cost_data_service.py` | Material costs, labor rates by trade, productivity factors | Cost Agent (Epic 2) |
| Monte Carlo | `monte_carlo.py` | Probabilistic simulation, percentile calculation, risk ranking | Risk Agent (Epic 2) |
| PDF Generator | `pdf_generator.py` | HTML rendering, PDF conversion, Storage upload | Final Agent (Epic 2), Frontend API |

### Data Models and Contracts

#### LocationFactors (Response from `get_location_factors`)

```python
@dataclass
class LocationFactors:
    zip_code: str
    region_code: str  # "west", "midwest", "south", "northeast"
    city: str
    state: str

    labor_rates: Dict[str, float]  # {trade: hourly_rate}
    # Keys: electrician, plumber, carpenter, hvac_tech, roofer,
    #       painter, tile_setter, general_labor

    is_union: bool
    union_premium: float  # Multiplier if union (e.g., 1.25)

    permit_costs: PermitCosts
    weather_factors: WeatherFactors

    is_default: bool  # True if using regional fallback
    data_source: str  # "firestore" | "cache" | "default"

@dataclass
class PermitCosts:
    base_percentage: float  # e.g., 0.02 for 2% of project value
    minimum: float  # Minimum permit fee
    maximum: Optional[float]  # Cap if exists
    inspection_fee: float

@dataclass
class WeatherFactors:
    winter_slowdown: float  # e.g., 1.15 for 15% productivity loss
    summer_premium: float  # e.g., 1.0 for no premium
    rainy_season_months: List[int]
    outdoor_work_adjustment: float
```

#### MaterialCost (Response from `get_material_cost`)

```python
@dataclass
class MaterialCost:
    item_code: str  # RSMeans-style code, e.g., "092900"
    description: str
    unit: str  # "sf", "lf", "each", etc.

    unit_cost: float  # Material cost per unit
    labor_hours: float  # Labor hours per unit

    crew: str  # e.g., "2 Carpenters + 1 Laborer"
    crew_daily_output: float  # Units per day
    productivity_factor: float  # Multiplier for efficiency

    # Cost ranges for Monte Carlo
    cost_low: float  # Optimistic
    cost_likely: float  # Most likely (same as unit_cost)
    cost_high: float  # Pessimistic

    csi_division: str  # "09" for Finishes
    subdivision: str  # "09 29 00" for Gypsum Board

@dataclass
class LaborRate:
    trade: str
    base_rate: float  # Base hourly rate
    benefits_burden: float  # Burden percentage (e.g., 0.35)
    total_rate: float  # base_rate * (1 + benefits_burden)
```

#### MonteCarloResult (Response from `run_simulation`)

```python
@dataclass
class MonteCarloResult:
    iterations: int  # Number of iterations run (1000+)

    # Percentiles
    p50: float  # 50th percentile (median)
    p80: float  # 80th percentile
    p90: float  # 90th percentile

    # Statistics
    mean: float
    std_dev: float
    min_value: float
    max_value: float

    # Recommendations
    recommended_contingency: float  # Percentage based on P80-P50 spread

    # Risk analysis
    top_risks: List[RiskFactor]  # Top 5 items contributing to variance

    # Distribution data for charting
    histogram: List[HistogramBin]

@dataclass
class RiskFactor:
    item: str  # Line item description
    impact: float  # Dollar impact on variance
    probability: float  # Likelihood of high-cost scenario
    sensitivity: float  # Correlation with total cost variance

@dataclass
class HistogramBin:
    range_low: float
    range_high: float
    count: int
    percentage: float
```

#### PDFGenerationRequest

```python
@dataclass
class PDFGenerationRequest:
    estimate_id: str
    sections: Optional[List[str]] = None  # None = all sections
    # Options: "executive_summary", "cost_breakdown", "boq",
    #          "labor_analysis", "schedule", "risk_analysis",
    #          "assumptions", "cad_plan"
    client_ready: bool = False  # Simplified version without internal notes
    include_cad_annotation: bool = True

@dataclass
class PDFGenerationResult:
    pdf_url: str  # Firebase Storage download URL
    storage_path: str  # gs://bucket/pdfs/{estimateId}/estimate.pdf
    page_count: int
    file_size_bytes: int
    generated_at: str  # ISO timestamp
```

### APIs and Interfaces

#### Location Intelligence Service

```python
# functions/services/cost_data_service.py

async def get_location_factors(zip_code: str) -> LocationFactors:
    """
    Retrieve location-specific cost factors for a zip code.

    Args:
        zip_code: 5-digit US zip code

    Returns:
        LocationFactors with labor rates, union status, permits, weather

    Raises:
        ValueError: If zip_code format is invalid

    Notes:
        - Falls back to regional defaults if specific zip not found
        - Results are cached for 24 hours
        - Sets is_default=True when using fallback data
    """
    pass
```

#### Cost Data Service

```python
# functions/services/cost_data_service.py

async def get_material_cost(item_code: str) -> MaterialCost:
    """
    Retrieve cost data for a material item.

    Args:
        item_code: RSMeans-style item code (e.g., "092900" for drywall)

    Returns:
        MaterialCost with unit costs, labor hours, crew info

    Raises:
        ItemNotFoundError: If item_code not in database
    """
    pass

async def get_labor_rate(trade: str, zip_code: str) -> LaborRate:
    """
    Get labor rate for a specific trade at a location.

    Args:
        trade: Trade name (electrician, plumber, etc.)
        zip_code: Location for rate lookup

    Returns:
        LaborRate with base rate and burden
    """
    pass

async def search_materials(
    query: str,
    csi_division: Optional[str] = None,
    limit: int = 20
) -> List[MaterialCost]:
    """
    Search materials database by description or code.

    Args:
        query: Search term
        csi_division: Optional filter by CSI division code
        limit: Max results to return

    Returns:
        List of matching MaterialCost items
    """
    pass
```

#### Monte Carlo Service

```python
# functions/services/monte_carlo.py

def run_simulation(
    line_items: List[LineItemInput],
    iterations: int = 1000,
    confidence_levels: List[int] = [50, 80, 90]
) -> MonteCarloResult:
    """
    Run Monte Carlo simulation on cost estimate.

    Args:
        line_items: List of items with low/likely/high cost ranges
        iterations: Number of simulation iterations (min 1000)
        confidence_levels: Percentiles to calculate

    Returns:
        MonteCarloResult with percentiles, contingency, and risk factors

    Implementation:
        Uses numpy.random.triangular for each item's distribution
        Aggregates totals across iterations
        Calculates percentiles using numpy.percentile
        Identifies top variance contributors via sensitivity analysis
    """
    pass

@dataclass
class LineItemInput:
    id: str
    description: str
    quantity: float
    unit_cost_low: float
    unit_cost_likely: float
    unit_cost_high: float
```

#### PDF Generator Service

```python
# functions/services/pdf_generator.py

async def generate_pdf(
    estimate_id: str,
    sections: Optional[List[str]] = None,
    client_ready: bool = False
) -> PDFGenerationResult:
    """
    Generate professional PDF estimate report.

    Args:
        estimate_id: Firestore estimate document ID
        sections: Optional list of sections to include (None = all)
        client_ready: If True, generate simplified client version

    Returns:
        PDFGenerationResult with Storage URL and metadata

    Implementation:
        1. Load estimate data from Firestore
        2. Render Jinja2 template with data
        3. Convert HTML to PDF using WeasyPrint
        4. Upload to Firebase Storage
        5. Return download URL
    """
    pass
```

### Workflows and Sequencing

#### Location Intelligence Flow

```
Location Agent calls get_location_factors(zip_code)
                        │
                        ▼
             ┌─────────────────────┐
             │  Check Firestore    │
             │  /costData/         │
             │  locationFactors/   │
             │  {zipCode}          │
             └──────────┬──────────┘
                        │
         ┌──────────────┴──────────────┐
         │ Found                       │ Not Found
         ▼                             ▼
  ┌─────────────────┐        ┌─────────────────┐
  │ Return cached   │        │ Lookup region   │
  │ LocationFactors │        │ from zip prefix │
  └─────────────────┘        └────────┬────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │ Return regional │
                            │ defaults with   │
                            │ is_default=True │
                            └─────────────────┘
```

#### Monte Carlo Simulation Flow

```
Risk Agent calls run_simulation(line_items, 1000)
                        │
                        ▼
             ┌─────────────────────┐
             │  For each iteration │
             │  (1000x):           │
             │                     │
             │  total = Σ          │
             │    triangular(      │
             │      low, likely,   │
             │      high) × qty    │
             └──────────┬──────────┘
                        │
                        ▼
             ┌─────────────────────┐
             │  Calculate:         │
             │  - np.percentile    │
             │    for P50/P80/P90  │
             │  - Sensitivity via  │
             │    correlation      │
             │  - Contingency from │
             │    (P80-P50)/P50    │
             └──────────┬──────────┘
                        │
                        ▼
             ┌─────────────────────┐
             │  Return             │
             │  MonteCarloResult   │
             └─────────────────────┘
```

#### PDF Generation Flow

```
get_estimate_pdf(estimate_id, sections)
                        │
                        ▼
             ┌─────────────────────┐
             │  Load from          │
             │  Firestore:         │
             │  - finalEstimate    │
             │  - costEstimate     │
             │  - riskAnalysis     │
             │  - billOfQuantities │
             │  - cadData          │
             └──────────┬──────────┘
                        │
                        ▼
             ┌─────────────────────┐
             │  Render Jinja2      │
             │  template with      │
             │  estimate data      │
             │  (estimate_report.  │
             │   html)             │
             └──────────┬──────────┘
                        │
                        ▼
             ┌─────────────────────┐
             │  WeasyPrint         │
             │  HTML → PDF         │
             │  with styles.css    │
             └──────────┬──────────┘
                        │
                        ▼
             ┌─────────────────────┐
             │  Upload to          │
             │  Firebase Storage   │
             │  /pdfs/{id}/        │
             │  estimate.pdf       │
             └──────────┬──────────┘
                        │
                        ▼
             ┌─────────────────────┐
             │  Return PDF URL     │
             └─────────────────────┘
```

## Non-Functional Requirements

### Performance

| Metric | Target | Implementation |
|--------|--------|----------------|
| Location lookup | < 500ms | Firestore indexing, in-memory cache for hot data |
| Material cost lookup | < 200ms | Firestore single-doc read |
| Monte Carlo (1000 iter) | < 2 seconds | NumPy vectorized operations |
| PDF generation | < 10 seconds | WeasyPrint with pre-compiled CSS |
| PDF file size | < 5MB typical | Optimized images, compressed CSS |

**Monte Carlo Performance Details:**
- NumPy's `triangular` distribution is highly optimized
- 1000 iterations × 100 line items = 100,000 samples
- Vectorized sum across iterations: O(n×m) where n=items, m=iterations
- Percentile calculation: O(m log m) for sorting

### Security

- **Cost Data Access**: Read-only public access for materials/rates; no sensitive data
- **Firestore Rules**: `/costData/**` allows read by any authenticated user
- **PDF Storage**: Private bucket, signed URLs with expiration (1 hour default)
- **No PII**: Cost data contains no personally identifiable information
- **API Keys**: OpenAI key for PDF annotation (if CAD vision used) stored in Cloud Functions env vars

```javascript
// firestore.rules for /costData
match /costData/{document=**} {
  allow read: if request.auth != null;  // Any authenticated user
  allow write: if false;  // Admin only via Firebase Console/scripts
}
```

### Reliability/Availability

| Metric | Target | Approach |
|--------|--------|----------|
| Service availability | 99.5% | Firebase SLA, stateless functions |
| Data durability | 99.999% | Firestore replication |
| Graceful degradation | Yes | Regional defaults for unknown zips |
| Error recovery | Retry once | Exponential backoff, user notification |

**Fallback Strategy:**
- Unknown zip code → Use regional average based on state/prefix
- Cost item not found → Return error with suggested alternatives
- PDF generation failure → Return partial PDF or error with retry option
- Monte Carlo timeout → Return deterministic estimate (no confidence range)

### Observability

**Logging (using structlog):**
```python
logger.info("location_lookup", zip_code=zip, data_source="firestore", latency_ms=45)
logger.info("monte_carlo_complete", iterations=1000, p50=85000, p90=95000, duration_ms=1200)
logger.info("pdf_generated", estimate_id=id, page_count=12, file_size_kb=850, duration_ms=8500)
logger.error("material_not_found", item_code="999999", error="ItemNotFoundError")
```

**Metrics to Track:**
- Location lookup cache hit/miss ratio
- Monte Carlo simulation duration distribution
- PDF generation success/failure rate
- Cost data coverage (% of BoQ items found in database)

**Cloud Logging Integration:**
- All logs written to Cloud Logging via structlog
- Alerts configured for:
  - PDF generation failure rate > 5%
  - Monte Carlo duration > 5 seconds
  - Location lookup fallback rate > 20%

## Dependencies and Integrations

### Python Dependencies (requirements.txt)

| Package | Version | Purpose |
|---------|---------|---------|
| firebase-admin | 6.x | Firestore, Storage access |
| firebase-functions | 0.4.x | Cloud Functions framework |
| numpy | 1.26.x | Monte Carlo simulation, statistics |
| weasyprint | 60.x | HTML to PDF conversion |
| jinja2 | 3.1.x | PDF template rendering |
| structlog | 23.x | Structured logging |

### External Service Integrations

| Service | Usage | Credentials |
|---------|-------|-------------|
| Firestore | Cost data storage, estimate persistence | Firebase Admin SDK (auto) |
| Firebase Storage | PDF file storage | Firebase Admin SDK (auto) |
| Cloud Logging | Operational logs | Automatic via Cloud Functions |

### Internal Dependencies

| Dependency | Provider | Interface |
|------------|----------|-----------|
| Estimate data | Epic 2 (Firestore) | `/estimates/{id}` document |
| CAD images | Epic 3 (Storage) | `gs://bucket/cad/{id}/` |
| Agent outputs | Epic 2 | `/estimates/{id}/agentOutputs/` |

### Firestore Collections (Seeded by Story 4.4)

```
firestore/
├── costData/
│   ├── materials/{itemCode}
│   │   └── { description, unit, unitCost, laborHours, crew,
│   │         costLow, costLikely, costHigh, csiDivision, subdivision }
│   │
│   ├── laborRates/{rateId}
│   │   └── { trade, region, baseRate, benefitsBurden, totalRate }
│   │
│   └── locationFactors/{zipCode}
│       └── { regionCode, city, state, laborRates: {}, isUnion,
│             permitCosts: {}, weatherFactors: {} }
```

## Acceptance Criteria (Authoritative)

### Story 4.1: Location Intelligence Service

| AC# | Criterion | Verification |
|-----|-----------|--------------|
| 4.1.1 | Given a valid zip code, service returns labor rates for all 8 trades | Unit test with mock data |
| 4.1.2 | Given a valid zip code, service returns union/non-union status | Unit test with Chicago (union) vs Houston (non-union) |
| 4.1.3 | Given a valid zip code, service returns permit cost estimates | Unit test verifying percentage and minimums |
| 4.1.4 | Given a valid zip code, service returns weather/seasonal factors | Unit test with Denver (winter slowdown) |
| 4.1.5 | Given an unknown zip code, service returns regional defaults with is_default=True | Unit test with "00000" |
| 4.1.6 | Response time < 500ms for cached lookups | Performance test |
| 4.1.7 | Labor rates reflect regional cost of living (NYC > Denver > rural) | Data validation test |

### Story 4.2: Cost Data & Monte Carlo Simulation

| AC# | Criterion | Verification |
|-----|-----------|--------------|
| 4.2.1 | `get_material_cost` returns unit cost, labor hours, crew for valid item codes | Unit test |
| 4.2.2 | Monte Carlo runs 1000+ iterations using triangular distributions | Unit test verifying iteration count |
| 4.2.3 | Simulation calculates P50, P80, P90 percentiles correctly (P50 < P80 < P90) | Unit test with known distribution |
| 4.2.4 | Recommended contingency derived from P80-P50 spread | Formula validation test |
| 4.2.5 | Top 5 risk factors identified by variance contribution | Sensitivity analysis test |
| 4.2.6 | Simulation completes in < 2 seconds for 100 line items | Performance test |
| 4.2.7 | Histogram data returned for chart visualization | Schema validation test |

### Story 4.3: PDF Report Generation

| AC# | Criterion | Verification |
|-----|-----------|--------------|
| 4.3.1 | PDF contains Executive Summary with total cost, timeline, confidence range | Visual inspection |
| 4.3.2 | PDF contains Cost Breakdown by CSI division | Visual inspection |
| 4.3.3 | PDF contains Bill of Quantities with line items | Visual inspection |
| 4.3.4 | PDF contains Labor Analysis with trades and hours | Visual inspection |
| 4.3.5 | PDF contains Schedule with task list or Gantt | Visual inspection |
| 4.3.6 | PDF contains Risk Analysis with P50/P80/P90 and top risks | Visual inspection |
| 4.3.7 | PDF contains Assumptions and Exclusions section | Visual inspection |
| 4.3.8 | CAD plan image included with annotations (if available) | Visual inspection |
| 4.3.9 | PDF generated in < 10 seconds | Performance test |
| 4.3.10 | PDF uploaded to Firebase Storage and URL returned | Integration test |
| 4.3.11 | Section filtering works (can exclude sections) | Unit test |
| 4.3.12 | Client-ready mode produces simplified output | Visual inspection |

### Story 4.4: Cost Data Seeding & Maintenance

| AC# | Criterion | Verification |
|-----|-----------|--------------|
| 4.4.1 | Firestore `/costData/materials/` has 100+ documents | Count query |
| 4.4.2 | All MVP-scope CSI divisions have material data (03, 04, 05, 06, 07, 08, 09, 10, 22, 23, 26, 31, 32) | Query by division |
| 4.4.3 | Labor rates exist for 8 trades | Query count |
| 4.4.4 | Location factors exist for 50+ zip codes | Query count |
| 4.4.5 | Major metros covered (NYC, LA, Chicago, Houston, Phoenix, Denver, Atlanta, Seattle) | Specific document checks |
| 4.4.6 | Kitchen remodel BoQ can be fully costed from seeded data | Integration test |
| 4.4.7 | Bathroom remodel BoQ can be fully costed from seeded data | Integration test |
| 4.4.8 | Each material has RSMeans schema: unitCost, laborHours, crew, productivity | Schema validation |

### Story 4.5: Real Data Integration (BLS Labor + Weather API)

| AC# | Criterion | Verification |
|-----|-----------|--------------|
| 4.5.1 | BLS API integration retrieves hourly wage data for construction occupations (SOC codes 47-xxxx) | Integration test with real API call |
| 4.5.2 | Labor rates map to all 8 required trades via SOC codes | Unit test verifying mapping |
| 4.5.3 | BLS data is fetched by metro area (MSA codes) and mapped to zip codes | Unit test with NYC MSA → 10001 |
| 4.5.4 | Weather API integration retrieves historical precipitation and temperature data | Integration test with real API |
| 4.5.5 | Weather data calculates winter_slowdown factor based on historical freeze days | Unit test Denver vs Houston |
| 4.5.6 | Weather data identifies rainy_season_months from precipitation patterns | Unit test Seattle vs Phoenix |
| 4.5.7 | Data refresh job can update Firestore `/costData/locationFactors/` from APIs | Integration test with emulator |
| 4.5.8 | API failures gracefully fall back to cached/default data | Unit test simulating timeout |
| 4.5.9 | BLS API key stored securely in Cloud Functions environment | Config validation test |

## Traceability Mapping

| AC | Spec Section | Component | Test Idea |
|----|--------------|-----------|-----------|
| 4.1.1 | APIs/Location Intelligence | `get_location_factors()` | Call with "80202", verify 8 trades in response |
| 4.1.2 | Data Models/LocationFactors | `is_union` field | Call with "60601" (Chicago) → True, "77001" (Houston) → False |
| 4.1.3 | Data Models/PermitCosts | `permit_costs` field | Verify base_percentage, minimum, inspection_fee present |
| 4.1.4 | Data Models/WeatherFactors | `weather_factors` field | Verify winter_slowdown > 1.0 for Denver |
| 4.1.5 | Workflows/Location Flow | Regional fallback logic | Call with "00000", verify is_default=True |
| 4.2.1 | APIs/Cost Data | `get_material_cost()` | Call with "092900", verify all fields |
| 4.2.2 | APIs/Monte Carlo | `run_simulation()` | Pass 100 items, verify 1000 iterations logged |
| 4.2.3 | Data Models/MonteCarloResult | P50, P80, P90 fields | Assert p50 < p80 < p90 |
| 4.2.4 | Data Models/MonteCarloResult | `recommended_contingency` | Formula: (p80-p50)/p50 × 100 |
| 4.2.5 | Data Models/RiskFactor | `top_risks` array | Verify 5 items, sorted by impact |
| 4.3.1-4.3.8 | APIs/PDF Generator | `generate_pdf()` | Generate PDF, open and visually verify sections |
| 4.3.9 | NFR/Performance | PDF generation | Time the function, assert < 10s |
| 4.3.10 | APIs/PDF Generator | Storage upload | Verify gs:// URL returned, file exists |
| 4.4.1-4.4.8 | Dependencies/Firestore | Seeding script | Run script, query collections, verify counts |

## Risks, Assumptions, Open Questions

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **R1**: WeasyPrint may have font rendering issues on Cloud Functions | Medium | Medium | Pre-test in emulator, bundle system fonts if needed |
| **R2**: Monte Carlo simulation may be CPU-intensive for large estimates | Low | Low | 1000 iterations is manageable; can reduce if needed |
| **R3**: Mock cost data may not cover all material variations | Medium | Low | Start with common items, add as gaps discovered |
| **R4**: PDF size may exceed limits with large CAD images | Medium | Medium | Compress CAD images, limit resolution to 150dpi |

### Assumptions

| Assumption | Rationale |
|------------|-----------|
| **A1**: RSMeans schema is sufficient for MVP | Can extend schema if needed |
| **A2**: 50 metro areas provide adequate location coverage | Covers 80%+ of US population |
| **A3**: 1000 Monte Carlo iterations provide statistically significant results | Industry standard practice |
| **A4**: WeasyPrint 60.x works on Cloud Functions Python 3.11 | Tested in similar environments |
| **A5**: Triangular distribution appropriate for cost uncertainty | Standard in construction estimation |

### Open Questions

| Question | Owner | Due Date | Resolution |
|----------|-------|----------|------------|
| **Q1**: Should we cache location factors in memory or rely solely on Firestore? | Dev 4 | Story 4.1 start | Decide based on latency testing |
| **Q2**: What CAD image resolution for PDF? | Dev 4 + Dev 3 | Story 4.3 start | Coordinate with CAD extraction team |
| **Q3**: Do we need separate client-ready template or just filtered sections? | Dev 4 + PM | Story 4.3 start | PM to clarify requirements |

## Test Strategy Summary

### Unit Tests

| Test Suite | Coverage | Framework |
|------------|----------|-----------|
| `test_location_service.py` | Location lookups, fallbacks, caching | pytest |
| `test_cost_data_service.py` | Material lookup, labor rates, search | pytest |
| `test_monte_carlo.py` | Simulation, percentiles, sensitivity | pytest + numpy.testing |
| `test_pdf_generator.py` | Template rendering, section filtering | pytest |

### Integration Tests

| Test | Description | Environment |
|------|-------------|-------------|
| `test_location_with_firestore` | End-to-end location lookup | Firebase Emulator |
| `test_monte_carlo_with_real_data` | Simulation with seeded cost data | Firebase Emulator |
| `test_pdf_generation_e2e` | Full PDF generation and Storage upload | Firebase Emulator |
| `test_cost_data_coverage` | Verify BoQ items can be costed | Firebase Emulator |

### Performance Tests

| Test | Target | Methodology |
|------|--------|-------------|
| Location lookup latency | < 500ms | 100 sequential calls, measure p95 |
| Monte Carlo duration | < 2s for 100 items | Benchmark with varying item counts |
| PDF generation time | < 10s | Generate 5 sample estimates, measure average |

### Manual Testing

| Test | Verification Method |
|------|---------------------|
| PDF visual quality | Print sample, verify formatting |
| PDF content accuracy | Compare to Firestore data |
| Location data accuracy | Spot-check against public labor rate data |
| Monte Carlo plausibility | Verify P90/P50 ratio is reasonable (~1.1-1.3) |
