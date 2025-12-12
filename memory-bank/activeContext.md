# TrueCost - Active Context

## Current Focus: Epic 2 - Deep Agent Pipeline (Granular Cost Ledger + Dashboard Stability)

**Role**: Dev 2  
**Responsibility**: Maintain/extend the deep agent pipeline that transforms `ClarificationOutput` into a complete cost estimate, with **granular cost transparency** for UI/PDF consumers.  
**Task List**: See [epic2-task-list.md](./epic2-task-list.md) for detailed breakdown

## Epic 2 Overview

The Deep Agent Pipeline consumes the output from Dev 3's Clarification Agent and runs through an **orchestrated, non-linear pipeline** with **Scorer + Critic validation**:

### Pipeline Architecture (19 Agents)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ORCHESTRATOR                                               │
│  - Coordinates 6 primary + 6 scorer + 6 critic agents                                         │
│  - Flow: Primary → Scorer → (if low score) → Critic → Retry with feedback                    │
│  - Max 2 retries per agent                                                                    │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
                                              │
    ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
    ▼                                         ▼                                         ▼
┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
│  Location  │──►│   Scope    │──►│    Cost    │──►│    Risk    │──►│  Timeline  │──►│   Final    │
│   Agent    │   │   Agent    │   │   Agent    │   │   Agent    │   │   Agent    │   │   Agent    │
└─────┬──────┘   └─────┬──────┘   └─────┬──────┘   └─────┬──────┘   └─────┬──────┘   └─────┬──────┘
      │                │                │                │                │                │
      ▼                ▼                ▼                ▼                ▼                ▼
┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
│  SCORER    │   │  SCORER    │   │  SCORER    │   │  SCORER    │   │  SCORER    │   │  SCORER    │
│  (0-100)   │   │  (0-100)   │   │  (0-100)   │   │  (0-100)   │   │  (0-100)   │   │  (0-100)   │
└─────┬──────┘   └─────┬──────┘   └─────┬──────┘   └─────┬──────┘   └─────┬──────┘   └─────┬──────┘
      │                │                │                │                │                │
   ≥80? ──YES──►    ≥80? ──YES──►    ≥80? ──YES──►    ≥80? ──YES──►    ≥80? ──YES──►    ≥80? ──YES──► Done
      │                │                │                │                │                │
      ▼ NO             ▼ NO             ▼ NO             ▼ NO             ▼ NO             ▼ NO
┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
│   CRITIC   │   │   CRITIC   │   │   CRITIC   │   │   CRITIC   │   │   CRITIC   │   │   CRITIC   │
│ (feedback) │   │ (feedback) │   │ (feedback) │   │ (feedback) │   │ (feedback) │   │ (feedback) │
└─────┬──────┘   └─────┬──────┘   └─────┬──────┘   └─────┬──────┘   └─────┬──────┘   └─────┬──────┘
      │                │                │                │                │                │
      └────────────── Critic feedback → Retry PRIMARY (max 2 retries) ─────────────────────┘
