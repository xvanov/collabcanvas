# Epic 2: Deep Agent Pipeline - Task List

**Owner:** Dev 2
**Total PRs:** 7
**Estimated Duration:** 3-4 Sprints

## Agent Framework: LangChain Deep Agents + A2A Protocol

This epic uses **LangChain Deep Agents** (`deepagents` library) for agent logic and **A2A Protocol** for inter-agent communication.

### Pipeline Architecture (Non-Linear with Scorer + Critic)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ORCHESTRATOR                                               │
│  - Coordinates primary agents, scorers, and critics                                           │
│  - Flow: Primary → Scorer → If low score → Critic → Retry with critic feedback               │
│  - Max 2 retries per agent before failing                                                     │
│  - Updates Firestore for frontend real-time progress                                          │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
                                              │
        ┌─────────────────────────────────────┼─────────────────────────────────────┐
        │                                     │                                     │
        ▼                                     ▼                                     ▼
┌──────────────┐  A2A  ┌──────────────┐  A2A  ┌──────────────┐  A2A  ┌──────────────┐  A2A  ┌──────────────┐  A2A  ┌──────────────┐
│   Location   │──────►│    Scope     │──────►│     Cost     │──────►│     Risk     │──────►│   Timeline   │──────►│    Final     │
│    Agent     │       │    Agent     │       │    Agent     │       │    Agent     │       │    Agent     │       │    Agent     │
└──────┬───────┘       └──────┬───────┘       └──────┬───────┘       └──────┬───────┘       └──────┬───────┘       └──────┬───────┘
       │                      │                      │                      │                      │                      │
       ▼                      ▼                      ▼                      ▼                      ▼                      ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Location   │       │    Scope     │       │     Cost     │       │     Risk     │       │   Timeline   │       │    Final     │
│    SCORER    │       │    SCORER    │       │    SCORER    │       │    SCORER    │       │    SCORER    │       │    SCORER    │
│  (0-100)     │       │  (0-100)     │       │  (0-100)     │       │  (0-100)     │       │  (0-100)     │       │  (0-100)     │
└──────┬───────┘       └──────┬───────┘       └──────┬───────┘       └──────┬───────┘       └──────┬───────┘       └──────┬───────┘
       │                      │                      │                      │                      │                      │
       ▼                      ▼                      ▼                      ▼                      ▼                      ▼
   Score >= 80?           Score >= 80?           Score >= 80?           Score >= 80?           Score >= 80?           Score >= 80?
       │                      │                      │                      │                      │                      │
       ├── YES: Next ────────►├── YES: Next ────────►├── YES: Next ────────►├── YES: Next ────────►├── YES: Next ────────►├── YES: Done
       │                      │                      │                      │                      │                      │
       ▼ NO                   ▼ NO                   ▼ NO                   ▼ NO                   ▼ NO                   ▼ NO
┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Location   │       │    Scope     │       │     Cost     │       │     Risk     │       │   Timeline   │       │    Final     │
│    CRITIC    │       │    CRITIC    │       │    CRITIC    │       │    CRITIC    │       │    CRITIC    │       │    CRITIC    │
│ (feedback)   │       │ (feedback)   │       │ (feedback)   │       │ (feedback)   │       │ (feedback)   │       │ (feedback)   │
└──────┬───────┘       └──────┬───────┘       └──────┬───────┘       └──────┬───────┘       └──────┬───────┘       └──────┬───────┘
       │                      │                      │                      │                      │                      │
       └────────────── Feedback sent back to PRIMARY AGENT (max 2 retries) ────────────────────────────────────────────────┘
