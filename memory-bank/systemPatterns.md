# TrueCost - System Patterns

## Architecture Decisions

### ADR-001: LangChain Deep Agents for Agent Orchestration

**Decision**: Use LangChain Deep Agents (`deepagents` library) for agent orchestration

**Rationale**:
- Built-in planning tool (`write_todos`) for task decomposition
- Native subagent spawning via `task` tool
- File system tools (`ls`, `read_file`, `write_file`, `edit_file`) for context management
- Built on LangGraph with LangChain integration
- Perfect for complex multi-step tasks like cost estimation
- Context management for large CAD data through file system tools

**Implementation**:
- Install: `pip install deepagents>=0.2.0`
- Import: `from deepagents import create_deep_agent`
- Each agent (Location, Scope, Cost, Risk, Final) uses Deep Agents pattern
- See `docs/setup/deep-agents-integration.md` for details

**Consequence**: Mixed language codebase (TypeScript frontend, Python backend)

### ADR-002: GPT-4.1 with Env Var Configuration

**Decision**: Default to GPT-4.1, configurable via `LLM_MODEL`

**Rationale**:
- Strong instruction following
- 1M token context
- Easily swappable for testing/cost optimization

### ADR-003: A2A Protocol for Agent Communication

**Decision**: Use A2A (Agent2Agent) Protocol for inter-agent communication

**Rationale**:
- Industry standard (Google-backed)
- JSON-RPC 2.0 message format
- Agent Cards for capability discovery
- Task state tracking (Submitted → Working → Completed/Failed)
- LangChain/LangSmith integration
- Future-proof for external agent integrations

**Implementation**:
- Each agent exposes A2A endpoint (`a2a_{agent_name}`)
- Orchestrator uses A2A client to call agents
- Firestore for persistence + frontend updates (hybrid)

### ADR-004: Firestore for Agent State

**Decision**: Store agent state in Firestore with real-time listeners

**Rationale**:
- Firebase-native
- Real-time updates to frontend
- Built-in persistence
- Works alongside A2A for state backup

## Deep Agent Pipeline Architecture

### Agent Sequence

```python
DEEP_AGENT_SEQUENCE = [
    ("location", LocationAgent),      # Zip-code based data
    ("scope", ScopeAgent),            # BoQ in CSI MasterFormat
    ("cost", CostAgent),              # Material/labor/equipment costs
    ("risk", RiskAgent),              # Monte Carlo simulation
    ("final", FinalAgent),            # Synthesis + report
]
```

**Note**: Clarification + CAD Analysis are handled by Dev 3 before handoff.

### Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Dev 3 Produces                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ CAD Upload  │  │   Voice/    │  │    Clarification        │ │
│  │  & Parse    │→ │   Text      │→ │       Agent             │ │
│  └─────────────┘  └─────────────┘  └───────────┬─────────────┘ │
└────────────────────────────────────────────────┼───────────────┘
                                                 │
                                                 ▼
                                    ┌────────────────────────┐
                                    │  ClarificationOutput   │
                                    │    (Schema v3.0.0)     │
                                    └────────────┬───────────┘
                                                 │
┌────────────────────────────────────────────────┼───────────────┐
│                        Dev 2 Consumes                          │
│                                                ▼               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐│
│  │  Location   │→ │   Scope     │→ │  Cost → Risk → Final    ││
│  │   Agent     │  │   Agent     │  │       Agents            ││
│  └─────────────┘  └─────────────┘  └─────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

## Firestore Data Architecture

### Collections

```
firestore/
├── users/{userId}
│   └── profile, settings
│
├── estimates/{estimateId}
│   ├── userId, projectName, status, createdAt, updatedAt
│   ├── cadFileRef: "gs://bucket/cad/{estimateId}/file.pdf"
│   ├── clarificationOutput: { ... }     # From Dev 3
│   ├── locationFactors: { ... }         # From Location Agent
│   ├── billOfQuantities: { ... }        # From Scope Agent
│   ├── costEstimate: { ... }            # From Cost Agent
│   ├── riskAnalysis: { ... }            # From Risk Agent
│   ├── finalEstimate: { ... }           # From Final Agent
│   ├── pipelineStatus: { currentAgent, completedAgents[], progress }
│   │
│   ├── /agentOutputs/{agentName}
│   │   └── { status, output, summary, confidence, tokensUsed, duration }
│   │
│   ├── /conversations/{messageId}
│   │   └── { role, content, timestamp }
│   │
│   └── /versions/{versionId}
│       └── { snapshot, createdAt, reason }
│
├── feedback/{feedbackId}
│   └── { estimateId, userId, actualCosts, variance }
│
└── costData/                     # RSMeans-schema mock (Dev 4)
    ├── materials/{materialId}
    ├── laborRates/{rateId}
    └── locationFactors/{zipCode}
```

### Status Flows

**Estimate Status**:
```
"draft" → "clarifying" → "processing" → "plan_review" → "final" → "exported"
```

**Agent Status**:
```
"pending" → "running" → "completed"
               ↓
           "failed" → "retrying" → "completed" | "failed"
```

## API Patterns

### Response Format

```python
# Success
{"success": True, "data": {...}}

# Error
{"success": False, "error": {"code": "ERROR_CODE", "message": "...", "details": {}}}
```

### Error Handling

```python
class TrueCostError(Exception):
    def __init__(self, code: str, message: str, details: dict = None):
        self.code = code
        self.message = message
        self.details = details or {}

# Error codes
CAD_PARSE_FAILED = "CAD_PARSE_FAILED"
AGENT_TIMEOUT = "AGENT_TIMEOUT"
VALIDATION_ERROR = "VALIDATION_ERROR"
```

### Logging

```python
import structlog
logger = structlog.get_logger()

logger.info("agent_started", estimate_id=id, agent="location")
logger.info("agent_completed", estimate_id=id, agent="location", duration_ms=1234)
logger.error("agent_failed", estimate_id=id, agent="location", error=str(e))
```

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Python functions | snake_case | `start_estimate`, `run_pipeline` |
| Python classes | PascalCase | `LocationAgent`, `TrueCostError` |
| Python files | snake_case | `location_agent.py`, `monte_carlo.py` |
| Firestore collections | camelCase | `estimates`, `agentOutputs` |
| Firestore fields | camelCase | `estimateId`, `createdAt` |
| Environment variables | SCREAMING_SNAKE | `LLM_MODEL`, `OPENAI_API_KEY` |

## Service Interfaces (Dependencies from Dev 4)

```python
# Location Service (Dev 4 implements, Dev 2 consumes)
def get_location_factors(zip_code: str) -> LocationFactors:
    """Returns {laborRates: {}, isUnion: bool, permitCosts: {}, weatherFactors: {}}"""

# Cost Data (Dev 4 implements, Dev 2 consumes)
def get_material_cost(item_code: str) -> MaterialCost:
    """Returns {unitCost: float, laborHours: float, crew: str, productivity: float}"""

# Monte Carlo (Dev 4 implements, Dev 2 consumes)
def run_simulation(line_items: list, iterations: int = 1000) -> MonteCarloResult:
    """Returns {p50: float, p80: float, p90: float, contingency: float, topRisks: []}"""
```

## Handoff Contract: Dev 3 → Dev 2

**Input**: `ClarificationOutput` v3.0.0

Key fields consumed by Deep Pipeline:
- `projectBrief.location.zipCode` - For Location Agent
- `csiScope` - All 24 CSI divisions with status
- `cadData.spaceModel` - Measurements for quantity validation
- `cadData.spatialRelationships` - Layout understanding
- `projectBrief.scopeSummary.finishLevel` - Material selection

