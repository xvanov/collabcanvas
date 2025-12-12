# Agent Communication in TrueCost Pipeline (A2A Protocol)

## Overview

TrueCost uses the **Agent2Agent (A2A) Protocol** for inter-agent communication. A2A is Google's open standard for enabling AI agents to communicate, collaborate, and solve complex problems together.

Agents communicate via **JSON-RPC 2.0** messages, with **Firestore** providing persistence and real-time frontend updates.

## Architecture: Non-Linear Pipeline with Scorer + Critic Agents

The pipeline is **NOT linear**. It includes:
- **6 Primary Agents**: Do the actual work
- **6 Scorer Agents**: Objective numerical scoring (0-100)
- **6 Critic Agents**: Qualitative feedback when score is low
- **1 Orchestrator**: Coordinates everything, manages retry loops

### Agent Count: 19 Total

| Type | Count | Agents |
|------|-------|--------|
| Primary | 6 | Location, Scope, Cost, Risk, Timeline, Final |
| Scorer | 6 | Objective scoring (0-100) for each primary |
| Critic | 6 | Qualitative feedback for each primary |
| Orchestrator | 1 | Coordinate all agents |

### Full Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ORCHESTRATOR                                               │
│  - Coordinates 6 primary + 6 scorer + 6 critic agents via A2A                                 │
│  - Flow: Primary → Scorer → (if score < 80) → Critic → Retry with feedback                   │
│  - Max 2 retries per agent                                                                    │
│  - Updates Firestore for frontend real-time progress                                          │
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
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    Firestore                                                 │
│  - Persistence: Agent outputs, scores, feedback saved                                        │
│  - Frontend: Real-time updates via onSnapshot                                                │
│  - Tracking: Scores, retry counts, critic feedback                                           │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Validation Flow (Primary → Scorer → Critic)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    For Each Primary Agent:                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. Orchestrator calls PRIMARY AGENT via A2A                                     │
│                    │                                                             │
│                    ▼                                                             │
│  2. Primary Agent processes, returns result                                      │
│                    │                                                             │
│                    ▼                                                             │
│  3. Orchestrator calls SCORER AGENT via A2A                                      │
│     - Scorer evaluates output OBJECTIVELY                                        │
│     - Returns numerical score (0-100)                                            │
│                    │                                                             │
│                    ▼                                                             │
│  4. If score >= 80: PASS → Move to next primary agent                            │
│     If score < 80:  → Continue to step 5                                         │
│                    │                                                             │
│                    ▼                                                             │
│  5. Orchestrator calls CRITIC AGENT via A2A                                      │
│     - Critic provides QUALITATIVE feedback:                                      │
│       • What's wrong with the output                                             │
│       • Why it's wrong (reasoning)                                               │
│       • How to fix it (specific suggestions)                                     │
│                    │                                                             │
│                    ▼                                                             │
│  6. If retries < 2:                                                              │
│     - Orchestrator sends CRITIC FEEDBACK to PRIMARY AGENT                        │
│     - Primary agent retries with feedback context                                │
│     - Loop back to step 1                                                        │
│                    │                                                             │
│  7. If retries >= 2:                                                             │
│     - Mark pipeline as failed                                                    │
│     - Save partial results to Firestore                                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Scorer vs Critic: Separation of Concerns

| Agent Type | Purpose | Output | When Called |
|------------|---------|--------|-------------|
| **Scorer** | Objective evaluation | Numerical score (0-100) | Always (after primary) |
| **Critic** | Qualitative feedback | Issues, suggestions, fixes | Only if score < 80 |

### Why Separate?

1. **Scorer is fast**: Quick numerical evaluation, no need for detailed feedback
2. **Critic is thorough**: Deep analysis, only when needed
3. **Clear threshold**: 80 is the passing score (configurable)
4. **Cost efficient**: Don't run expensive critic if score is good

## A2A Protocol Basics

