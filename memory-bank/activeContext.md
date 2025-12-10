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
| **PR #3** | `epic2/orchestrator` | 2.1 | 🔲 Ready | Pipeline orchestrator & Cloud Function entry points |
| **PR #4** | `epic2/location-agent` | 2.2 | 🔲 Not Started | Location Intelligence Agent |
| **PR #5** | `epic2/scope-agent` | 2.3 | 🔲 Not Started | Construction Scope Agent (BoQ enrichment) |
| **PR #6** | `epic2/cost-agent` | 2.4 | 🔲 Not Started | Cost Estimation Agent |
| **PR #7** | `epic2/risk-final-agents` | 2.5 | 🔲 Not Started | Risk & Final Estimator Agents |
| **PR #8** | `epic2/firestore-rules` | - | 🔲 Not Started | Security rules & documentation |

## Completed PRs

### PR #1: Foundation & Project Setup ✅
**Completed**: Dec 10, 2025
**Tests**: 58 passing

**Files Created**:
- `functions/requirements.txt`
- `functions/config/settings.py`, `functions/config/errors.py`
- `functions/services/firestore_service.py`
- `functions/services/llm_service.py`
- `functions/services/a2a_client.py`
- `functions/agents/base_agent.py` (BaseA2AAgent)
- `functions/agents/scorers/base_scorer.py` (BaseScorer)
- `functions/agents/critics/base_critic.py` (BaseCritic)
- `functions/agents/agent_cards.py` (19 agents registered)
- `functions/pytest.ini`, `functions/tests/conftest.py`
- 5 unit test files

### PR #2: ClarificationOutput Models ✅
**Completed**: Dec 10, 2025
**Tests**: 7 passing (65 total)

**Files Created**:
- `functions/models/clarification_output.py` - Comprehensive Pydantic models for v3.0.0
  - All enums (ProjectType, CSIDivisionStatus, CSIUnit, etc.)
  - Location, Timeline, ScopeSummary, ProjectBrief models
  - CSILineItem, CSIDivision, CSIScope (all 24 divisions)
  - CADData with SpaceModel, SpatialRelationships
  - Project-specific: KitchenSpecificData, BathroomSpecificData, etc.
  - ValidationFlags, ConversationHistory
  - Helper methods: `get_all_divisions()`, `get_division_by_code()`
- `functions/validators/clarification_validator.py` - Simple `parse_clarification_output()` helper
- `functions/tests/fixtures/clarification_output_kitchen.json` - Kitchen remodel fixture
- `functions/tests/fixtures/clarification_output_bathroom.json` - Bathroom remodel fixture
- `functions/tests/unit/test_clarification_models.py` - 7 unit tests

**Usage**:
```python
from validators.clarification_validator import parse_clarification_output

clarification = parse_clarification_output(raw_data)
zip_code = clarification.projectBrief.location.zipCode
divisions = clarification.csiScope.get_all_divisions()
```

## Current PR: PR #3 (Ready to Start)

**Branch**: `epic2/orchestrator`

### PR #3 Tasks:
1. Create agent output models (`models/agent_output.py`)
2. Create estimate models (`models/estimate.py`)
3. Create orchestrator (`agents/orchestrator.py`)
4. Create Cloud Function entry points (`main.py`)
5. Create stub agents for pipeline testing
6. Unit tests

## File Structure (Current State)

```
functions/
├── __init__.py
├── requirements.txt                 # ✅ PR #1
├── pytest.ini                       # ✅ PR #1
│
├── agents/
│   ├── __init__.py
│   ├── agent_cards.py               # ✅ PR #1 - 19 agents registered
│   ├── base_agent.py                # ✅ PR #1 - BaseA2AAgent
│   ├── primary/
│   │   └── __init__.py
│   ├── scorers/
│   │   ├── __init__.py
│   │   └── base_scorer.py           # ✅ PR #1 - BaseScorer
│   └── critics/
│       ├── __init__.py
│       └── base_critic.py           # ✅ PR #1 - BaseCritic
│
├── config/
│   ├── __init__.py
│   ├── settings.py                  # ✅ PR #1
│   └── errors.py                    # ✅ PR #1
│
├── models/
│   ├── __init__.py
│   └── clarification_output.py      # ✅ PR #2 - Full v3.0.0 models
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
    │   ├── test_a2a_client.py       # ✅ PR #1
    │   ├── test_base_agent.py       # ✅ PR #1
    │   ├── test_config.py           # ✅ PR #1
    │   ├── test_firestore_service.py # ✅ PR #1
    │   ├── test_llm_service.py      # ✅ PR #1
    │   └── test_clarification_models.py # ✅ PR #2
    └── integration/
        └── __init__.py
```

## Next Action

**Start PR #3: Orchestrator & Pipeline Infrastructure**

See `memory-bank/epic2-task-list.md` (PR #3 section) for detailed tasks.

---

_Last Updated: December 10, 2025_
