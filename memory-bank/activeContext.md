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

| PR | Branch | Story | Status | Description |
|----|--------|-------|--------|-------------|
| **PR #1** | `epic2/foundation` | 2.1 | ✅ Complete | Project setup, config, services, base classes |
| **PR #2** | `epic2/clarification-validation` | 2.1 | ✅ Complete | ClarificationOutput Pydantic models & parsing |
| **PR #3** | `epic2/orchestrator` | 2.1 | ✅ Complete | Pipeline orchestrator & Cloud Function entry points |
| **PR #4** | `epic2/location-agent` | 2.2 | 🔲 Ready | Location Intelligence Agent |
| **PR #5** | `epic2/scope-agent` | 2.3 | 🔲 Not Started | Construction Scope Agent (BoQ enrichment) |
| **PR #6** | `epic2/cost-agent` | 2.4 | 🔲 Not Started | Cost Estimation Agent |
| **PR #7** | `epic2/risk-final-agents` | 2.5 | 🔲 Not Started | Risk, Timeline & Final Agents |
| **PR #8** | `epic2/firestore-rules` | - | 🔲 Not Started | Security rules & documentation |

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

## Current PR: PR #4 (Ready to Start)

**Branch**: `epic2/location-agent` (or continue on `ture-agent-pipeline`)
**Story**: 2.2 - Location Intelligence Agent

### PR #4 Tasks:
1. Create `functions/models/location_factors.py` - Pydantic models
2. Create `functions/services/cost_data_service.py` - Mock cost data service
3. Replace stub `LocationAgent` with real LLM-powered implementation
4. Replace stub `LocationScorer` with real scoring logic
5. Replace stub `LocationCritic` with real critique logic
6. Create mock location data fixtures
7. Add unit tests

### Location Agent Requirements:
- Read `projectBrief.location.zipCode` from ClarificationOutput
- Call `cost_data_service.get_location_factors(zip_code)` 
- Extract and structure labor rates (electrician, plumber, carpenter, etc.)
- Determine union vs non-union market
- Get permit cost estimates
- Get weather/seasonal factors
- Apply location multiplier
- Save `locationFactors` to estimate document
- Generate human-readable summary

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
│   │   ├── location_agent.py        # ✅ PR #3 (stub) - Replace in PR #4
│   │   ├── scope_agent.py           # ✅ PR #3 (stub)
│   │   ├── cost_agent.py            # ✅ PR #3 (stub)
│   │   ├── risk_agent.py            # ✅ PR #3 (stub)
│   │   ├── timeline_agent.py        # ✅ PR #3 (stub)
│   │   └── final_agent.py           # ✅ PR #3 (stub)
│   ├── scorers/
│   │   ├── __init__.py
│   │   ├── base_scorer.py           # ✅ PR #1 - BaseScorer
│   │   ├── location_scorer.py       # ✅ PR #3 (stub) - Replace in PR #4
│   │   ├── scope_scorer.py          # ✅ PR #3 (stub)
│   │   ├── cost_scorer.py           # ✅ PR #3 (stub)
│   │   ├── risk_scorer.py           # ✅ PR #3 (stub)
│   │   ├── timeline_scorer.py       # ✅ PR #3 (stub)
│   │   └── final_scorer.py          # ✅ PR #3 (stub)
│   └── critics/
│       ├── __init__.py
│       ├── base_critic.py           # ✅ PR #1 - BaseCritic
│       ├── location_critic.py       # ✅ PR #3 (stub) - Replace in PR #4
│       ├── scope_critic.py          # ✅ PR #3 (stub)
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
│   └── estimate.py                  # ✅ PR #3 - EstimateDocument
│
├── services/
│   ├── __init__.py
│   ├── firestore_service.py         # ✅ PR #1
│   ├── llm_service.py               # ✅ PR #1
│   └── a2a_client.py                # ✅ PR #1
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
    │   └── clarification_output_bathroom.json  # ✅ PR #2
    ├── unit/
    │   ├── __init__.py
    │   ├── test_a2a_client.py       # ✅ PR #1 (11 tests)
    │   ├── test_base_agent.py       # ✅ PR #1 (18 tests)
    │   ├── test_config.py           # ✅ PR #1 (11 tests)
    │   ├── test_firestore_service.py # ✅ PR #1 (9 tests)
    │   ├── test_llm_service.py      # ✅ PR #1 (9 tests)
    │   ├── test_clarification_models.py # ✅ PR #2 (7 tests)
    │   └── test_orchestrator.py     # ✅ PR #3 (15 tests)
    └── integration/
        └── __init__.py
```

## Next Action

**Start PR #4: Location Intelligence Agent**

See `memory-bank/epic2-task-list.md` (PR #4 section) for detailed tasks.

---

_Last Updated: December 10, 2025_