```

### Validation Flow Per Agent

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  1. PRIMARY AGENT produces output                                                │
│                    │                                                             │
│                    ▼                                                             │
│  2. SCORER AGENT evaluates output (objective, numerical 0-100)                   │
│                    │                                                             │
│                    ▼                                                             │
│  3. If score >= 80: PASS → Move to next agent                                    │
│     If score < 80:  → Call CRITIC AGENT                                          │
│                    │                                                             │
│                    ▼                                                             │
│  4. CRITIC AGENT provides qualitative feedback                                   │
│     - What's wrong                                                               │
│     - Why it's wrong                                                             │
│     - How to fix it                                                              │
│                    │                                                             │
│                    ▼                                                             │
│  5. ORCHESTRATOR sends critic feedback to PRIMARY AGENT                          │
│     - Primary agent retries with critic context                                  │
│     - Max 2 retries                                                              │
│                    │                                                             │
│  6. If still failing after 2 retries: FAIL pipeline                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Agent Count: 19 Total
| Type | Count | Agents |
|------|-------|--------|
| **Primary** | 6 | Location, Scope, Cost, Risk, Timeline, Final |
| **Scorer** | 6 | Objective scoring (0-100) for each primary |
| **Critic** | 6 | Qualitative feedback for each primary |
| **Orchestrator** | 1 | Coordinate flow, manage retries |
| **TOTAL** | **19** | |

### Deep Agents Features:
- **Planning Tool** (`write_todos`): Break down complex tasks into discrete steps
- **File System Tools**: `ls`, `read_file`, `write_file`, `edit_file` for context management
- **Subagent Spawning** (`task` tool): Delegate work to specialized subagents for context isolation

### A2A Protocol Features:
- **JSON-RPC 2.0**: Standard message format for agent communication
- **Agent Cards**: JSON metadata describing agent capabilities
- **Task States**: Submitted → Working → Completed/Failed
- **Thread Context**: Conversation continuity across agent calls

**Implementation Pattern:**
- All 19 agents use `create_deep_agent()` from `deepagents` library
- Agents communicate via A2A protocol (JSON-RPC 2.0)
- Each agent exposes A2A endpoint:
  - Primary: `a2a_{agent_name}` (e.g., `a2a_location`)
  - Scorer: `a2a_{agent_name}_scorer` (e.g., `a2a_location_scorer`)
  - Critic: `a2a_{agent_name}_critic` (e.g., `a2a_location_critic`)
- Firestore for persistence + frontend real-time updates
- **Non-linear flow**: 
  - Primary → Scorer → (if score < 80) → Critic → Retry Primary with feedback
  - Max 2 retries per agent
- See `docs/setup/agent-communication.md` for A2A implementation details

---

## File Structure Overview

```
truecost/
├── functions/                           # NEW - Python Cloud Functions
│   ├── __init__.py
│   ├── main.py                          # Cloud Function entry points + A2A endpoints
│   ├── requirements.txt                 # Python dependencies
│   │
│   ├── agents/                          # Deep Agent implementations
│   │   ├── __init__.py
│   │   ├── base_agent.py                # Abstract base class (A2A-compatible)
│   │   ├── agent_cards.py               # A2A Agent Cards registry (19 agents)
│   │   ├── orchestrator.py              # Non-linear pipeline with scorer/critic flow
│   │   │
│   │   ├── primary/                     # Primary agents (do the work) - 6 total
│   │   │   ├── __init__.py
│   │   │   ├── location_agent.py        # Story 2.2 - Location factors
│   │   │   ├── scope_agent.py           # Story 2.3 - BoQ enrichment
│   │   │   ├── cost_agent.py            # Story 2.4 - Cost calculation
│   │   │   ├── risk_agent.py            # Story 2.5 - Monte Carlo
│   │   │   ├── timeline_agent.py        # Story 2.5 - Timeline estimation
│   │   │   └── final_agent.py           # Story 2.5 - Synthesis
│   │   │
│   │   ├── scorers/                     # Scorer agents (objective 0-100) - 6 total
│   │   │   ├── __init__.py
│   │   │   ├── base_scorer.py           # Base scorer agent
│   │   │   ├── location_scorer.py       # Scores location output
│   │   │   ├── scope_scorer.py          # Scores scope/BoQ output
│   │   │   ├── cost_scorer.py           # Scores cost calculations
│   │   │   ├── risk_scorer.py           # Scores risk analysis
│   │   │   ├── timeline_scorer.py       # Scores timeline
│   │   │   └── final_scorer.py          # Scores final estimate
│   │   │
│   │   └── critics/                     # Critic agents (qualitative feedback) - 6 total
│   │       ├── __init__.py
│   │       ├── base_critic.py           # Base critic agent
│   │       ├── location_critic.py       # Critiques location output
│   │       ├── scope_critic.py          # Critiques scope/BoQ output
│   │       ├── cost_critic.py           # Critiques cost calculations
│   │       ├── risk_critic.py           # Critiques risk analysis
│   │       ├── timeline_critic.py       # Critiques timeline
│   │       └── final_critic.py          # Critiques final estimate
│   │
│   ├── services/                        # Service layer
│   │   ├── __init__.py
│   │   ├── firestore_service.py         # Firestore CRUD helpers
│   │   ├── llm_service.py               # LLM wrapper (OpenAI)
│   │   └── a2a_client.py                # A2A protocol client
│   │
│   ├── models/                          # Data models (Pydantic)
│   │   ├── __init__.py
│   │   ├── clarification_output.py      # Input schema validation
│   │   ├── estimate.py                  # Estimate document models
│   │   ├── agent_output.py              # Agent output models
│   │   ├── location_factors.py          # Location data models
│   │   ├── bill_of_quantities.py        # BoQ models
│   │   ├── cost_estimate.py             # Cost calculation models
│   │   ├── risk_analysis.py             # Risk/Monte Carlo models
│   │   └── final_estimate.py            # Final output models
│   │
│   ├── config/                          # Configuration
│   │   ├── __init__.py
│   │   ├── settings.py                  # Environment variables
│   │   └── errors.py                    # Error codes and exceptions
│   │
│   ├── validators/                      # Schema validators
│   │   ├── __init__.py
│   │   └── clarification_validator.py   # ClarificationOutput v3.0.0 validation
│   │
│   └── tests/                           # Test suite
│       ├── __init__.py
│       ├── conftest.py                  # Pytest fixtures
│       ├── fixtures/                    # Test data
│       │   ├── __init__.py
│       │   ├── clarification_output_kitchen.json
│       │   ├── clarification_output_bathroom.json
│       │   └── mock_cost_data.py
│       ├── unit/                        # Unit tests
│       │   ├── __init__.py
│       │   ├── test_clarification_validator.py
│       │   ├── test_orchestrator.py
│       │   ├── test_location_agent.py
│       │   ├── test_scope_agent.py
│       │   ├── test_cost_agent.py
│       │   ├── test_risk_agent.py
│       │   └── test_final_agent.py
│       └── integration/                 # Integration tests
│           ├── __init__.py
│           └── test_pipeline_integration.py
│
├── collabcanvas/                        # Existing - update firestore.rules
│   └── firestore.rules                  # ADD: estimates collection rules
│
└── memory-bank/                         # Documentation
    └── epic2-task-list.md               # This file