### JSON-RPC 2.0 Message Format

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "task-123",
  "method": "message/send",
  "params": {
    "message": {
      "role": "user",
      "parts": [
        {"type": "data", "data": {"estimate_id": "est-456", "input": {...}}}
      ]
    },
    "context": {
      "thread_id": "est-456"
    }
  }
}
```

**Response (Success):**
```json
{
  "jsonrpc": "2.0",
  "id": "task-123",
  "result": {
    "task_id": "task-789",
    "status": "completed",
    "result": {
      "locationFactors": {...}
    }
  }
}
```

**Response (Error):**
```json
{
  "jsonrpc": "2.0",
  "id": "task-123",
  "result": {
    "task_id": "task-789",
    "status": "failed",
    "error": "Invalid zip code format"
  }
}
```

### Task States

```
Submitted → Working → Completed
                  ↓
               Failed
```

## Agent Cards

Each TrueCost agent (primary and critic) exposes an **Agent Card** describing its capabilities:

```python
# functions/agents/agent_cards.py

# Primary Agents - Do the actual work
PRIMARY_AGENT_CARDS = {
    "location": {
        "name": "TrueCost Location Agent",
        "description": "Analyzes location factors for construction estimates",
        "version": "1.0.0",
        "capabilities": ["location-analysis", "labor-rates", "permit-costs"],
        "input_modes": ["json"],
        "output_modes": ["json"],
        "endpoint": "/a2a/location"
    },
    "scope": {
        "name": "TrueCost Scope Agent", 
        "description": "Enriches Bill of Quantities with cost codes",
        "version": "1.0.0",
        "capabilities": ["boq-enrichment", "cost-codes", "validation"],
        "input_modes": ["json"],
        "output_modes": ["json"],
        "endpoint": "/a2a/scope"
    },
    "cost": {
        "name": "TrueCost Cost Agent",
        "description": "Calculates material, labor, and equipment costs",
        "version": "1.0.0",
        "capabilities": ["cost-calculation", "pricing"],
        "input_modes": ["json"],
        "output_modes": ["json"],
        "endpoint": "/a2a/cost"
    },
    "risk": {
        "name": "TrueCost Risk Agent",
        "description": "Performs Monte Carlo simulation for risk analysis",
        "version": "1.0.0",
        "capabilities": ["monte-carlo", "risk-assessment"],
        "input_modes": ["json"],
        "output_modes": ["json"],
        "endpoint": "/a2a/risk"
    },
    "final": {
        "name": "TrueCost Final Agent",
        "description": "Synthesizes final estimate with timeline",
        "version": "1.0.0",
        "capabilities": ["synthesis", "timeline", "reporting"],
        "input_modes": ["json"],
        "output_modes": ["json"],
        "endpoint": "/a2a/final"
    }
}

# Critic Agents - Validate primary agent outputs
CRITIC_AGENT_CARDS = {
    "location_critic": {
        "name": "TrueCost Location Critic",
        "description": "Validates location factors output for accuracy and completeness",
        "version": "1.0.0",
        "capabilities": ["validation", "quality-check"],
        "input_modes": ["json"],
        "output_modes": ["json"],
        "endpoint": "/a2a/location_critic"
    },
    "scope_critic": {
        "name": "TrueCost Scope Critic",
        "description": "Validates Bill of Quantities for completeness and accuracy",
        "version": "1.0.0",
        "capabilities": ["validation", "quality-check", "cost-code-validation"],
        "input_modes": ["json"],
        "output_modes": ["json"],
        "endpoint": "/a2a/scope_critic"
    },
    "cost_critic": {
        "name": "TrueCost Cost Critic",
        "description": "Validates cost calculations for mathematical accuracy",
        "version": "1.0.0",
        "capabilities": ["validation", "math-verification", "rate-validation"],
        "input_modes": ["json"],
        "output_modes": ["json"],
        "endpoint": "/a2a/cost_critic"
    },
    "risk_critic": {
        "name": "TrueCost Risk Critic",
        "description": "Validates risk analysis and Monte Carlo results",
        "version": "1.0.0",
        "capabilities": ["validation", "statistical-check"],
        "input_modes": ["json"],
        "output_modes": ["json"],
        "endpoint": "/a2a/risk_critic"
    },
    "final_critic": {
        "name": "TrueCost Final Critic",
        "description": "Validates final estimate for consistency and completeness",
        "version": "1.0.0",
        "capabilities": ["validation", "consistency-check", "completeness-check"],
        "input_modes": ["json"],
        "output_modes": ["json"],
        "endpoint": "/a2a/final_critic"
    }
}

