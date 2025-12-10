# Prompt for Starting New Chat - Epic 2 Deep Agent Pipeline

Copy and paste this prompt when starting a new chat:

---

**I'm working on Epic 2: Deep Agent Pipeline for TrueCost. I'm Dev 2 responsible for building the deep agent pipeline that transforms `ClarificationOutput` into complete cost estimates.**

## Context

- **Project**: TrueCost - AI-powered construction estimation system (brownfield pivot from CollabCanvas)
- **My Role**: Dev 2 - Deep Agent Pipeline
- **Current Branch**: `true-agent-pipeline`
- **Status**: Local dev environment running (Firebase emulators + Vite)

## What I'm Building

A 5-agent sequential pipeline:
```
ClarificationOutput → Location → Scope → Cost → Risk → Final → Complete Estimate
```

**Agents to build**:
1. Location Agent - Zip-code based cost factors
2. Scope Agent - Bill of Quantities enrichment
3. Cost Agent - Material/labor/equipment calculations
4. Risk Agent - Monte Carlo simulation
5. Final Agent - Synthesis and executive summary

## Key Technical Decisions

- **Agent Framework**: **LangChain Deep Agents** (`deepagents` library) - provides planning tool, file system tools, and subagent spawning
- **LLM**: OpenAI GPT-4.1 (configurable via env var)
- **Backend**: Python Cloud Functions (2nd gen) in `functions/` directory at project root
- **State Management**: Firestore for persistence and real-time updates
- **Input Contract**: `ClarificationOutput` v3.0.0 (see `docs/clarification-output-schema.md`)
- **Deep Agents Guide**: See `docs/setup/deep-agents-integration.md` for implementation patterns

## Current Task

**PR #1: Foundation & Project Setup**

I need to:
1. Create `functions/` directory structure at project root
2. Set up Python environment with `requirements.txt` (include `deepagents`, `langchain`, `langchain-openai`, `langgraph`)
3. Create configuration module (`config/settings.py`, `config/errors.py`)
4. Create Firestore service (`services/firestore_service.py`)
5. Create LLM service wrapper using LangChain (`services/llm_service.py`)
6. Create base agent class using Deep Agents pattern (`agents/base_agent.py` - wraps `create_deep_agent()`)
7. Set up test infrastructure

## Important Files

- **Memory Bank**: `memory-bank/` - Read ALL files for full context
- **Task List**: `memory-bank/epic2-task-list.md` - Complete PR breakdown
- **Schema**: `docs/clarification-output-schema.md` - Input contract
- **Example**: `docs/clarification-output-example.json` - Sample input
- **Architecture**: `docs/architecture.md` - Technical decisions (note: mentions Python Deep Agents but we're using LangChain)

## Dependencies

- **From Dev 3**: `ClarificationOutput` v3.0.0 schema (defined, example available)
- **From Dev 4**: `cost_data_service.py`, `monte_carlo.py` (will mock initially)

## What I Need Help With

[Describe your current task or question]

---

**Please read the memory bank files first to understand the full context, then help me proceed with implementation.**