```

---

## PR #1: Foundation & Project Setup

**Branch:** `epic2/foundation`
**Story:** 2.1 (Part 1)
**Goal:** Set up Python Cloud Functions structure, dependencies, configuration, and base classes.

### Tasks

- [ ] **1.1 Create functions directory structure**
  - Create: `functions/__init__.py`
  - Create: `functions/agents/__init__.py`
  - Create: `functions/services/__init__.py`
  - Create: `functions/models/__init__.py`
  - Create: `functions/config/__init__.py`
  - Create: `functions/validators/__init__.py`
  - Create: `functions/tests/__init__.py`
  - Create: `functions/tests/unit/__init__.py`
  - Create: `functions/tests/integration/__init__.py`
  - Create: `functions/tests/fixtures/__init__.py`

- [ ] **1.2 Create requirements.txt**
  - Create: `functions/requirements.txt`
  ```
  firebase-admin>=6.0.0
  firebase-functions>=0.4.0
  openai>=1.0.0
  langchain>=0.1.0
  langchain-openai>=0.1.0
  langgraph>=0.2.0
  deepagents>=0.2.0
  httpx>=0.25.0          # A2A protocol HTTP client
  pydantic>=2.0.0
  structlog>=23.0.0
  numpy>=1.24.0
  python-dotenv>=1.0.0
  pytest>=7.0.0
  pytest-asyncio>=0.21.0
  ```

- [ ] **1.3 Create configuration module**
  - Create: `functions/config/settings.py`
    - Environment variable loading
    - LLM_MODEL, OPENAI_API_KEY, LOG_LEVEL
    - Firebase project settings
  - Create: `functions/config/errors.py`
    - TrueCostError exception class
    - Error code constants (VALIDATION_ERROR, AGENT_TIMEOUT, etc.)

- [ ] **1.4 Create Firestore service**
  - Create: `functions/services/firestore_service.py`
    - `get_estimate(estimate_id)` - fetch estimate document
    - `update_estimate(estimate_id, data)` - update estimate
    - `update_agent_status(estimate_id, agent_name, status)` - update pipeline status
    - `save_agent_output(estimate_id, agent_name, output)` - save to agentOutputs subcollection
    - `delete_estimate(estimate_id)` - delete with subcollections

- [ ] **1.5 Create LLM service wrapper**
  - Create: `functions/services/llm_service.py`
    - LangChain OpenAI client initialization (`ChatOpenAI`)
    - Model configuration from environment variables
    - Helper for creating Deep Agents with consistent model settings
    - Token usage tracking
    - Error handling with retries

- [ ] **1.6 Create A2A client service**
  - Create: `functions/services/a2a_client.py`
    - `A2AClient` class for inter-agent communication
    - `send_task(target_agent, message, thread_id)` - send A2A JSON-RPC message
    - `get_task_status(target_agent, task_id)` - get async task status
    - `wait_for_completion(target_agent, task_id)` - poll for completion
    - Timeout handling (5 min default for agent processing)
    - Error handling for JSON-RPC errors

- [ ] **1.7 Create base agent class with A2A support**
  - Create: `functions/agents/base_agent.py`
    - Abstract `BaseA2AAgent` class wrapping Deep Agents + A2A
    - Use `create_deep_agent()` from `deepagents` library
    - `handle_a2a_request(request)` - process incoming A2A JSON-RPC
    - `run(estimate_id, input_data, feedback=None)` abstract method
      - Support optional `feedback` parameter for retry attempts
      - Include feedback in system prompt when provided
    - Common logging setup
    - Firestore status updates
    - Duration and token tracking
    - Integration with Deep Agents' built-in tools (planning, file system, subagents)

- [ ] **1.8 Create agent cards registry**
  - Create: `functions/agents/agent_cards.py`
    - `AGENT_CARDS` dict with metadata for all 5 agents
    - Each card: name, description, version, capabilities, input/output modes
    - Endpoint URLs for each agent

- [ ] **1.9 Create pytest configuration**
  - Create: `functions/tests/conftest.py`
    - Mock Firebase Admin
    - Mock OpenAI client
    - Mock A2A responses
    - Common fixtures
  - Create: `functions/pytest.ini`

- [ ] **1.10 Add unit tests for foundation**
  - Create: `functions/tests/unit/test_config.py`
  - Create: `functions/tests/unit/test_firestore_service.py`
  - Create: `functions/tests/unit/test_llm_service.py`
  - Create: `functions/tests/unit/test_a2a_client.py`
  - Create: `functions/tests/unit/test_base_agent.py`

### Verification
- [ ] `cd functions && pip install -r requirements.txt` succeeds
- [ ] `pytest tests/unit/test_config.py` passes
- [ ] `pytest tests/unit/test_firestore_service.py` passes
- [ ] `pytest tests/unit/test_a2a_client.py` passes
- [ ] All imports work correctly
- [ ] A2A client can construct valid JSON-RPC messages

---

## PR #2: ClarificationOutput Validation & Models

**Branch:** `epic2/clarification-validation`
**Story:** 2.1 (Part 2)
**Goal:** Create Pydantic models for ClarificationOutput v3.0.0 and validation logic.

### Tasks

- [ ] **2.1 Create ClarificationOutput Pydantic models**
  - Create: `functions/models/clarification_output.py`
    - `ClarificationOutput` root model
    - `ProjectBrief` model
    - `Location` model
    - `ScopeSummary` model
    - `Timeline` model
    - `CSIScope` model (all 24 divisions)
    - `CSIDivision` model
    - `CSILineItem` model
    - `CADData` model
    - `SpaceModel` model
    - `Room`, `Wall`, `Opening` models
    - `SpatialRelationships` model
    - `KitchenSpecificData`, `BathroomSpecificData` models
    - `ConversationHistory` model
    - `ValidationFlags` model
    - All enums (ProjectType, CSIDivisionStatus, CSIUnit, etc.)

- [ ] **2.2 Create ClarificationOutput validator**
  - Create: `functions/validators/clarification_validator.py`
    - `validate_clarification_output(data)` - full validation
    - CSI completeness check (all 24 divisions)
    - Exclusion reason validation
    - Location completeness check
    - CAD data presence check
    - Layout narrative length check
    - Schema version check
    - Return `ValidationResult` with errors/warnings

- [ ] **2.3 Create test fixtures**
  - Create: `functions/tests/fixtures/clarification_output_kitchen.json`
    - Copy from `docs/clarification-output-example.json`
  - Create: `functions/tests/fixtures/clarification_output_bathroom.json`
    - Create bathroom remodel example
  - Create: `functions/tests/fixtures/clarification_output_invalid.json`
    - Missing CSI divisions, no exclusion reasons

- [ ] **2.4 Add unit tests for validation**
  - Create: `functions/tests/unit/test_clarification_validator.py`
    - Test valid kitchen remodel passes
    - Test valid bathroom remodel passes
    - Test missing CSI divisions fails
    - Test missing exclusion reasons fails
    - Test invalid schema version fails
    - Test missing CAD data fails

### Verification
- [ ] `pytest tests/unit/test_clarification_validator.py` - all tests pass
- [ ] Kitchen example JSON validates successfully
- [ ] Invalid JSON returns appropriate errors
- [ ] All 24 CSI divisions are checked

---

## PR #3: Orchestrator & Pipeline Infrastructure

**Branch:** `epic2/orchestrator`
**Story:** 2.1 (Part 3)
**Goal:** Create pipeline orchestrator and Cloud Function entry points.

### Tasks

- [ ] **3.1 Create agent output models**
  - Create: `functions/models/agent_output.py`
    - `AgentStatus` enum (pending, running, completed, failed)
    - `AgentOutput` model (status, output, summary, confidence, tokens, duration)
    - `PipelineStatus` model (currentAgent, completedAgents, progress, retries)

- [ ] **3.1a Create validation models**
  - Create: `functions/models/validation.py`
    - `ValidationStatus` enum (passed, failed, warning)
    - `ValidationIssue` model (severity, field, message, suggestion)
    - `ValidationResult` model (status, agent_name, issues, confidence, summary)
    - Validation rules for each agent type

- [ ] **3.1b Create validator agents**
  - Create: `functions/agents/validators/__init__.py`
  - Create: `functions/agents/validators/validator_agent.py` (base validator)
    - Uses Deep Agents for validation
    - Custom validation tools (schema check, data quality check)
    - `validate(agent_name, output, estimate_id)` method
  - Create: `functions/agents/validators/location_validator.py`
  - Create: `functions/agents/validators/scope_validator.py`
  - Create: `functions/agents/validators/cost_validator.py`
  - Create: `functions/agents/validators/risk_validator.py`
  - Create: `functions/agents/validators/final_validator.py`

- [ ] **3.2 Create estimate models**
  - Create: `functions/models/estimate.py`
    - `EstimateStatus` enum (draft, clarifying, processing, plan_review, final, exported)
    - `EstimateDocument` model (all fields from Firestore schema)

- [ ] **3.3 Create orchestrator with A2A**
  - Create: `functions/agents/orchestrator.py`
    - `AGENT_SEQUENCE` constant (5 agents in order)
    - `PipelineOrchestrator` class
    - Uses `A2AClient` to call agents via JSON-RPC
    - `run_pipeline(estimate_id, clarification_output)` - main runner
    - **A2A Communication:**
      - Send task to each agent via `a2a.send_task()`
      - Use `estimate_id` as `thread_id` for context continuity
      - Handle A2A responses (completed/failed)
    - **Validation and retry logic**:
      - After each agent, run validator agent to check output quality
      - If validation fails, retry agent with feedback about issues
      - Maximum 2 retries per agent
      - Store validation results in Firestore
    - **Firestore updates** (for frontend):
      - Update `pipelineStatus.currentAgent`
      - Update `pipelineStatus.progress`
      - Save agent outputs for persistence
    - Error handling and rollback
    - Progress tracking (0-100%)

- [ ] **3.4 Create Cloud Function entry points**
  - Create: `functions/main.py`
    - **A2A Endpoints (per agent):**
      - `a2a_location(req)` - A2A endpoint for Location Agent
      - `a2a_scope(req)` - A2A endpoint for Scope Agent
      - `a2a_cost(req)` - A2A endpoint for Cost Agent
      - `a2a_risk(req)` - A2A endpoint for Risk Agent
      - `a2a_final(req)` - A2A endpoint for Final Agent
      - Each endpoint: parse JSON-RPC, call `agent.handle_a2a_request()`
      - Timeout: 300s (5 min) per agent
    - **Pipeline Entry Points:**
      - `start_deep_pipeline(req)` - validate and start pipeline
        - **Use 2nd gen Cloud Functions** (60-minute timeout support)
        - **Async/fire-and-forget pattern** - start pipeline, return immediately
        - Don't wait for pipeline completion (takes 5-15 minutes)
        - Return: `{success: bool, data: {estimateId, status: "processing"}}`
      - `delete_estimate(req)` - delete estimate and subcollections
      - `get_pipeline_status(req)` - get current status
        - Read from Firestore `pipelineStatus` field
        - Return: `{success: bool, data: {status, currentAgent, progress, completedAgents}}`
    - Response format: `{success: bool, data/error}`
    - Authentication validation
    - Request logging
    - **Note**: Pipeline execution time is 5-15 minutes - frontend listens to Firestore for progress

- [ ] **3.5 Create stub agents for pipeline testing**
  - Create: `functions/agents/location_agent.py` (stub)
  - Create: `functions/agents/scope_agent.py` (stub)
  - Create: `functions/agents/cost_agent.py` (stub)
  - Create: `functions/agents/risk_agent.py` (stub)
  - Create: `functions/agents/final_agent.py` (stub)
  - Each stub returns mock output for pipeline testing

- [ ] **3.6 Add orchestrator unit tests**
  - Create: `functions/tests/unit/test_orchestrator.py`
    - Test pipeline sequence is correct
    - Test status updates work
    - Test error handling
    - Test progress calculation

- [ ] **3.7 Update firebase.json for Python functions**
  - Edit: `collabcanvas/firebase.json`
    - Add Python functions configuration
    - Set runtime to python311
    - Configure memory and timeout

### Verification
- [ ] `firebase emulators:start` - Python functions load
- [ ] Call `start_deep_pipeline` with valid ClarificationOutput - returns estimateId
- [ ] Pipeline status updates visible in Firestore emulator
- [ ] Call `delete_estimate` - document and subcollections deleted
- [ ] `pytest tests/unit/test_orchestrator.py` passes

---

## PR #4: Location Intelligence Agent

**Branch:** `epic2/location-agent`
**Story:** 2.2
**Goal:** Implement Location Agent that retrieves location-based cost factors.

### Tasks

- [ ] **4.1 Create location factor models**
  - Create: `functions/models/location_factors.py`
    - `LaborRates` model (electrician, plumber, carpenter, hvac, etc.)
    - `PermitCosts` model (percentage, fixed amounts)
    - `WeatherFactors` model (seasonal impacts)
    - `LocationFactors` model (laborRates, isUnion, permitCosts, weatherFactors, regionCode)

- [ ] **4.2 Create mock cost data service interface**
  - Create: `functions/services/cost_data_service.py` (interface + mock)
    - `get_location_factors(zip_code)` - returns LocationFactors
    - Mock data for major metros (Denver, NYC, Chicago, LA, etc.)
    - Regional defaults for unknown zip codes
    - Cache mechanism (in-memory for now)

- [ ] **4.3 Implement Location Agent**
  - Edit: `functions/agents/location_agent.py`
    - Inherit from `BaseAgent` (wraps Deep Agents)
    - Use `create_deep_agent()` with custom system prompt for location analysis
    - Add custom tools: `get_location_factors` tool for cost data service
    - Read `projectBrief.location.zipCode` from ClarificationOutput
    - Use Deep Agents' planning tool to break down analysis steps
    - Call `cost_data_service.get_location_factors()` via tool
    - Extract and structure labor rates
    - Determine union vs non-union market
    - Get permit cost estimates
    - Get weather/seasonal factors
    - Use file system tools to store intermediate results if needed
    - Save `locationFactors` to estimate document
    - Generate human-readable summary

- [ ] **4.4 Create mock location data fixtures**
  - Create: `functions/tests/fixtures/mock_cost_data.py`
    - Denver (80202) - mixed market
    - NYC (10001) - union, high rates
    - Houston (77001) - non-union, lower rates
    - Unknown zip defaults

- [ ] **4.5 Add Location Agent tests**
  - Create: `functions/tests/unit/test_location_agent.py`
    - Test Denver zip returns correct data
    - Test NYC returns union market
    - Test unknown zip uses defaults
    - Test output schema is correct
    - Test Firestore update called

### Verification
- [ ] Location Agent runs in pipeline without errors
- [ ] Firestore `/estimates/{id}/agentOutputs/location` created
- [ ] `locationFactors` field populated on estimate document
- [ ] Labor rates match expected values for test zips
- [ ] `pytest tests/unit/test_location_agent.py` passes

---

## PR #5: Construction Scope Agent

**Branch:** `epic2/scope-agent`
**Story:** 2.3
**Goal:** Implement Scope Agent that enriches Bill of Quantities with cost codes.

### Tasks

- [ ] **5.1 Create Bill of Quantities models**
  - Create: `functions/models/bill_of_quantities.py`
    - `EnrichedLineItem` model (adds costCode, unitCost reference)
    - `EnrichedDivision` model
    - `BillOfQuantities` model (divisions array)
    - Validation for quantity calculations

- [ ] **5.2 Add cost code lookup to cost data service**
  - Edit: `functions/services/cost_data_service.py`
    - `get_cost_code(item_description, division)` - map to RSMeans code
    - Mock cost code database
    - Fuzzy matching for item descriptions

- [ ] **5.3 Implement Scope Agent**
  - Edit: `functions/agents/scope_agent.py`
    - Inherit from `BaseAgent` (wraps Deep Agents)
    - Use `create_deep_agent()` with system prompt for scope enrichment
    - Add custom tools: `get_cost_code`, `validate_quantities`, `check_completeness`
    - Use Deep Agents' planning tool to organize work by CSI division
    - Read `csiScope` from ClarificationOutput
    - For each included division:
      - Validate line items have quantities
      - Map items to cost database codes via tool
      - Add `costCode` to each line item
    - Validate quantities against `cadData.spaceModel`:
      - Check sqft totals match
      - Flag discrepancies
    - Use Deep Agent's LLM capabilities to:
      - Verify completeness for project type
      - Suggest missing items
      - Validate material selections match finishLevel
    - Use subagent tool for complex division validation if needed
    - Save enriched `billOfQuantities` to estimate document
    - Generate summary with item counts per division

- [ ] **5.4 Add Scope Agent tests**
  - Create: `functions/tests/unit/test_scope_agent.py`
    - Test kitchen remodel produces correct divisions
    - Test cost codes assigned to line items
    - Test quantity validation against CAD data
    - Test finishLevel affects material selection
    - Test incomplete scope generates warnings

### Verification
- [ ] Scope Agent runs after Location Agent completes
- [ ] `billOfQuantities` field populated with enriched data
- [ ] Each line item has `costCode` assigned
- [ ] Firestore `/estimates/{id}/agentOutputs/scope` created
- [ ] `pytest tests/unit/test_scope_agent.py` passes

---

## PR #6: Cost Estimation Agent

**Branch:** `epic2/cost-agent`
**Story:** 2.4
**Goal:** Implement Cost Agent that calculates material, labor, and equipment costs.

### Tasks

- [ ] **6.1 Create cost estimate models**
  - Create: `functions/models/cost_estimate.py`
    - `MaterialCost` model (itemCode, quantity, unitCost, totalCost)
    - `LaborCost` model (trade, hours, rate, totalCost)
    - `EquipmentCost` model (item, days, rate, totalCost)
    - `CostSubtotals` model (materials, labor, equipment)
    - `CostAdjustments` model (locationFactor, overhead, profit)
    - `CostEstimate` model (lineItems, subtotals, adjustments, total, confidence)

- [ ] **6.2 Add material cost lookup to cost data service**
  - Edit: `functions/services/cost_data_service.py`
    - `get_material_cost(cost_code)` - returns unit cost, labor hours
    - `get_labor_rate(trade, zip_code)` - returns hourly rate
    - `get_equipment_cost(item)` - returns daily rate
    - Mock RSMeans-schema data for common items

- [ ] **6.3 Implement Cost Agent**
  - Edit: `functions/agents/cost_agent.py`
    - Inherit from `BaseAgent` (wraps Deep Agents)
    - Use `create_deep_agent()` with system prompt for cost calculation
    - Add custom tools: `get_material_cost`, `get_labor_rate`, `get_equipment_cost`
    - Use Deep Agents' planning tool to organize cost calculation by division
    - Read `billOfQuantities` from previous agent
    - Read `locationFactors` for rate adjustments
    - For each line item:
      - Look up unit cost from cost database via tool
      - Calculate: `materialCost = quantity × unitCost`
      - Calculate labor hours and cost
      - Add equipment costs where needed
    - Apply adjustments:
      - Location factor multiplier
      - Overhead percentage (default 10%)
      - Profit percentage (default 10%)
    - Calculate totals:
      - Materials subtotal
      - Labor subtotal
      - Equipment subtotal
      - Adjusted grand total
    - Use file system tools to store intermediate calculations if needed
    - Calculate confidence based on data quality
    - Save `costEstimate` to estimate document

- [ ] **6.4 Add Cost Agent tests**
  - Create: `functions/tests/unit/test_cost_agent.py`
    - Test material cost calculation
    - Test labor cost with location rates
    - Test equipment cost inclusion
    - Test overhead/profit application
    - Test location factor adjustment
    - Test confidence scoring

### Verification
- [ ] Cost Agent runs after Scope Agent completes
- [ ] `costEstimate` field populated with full breakdown
- [ ] Material costs = quantity × unit cost
- [ ] Location factors applied correctly
- [ ] Firestore `/estimates/{id}/agentOutputs/cost` created
- [ ] `pytest tests/unit/test_cost_agent.py` passes

---

## PR #7: Risk Analysis & Final Estimator Agents

**Branch:** `epic2/risk-final-agents`
**Story:** 2.5
**Goal:** Implement Risk Agent (Monte Carlo) and Final Agent (synthesis).

### Tasks

- [ ] **7.1 Create risk analysis models**
  - Create: `functions/models/risk_analysis.py`
    - `RiskFactor` model (item, impact, probability, description)
    - `MonteCarloResult` model (p50, p80, p90, distribution)
    - `RiskAnalysis` model (percentiles, contingency, topRisks, narrative)

- [ ] **7.2 Create mock Monte Carlo service**
  - Create: `functions/services/monte_carlo_service.py` (interface + mock)
    - `run_simulation(line_items, iterations)` - call Dev 4's service
    - Mock implementation using NumPy triangular distributions
    - Calculate P50, P80, P90 percentiles
    - Identify top 5 risk factors by variance contribution
    - Recommend contingency percentage

- [ ] **7.3 Implement Risk Agent**
  - Edit: `functions/agents/risk_agent.py`
    - Inherit from `BaseAgent` (wraps Deep Agents)
    - Use `create_deep_agent()` with system prompt for risk analysis
    - Add custom tool: `run_monte_carlo_simulation`
    - Use Deep Agents' planning tool to organize risk analysis steps
    - Read `costEstimate` from previous agent
    - Prepare line items with uncertainty ranges:
      - Low: -10% of likely
      - High: +20% of likely
    - Call Monte Carlo service via tool (1000 iterations)
    - Calculate contingency: `(P80 - P50) / P50 × 100`
    - Identify top 5 risk factors
    - Use Deep Agent's LLM to generate risk narrative
    - Use file system tools to store simulation results if needed
    - Save `riskAnalysis` to estimate document

- [ ] **7.4 Create final estimate models**
  - Create: `functions/models/final_estimate.py`
    - `ExecutiveSummary` model (totalCost, timeline, confidenceRange)
    - `TimelineTask` model (name, duration, dependencies, start, end)
    - `ProjectTimeline` model (totalDuration, tasks, criticalPath)
    - `FinalEstimate` model (summary, timeline, breakdown, recommendations)

- [ ] **7.5 Implement Final Agent**
  - Edit: `functions/agents/final_agent.py`
    - Inherit from `BaseAgent` (wraps Deep Agents)
    - Use `create_deep_agent()` with system prompt for final synthesis
    - Use Deep Agents' planning tool to organize final report generation
    - Aggregate all previous agent outputs
    - Use file system tools to read previous agent outputs if needed
    - Generate executive summary:
      - Total cost (with contingency)
      - Timeline estimate
      - Confidence range (P50/P80/P90)
    - Generate project timeline:
      - Calculate task durations from scope
      - Create task dependencies
      - Identify critical path
    - Use Deep Agent's LLM to:
      - Generate recommendations
      - Create professional summary text
    - Use subagent tool for complex timeline generation if needed
    - Save `finalEstimate` to estimate document
    - Update estimate status to "complete"

- [ ] **7.6 Add Risk and Final Agent tests**
  - Create: `functions/tests/unit/test_risk_agent.py`
    - Test Monte Carlo produces valid percentiles
    - Test contingency calculation
    - Test top risks identification
  - Create: `functions/tests/unit/test_final_agent.py`
    - Test aggregation of all outputs
    - Test timeline generation
    - Test status update to "complete"

- [ ] **7.7 Create integration test**
  - Create: `functions/tests/integration/test_pipeline_integration.py`
    - Full pipeline test with kitchen remodel
    - Verify all 5 agents complete
    - Verify final estimate has all sections
    - Verify status is "complete"

### Verification
- [ ] Risk Agent produces P50 < P80 < P90
- [ ] Contingency percentage is reasonable (5-20%)
- [ ] Top 5 risks identified and sorted by impact
- [ ] Final Agent aggregates all outputs
- [ ] Timeline generated with dependencies
- [ ] Estimate status changes to "complete"
- [ ] All 5 agent outputs in `/agentOutputs/` subcollection
- [ ] `pytest tests/` - all tests pass
- [ ] Integration test completes full pipeline

---

## PR #8: Firestore Rules & Documentation

**Branch:** `epic2/firestore-rules`
**Goal:** Update Firestore security rules and finalize documentation.

### Tasks

- [ ] **8.1 Update Firestore security rules**
  - Edit: `collabcanvas/firestore.rules`
    - Add `/estimates/{estimateId}` collection rules
    - Add `/estimates/{estimateId}/agentOutputs/{agentId}` rules
    - Add `/estimates/{estimateId}/conversations/{msgId}` rules
    - Add `/estimates/{estimateId}/versions/{versionId}` rules
    - User can only access own estimates
    - Read-only for agent outputs after completion

- [ ] **8.2 Update memory bank**
  - Edit: `memory-bank/progress.md` - mark stories complete
  - Edit: `memory-bank/activeContext.md` - update current focus

- [ ] **8.3 Create API documentation**
  - Create: `docs/api/deep-pipeline-api.md`
    - `start_deep_pipeline` request/response
    - `delete_estimate` request/response
    - `get_pipeline_status` request/response
    - Error codes and handling

- [ ] **8.4 Final testing**
  - Run full test suite
  - Deploy to Firebase emulators
  - Manual end-to-end test with kitchen example

### Verification
- [ ] Firestore rules deploy without errors
- [ ] User can only access own estimates
- [ ] All tests pass
- [ ] Documentation complete

---

## Summary

| PR | Branch | Story | Description | Key Files |
|----|--------|-------|-------------|-----------|
| 1 | `epic2/foundation` | 2.1 | Project setup, config, services, A2A client, base classes | `requirements.txt`, `config/`, `services/a2a_client.py`, `base_agent.py`, `base_scorer.py`, `base_critic.py` |
| 2 | `epic2/clarification-validation` | 2.1 | ClarificationOutput models & validation | `models/clarification_output.py`, `validators/` |
| 3 | `epic2/orchestrator` | 2.1 | A2A orchestrator with Scorer+Critic flow & 18 endpoints | `orchestrator.py`, `main.py` (18 A2A endpoints) |
| 4 | `epic2/location-agent` | 2.2 | Location Agent + Scorer + Critic | `location_agent.py`, `location_scorer.py`, `location_critic.py` |
| 5 | `epic2/scope-agent` | 2.3 | Scope Agent + Scorer + Critic | `scope_agent.py`, `scope_scorer.py`, `scope_critic.py` |
| 6 | `epic2/cost-agent` | 2.4 | Cost Agent + Scorer + Critic | `cost_agent.py`, `cost_scorer.py`, `cost_critic.py` |
| 7 | `epic2/risk-timeline-final` | 2.5 | Risk, Timeline, Final + Scorers + Critics | All remaining agents (9 total) |
| 8 | `epic2/firestore-rules` | - | Security rules & docs | `firestore.rules`, API docs |

---

## Dependencies Between PRs

```
PR #1 (Foundation)
    ↓
PR #2 (Validation) ──────────┐
    ↓                        │
PR #3 (Orchestrator) ←───────┘
    ↓
PR #4 (Location Agent)
    ↓
PR #5 (Scope Agent)
    ↓
PR #6 (Cost Agent)
    ↓
PR #7 (Risk & Final Agents)
    ↓
PR #8 (Rules & Docs)
```

---

## External Dependencies (From Dev 4)

These services are mocked in this Epic. When Dev 4 delivers:

| Service | PR to Update | Action |
|---------|--------------|--------|
| `cost_data_service.get_location_factors()` | PR #4 | Replace mock with real call |
| `cost_data_service.get_material_cost()` | PR #6 | Replace mock with real call |
| `monte_carlo.run_simulation()` | PR #7 | Replace mock with real call |

---

_Last Updated: December 10, 2025_

