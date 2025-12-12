# A2A Protocol Quick Start for TrueCost

## TL;DR

TrueCost uses **A2A Protocol (Agent2Agent)** for inter-agent communication with a **non-linear pipeline** that includes **Scorer + Critic validation** and retry loops.

### Full Architecture: 19 Agents Total

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ORCHESTRATOR                                               │
│  - Coordinates 6 primary + 6 scorer + 6 critic agents via A2A                                 │
│  - Flow: Primary → Scorer → (if score < 80) → Critic → Retry with feedback                   │
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
| **Critic** | 6 | Qualitative feedback (when score < 80) |
| **Orchestrator** | 1 | Coordinate all agents |
| **TOTAL** | **19** | |

### Validation Flow
```
Primary Agent → Scorer (0-100) → Score ≥ 80? → YES → Next Agent
                                     ↓
                                    NO
                                     ↓
                              Critic (feedback)
                                     ↓
                              Retry with feedback
                              (max 2 retries)
```

## What is A2A?

**A2A (Agent2Agent)** is Google's open protocol for AI agent communication:
- **JSON-RPC 2.0** message format
- **Agent Cards** for capability discovery
- **Task states**: Submitted → Working → Completed/Failed
- **Thread context** for conversation continuity

## Key Files

| File | Purpose |
|------|---------|
| `services/a2a_client.py` | Client to call other agents |
| `agents/base_agent.py` | Base class with A2A handler |
| `agents/agent_cards.py` | Agent capability registry (19 agents) |
| `agents/orchestrator.py` | Non-linear pipeline with Scorer + Critic flow |
| **Primary Agents (6)** | |
| `agents/primary/` | location, scope, cost, risk, timeline, final |
| **Scorer Agents (6)** | |
| `agents/scorers/` | Objective scoring (0-100) for each primary |
| `agents/scorers/base_scorer.py` | Base scorer agent class |
| **Critic Agents (6)** | |
| `agents/critics/` | Qualitative feedback for each primary |
| `agents/critics/base_critic.py` | Base critic agent class |
| **Endpoints** | |
| `main.py` | 18 A2A endpoints (`a2a_location`, `a2a_location_scorer`, `a2a_location_critic`, etc.) |

## Basic Usage

### 1. Call Another Agent

```python
from services.a2a_client import A2AClient

a2a = A2AClient()

# Send task to scope agent
response = await a2a.send_task(
    target_agent="scope",
    message={
        "estimate_id": "est-123",
        "input": {"locationFactors": {...}}
    },
    thread_id="est-123"
)

# Check result
if response["result"]["status"] == "completed":
    scope_output = response["result"]["result"]
```

### 2. Create an Agent

```python
from agents.base_agent import BaseA2AAgent
from deepagents import create_deep_agent

class MyAgent(BaseA2AAgent):
    def __init__(self, firestore_service):
        super().__init__("my_agent", firestore_service)
        self.agent = create_deep_agent(
            model=ChatOpenAI(model="gpt-4.1"),
            system_prompt="You are a helpful agent..."
        )
    
    async def run(self, estimate_id: str, input_data: dict) -> dict:
        # Your agent logic here
        result = await self.agent.ainvoke(...)
        return result
```

### 3. Expose A2A Endpoint

```python
# main.py
@https_fn.on_request(timeout_sec=300)
async def a2a_my_agent(req):
    agent = MyAgent(firestore)
    request_data = req.get_json()
    result = await agent.handle_a2a_request(request_data)
    return https_fn.Response(json=result)
```

## A2A Message Format

### Request
```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "method": "message/send",
  "params": {
    "message": {
      "role": "user",
      "parts": [{"type": "data", "data": {...}}]
    },
    "context": {"thread_id": "est-456"}
  }
}
```

### Response (Success)
```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "result": {
    "task_id": "task-789",
    "status": "completed",
    "result": {...}
  }
}
```

### Response (Failure)
```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "result": {
    "task_id": "task-789",
    "status": "failed",
    "error": "Error message"
  }
}
```

## Firestore (Still Important!)

A2A handles communication; Firestore handles:
- **Persistence**: Save outputs for recovery
- **Frontend**: Real-time updates via `onSnapshot`
- **State backup**: Pipeline progress

```python
# Agent saves to Firestore after A2A response
await self.firestore.save_agent_output(estimate_id, self.name, result)
```

## References

- [A2A Protocol Docs](https://agent2agent.info/docs/introduction/)
- [LangSmith A2A](https://docs.langchain.com/langsmith/server-a2a)
- [TrueCost Agent Communication](./agent-communication.md)
- [Protocol Comparison](./agent-protocols-comparison.md)

