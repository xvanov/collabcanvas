# Tech Context

## Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind + shadcn/ui, Zustand, Konva; Firebase SDK (Auth, Firestore, RTDB, Storage). Tests: Vitest/RTL/Playwright.
- **Python Backend (Active):** Python 3.11+ in `functions_py/` with:
  - Firebase Admin SDK 6.5.0+
  - OpenAI 1.54.0+ (GPT-4.1, GPT-4o Vision, Whisper)
  - Deep Agents 0.2.0+
  - ezdxf 1.3.0+ for DXF parsing (6-pass extraction, 5 wall strategies, 4 window strategies)
  - PyMuPDF for PDF→PNG conversion (200 DPI)
  - WeasyPrint 62.0+ + Jinja2 for PDF generation
  - NumPy 1.26.0+ for Monte Carlo
  - pytest 8.0.0+ for testing (27+ unit tests)
- **Node Backend (Existing):** Node 20 Firebase Functions (TS) in `collabcanvas/functions/` from CollabCanvas - coexists with Python functions

## Directory Structure
```
truecost/
├── functions_py/              # Python Functions (Epic 3, 2, 4)
│   ├── config/               # Settings & env config
│   ├── services/             # Storage, CAD parsing, etc.
│   ├── agents/               # 7 Deep Agents (future)
│   ├── types/                # Type definitions
│   └── tests/                # Unit & integration tests
├── collabcanvas/
│   ├── functions/            # Node Functions (legacy)
│   └── src/
│       ├── components/epic3/ # Epic 3 Test Lab UI
│       ├── services/         # Frontend services + mocks
│       └── pages/            # Routes including /epic3-lab
└── docs/                     # Documentation & specs
```

## Data & Integrations
- **Storage:** CAD files at `cad/{estimateId}/{filename}` in Firebase Storage (50MB max)
- **Supported CAD formats:** PDF, DWG, DXF, PNG, JPG
- **Mock RSMeans-schema datasets** (future): materials, labor rates, location factors, permits in Firestore (`/costData/**`)
- **Firestore:** Estimate state in `/estimates/{id}` with subcollections
- **Optional stretch:** Unrawngle API for multi-retailer pricing

## Environment / Tooling
- **Frontend:** Node 20+, npm, Vite dev server
- **Python Backend:** Python 3.11+, venv, pytest
- **Firebase CLI:** Emulators for local dev
- **Import Pattern:** Relative imports (`../`) throughout - no `@/` alias used
- **Env Vars:**
  - Python (`functions_py/.env`): OPENAI_API_KEY, LLM_MODEL (gpt-4.1), VISION_MODEL (gpt-4o), LANGSMITH_API_KEY (optional), ENABLE_VOICE_INPUT, ENABLE_WHISPER_FALLBACK
  - Frontend (`.env.local`): Firebase config, VITE_USE_MOCK_CAD_UPLOAD (true for mock service)

## Development Workflow
- **Epic 3 Pattern:** Each PR has backend implementation + test UI component in Epic 3 Lab
- **Testing:** Python unit tests with pytest; frontend mock services during development
- **Vite Cache:** Clear with `npm run dev -- --force` when rapid file changes cause issues
- **Progressive Unlocking:** Epic 3 Test Lab unlocks PRs as they're completed

## Constraints
- **Firebase-first deployment:** Auth/Firestore/Functions/Storage/Hosting
- **API key security:** Keys in Functions secrets/env, never client-side
- **Performance targets:** Pipeline <5 min, CAD parse <30s, PDF <10s, initial load <3s
- **File size limits:** CAD uploads max 50MB
- **Coexistence:** Python and Node functions both deployed, no migration of CollabCanvas features