# Combined for registry lookup
AGENT_CARDS = {**PRIMARY_AGENT_CARDS, **CRITIC_AGENT_CARDS}
```

## A2A Client

The `A2AClient` class handles communication between agents:

```python
# functions/services/a2a_client.py

from typing import Dict, Any
from uuid import uuid4
import httpx

class A2AClient:
    """Client for A2A protocol communication."""
    
    def __init__(self, base_url: str = None):
        # Internal calls use function URLs
        self.base_url = base_url or "http://localhost:5001/truecost/us-central1"
    
    async def send_task(
        self,
        target_agent: str,
        message: Dict[str, Any],
        thread_id: str = None
    ) -> Dict:
        """Send A2A task to target agent."""
        payload = {
            "jsonrpc": "2.0",
            "id": str(uuid4()),
            "method": "message/send",
            "params": {
                "message": {
                    "role": "user",
                    "parts": [{"type": "data", "data": message}]
                }
            }
        }
        
        if thread_id:
            payload["params"]["context"] = {"thread_id": thread_id}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/a2a_{target_agent}",
                json=payload,
                timeout=300.0  # 5 min for agent processing
            )
            return response.json()
    
    async def get_task_status(self, target_agent: str, task_id: str) -> Dict:
        """Get status of an async task."""
        payload = {
            "jsonrpc": "2.0",
            "id": str(uuid4()),
            "method": "tasks/get",
            "params": {"task_id": task_id}
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/a2a_{target_agent}",
                json=payload
            )
            return response.json()
```

## A2A Handler (Per Agent)

Each agent has an A2A handler to process incoming messages:

```python
# functions/agents/base_agent.py

from typing import Dict, Any
from uuid import uuid4

class BaseA2AAgent:
    """Base class for A2A-compatible agents."""
    
    def __init__(self, name: str, firestore_service):
        self.name = name
        self.firestore = firestore_service
    
    async def handle_a2a_request(self, request: Dict) -> Dict:
        """Handle incoming A2A JSON-RPC request."""
        method = request.get("method")
        params = request.get("params", {})
        request_id = request.get("id")
        
        if method == "message/send":
            return await self._process_message(params, request_id)
        elif method == "tasks/get":
            return await self._get_task_status(params, request_id)
        else:
            return self._error(-32601, "Method not found", request_id)
    
    async def _process_message(self, params: Dict, request_id: str) -> Dict:
        """Process incoming message and run agent."""
        # Extract data from message parts
        message = params.get("message", {})
        parts = message.get("parts", [])
        data = next((p.get("data") for p in parts if p.get("type") == "data"), {})
        
        estimate_id = data.get("estimate_id")
        input_data = data.get("input", {})
        
        task_id = str(uuid4())
        
        try:
            # Run the agent's main logic
            result = await self.run(estimate_id, input_data)
            
            # Save to Firestore for persistence + frontend
            await self.firestore.save_agent_output(estimate_id, self.name, result)
            
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
    
    async def run(self, estimate_id: str, input_data: Dict) -> Dict:
        """Override in subclass: agent's main logic."""
        raise NotImplementedError
    
    def _error(self, code: int, message: str, request_id: str) -> Dict:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {"code": code, "message": message}
        }
```

## Orchestrator with A2A (Scorer + Critic Flow)

The orchestrator coordinates the **non-linear pipeline** with the flow: Primary → Scorer → (if low) → Critic → Retry:

```python
# functions/agents/orchestrator.py

from typing import Dict, Any, List
from services.a2a_client import A2AClient
from services.firestore_service import FirestoreService

