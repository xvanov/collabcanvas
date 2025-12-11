# TrueCost - Active Context

## Current Focus: Epic 2 - Deep Agent Pipeline

**Role**: Dev 2
**Responsibility**: Build the deep agent pipeline that transforms `ClarificationOutput` into a complete cost estimate.
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
| **PR #6** | `epic2/cost-agent` | 2.4 | 🔲 Ready | - | Cost Estimation Agent |
| **PR #7** | `epic2/risk-final-agents` | 2.5 | 🔲 Not Started | - | Risk, Timeline & Final Agents |
| **PR #8** | `epic2/firestore-rules` | - | 🔲 Not Started | - | Security rules & documentation |

**Total Tests: 135 passing**

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

## Current PR: PR #6 (Ready to Start)

**Branch**: `epic2/cost-agent`
**Story**: 2.4 - Cost Estimation Agent

### PR #6 Tasks:
1. Create `functions/models/cost_estimate.py` - Cost estimate Pydantic models
2. Add `get_material_cost()` to cost data service - Material pricing lookup
3. Replace stub `CostAgent` with real LLM-powered implementation
4. Replace stub `CostScorer` with real scoring logic
5. Replace stub `CostCritic` with real critique logic
6. Create mock cost estimate fixtures
7. Add unit tests

### Cost Agent Requirements:
- Apply unit costs from CostDataService to BoQ line items
- Apply location factors from LocationAgent output
- Calculate material costs, labor costs, and totals
- Generate cost breakdown by division and trade
- Provide confidence ranges for estimates

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
│   │   ├── cost_agent.py            # ✅ PR #3 (stub)
│   │   ├── risk_agent.py            # ✅ PR #3 (stub)
│   │   ├── timeline_agent.py        # ✅ PR #3 (stub)
│   │   └── final_agent.py           # ✅ PR #3 (stub)
│   ├── scorers/
│   │   ├── __init__.py
│   │   ├── base_scorer.py           # ✅ PR #1 - BaseScorer
│   │   ├── location_scorer.py       # ✅ PR #4 - 7-criteria scoring
│   │   ├── scope_scorer.py          # ✅ PR #5 - 6-criteria scoring
│   │   ├── cost_scorer.py           # ✅ PR #3 (stub)
│   │   ├── risk_scorer.py           # ✅ PR #3 (stub)
│   │   ├── timeline_scorer.py       # ✅ PR #3 (stub)
│   │   └── final_scorer.py          # ✅ PR #3 (stub)
│   └── critics/
│       ├── __init__.py
│       ├── base_critic.py           # ✅ PR #1 - BaseCritic
│       ├── location_critic.py       # ✅ PR #4 - Actionable feedback
│       ├── scope_critic.py          # ✅ PR #5 - Actionable feedback
│       ├── cost_critic.py           # ✅ PR #3 (stub)
│       ├── risk_critic.py           # ✅ PR #3 (stub)
│       ├── timeline_critic.py       # ✅ PR #3 (stub)
│       └── final_critic.py          # ✅ PR #3 (stub)
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
│   └── bill_of_quantities.py        # ✅ PR #5 - CostCode, EnrichedLineItem, BillOfQuantities
│
├── services/
│   ├── __init__.py
│   ├── firestore_service.py         # ✅ PR #1
│   ├── llm_service.py               # ✅ PR #1
│   ├── a2a_client.py                # ✅ PR #1
│   └── cost_data_service.py         # ✅ PR #4/5 - Mock cost data + get_cost_code()
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
    │   └── mock_boq_data.py                    # ✅ PR #5 - BoQ test fixtures
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
    │   └── test_scope_agent.py      # ✅ PR #5 (29 tests)
    └── integration/
        └── __init__.py
```

## Next Action

**Start PR #6: Cost Estimation Agent**

See `memory-bank/epic2-task-list.md` (PR #6 section) for detailed tasks.

---

_Last Updated: December 11, 2025 (PR #5 Complete)_
