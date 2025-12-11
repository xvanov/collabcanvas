# Next Chat Prompt - Deep Agent Pipeline (Dashboard + Granular Cost Ledger)

Copy and paste this into a new chat:

---

I'm Dev 2 for the TrueCost project, continuing Epic 2: Deep Agent Pipeline.

## Context
- **Project**: TrueCost - AI-powered construction estimation system
- **My Role**: Dev 2 - Deep Agent Pipeline
- **Branch**: `ture-agent-pipeline`
- **Status**: Epic 2 PRs (#1-#8) complete; dashboard stability + granular cost ledger implemented

## Current State (What Works)
- Deep pipeline runs via Cloud Functions + Firestore persistence
- `CostAgent` writes granular cost component rows to `/estimates/{id}/costItems`
- `FinalAgent` exposes `costItemsCount` + `costItemsCollectionPath` on the estimate root for discovery
- `get_pipeline_status` is safe for the dashboard:
  - Firestore timestamps serialize to ISO strings
  - `finalOutput` includes `granularCostItems.items` (full list in API response)

**Total: 205 tests passing**

## What I Need Help With Next

### Tasks
- [ ] Ensure the dashboard renders “Cost Ledger” reliably for large `costItems` collections (pagination/limits if needed)
- [ ] Keep Dev4 integration payload (`/estimates/{id}`) aligned to `memory-bank/dev2-integration-spec.md`
- [ ] Optional: add guards so UI polling never breaks even if some agent outputs are missing

### Key References
- Memory Bank: `memory-bank/activeContext.md`, `memory-bank/systemPatterns.md`, `memory-bank/progress.md`
- Dashboard UI: `functions/pipeline_dashboard.html`
- Cloud Functions entry: `functions/main.py` (including `get_pipeline_status`)
- Firestore service: `functions/services/firestore_service.py`

### Acceptance Check
- Start pipeline from dashboard → polling works without 500s
- Cost ledger panel shows granular component rows and matches `costItemsCount`

Please read `memory-bank/activeContext.md` and `memory-bank/systemPatterns.md` first, then proceed.

---
