# TrueCost

> **AI-Powered Construction Estimation** - Transform project plans into accurate, risk-adjusted cost estimates using 7 specialized deep agents.

## Overview

TrueCost is an AI-powered construction estimation system built as a brownfield pivot from the existing CollabCanvas collaborative canvas application. The system employs **7 specialized deep agents** that collaborate through structured workflows to transform CAD plans and project descriptions into comprehensive, professionally-credible estimates.

**Target Users:** General contractors and subcontractors who need fast, accurate estimates to win bids and manage project costs.

### Key Features

- **7-Agent Deep Pipeline** - Specialized agents for clarification, CAD analysis, location intelligence, scope generation, cost estimation, risk analysis, and final synthesis
- **CAD Plan Analysis** - Upload PDF, DWG, or image files for automatic measurement extraction
- **Voice + Text Input** - Describe projects via natural language (typed or spoken)
- **Risk-Adjusted Estimates** - Monte Carlo simulation provides P50/P80/P90 confidence intervals
- **Professional PDF Output** - Generate client-ready estimate reports
- **Multi-Retailer Price Comparison** - Find optimal material prices across Home Depot, Lowe's, and more

## Current Status

**Phase:** Implementation Planning (MVP)

The project is transitioning from CollabCanvas (collaborative canvas) to TrueCost (AI estimation engine). See `/docs` for detailed planning artifacts:

- **PRD:** [docs/prd.md](./docs/prd.md) - Product requirements (78 FRs)
- **Architecture:** [docs/architecture.md](./docs/architecture.md) - Technical design decisions
- **Epics:** [docs/epics.md](./docs/epics.md) - Implementation breakdown (5 epics, 24 stories)
- **Sprint Status:** [docs/sprint-artifacts/sprint-status.yaml](./docs/sprint-artifacts/sprint-status.yaml) - Current progress

## Architecture

### Technology Stack

**Frontend (Existing - to be extended):**
- React 19 + TypeScript + Vite
- Konva.js for canvas rendering
- Zustand for state management
- Tailwind CSS + shadcn/ui
- Firebase SDK

**Backend (New - Python Cloud Functions):**
- Python Deep Agents (deepagents 0.2)
- OpenAI GPT-4.1 (configurable via env var)
- Firebase Cloud Functions (2nd gen)
- Firestore + Firebase Storage
- WeasyPrint for PDF generation

### Agent Pipeline

```
Clarification → CAD Analysis → Location → Scope → Cost → Risk → Final
    Agent          Agent        Agent     Agent   Agent  Agent  Agent
```

Each agent:
1. Receives structured input from previous agents
2. Performs specialized analysis
3. Writes output to Firestore (real-time UI updates)
4. Hands off to next agent in sequence

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Firebase CLI (`npm install -g firebase-tools`)

### Development Setup

```bash
# Frontend dependencies
cd collabcanvas
npm install

# Python Cloud Functions
cd ../functions
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Environment setup
cp .env.example .env.local
# Edit .env.local with your API keys

# Start emulators
firebase emulators:start

# Start frontend dev server (new terminal)
npm run dev
```

### Environment Variables

```bash
LLM_MODEL=gpt-4.1
OPENAI_API_KEY=sk-...
LANGSMITH_API_KEY=ls-...  # Optional - for agent tracing
```

## Project Structure

```
truecost/
├── collabcanvas/             # React Frontend (existing, to be extended)
│   └── src/
│       ├── components/
│       │   ├── estimate/     # NEW: TrueCost UI components
│       │   └── ...           # Existing canvas components
│       ├── hooks/
│       ├── services/
│       └── stores/
│
├── functions/                # Python Cloud Functions (NEW)
│   ├── agents/               # 7 Deep Agents
│   ├── services/             # CAD parsing, Monte Carlo, PDF generation
│   └── templates/            # PDF report templates
│
├── docs/                     # Documentation
│   ├── prd.md               # Product requirements
│   ├── architecture.md      # Technical architecture
│   ├── epics.md             # Epic/story breakdown
│   └── sprint_artifacts/    # Sprint tracking
│
└── bmad/                     # BMAD workflow system
```

## Documentation

| Document | Purpose |
|----------|---------|
| [PRD](./docs/prd.md) | Product requirements, success criteria, functional specs |
| [Architecture](./docs/architecture.md) | Technical decisions, data models, API contracts |
| [Epics](./docs/epics.md) | Implementation breakdown, FR coverage, verification checklists |
| [Product Brief](./docs/product-brief.md) | Problem statement, vision, competitive analysis |

## Existing CollabCanvas Features (Foundation)

The TrueCost pivot leverages existing CollabCanvas infrastructure:

- Firebase Auth (Google OAuth)
- Firestore data persistence patterns
- Cloud Functions for AI integration
- Firebase Storage for file uploads
- React component library
- Zustand state management
- Project management CRUD
- BOM infrastructure

See [docs/archive/collabcanvas-stories/](./docs/archive/collabcanvas-stories/) for historical CollabCanvas implementation details.

## Contributing

This project uses the BMAD Method for planning and implementation:

1. Use `/bmad:bmm:workflows:create-story` to draft stories from epics
2. Use `/bmad:bmm:workflows:dev-story` to implement stories
3. Use `/bmad:bmm:workflows:sprint-planning` to track progress

## License

This project is licensed under the MIT License.

---

**TrueCost - Accurate estimates in minutes, not hours.**
