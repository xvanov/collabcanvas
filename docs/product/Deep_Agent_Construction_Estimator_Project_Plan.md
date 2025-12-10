# Deep-Agent Construction Cost Estimator

**Capstone Project - Technical Plan Document**

*AI-Powered Construction Estimation Using LangChain Deep Agents*

Version 1.0 | December 2025

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Deep Agents Architecture](#2-deep-agents-architecture)
3. [RSMeans-Compatible Data Schema](#3-rsmeans-compatible-data-schema)
4. [Tool Implementations](#4-tool-implementations)
5. [API Specification](#5-api-specification)
6. [Frontend Requirements](#6-frontend-requirements)
7. [Project Structure](#7-project-structure)
8. [Implementation Phases](#8-implementation-phases)
9. [Sample Mock Data](#9-sample-mock-data)
10. [Estimation Logic and Formulas](#10-estimation-logic-and-formulas)
11. [Appendix](#11-appendix)

---

## 1. Executive Summary

This document outlines the technical plan for building an AI-powered Construction Cost and Timeline Estimator using LangChain's Deep Agents framework. The system leverages Large Language Model (LLM) reasoning combined with specialized tools to generate accurate cost estimates, project schedules, and risk analyses for construction projects.

Unlike traditional ML-based approaches that require extensive training data, this system uses a Deep Agent architecture where an intelligent orchestrator plans tasks, manages context through a file system, and delegates work to specialized subagents. This approach provides transparency, explainability, and the ability to handle complex, multi-step estimation workflows.

### 1.1 Key Features

1. CAD/PDF plan upload with automatic extraction of project parameters
2. Intelligent clarification of missing project information
3. Automated Bill of Quantities (BoQ) generation
4. Location-aware cost estimation using RSMeans-compatible data schema
5. Timeline estimation with critical path analysis
6. Risk analysis based on location, weather, and soil conditions
7. Real-time streaming of agent reasoning for transparency
8. Professional PDF report export

### 1.2 Technology Stack

| Component | Technology |
|-----------|------------|
| Backend Framework | FastAPI (Python 3.11+) |
| Agent Framework | LangChain deepagents library |
| LLM Provider | OpenAI GPT-4o |
| Frontend | React with TypeScript |
| Streaming | Server-Sent Events (SSE) |
| PDF Generation | ReportLab / WeasyPrint |
| Data Storage | JSON files (mock data), PostgreSQL-ready schema |

---

## 2. Deep Agents Architecture

Deep Agents represent an advanced agent architecture designed for handling complex, multi-step tasks. Unlike simple tool-calling agents, Deep Agents incorporate planning capabilities, context management through file systems, and the ability to spawn specialized subagents.

### 2.1 Core Capabilities

**Planning and Task Decomposition:** The agent uses a built-in TODO list tool to break down complex estimation tasks into discrete steps, track progress, and adapt plans as new information emerges from uploaded documents or user clarifications.

**Context Management:** File system tools (ls, read_file, write_file, edit_file) allow the agent to offload large context to memory, preventing context window overflow when processing large construction plans or multiple data sources.

**Subagent Spawning:** A built-in task tool enables the main agent to spawn specialized subagents for context isolation. Each estimation domain (scope, cost, timeline, risk) can be handled by a focused subagent.

### 2.2 Agent Workflow

The estimation workflow follows this sequence:

```
User Input (Project Details + Optional CAD/PDF)
    ↓
Main Deep Agent (Orchestrator)
    ├── Plans tasks using TODO tool
    ├── Extracts data from uploaded files
    └── Spawns subagents for each domain
    ↓
┌─────────────────┬─────────────────┐
│ Scope Subagent  │ Location        │
│ (BoQ Generator) │ Subagent        │
└────────┬────────┴────────┬────────┘
         ↓                 ↓
┌─────────────────┬─────────────────┐
│ Cost Subagent   │ Timeline        │
│                 │ Subagent        │
└────────┬────────┴────────┬────────┘
         ↓                 ↓
         Risk Analysis Subagent
                  ↓
         Final Report Generation
```

### 2.3 Subagent Definitions

| Subagent | Purpose | Output |
|----------|---------|--------|
| Scope Agent | Analyzes project details and uploaded plans to generate Bill of Quantities | BoQ with items, quantities, units |
| Location Agent | Fetches location-specific modifiers for labor, materials, weather, soil | Location factors JSON |
| Cost Agent | Calculates costs using BoQ and location factors | Cost breakdown by category |
| Timeline Agent | Estimates project duration using productivity data | Duration + critical path |
| Risk Agent | Identifies risks based on location, weather, soil | Risk list with probabilities |

---

## 3. RSMeans-Compatible Data Schema

All mock data follows the RSMeans schema structure to ensure seamless integration with real RSMeans API in the future. RSMeans uses the CSI MasterFormat 2018 standard, which organizes construction information into 50 divisions.

### 3.1 Unit Cost Line Item Schema

Each unit cost item contains material, labor, and equipment costs:

```json
{
  "line_number": "03 30 53.40 0300",
  "description": "Concrete, structural, 4000 PSI, includes placing",
  "division": "03",
  "division_name": "Concrete",
  "unit": "C.Y.",
  "bare_costs": {
    "material": 125.00,
    "labor": 45.50,
    "equipment": 12.75
  },
  "total_incl_op": 215.00,
  "labor_hours": 0.85,
  "crew": "C-8",
  "daily_output": 85
}
```

### 3.2 CSI MasterFormat Divisions

Primary divisions used in residential/commercial construction:

| Division | Name | Examples |
|----------|------|----------|
| 03 | Concrete | Foundations, slabs, footings |
| 04 | Masonry | Brick, block, stone |
| 05 | Metals | Structural steel, rebar |
| 06 | Wood, Plastics, Composites | Framing, millwork, trim |
| 07 | Thermal and Moisture Protection | Insulation, roofing, waterproofing |
| 08 | Openings | Doors, windows, glazing |
| 09 | Finishes | Drywall, flooring, paint |
| 22 | Plumbing | Fixtures, piping, water heaters |
| 23 | HVAC | Heating, cooling, ventilation |
| 26 | Electrical | Wiring, panels, fixtures |

### 3.3 Location Factor Schema

```json
{
  "zip_code": "77001",
  "city": "Houston",
  "state": "TX",
  "factors": {
    "material": 0.98,
    "labor": 0.92,
    "equipment": 1.02,
    "total": 0.96
  },
  "labor_rates": {
    "skilled": 42.50,
    "unskilled": 18.75,
    "electrician": 55.00,
    "plumber": 52.00
  }
}
```

### 3.4 Assembly Cost Schema

Assemblies group multiple unit costs into functional building elements:

```json
{
  "assembly_number": "A1010 110",
  "description": "Standard Foundation, 8 inch block, 4 foot depth",
  "unit": "L.F.",
  "components": [
    { "line_number": "03 30 53.40 0300", "quantity": 0.15 },
    { "line_number": "04 22 10.14 1000", "quantity": 8.0 },
    { "line_number": "05 12 23.10 0100", "quantity": 1.2 }
  ],
  "total_cost_per_unit": 185.50
}
```

---

## 4. Tool Implementations

The Deep Agent is equipped with custom tools that interface with mock data sources. Each tool is designed with the same interface as future real API integrations.

### 4.1 Material Cost Tool

| Attribute | Description |
|-----------|-------------|
| Function | `get_material_cost(item_code: str, zip_code: str) -> dict` |
| Input | MasterFormat line number (e.g., "03 30 53.40 0300"), ZIP code |
| Output | Unit cost with material, labor, equipment breakdown adjusted for location |
| Data Source | unit_costs.json (mock) → RSMeans API (future) |

### 4.2 Labor Rate Tool

| Attribute | Description |
|-----------|-------------|
| Function | `get_labor_rates(zip_code: str, labor_type: str) -> dict` |
| Input | ZIP code, labor type (union/open_shop/residential) |
| Output | Hourly rates by trade (electrician, plumber, carpenter, etc.) |
| Data Source | labor_rates.json (mock) → RSMeans/BLS API (future) |

### 4.3 Weather Delay Tool

| Attribute | Description |
|-----------|-------------|
| Function | `get_weather_factors(zip_code: str, start_month: int) -> dict` |
| Input | ZIP code, project start month |
| Output | Weather delay factor (1.0 = no delay, 1.15 = 15% slowdown) |
| Data Source | weather_factors.json (mock) → NOAA API (future) |

### 4.4 Soil Condition Tool

| Attribute | Description |
|-----------|-------------|
| Function | `get_soil_conditions(lat: float, lon: float) -> dict` |
| Input | Latitude, Longitude |
| Output | Soil type, bearing capacity, difficulty factor for excavation |
| Data Source | soil_factors.json (mock) → USDA Soil Survey API (future) |

### 4.5 Productivity Tool

| Attribute | Description |
|-----------|-------------|
| Function | `get_productivity(task_code: str) -> dict` |
| Input | Task/activity code |
| Output | Daily output, crew size, labor hours per unit |
| Data Source | productivity.json (mock) → RSMeans API (future) |

### 4.6 PDF/CAD Parser Tool

| Attribute | Description |
|-----------|-------------|
| Function | `parse_construction_plan(file_path: str) -> dict` |
| Input | Path to uploaded PDF or image file |
| Output | Extracted dimensions, room counts, annotations, project type |
| Implementation | GPT-4 Vision API for image analysis + PyMuPDF for text extraction |

---

## 5. API Specification

### 5.1 Main Estimation Endpoint

```
POST /api/v1/estimate
```

**Request Body:**

```json
{
  "project_type": "residential | commercial | industrial",
  "size_sqft": 2400,
  "floors": 2,
  "location": "77001",
  "quality": "economy | standard | premium | luxury",
  "construction_type": "new | renovation | addition",
  "plan_file": "<base64_encoded_pdf> (optional)"
}
```

**Response:**

```json
{
  "estimate_id": "est_abc123",
  "total_cost": 248200,
  "cost_breakdown": {
    "materials": 124100,
    "labor": 86870,
    "equipment": 12410,
    "overhead": 12410,
    "profit": 12410
  },
  "boq": [...],
  "timeline_weeks": 18,
  "critical_path": [...],
  "risks": [...],
  "assumptions": [...],
  "location_factors": {...}
}
```

### 5.2 Streaming Endpoint

```
GET /api/v1/estimate/{estimate_id}/stream
```

Returns Server-Sent Events (SSE) stream of agent reasoning:

```
event: agent_thought
data: {"agent": "scope", "thought": "Analyzing uploaded floor plan..."}

event: tool_call
data: {"tool": "get_material_cost", "input": {...}, "output": {...}}

event: subagent_complete
data: {"agent": "scope", "result": {...}}

event: complete
data: {"estimate_id": "est_abc123", "status": "success"}
```

### 5.3 PDF Export Endpoint

```
GET /api/v1/estimate/{estimate_id}/pdf
```

Returns a professionally formatted PDF report with:

1. Executive summary with total cost and timeline
2. Detailed Bill of Quantities table
3. Cost breakdown by CSI division
4. Timeline Gantt chart
5. Risk assessment matrix
6. Assumptions and exclusions

### 5.4 File Upload Endpoint

```
POST /api/v1/upload
Content-Type: multipart/form-data
```

Accepts PDF or image files (PNG, JPG) of construction plans. Returns file ID for use in estimate request.

---

## 6. Frontend Requirements

### 6.1 Pages and Components

1. **Landing Page:** Hero section explaining the tool, feature highlights, CTA to start estimation
2. **Project Input Form:** Multi-step form with project type, size, location, quality level, and file upload dropzone
3. **Agent Reasoning View:** Real-time display of agent thoughts, tool calls, and subagent progress with visual timeline
4. **Results Dashboard:** Summary cards, cost breakdown chart, timeline visualization, risk panel
5. **BoQ Detail View:** Expandable table showing all line items with costs
6. **PDF Preview/Download:** In-browser PDF preview with download button

### 6.2 Real-Time Streaming UI

The agent reasoning view provides transparency into the estimation process:

- Step-by-step progress indicator showing current agent/phase
- Collapsible sections for each subagent's reasoning
- Tool call logs showing inputs and outputs
- TODO list display showing planned vs completed tasks
- Estimated time remaining based on task completion

### 6.3 Visualization Components

| Component | Library / Implementation |
|-----------|--------------------------|
| Cost Breakdown Pie/Bar Chart | Recharts or Chart.js |
| Timeline Gantt Chart | react-gantt-timeline or custom SVG |
| Risk Matrix Heatmap | Custom grid component with color coding |
| File Upload Dropzone | react-dropzone |
| PDF Viewer | react-pdf |
| Agent Progress Stepper | Custom component with SSE updates |

---

## 7. Project Structure

### 7.1 Backend Directory Structure

```
backend/
├── main.py                    # FastAPI application entry point
├── config.py                  # Configuration and environment variables
├── requirements.txt           # Python dependencies
│
├── agents/
│   ├── __init__.py
│   ├── orchestrator.py        # Main Deep Agent setup
│   └── subagents/
│       ├── scope_agent.py     # BoQ generation subagent
│       ├── location_agent.py  # Location factors subagent
│       ├── cost_agent.py      # Cost calculation subagent
│       ├── timeline_agent.py  # Timeline estimation subagent
│       └── risk_agent.py      # Risk analysis subagent
│
├── tools/
│   ├── __init__.py
│   ├── material_costs.py      # Material cost lookup tool
│   ├── labor_rates.py         # Labor rate lookup tool
│   ├── weather_factors.py     # Weather delay tool
│   ├── soil_conditions.py     # Soil analysis tool
│   ├── productivity.py        # Productivity data tool
│   └── plan_parser.py         # PDF/CAD parsing tool
│
├── data/
│   ├── unit_costs.json        # RSMeans-format unit costs
│   ├── assemblies.json        # Assembly cost data
│   ├── labor_rates.json       # Labor rates by location
│   ├── location_factors.json  # Location adjustment factors
│   ├── weather_factors.json   # Weather delay factors
│   ├── soil_factors.json      # Soil condition data
│   └── productivity.json      # Task productivity data
│
├── routers/
│   ├── __init__.py
│   ├── estimate.py            # Estimation endpoints
│   ├── upload.py              # File upload endpoints
│   └── export.py              # PDF export endpoints
│
├── schemas/
│   ├── __init__.py
│   ├── project.py             # Project input schemas
│   ├── estimate.py            # Estimate response schemas
│   └── boq.py                 # Bill of Quantities schemas
│
├── services/
│   ├── __init__.py
│   ├── pdf_generator.py       # PDF report generation
│   └── streaming.py           # SSE streaming service
│
└── tests/
    ├── test_agents.py
    ├── test_tools.py
    └── test_api.py
```

### 7.2 Frontend Directory Structure

```
frontend/
├── package.json
├── tsconfig.json
├── vite.config.ts
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   ├── ProjectInputPage.tsx
│   │   ├── EstimationPage.tsx      # Agent reasoning view
│   │   └── ResultsPage.tsx
│   │
│   ├── components/
│   │   ├── ProjectForm/
│   │   ├── FileUpload/
│   │   ├── AgentProgress/
│   │   ├── CostBreakdown/
│   │   ├── TimelineChart/
│   │   ├── RiskMatrix/
│   │   └── BoQTable/
│   │
│   ├── hooks/
│   │   ├── useEstimation.ts
│   │   └── useSSEStream.ts
│   │
│   ├── services/
│   │   └── api.ts
│   │
│   └── types/
│       └── index.ts
│
└── public/
```

---

## 8. Implementation Phases

### Phase 1: Foundation

1. Set up backend project structure with FastAPI
2. Create RSMeans-compatible mock data files (JSON)
3. Implement basic tool functions (material costs, labor rates)
4. Set up Deep Agent with create_deep_agent() and OpenAI model
5. Test basic agent invocation with simple inputs

### Phase 2: Core Agents

1. Implement Scope Agent (BoQ generation)
2. Implement Location Agent (factor retrieval)
3. Implement Cost Agent (calculation logic)
4. Implement Timeline Agent (duration estimation)
5. Implement Risk Agent (risk identification)
6. Integrate subagents into main orchestrator

### Phase 3: API & Streaming

1. Create FastAPI routers for estimation endpoints
2. Implement SSE streaming for agent reasoning
3. Add file upload endpoint for CAD/PDF files
4. Implement plan parsing tool with GPT-4 Vision
5. Add request/response validation with Pydantic

### Phase 4: Frontend

1. Set up React project with TypeScript and Vite
2. Build project input form with validation
3. Implement file upload component
4. Create agent reasoning view with SSE integration
5. Build results dashboard with charts
6. Style with Tailwind CSS

### Phase 5: PDF Export & Polish

1. Implement PDF report generation service
2. Add PDF preview and download functionality
3. Error handling and edge cases
4. Performance optimization
5. Documentation and code cleanup

---

## 9. Sample Mock Data

### 9.1 Sample Unit Costs (unit_costs.json)

```json
[
  {
    "line_number": "03 30 53.40 0300",
    "description": "Structural concrete, 4000 PSI, direct chute",
    "division": "03",
    "unit": "C.Y.",
    "bare_costs": { "material": 125.00, "labor": 45.50, "equipment": 12.75 },
    "total_incl_op": 215.00,
    "labor_hours": 0.85,
    "crew": "C-8",
    "daily_output": 85
  },
  {
    "line_number": "06 11 10.10 0100",
    "description": "Wood framing, studs, 2x4, 16\" O.C.",
    "division": "06",
    "unit": "L.F.",
    "bare_costs": { "material": 2.85, "labor": 3.20, "equipment": 0.15 },
    "total_incl_op": 7.50,
    "labor_hours": 0.045,
    "crew": "2 Carp",
    "daily_output": 355
  },
  {
    "line_number": "09 29 10.10 0100",
    "description": "Gypsum board, 1/2\" thick, standard",
    "division": "09",
    "unit": "S.F.",
    "bare_costs": { "material": 0.45, "labor": 0.85, "equipment": 0.02 },
    "total_incl_op": 1.65,
    "labor_hours": 0.012,
    "crew": "2 Carp",
    "daily_output": 1330
  }
]
```

### 9.2 Sample Location Factors (location_factors.json)

```json
[
  {
    "zip_code": "77001",
    "city": "Houston",
    "state": "TX",
    "factors": { "material": 0.98, "labor": 0.92, "equipment": 1.02, "total": 0.96 },
    "labor_rates": { "skilled": 42.50, "unskilled": 18.75 }
  },
  {
    "zip_code": "10001",
    "city": "New York",
    "state": "NY",
    "factors": { "material": 1.15, "labor": 1.45, "equipment": 1.12, "total": 1.28 },
    "labor_rates": { "skilled": 78.50, "unskilled": 32.00 }
  },
  {
    "zip_code": "90210",
    "city": "Beverly Hills",
    "state": "CA",
    "factors": { "material": 1.08, "labor": 1.35, "equipment": 1.05, "total": 1.18 },
    "labor_rates": { "skilled": 68.00, "unskilled": 28.50 }
  }
]
```

### 9.3 Sample Weather Factors (weather_factors.json)

```json
[
  {
    "zip_code": "77001",
    "city": "Houston",
    "state": "TX",
    "monthly_factors": {
      "1": 1.05, "2": 1.05, "3": 1.08, "4": 1.12,
      "5": 1.15, "6": 1.18, "7": 1.15, "8": 1.18,
      "9": 1.15, "10": 1.08, "11": 1.05, "12": 1.05
    },
    "annual_rain_days": 104,
    "extreme_heat_days": 45
  },
  {
    "zip_code": "10001",
    "city": "New York",
    "state": "NY",
    "monthly_factors": {
      "1": 1.20, "2": 1.18, "3": 1.12, "4": 1.08,
      "5": 1.05, "6": 1.05, "7": 1.05, "8": 1.05,
      "9": 1.05, "10": 1.08, "11": 1.12, "12": 1.18
    },
    "annual_rain_days": 122,
    "extreme_cold_days": 25
  }
]
```

### 9.4 Sample Soil Factors (soil_factors.json)

```json
[
  {
    "zip_code": "77001",
    "soil_type": "Clay",
    "bearing_capacity_psf": 1500,
    "excavation_difficulty": 1.15,
    "drainage_rating": "Poor",
    "frost_depth_inches": 0,
    "notes": "Expansive clay, requires special foundation design"
  },
  {
    "zip_code": "10001",
    "soil_type": "Rock/Fill",
    "bearing_capacity_psf": 4000,
    "excavation_difficulty": 1.35,
    "drainage_rating": "Good",
    "frost_depth_inches": 48,
    "notes": "Manhattan bedrock, may require blasting"
  },
  {
    "zip_code": "90210",
    "soil_type": "Sandy Loam",
    "bearing_capacity_psf": 2000,
    "excavation_difficulty": 1.00,
    "drainage_rating": "Good",
    "frost_depth_inches": 0,
    "notes": "Hillside location may require additional grading"
  }
]
```

---

## 10. Estimation Logic and Formulas

### 10.1 Bill of Quantities Generation

The Scope Agent uses project parameters to generate quantities:

| Item | Formula | Unit |
|------|---------|------|
| Concrete (Foundation) | floor_area × 0.5 / 27 | C.Y. |
| Framing Lumber | wall_length × floors × 1.3 | B.F. |
| Drywall | sqft × 2.2 × floors | S.F. |
| Roofing | sqft × 1.1 / floors | S.F. |
| Electrical Outlets | sqft / 100 | EA |
| Plumbing Fixtures | bathrooms × 3 + kitchens × 2 | EA |

### 10.2 Cost Calculation

For each line item in the BoQ:

```
line_cost = quantity × unit_cost × location_factor

Where unit_cost = bare_material + bare_labor + bare_equipment + O&P

total_cost = Σ(line_costs) + overhead (10%) + profit (10%)
```

### 10.3 Timeline Calculation

```
task_duration = quantity / (daily_output × crew_productivity)

adjusted_duration = task_duration × weather_factor × soil_factor

total_weeks = critical_path_sum / 5 (working days per week)
```

### 10.4 Risk Scoring

| Condition | Risk Type | Impact |
|-----------|-----------|--------|
| weather_factor > 1.10 | Schedule Risk | High |
| soil_factor > 1.15 | Cost Risk | Medium-High |
| material_factor > 1.10 | Supply Chain Risk | Medium |
| labor_factor > 1.20 | Labor Availability Risk | Medium |

---

## 11. Appendix

### 11.1 Dependencies

**Backend (Python):**

```
fastapi>=0.104.0
uvicorn>=0.24.0
deepagents>=0.1.0
langchain>=0.1.0
langchain-openai>=0.0.5
openai>=1.0.0
python-multipart>=0.0.6
pydantic>=2.5.0
reportlab>=4.0.0
pymupdf>=1.23.0
sse-starlette>=1.8.0
```

**Frontend (Node.js):**

```
react: ^18.2.0
typescript: ^5.0.0
vite: ^5.0.0
@tanstack/react-query: ^5.0.0
recharts: ^2.10.0
react-dropzone: ^14.2.0
react-pdf: ^7.5.0
tailwindcss: ^3.3.0
```

### 11.2 Environment Variables

```bash
# Backend .env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
DATA_DIR=./data
CORS_ORIGINS=http://localhost:5173

# Frontend .env
VITE_API_URL=http://localhost:8000
```

### 11.3 References

- LangChain Deep Agents Documentation: https://docs.langchain.com/oss/python/deepagents
- RSMeans Data Online: https://rsmeans.com
- CSI MasterFormat 2018: https://csiresources.org/standards/masterformat
- FastAPI Documentation: https://fastapi.tiangolo.com
- OpenAI API Documentation: https://platform.openai.com/docs

---

*Document generated for Capstone Project planning purposes.*