class PipelineOrchestrator:
    """Orchestrate deep agent pipeline with Scorer + Critic validation."""
    
    AGENT_SEQUENCE = ["location", "scope", "cost", "risk", "timeline", "final"]
    MAX_RETRIES = 2
    PASSING_SCORE = 80  # Score threshold to pass without critic
    
    def __init__(self):
        self.a2a = A2AClient()
        self.firestore = FirestoreService()
    
    async def run_pipeline(self, estimate_id: str, clarification_output: Dict):
        """Execute non-linear pipeline with Scorer + Critic validation."""
        
        thread_id = estimate_id
        current_data = {
            "clarification_output": clarification_output,
            "estimate_id": estimate_id
        }
        
        for i, agent_name in enumerate(self.AGENT_SEQUENCE):
            # Run agent with scorer + critic validation (may loop multiple times)
            agent_output = await self._run_with_validation(
                estimate_id=estimate_id,
                agent_name=agent_name,
                input_data=current_data,
                thread_id=thread_id,
                index=i
            )
            
            # Build context for next agent
            current_data = {
                "estimate_id": estimate_id,
                "input": agent_output,
                "previous_agents": self.AGENT_SEQUENCE[:i+1]
            }
        
        # Pipeline complete
        await self.firestore.update_estimate(estimate_id, {
            "status": "complete",
            "pipelineStatus.progress": 100,
            "pipelineStatus.currentAgent": None,
            "pipelineStatus.completedAgents": self.AGENT_SEQUENCE
        })
    
    async def _run_with_validation(
        self,
        estimate_id: str,
        agent_name: str,
        input_data: Dict,
        thread_id: str,
        index: int
    ) -> Dict:
        """Run Primary → Scorer → (if low) → Critic → Retry loop."""
        
        critic_feedback = None
        
        for attempt in range(self.MAX_RETRIES + 1):
            # Update status
            await self._update_status(
                estimate_id, agent_name, index,
                retry=attempt if attempt > 0 else None
            )
            
            # Prepare input (include critic feedback if retrying)
            agent_input = {**input_data}
            if critic_feedback:
                agent_input["critic_feedback"] = critic_feedback
                agent_input["retry_attempt"] = attempt
            
            # ═══════════════════════════════════════════════════════════
            # STEP 1: Call PRIMARY AGENT via A2A
            # ═══════════════════════════════════════════════════════════
            primary_response = await self.a2a.send_task(
                target_agent=agent_name,
                message=agent_input,
                thread_id=thread_id
            )
            
            primary_result = primary_response.get("result", {})
            if primary_result.get("status") == "failed":
                raise Exception(f"Agent {agent_name} failed: {primary_result.get('error')}")
            
            agent_output = primary_result.get("result", {})
            
            # ═══════════════════════════════════════════════════════════
            # STEP 2: Call SCORER AGENT via A2A (always)
            # ═══════════════════════════════════════════════════════════
            scorer_response = await self.a2a.send_task(
                target_agent=f"{agent_name}_scorer",
                message={
                    "estimate_id": estimate_id,
                    "agent_name": agent_name,
                    "output": agent_output,
                    "input": input_data
                },
                thread_id=thread_id
            )
            
            scorer_result = scorer_response.get("result", {}).get("result", {})
            score = scorer_result.get("score", 0)
            
            # Save score to Firestore
            await self.firestore.update_estimate(estimate_id, {
                f"pipelineStatus.scores.{agent_name}": score,
                f"pipelineStatus.scores.{agent_name}_attempt_{attempt}": score
            })
            
            # ═══════════════════════════════════════════════════════════
            # STEP 3: Check score - if >= 80, PASS
            # ═══════════════════════════════════════════════════════════
            if score >= self.PASSING_SCORE:
                # Save successful output to Firestore
                await self.firestore.save_agent_output(
                    estimate_id, agent_name, agent_output
                )
                return agent_output
            
            # ═══════════════════════════════════════════════════════════
            # STEP 4: Score < 80 - Call CRITIC AGENT for feedback
            # ═══════════════════════════════════════════════════════════
            critic_response = await self.a2a.send_task(
                target_agent=f"{agent_name}_critic",
                message={
                    "estimate_id": estimate_id,
                    "agent_name": agent_name,
                    "output": agent_output,
                    "input": input_data,
                    "score": score,
                    "scorer_feedback": scorer_result.get("feedback", "")
                },
                thread_id=thread_id
            )
            
            critic_result = critic_response.get("result", {}).get("result", {})
            
            # ═══════════════════════════════════════════════════════════
            # STEP 5: Prepare critic feedback for retry
            # ═══════════════════════════════════════════════════════════
            critic_feedback = {
                "score": score,
                "issues": critic_result.get("issues", []),
                "why_wrong": critic_result.get("why_wrong", ""),
                "how_to_fix": critic_result.get("how_to_fix", []),
                "previous_output": agent_output
            }
            
            # Log retry attempt
            await self.firestore.update_estimate(estimate_id, {
                f"pipelineStatus.retries.{agent_name}": attempt + 1,
                f"pipelineStatus.criticFeedback.{agent_name}": critic_feedback
            })
        
        # All retries exhausted - fail the pipeline
        await self._handle_failure(
            estimate_id, agent_name,
            f"Score {score} < {self.PASSING_SCORE} after {self.MAX_RETRIES} retries"
        )
        raise Exception(
            f"Agent {agent_name} failed with score {score} after {self.MAX_RETRIES} retries"
        )
    
    async def _update_status(
        self,
        estimate_id: str,
        agent_name: str,
        index: int,
        retry: int = None
    ):
        """Update pipeline status in Firestore for frontend."""
        progress = (index / len(self.AGENT_SEQUENCE)) * 100
        status_update = {
            "pipelineStatus.currentAgent": agent_name,
            "pipelineStatus.progress": progress,
            "pipelineStatus.completedAgents": self.AGENT_SEQUENCE[:index]
        }
        if retry:
            status_update["pipelineStatus.currentRetry"] = retry
        
        await self.firestore.update_estimate(estimate_id, status_update)
    
    async def _handle_failure(self, estimate_id: str, agent_name: str, error: str):
        """Handle agent failure."""
        await self.firestore.update_estimate(estimate_id, {
            "status": "failed",
            "pipelineStatus.currentAgent": f"{agent_name}_failed",
            "pipelineStatus.error": error
        })