```

### Agent Count: 19 Total
| Type | Count | Purpose |
|------|-------|---------|
| **Primary** | 6 | Location, Scope, Cost, Risk, Timeline, Final |
| **Scorer** | 6 | Objective numerical scoring (0-100) |
| **Critic** | 6 | Qualitative feedback when score < 80 |
| **Orchestrator** | 1 | Coordinate flow, manage retries |

## PR-Based Implementation Plan

| PR | Branch | Story | Status | Tests | Description |
|----|--------|-------|--------|-------|-------------|
| **PR #1** | `epic2/foundation` | 2.1 | ✅ Complete | 58 | Project setup, config, services, base classes |
| **PR #2** | `epic2/clarification-validation` | 2.1 | ✅ Complete | 7 | ClarificationOutput Pydantic models & parsing |
| **PR #3** | `epic2/orchestrator` | 2.1 | ✅ Complete | 15 | Pipeline orchestrator & Cloud Function entry points |
| **PR #4** | `ture-agent-pipeline` | 2.2 | ✅ Complete | 26 | Location Intelligence Agent |
| **PR #5** | `epic2/scope-agent` | 2.3 | ✅ Complete | 29 | Construction Scope Agent (BoQ enrichment) |
| **PR #6** | `epic2/cost-agent` | 2.4 | ✅ Complete | 36 | Cost Estimation Agent (P50/P80/P90) |
| **PR #7** | `epic2/risk-final-agents` | 2.5 | ✅ Complete | 33 | Risk, Timeline & Final Agents |
| **PR #8** | `epic2/firestore-rules` | - | ✅ Complete | - | Security rules, docs, integration mapping |

**Total Tests: 205 passing**

## Completed PRs

### PR #1: Foundation & Project Setup ✅
**Completed**: Dec 10, 2025
**Tests**: 58 passing

### PR #2: ClarificationOutput Models ✅
**Completed**: Dec 10, 2025
**Tests**: 7 passing (65 total)

### PR #3: Orchestrator & Pipeline Infrastructure ✅
**Completed**: Dec 10, 2025
**Tests**: 15 passing (80 total)

**Files Created**:
- `functions/models/agent_output.py` - AgentStatus, AgentOutput, PipelineStatus, PipelineResult
- `functions/models/estimate.py` - EstimateStatus, EstimateDocument
- `functions/agents/orchestrator.py` - PipelineOrchestrator with Scorer+Critic flow
- `functions/main.py` - Cloud Function entry points + 18 A2A endpoints
- `functions/agents/primary/*.py` - 6 stub primary agents
- `functions/agents/scorers/*.py` - 6 stub scorer agents
- `functions/agents/critics/*.py` - 6 stub critic agents
- `functions/tests/unit/test_orchestrator.py` - 15 unit tests
- `functions/.gitignore` - Python-specific ignores
- Updated `collabcanvas/firebase.json` for Python functions

### PR #4: Location Intelligence Agent ✅
**Completed**: Dec 11, 2025
**Tests**: 26 passing (106 total)

**Files Created/Modified**:
- `functions/models/location_factors.py` - LaborRates, PermitCosts, WeatherFactors, LocationFactors
- `functions/services/cost_data_service.py` - Mock cost data for 6 metros (Denver, NYC, Houston, LA, Chicago, Phoenix)
- `functions/agents/primary/location_agent.py` - Real LLM-powered agent (replaced stub)
- `functions/agents/scorers/location_scorer.py` - 7-criteria scoring (replaced stub)
- `functions/agents/critics/location_critic.py` - Actionable feedback (replaced stub)
- `functions/tests/fixtures/mock_cost_data.py` - Test fixtures
- `functions/tests/unit/test_location_agent.py` - 26 unit tests

**Features Implemented**:
- Location factors Pydantic models with validation
- CostDataService with mock data for major metros
- Regional estimation for unknown ZIP codes
- LLM-powered location analysis with fallback
- 7 scoring criteria (labor rates, location data, permits, weather, analysis quality, etc.)
- Detailed critic feedback with specific fix suggestions

### PR #5: Construction Scope Agent ✅
**Completed**: Dec 11, 2025
**Tests**: 29 passing (135 total)

**Files Created/Modified**:
- `functions/models/bill_of_quantities.py` - CostCode, UnitCostReference, EnrichedLineItem, EnrichedDivision, BillOfQuantities
- `functions/services/cost_data_service.py` - Added `get_cost_code()` for CSI MasterFormat lookup
- `functions/agents/primary/scope_agent.py` - Real LLM-powered agent (replaced stub)
- `functions/agents/scorers/scope_scorer.py` - 6-criteria scoring (replaced stub)
- `functions/agents/critics/scope_critic.py` - Actionable feedback (replaced stub)
- `functions/tests/fixtures/mock_boq_data.py` - Test fixtures
- `functions/tests/unit/test_scope_agent.py` - 29 unit tests

**Features Implemented**:
- Bill of Quantities Pydantic models with CSI division support
- CSI MasterFormat cost code lookup with fuzzy matching
- Scope enrichment with cost codes from ClarificationOutput csiScope
- Quantity validation against CAD data (spaceModel.rooms)
- 6 scoring criteria (cost code coverage, quantities, division coverage, etc.)
- Detailed critic feedback for scope completeness issues

## Completed PR: PR #7 ✅

**Branch**: `epic2/risk-final-agents`
**Story**: 2.5 - Risk, Timeline & Final Agents
**Tests**: 33 passing (205 total)
**Completed**: Dec 11, 2025

### PR #7 Files Created/Modified:
- `functions/models/risk_analysis.py` - RiskFactor, CostImpact, Probability, PercentileValues, MonteCarloResult, RiskAnalysisSummary, RiskAnalysis
- `functions/models/timeline.py` - DurationRange, TimelineTask, Milestone, CriticalPath, ProjectTimeline
- `functions/models/final_estimate.py` - ExecutiveSummary, CostBreakdownSummary, TimelineSummary, RiskSummary, FinalEstimate
- `functions/services/monte_carlo_service.py` - Mock Monte Carlo with NumPy triangular distributions
- `functions/agents/primary/risk_agent.py` - Real LLM-powered agent with Monte Carlo (replaced stub)
- `functions/agents/scorers/risk_scorer.py` - 4-criteria scoring (replaced stub)
- `functions/agents/critics/risk_critic.py` - Actionable feedback (replaced stub)
- `functions/agents/primary/timeline_agent.py` - Real LLM-powered agent (replaced stub)
- `functions/agents/scorers/timeline_scorer.py` - 4-criteria scoring (replaced stub)
- `functions/agents/critics/timeline_critic.py` - Actionable feedback (replaced stub)
- `functions/agents/primary/final_agent.py` - Real LLM-powered synthesis agent (replaced stub)
- `functions/agents/scorers/final_scorer.py` - 4-criteria scoring (replaced stub)
- `functions/agents/critics/final_critic.py` - Actionable feedback (replaced stub)
- `functions/tests/fixtures/mock_risk_timeline_data.py` - Test fixtures
- `functions/tests/unit/test_risk_timeline_final.py` - 33 unit tests

### Key Features Implemented:
- **Risk Agent**: Monte Carlo simulation with P50/P80/P90 percentiles, contingency calculation, risk factor identification
- **Timeline Agent**: Project timeline with tasks, durations, dependencies, critical path analysis
- **Final Agent**: Synthesis of all agent outputs into executive summary with recommendations

## Next PR: PR #8 (Ready to Start)

**Branch**: `epic2/firestore-rules`
**Story**: Firestore Rules & Documentation

## File Structure (Current State)

```
functions/
├── __init__.py
├── requirements.txt                 # ✅ PR #1
├── pytest.ini                       # ✅ PR #1
├── .gitignore                       # ✅ PR #3
├── main.py                          # ✅ PR #3 - Cloud Function entry points
│
├── agents/
│   ├── __init__.py
│   ├── agent_cards.py               # ✅ PR #1 - 19 agents registered
│   ├── base_agent.py                # ✅ PR #1 - BaseA2AAgent
│   ├── orchestrator.py              # ✅ PR #3 - PipelineOrchestrator
│   ├── primary/
│   │   ├── __init__.py
│   │   ├── location_agent.py        # ✅ PR #4 - Real LLM implementation
│   │   ├── scope_agent.py           # ✅ PR #5 - Real LLM implementation
│   │   ├── cost_agent.py            # ✅ PR #6 - Real LLM implementation with P50/P80/P90
│   │   ├── risk_agent.py            # ✅ PR #7 - Real LLM implementation with Monte Carlo
│   │   ├── timeline_agent.py        # ✅ PR #7 - Real LLM implementation
│   │   └── final_agent.py           # ✅ PR #7 - Real LLM synthesis agent
│   ├── scorers/
│   │   ├── __init__.py
│   │   ├── base_scorer.py           # ✅ PR #1 - BaseScorer
│   │   ├── location_scorer.py       # ✅ PR #4 - 7-criteria scoring
│   │   ├── scope_scorer.py          # ✅ PR #5 - 6-criteria scoring
│   │   ├── cost_scorer.py           # ✅ PR #6 - 6-criteria scoring
│   │   ├── risk_scorer.py           # ✅ PR #7 - 4-criteria scoring
│   │   ├── timeline_scorer.py       # ✅ PR #7 - 4-criteria scoring
│   │   └── final_scorer.py          # ✅ PR #7 - 4-criteria scoring
│   └── critics/
│       ├── __init__.py
│       ├── base_critic.py           # ✅ PR #1 - BaseCritic
│       ├── location_critic.py       # ✅ PR #4 - Actionable feedback
│       ├── scope_critic.py          # ✅ PR #5 - Actionable feedback
│       ├── cost_critic.py           # ✅ PR #6 - Actionable feedback
│       ├── risk_critic.py           # ✅ PR #7 - Actionable feedback
│       ├── timeline_critic.py       # ✅ PR #7 - Actionable feedback
│       └── final_critic.py          # ✅ PR #7 - Actionable feedback
│
├── config/
│   ├── __init__.py
│   ├── settings.py                  # ✅ PR #1
│   └── errors.py                    # ✅ PR #1
│
├── models/
│   ├── __init__.py
│   ├── clarification_output.py      # ✅ PR #2 - Full v3.0.0 models
│   ├── agent_output.py              # ✅ PR #3 - AgentStatus, PipelineStatus
│   ├── estimate.py                  # ✅ PR #3 - EstimateDocument
│   ├── location_factors.py          # ✅ PR #4 - LaborRates, PermitCosts, LocationFactors
│   ├── bill_of_quantities.py        # ✅ PR #5 - CostCode, EnrichedLineItem, BillOfQuantities
│   ├── cost_estimate.py             # ✅ PR #6 - CostRange, LineItemCost, CostEstimate
│   ├── risk_analysis.py             # ✅ PR #7 - RiskFactor, MonteCarloResult, RiskAnalysis
│   ├── timeline.py                  # ✅ PR #7 - TimelineTask, ProjectTimeline
│   └── final_estimate.py            # ✅ PR #7 - ExecutiveSummary, FinalEstimate
│
├── services/
│   ├── __init__.py
│   ├── firestore_service.py         # ✅ PR #1
│   ├── llm_service.py               # ✅ PR #1
│   ├── a2a_client.py                # ✅ PR #1
│   ├── cost_data_service.py         # ✅ PR #4/5/6 - Mock cost data + get_cost_code() + material/labor costs
│   └── monte_carlo_service.py       # ✅ PR #7 - Mock Monte Carlo simulation
│
├── validators/
│   ├── __init__.py
│   └── clarification_validator.py   # ✅ PR #2 - parse_clarification_output()
│
└── tests/
    ├── __init__.py
    ├── conftest.py                  # ✅ PR #1
    ├── fixtures/
    │   ├── __init__.py
    │   ├── clarification_output_kitchen.json   # ✅ PR #2
    │   ├── clarification_output_bathroom.json  # ✅ PR #2
    │   ├── mock_cost_data.py                   # ✅ PR #4 - Location test fixtures
    │   ├── mock_boq_data.py                    # ✅ PR #5 - BoQ test fixtures
    │   ├── mock_cost_estimate_data.py         # ✅ PR #6 - Cost test fixtures
    │   └── mock_risk_timeline_data.py         # ✅ PR #7 - Risk/Timeline/Final fixtures
    ├── unit/
    │   ├── __init__.py
    │   ├── test_a2a_client.py       # ✅ PR #1 (11 tests)
    │   ├── test_base_agent.py       # ✅ PR #1 (18 tests)
    │   ├── test_config.py           # ✅ PR #1 (11 tests)
    │   ├── test_firestore_service.py # ✅ PR #1 (9 tests)
    │   ├── test_llm_service.py      # ✅ PR #1 (9 tests)
    │   ├── test_clarification_models.py # ✅ PR #2 (7 tests)
    │   ├── test_orchestrator.py     # ✅ PR #3 (15 tests)
    │   ├── test_location_agent.py   # ✅ PR #4 (26 tests)
    │   ├── test_scope_agent.py      # ✅ PR #5 (29 tests)
    │   ├── test_cost_agent.py       # ✅ PR #6 (36 tests)
    │   └── test_risk_timeline_final.py # ✅ PR #7 (33 tests)
    └── integration/
        └── __init__.py
```

## Next Action

Finalize “granular cost” visibility end-to-end:
- Persist granular cost components to Firestore subcollection: `/estimates/{estimateId}/costItems`
  - Written by `CostAgent` as each line item is costed
  - Includes material/labor/equipment components plus simple heuristics (e.g., SF → plank counts)
- Ensure `get_pipeline_status` is dashboard-safe:
  - Serialize Firestore timestamps in JSON responses
  - Attach **full** `costItems` list into the `finalOutput` response for UI display (no truncation in API response)
- Keep Dev4 integration payload on estimate root aligned to `dev2-integration-spec.md` (fields like `laborAnalysis`, `cost_breakdown`, `risk_analysis`, etc.)

---

_Last Updated: December 11, 2025 (Granular cost ledger + dashboard fixes; 205 tests passing)_
