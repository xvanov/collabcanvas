# Next Chat Prompt - PR #4: Location Intelligence Agent

Copy and paste this into a new chat:

---

I'm Dev 2 for the TrueCost project, continuing Epic 2: Deep Agent Pipeline.

## Context
- **Project**: TrueCost - AI-powered construction estimation system
- **My Role**: Dev 2 - Deep Agent Pipeline
- **Branch**: `ture-agent-pipeline`
- **Status**: PR #1 ✅, PR #2 ✅, PR #3 ✅, Starting PR #4

## Completed PRs
- **PR #1**: Foundation (58 tests) - config, services, base classes, agent cards
- **PR #2**: ClarificationOutput Models (7 tests) - Pydantic models for v3.0.0
- **PR #3**: Orchestrator & Pipeline Infrastructure (15 tests) - PipelineOrchestrator, main.py, stub agents

**Total: 80 tests passing**

## PR #4: Location Intelligence Agent

### Tasks
- [ ] Create `functions/models/location_factors.py` - LocationFactors, LaborRates, PermitCosts models
- [ ] Create `functions/services/cost_data_service.py` - Mock cost data service interface
- [ ] Replace stub `functions/agents/primary/location_agent.py` with real LLM implementation
- [ ] Replace stub `functions/agents/scorers/location_scorer.py` with real scoring logic
- [ ] Replace stub `functions/agents/critics/location_critic.py` with real critique logic
- [ ] Create `functions/tests/fixtures/mock_cost_data.py` - Mock location data (Denver, NYC, Houston)
- [ ] Create `functions/tests/unit/test_location_agent.py`

### Location Agent Requirements
- Extract zip code from `clarificationOutput.projectBrief.location.zipCode`
- Call `cost_data_service.get_location_factors(zip_code)`
- Return structured LocationFactors:
  - Labor rates (electrician, plumber, carpenter, HVAC, etc.)
  - Union vs non-union market determination
  - Permit costs (building, electrical, plumbing, mechanical)
  - Weather/seasonal factors
  - Location cost multiplier (0.8-1.5 range)
- Save output to Firestore
- Generate human-readable summary

### Key References
- Task list: `memory-bank/epic2-task-list.md` (PR #4 section)
- Base agent: `functions/agents/base_agent.py`
- Base scorer: `functions/agents/scorers/base_scorer.py`
- Base critic: `functions/agents/critics/base_critic.py`
- Current stub: `functions/agents/primary/location_agent.py`
- Services: `functions/services/` (firestore, llm, a2a_client)

### Mock Data to Support
- Denver (80202) - Mixed market, locationFactor 1.05
- NYC (10001) - Union market, locationFactor 1.25
- Houston (77001) - Non-union, locationFactor 0.95
- Unknown zips - Default to national averages

Please read `memory-bank/epic2-task-list.md` (PR #4 section) first, then start implementing.

---
