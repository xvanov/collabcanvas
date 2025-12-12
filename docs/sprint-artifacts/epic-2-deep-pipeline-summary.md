# Epic 2: Deep Agent Pipeline - Implementation Summary

**Status:** MERGED (PR #17 - True Agent Pipeline)
**Date Merged:** 2025-12-11
**Developer:** Dev 2
**Epic Goal:** Build an AI-powered construction cost estimation pipeline using 19 deep agents with scorer/critic validation for quality assurance.

---

## Overview

Epic 2 delivers the core intelligence of TrueCost: a sophisticated multi-agent pipeline that transforms a `ClarificationOutput` (project requirements, CAD data, scope) into a comprehensive construction cost estimate with Monte Carlo risk analysis, timeline scheduling, and executive summaries.

## Architecture Highlights

### 19-Agent Pipeline

The pipeline uses a **Scorer + Critic validation pattern** that ensures output quality:

```
ORCHESTRATOR (1 agent)
    │
    ▼
Primary Agent → Scorer (0-100) → Score ≥ 80? → Next Agent
                                      │
                                      ▼ (No)
                              Critic → Retry with feedback (max 2)
```

**Agent Breakdown:**

| Category | Count | Agents |
|----------|-------|--------|
| Primary | 6 | Location, Scope, Cost, Risk, Timeline, Final |
| Scorer | 6 | Objective 0-100 scoring for each primary |
| Critic | 6 | Qualitative feedback when score < 80 |
| Orchestrator | 1 | Flow coordination, retry management |

### Primary Agent Responsibilities

| Agent | Input | Output | Key Feature |
|-------|-------|--------|-------------|
| **Location** | ClarificationOutput | LocationFactors | Labor rates, permits, weather by ZIP |
| **Scope** | ClarificationOutput + Location | BillOfQuantities | CSI MasterFormat enrichment |
| **Cost** | BoQ + Location | CostEstimate | P50/P80/P90 three-tier pricing |
| **Risk** | Cost + BoQ | RiskAnalysis | Monte Carlo with 1000 iterations |
| **Timeline** | Scope + Cost | ProjectTimeline | Critical path, task dependencies |
| **Final** | All outputs | FinalEstimate | Executive summary synthesis |

## Technical Implementation

### Test Coverage

| PR | Tests | Description |
|----|-------|-------------|
| PR #1 | 58 | Foundation: config, services, base classes |
| PR #2 | 7 | ClarificationOutput v3.0.0 models |
| PR #3 | 15 | Orchestrator + 18 A2A endpoints |
| PR #4 | 26 | Location Agent + Scorer + Critic |
| PR #5 | 29 | Scope Agent + CSI enrichment |
| PR #6 | 36 | Cost Agent + P50/P80/P90 |
| PR #7 | 33 | Risk, Timeline, Final agents |
| **Total** | **205** | All tests passing |

### Key Files Created

```
functions/
├── main.py                    # Cloud Function entry points
├── agents/
│   ├── orchestrator.py        # Pipeline coordination
│   ├── primary/               # 6 primary agents
│   ├── scorers/               # 6 scorer agents
│   └── critics/               # 6 critic agents
├── models/
│   ├── clarification_output.py
│   ├── location_factors.py
│   ├── bill_of_quantities.py
│   ├── cost_estimate.py
│   ├── risk_analysis.py
│   ├── timeline.py
│   └── final_estimate.py
└── services/
    ├── cost_data_service.py   # Mock RSMeans-style data
    └── monte_carlo_service.py # Risk simulation
```

### Cloud Function Endpoints

| Endpoint | Purpose |
|----------|---------|
| `start_deep_pipeline` | Initiate estimate pipeline |
| `get_pipeline_status` | Real-time progress polling |
| `delete_estimate` | Remove estimate + subcollections |
| `a2a_location` | Location agent A2A endpoint |
| `a2a_scope` | Scope agent A2A endpoint |
| `a2a_cost` | Cost agent A2A endpoint |
| `a2a_risk` | Risk agent A2A endpoint |
| `a2a_timeline` | Timeline agent A2A endpoint |
| `a2a_final` | Final agent A2A endpoint |

## Key Features Implemented

### 1. Three-Tier Cost Output (P50/P80/P90)

All cost calculations produce three estimates:

- **P50 (low):** Median estimate - 50th percentile
- **P80 (medium):** Conservative - 80th percentile
- **P90 (high):** Pessimistic - 90th percentile

```python
class CostRange(BaseModel):
    low: float   # P50
    medium: float  # P80
    high: float  # P90
```

### 2. CSI MasterFormat Integration

The Scope Agent enriches line items with CSI division codes:

- 50+ construction item mappings
- Fuzzy keyword matching
- Trade assignment per division

### 3. Monte Carlo Risk Simulation

The Risk Agent runs probabilistic analysis:

- 1000 iterations using NumPy triangular distributions
- Calculates P50/P80/P90 percentiles
- Identifies top 5 risk factors with sensitivity scores
- Recommends contingency percentage

### 4. Granular Cost Ledger

Fine-grained cost components stored in Firestore subcollection:

- `/estimates/{estimateId}/costItems`
- Material, labor, equipment breakdowns
- Supports UI drill-down and PDF detail tables

### 5. Scorer/Critic Quality Assurance

Each agent output is validated:

**Scorer Criteria Examples (Location):**
- labor_rates_completeness (weight: 3)
- location_data_accuracy (weight: 2)
- permit_costs_completeness (weight: 2)
- analysis_quality (weight: 2)

**Critic Feedback Format:**
- What's wrong
- Why it's wrong
- How to fix it

## Integration Points

### Upstream Dependencies (From Dev 3)

| Dependency | Status | Notes |
|------------|--------|-------|
| `ClarificationOutput` v3.0.0 | Defined | Schema in `docs/clarification-output-schema.md` |

### Downstream Consumers (To Dev 4)

| Consumer | Integration File | Status |
|----------|------------------|--------|
| PDF Generator | `dev2-integration-spec.md` | Fully specified |
| Monte Carlo Service | Mock in place | Awaiting real implementation |

### Data Contracts

The Final Agent outputs all fields required by Dev 4's PDF generator:

- `projectName`, `address`, `projectType`
- `p50`, `p80`, `p90`, `contingencyPct`
- `laborAnalysis`, `schedule`, `cost_breakdown`
- `risk_analysis`, `bill_of_quantities`, `assumptions`

## Known Limitations

1. **Mock Cost Data:** Uses hardcoded regional data for 6 metros; production needs RSMeans API
2. **Mock Monte Carlo:** NumPy-based simulation; production needs proper risk modeling
3. **LLM Dependency:** Agents require OpenAI API; needs fallback handling
4. **Branch Typo:** Developed on `ture-agent-pipeline` (should be `true-agent-pipeline`)

## Post-Merge Integration Needs

See `tech-spec-post-merge-integration.md` for full details:

1. **Connect UI to pipeline status** - Dashboard shows real-time agent progress
2. **Wire PDF generation** - Call `generate_pdf()` from EstimatePage
3. **Integrate with clarification agent** - Chatbot triggers pipeline start
4. **Replace mock services** - Connect to real cost data when available

---

**Document Version:** 1.0
**Created:** 2025-12-11
**Author:** Technical Writer (Paige)