```

## Cloud Function Endpoints

Each agent is exposed as a Cloud Function with A2A endpoint:

```python
# functions/main.py

from firebase_functions import https_fn
from agents.location_agent import LocationAgent
from agents.scope_agent import ScopeAgent
from agents.cost_agent import CostAgent
from agents.risk_agent import RiskAgent
from agents.final_agent import FinalAgent
from services.firestore_service import FirestoreService

firestore = FirestoreService()

# A2A Endpoints for each agent
@https_fn.on_request(timeout_sec=300)
async def a2a_location(req):
    """A2A endpoint for Location Agent."""
    agent = LocationAgent(firestore)
    request_data = req.get_json()
    result = await agent.handle_a2a_request(request_data)
    return https_fn.Response(json=result)

@https_fn.on_request(timeout_sec=300)
async def a2a_scope(req):
    """A2A endpoint for Scope Agent."""
    agent = ScopeAgent(firestore)
    request_data = req.get_json()
    result = await agent.handle_a2a_request(request_data)
    return https_fn.Response(json=result)

@https_fn.on_request(timeout_sec=300)
async def a2a_cost(req):
    """A2A endpoint for Cost Agent."""
    agent = CostAgent(firestore)
    request_data = req.get_json()
    result = await agent.handle_a2a_request(request_data)
    return https_fn.Response(json=result)

@https_fn.on_request(timeout_sec=300)
async def a2a_risk(req):
    """A2A endpoint for Risk Agent."""
    agent = RiskAgent(firestore)
    request_data = req.get_json()
    result = await agent.handle_a2a_request(request_data)
    return https_fn.Response(json=result)

@https_fn.on_request(timeout_sec=300)
async def a2a_final(req):
    """A2A endpoint for Final Agent."""
    agent = FinalAgent(firestore)
    request_data = req.get_json()
    result = await agent.handle_a2a_request(request_data)
    return https_fn.Response(json=result)

# Main pipeline entry point
@https_fn.on_call(timeout_sec=900)  # 15 min for full pipeline
async def start_deep_pipeline(req):
    """Start the deep agent pipeline."""
    data = req.data
    estimate_id = data.get("estimateId")
    clarification_output = data.get("clarificationOutput")
    
    orchestrator = PipelineOrchestrator()
    
    # Fire-and-forget: start pipeline, don't wait
    import asyncio
    asyncio.create_task(
        orchestrator.run_pipeline(estimate_id, clarification_output)
    )
    
    return {
        "success": True,
        "data": {
            "estimateId": estimate_id,
            "status": "processing"
        }
    }
