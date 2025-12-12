# Agent Communication Protocols Comparison

## Overview

There are several protocols available for agent communication. This document compares them and explains which to use for TrueCost.

## Protocol Comparison

| Protocol | Type | Use Case | LangChain Support |
|----------|------|----------|-------------------|
| **A2A (Agent2Agent)** | Inter-agent communication | Agents across systems/vendors | ✅ LangSmith Agent Server |
| **MCP (Model Context Protocol)** | Tool/context sharing | LLMs accessing tools | ✅ langchain-mcp-adapters |
| **ACP (Agent Communication Protocol)** | Unified agent communication | Multi-agent coordination | Under development |
| **Subagents (task tool)** | Context isolation | Within one agent | ✅ Deep Agents built-in |
| **Firestore (TrueCost)** | Data-driven pipeline | Sequential pipeline | ✅ Custom implementation |

---

## 1. A2A Protocol (Agent2Agent)

**What**: Google's open protocol for agent-to-agent communication.

**Source**: [a2a-protocol.org](https://agent2agent.info/docs/introduction/)

### Key Features

- **JSON-RPC 2.0** over HTTP(S)
- **Agent Cards**: JSON metadata describing agent capabilities
- **Task-based workflow**: Submitted → Working → Completed/Failed
- **SSE streaming** for real-time updates
- **Enterprise security**: Authentication, authorization

### How It Works

```
┌─────────────┐                    ┌─────────────┐
│  Agent A    │                    │  Agent B    │
│             │                    │             │
│  /a2a/{id}  │◄──── JSON-RPC ────►│  /a2a/{id}  │
│             │                    │             │
└─────────────┘                    └─────────────┘

1. Agent A discovers Agent B via Agent Card
2. Agent A sends JSON-RPC message to /a2a/{agent_b_id}
3. Agent B processes, returns result
4. Task states tracked: Submitted → Working → Completed
```

### Agent Card Example

```json
{
  "name": "Location Agent",
  "description": "Analyzes location factors for construction estimates",
  "version": "1.0.0",
  "capabilities": ["location-analysis", "labor-rates"],
  "input_modes": ["text", "json"],
  "output_modes": ["json"],
  "endpoint": "https://api.truecost.com/a2a/location-agent"
}
```

### JSON-RPC Message Example

```json
// Request
{
  "jsonrpc": "2.0",
  "id": "task-123",
  "method": "message/send",
  "params": {
    "message": {
      "role": "user",
      "parts": [
        {"type": "text", "text": "Analyze location for zip 80202"}
      ]
    }
  }
}

// Response
{
  "jsonrpc": "2.0",
  "id": "task-123",
  "result": {
    "task_id": "task-456",
    "status": "completed",
    "result": {
      "zipCode": "80202",
      "laborRates": {...}
    }
  }
}
```

### LangChain Integration

```python
# LangSmith Agent Server provides A2A endpoints
# /a2a/{assistant_id}

# Example: Agent-to-agent communication
import requests

# Send message to another agent
response = requests.post(
    "http://localhost:8124/a2a/scope-agent",
    json={
        "jsonrpc": "2.0",
        "id": "msg-1",
        "method": "message/send",
        "params": {
            "message": {
                "role": "user",
                "parts": [{"type": "text", "text": "Enrich BoQ"}]
            }
        }
    }
)
```

---

## 2. MCP (Model Context Protocol)

**What**: Anthropic's protocol for exposing tools and context to LLMs.

**Source**: [modelcontextprotocol.io](https://modelcontextprotocol.io/)

### Key Features

- **Tool exposure**: Define tools that LLMs can call
- **Resource sharing**: Expose data/context to models
- **Transport**: HTTP/SSE or stdio
- **Stateless or stateful**: Configurable sessions

### How It Works

```
┌─────────────┐                    ┌─────────────┐
│   Agent     │                    │ MCP Server  │
│             │ ──── List Tools ──►│             │
│   (LLM)     │◄─── Tool List ─────│ (provides   │
│             │                    │   tools)    │
│             │ ─── Call Tool ────►│             │
│             │◄── Tool Result ────│             │
└─────────────┘                    └─────────────┘
```

### LangChain Integration

```python
from langchain_mcp_adapters import MultiServerMCPClient

# Connect to MCP servers
client = MultiServerMCPClient({
    "cost_data": {
        "transport": "stdio",
        "command": "python",
        "args": ["cost_data_server.py"]
    }
})

# Get tools from MCP
tools = await client.get_tools()

# Use tools in agent
agent = create_deep_agent(
    model=ChatOpenAI(model="gpt-4"),
    tools=tools  # MCP tools available to agent
)
```

---

## 3. ACP (Agent Communication Protocol)

**What**: Emerging standard for unified agent communication.

**Source**: [agentcommunicationprotocol.dev](https://agentcommunicationprotocol.dev/)

### Key Features

- **Unified protocol** for agent communication
- **Event-driven**: Publish/subscribe model
- **Multi-modal**: Text, data, files
- **Designed for**: Multi-agent coordination

### Status

ACP is still under active development. Not yet widely adopted.

---

## 4. TrueCost Decision: A2A Protocol for MVP

### ✅ Decision: Use A2A Protocol for All Agent Communication

**Rationale:**
- Industry standard (Google-backed) - future-proof
- LangChain/LangSmith integration
- Enterprise-grade security and scalability
- Agent discoverability via Agent Cards
- Task state tracking built-in
- Enables future external integrations without refactoring

**Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    A2A Protocol Layer                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Location Agent ──A2A──► Scope Agent ──A2A──► Cost Agent        │
│       │                      │                   │               │
│       │                      │                   │               │
│       ▼                      ▼                   ▼               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     Firestore                                ││
│  │  (Persistence, Frontend Real-time Updates, Pipeline State)  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Risk Agent ──A2A──► Final Agent                                │
│       │                   │                                      │
│       ▼                   ▼                                      │
│                     Firestore                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Hybrid Approach:**
- **A2A**: Agent-to-agent communication (primary)
- **Firestore**: Persistence, frontend real-time updates, state backup

---

## 5. Implementing A2A in TrueCost (MVP)

### TrueCost Agent Registry

Each agent exposes an Agent Card for discovery:

```python
# functions/agents/agent_cards.py
AGENT_CARDS = {
    "location": {
        "name": "TrueCost Location Agent",
        "description": "Analyzes location factors for construction estimates",
        "version": "1.0.0",
        "capabilities": ["location-analysis", "labor-rates", "permit-costs"],
        "input_modes": ["json"],
        "output_modes": ["json"],
    },
    "scope": {
        "name": "TrueCost Scope Agent",
        "description": "Enriches Bill of Quantities with cost codes",
        "version": "1.0.0",
        "capabilities": ["boq-enrichment", "cost-codes", "validation"],
        "input_modes": ["json"],
        "output_modes": ["json"],
    },
    "cost": {
        "name": "TrueCost Cost Agent",
        "description": "Calculates material, labor, and equipment costs",
        "version": "1.0.0",
        "capabilities": ["cost-calculation", "pricing"],
        "input_modes": ["json"],
        "output_modes": ["json"],
    },
    "risk": {
        "name": "TrueCost Risk Agent",
        "description": "Performs Monte Carlo simulation for risk analysis",
        "version": "1.0.0",
        "capabilities": ["monte-carlo", "risk-assessment"],
        "input_modes": ["json"],
        "output_modes": ["json"],
    },
    "final": {
        "name": "TrueCost Final Agent",
        "description": "Synthesizes final estimate with timeline",
        "version": "1.0.0",
        "capabilities": ["synthesis", "timeline", "reporting"],
        "input_modes": ["json"],
        "output_modes": ["json"],
    },
}
```

### A2A Client Implementation

```python
# functions/services/a2a_client.py
from typing import Dict, Any
from uuid import uuid4
import httpx

class A2AClient:
    """Client for A2A protocol communication between agents."""
    
    def __init__(self, base_url: str = "http://localhost:8124"):
        self.base_url = base_url
    
    async def send_task(
        self,
        target_agent: str,
        message: Dict[str, Any],
        thread_id: str = None
    ) -> Dict:
        """Send A2A task to another agent."""
        payload = {
            "jsonrpc": "2.0",
            "id": str(uuid4()),
            "method": "message/send",
            "params": {
                "message": {
                    "role": "user",
                    "parts": [
                        {"type": "data", "data": message}
                    ]
                }
            }
        }
        
        if thread_id:
            payload["params"]["context"] = {"thread_id": thread_id}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/a2a/{target_agent}",
                json=payload,
                timeout=300.0  # 5 min timeout for agent processing
            )
            return response.json()
    
    async def get_task_status(self, target_agent: str, task_id: str) -> Dict:
        """Get status of a task."""
        payload = {
            "jsonrpc": "2.0",
            "id": str(uuid4()),
            "method": "tasks/get",
            "params": {"task_id": task_id}
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/a2a/{target_agent}",
                json=payload
            )
            return response.json()
    
    async def wait_for_completion(
        self,
        target_agent: str,
        task_id: str,
        poll_interval: float = 2.0,
        timeout: float = 300.0
    ) -> Dict:
        """Wait for task completion with polling."""
        import asyncio
        elapsed = 0
        while elapsed < timeout:
            status = await self.get_task_status(target_agent, task_id)
            if status.get("result", {}).get("status") in ["completed", "failed"]:
                return status
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval
        raise TimeoutError(f"Task {task_id} timed out after {timeout}s")
```

### A2A Server Handler (Cloud Functions)

```python
# functions/agents/a2a_handler.py
from typing import Dict, Any
from uuid import uuid4
from firebase_functions import https_fn

class A2AHandler:
    """Handle incoming A2A requests for TrueCost agents."""
    
    def __init__(self, agents: Dict[str, Any]):
        self.agents = agents
    
    async def handle_request(self, agent_name: str, request: Dict) -> Dict:
        """Handle A2A JSON-RPC request."""
        method = request.get("method")
        params = request.get("params", {})
        request_id = request.get("id")
        
        if method == "message/send":
            return await self._handle_message(agent_name, params, request_id)
        elif method == "tasks/get":
            return await self._handle_task_status(agent_name, params, request_id)
        else:
            return self._error_response(request_id, -32601, "Method not found")
    
    async def _handle_message(
        self,
        agent_name: str,
        params: Dict,
        request_id: str
    ) -> Dict:
        """Process message and run agent."""
        agent = self.agents.get(agent_name)
        if not agent:
            return self._error_response(request_id, -32600, f"Unknown agent: {agent_name}")
        
        # Extract message data
        message = params.get("message", {})
        parts = message.get("parts", [])
        data = next((p.get("data") for p in parts if p.get("type") == "data"), {})
        
        # Create task
        task_id = str(uuid4())
        
        # Run agent (async)
        try:
            result = await agent.run(data)
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "task_id": task_id,
                    "status": "completed",
                    "result": result
                }
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {
                    "task_id": task_id,
                    "status": "failed",
                    "error": str(e)
                }
            }
    
    def _error_response(self, request_id: str, code: int, message: str) -> Dict:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {"code": code, "message": message}
        }
```

### Orchestrator with A2A

```python
# functions/agents/orchestrator.py
from services.a2a_client import A2AClient
from services.firestore_service import FirestoreService

class PipelineOrchestrator:
    """Orchestrate agent pipeline using A2A protocol."""
    
    AGENT_SEQUENCE = ["location", "scope", "cost", "risk", "final"]
    
    def __init__(self):
        self.a2a = A2AClient()
        self.firestore = FirestoreService()
    
    async def run_pipeline(self, estimate_id: str, clarification_output: Dict):
        """Run full pipeline with A2A communication."""
        
        # Initialize pipeline state
        thread_id = estimate_id  # Use estimate_id as thread for continuity
        current_data = clarification_output
        
        for i, agent_name in enumerate(self.AGENT_SEQUENCE):
            # Update status in Firestore (for frontend)
            await self.firestore.update_pipeline_status(estimate_id, {
                "currentAgent": agent_name,
                "progress": (i / len(self.AGENT_SEQUENCE)) * 100,
                "completedAgents": self.AGENT_SEQUENCE[:i]
            })
            
            # Send A2A message to agent
            response = await self.a2a.send_task(
                target_agent=agent_name,
                message={
                    "estimate_id": estimate_id,
                    "input": current_data
                },
                thread_id=thread_id
            )
            
            # Check result
            result = response.get("result", {})
            if result.get("status") == "failed":
                raise Exception(f"Agent {agent_name} failed: {result.get('error')}")
            
            # Save output to Firestore (persistence + frontend updates)
            agent_output = result.get("result", {})
            await self.firestore.save_agent_output(estimate_id, agent_name, agent_output)
            
            # Pass output to next agent
            current_data = agent_output
        
        # Mark pipeline complete
        await self.firestore.update_estimate(estimate_id, {"status": "complete"})
```

---

## 6. Summary: A2A + Firestore Hybrid

| Component | Protocol | Purpose |
|-----------|----------|---------|
| Agent-to-Agent | **A2A** | Primary communication between agents |
| Persistence | **Firestore** | Store outputs, pipeline state |
| Frontend Updates | **Firestore** | Real-time progress via `onSnapshot` |
| External Integrations | **A2A** | Future: expose agents to external systems |

### Benefits of This Approach

1. **Standard Protocol**: A2A is industry-standard, future-proof
2. **Decoupled Agents**: Each agent is independently callable
3. **Real-time Frontend**: Firestore provides instant UI updates
4. **Scalable**: Can easily add new agents or external integrations
5. **Observable**: Both A2A task states and Firestore updates

---

## References

- [A2A Protocol Documentation](https://agent2agent.info/docs/introduction/)
- [LangSmith A2A Support](https://docs.langchain.com/langsmith/server-a2a)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [LangChain MCP Adapters](https://docs.langchain.com/oss/python/langchain/mcp)
- [ACP Documentation](https://agentcommunicationprotocol.dev/)