```

## Communication Flow Example

### Step 1: Start Pipeline

```python
# Frontend calls start_deep_pipeline
response = await functions.httpsCallable('start_deep_pipeline')({
    estimateId: "est-123",
    clarificationOutput: {...}
})
# Returns immediately: {success: true, data: {estimateId: "est-123", status: "processing"}}
```

### Step 2: Location Agent Receives A2A

```json
// A2A request to a2a_location
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "method": "message/send",
  "params": {
    "message": {
      "role": "user",
      "parts": [{
        "type": "data",
        "data": {
          "estimate_id": "est-123",
          "input": {
            "clarification_output": {...}
          }
        }
      }]
    },
    "context": {"thread_id": "est-123"}
  }
}
```

### Step 3: Location Agent Returns A2A Response

```json
{
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "task_id": "task-456",
    "status": "completed",
    "result": {
      "locationFactors": {
        "zipCode": "80202",
        "laborRates": {"electrician": 55.0, "plumber": 60.0},
        "isUnion": false
      }
    }
  }
}
```

### Step 4: Orchestrator Calls Scope Agent

```json
// A2A request to a2a_scope
{
  "jsonrpc": "2.0",
  "id": "req-002",
  "method": "message/send",
  "params": {
    "message": {
      "role": "user",
      "parts": [{
        "type": "data",
        "data": {
          "estimate_id": "est-123",
          "input": {
            "locationFactors": {...}
          },
          "previous_agents": ["location"]
        }
      }]
    },
    "context": {"thread_id": "est-123"}
  }
}
```

## Firestore Integration

While A2A handles agent communication, Firestore provides:

### 1. Persistence

```python
# Each agent saves output to Firestore
await firestore.save_agent_output(estimate_id, agent_name, result)
```

### 2. Frontend Real-time Updates

```typescript
// Frontend listens for updates
const unsubscribe = onSnapshot(
  doc(db, 'estimates', estimateId),
  (doc) => {
    const data = doc.data();
    console.log('Pipeline progress:', data.pipelineStatus.progress);
    console.log('Current agent:', data.pipelineStatus.currentAgent);
  }
);
```

### 3. Pipeline State Backup

If pipeline fails, state is preserved in Firestore for recovery.

## Validation and Retry (with A2A)

```python
async def run_with_validation(self, estimate_id: str, agent_name: str, data: Dict):
    """Run agent with validation and retry logic."""
    max_retries = 2
    
    for attempt in range(max_retries + 1):
        # Call agent via A2A
        response = await self.a2a.send_task(agent_name, data)
        result = response.get("result", {})
        
        if result.get("status") == "completed":
            # Validate output
            validation = await self.a2a.send_task(
                f"{agent_name}_validator",
                {"output": result.get("result")}
            )
            
            if validation.get("result", {}).get("status") == "passed":
                return result
            
            # Validation failed - retry with feedback
            feedback = validation.get("result", {}).get("issues", [])
            data["feedback"] = feedback
        
        if attempt < max_retries:
            await self._update_status(estimate_id, agent_name, "retrying", attempt + 1)
    
    raise Exception(f"Agent {agent_name} failed validation after {max_retries} retries")
```

## Key Points Summary

### ✅ What Agents Use to Communicate

| Component | Purpose |
|-----------|---------|
| **A2A Protocol** | Primary agent-to-agent communication |
| **JSON-RPC 2.0** | Message format |
| **Agent Cards** | Capability discovery |
| **Firestore** | Persistence + frontend updates |

### ✅ Benefits of A2A

1. **Standard Protocol**: Industry-standard (Google-backed)
2. **Decoupled Agents**: Each agent independently callable
3. **Future-Proof**: Easy to add external integrations
4. **Scalable**: Agents can be distributed across services
5. **Observable**: Task states + Firestore updates

### ✅ Firestore Still Important

- **Persistence**: All outputs saved
- **Frontend**: Real-time progress updates
- **Recovery**: State backup for failed pipelines
- **History**: Audit trail of agent outputs
