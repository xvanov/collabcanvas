# Project Brief: TrueCost

## Summary
TrueCost is a brownfield pivot of the CollabCanvas app into an AI-powered construction estimation system. It uses a 7-agent Deep Agents pipeline (Clarification → CAD Analysis → Location → Scope → Cost → Risk → Final) to turn a project description + CAD plan into a risk-adjusted estimate with PDF output and feedback loop.

## Goals
- Deliver accurate, probabilistic residential construction estimates (target MAPE < 10%).
- Automate data gathering: CAD measurements, labor rates, permits, weather, location factors.
- Produce professional, client-ready reports with cost, schedule, risk, and assumptions.
- Reuse CollabCanvas frontend/Firebase foundations; add Python agent backend.

## Scope (MVP)
- Required inputs: project description (text/voice) + CAD file (PDF/DWG/image).
- 7 agents operational with mocked RSMeans-schema data and Monte Carlo risk.
- Residential project types: remodels, additions, custom homes, systems (HVAC/electrical/plumbing), exterior.
- Three UI sections: Input, Plan, Final Estimate; pipeline visibility; PDF export; feedback capture for actuals.

## Out of Scope (MVP)
- Commercial/multi-family projects; live RSMeans/API pricing; BIM import; mobile app; third-party integrations (QuickBooks/Buildertrend); team collab features.

## Success Criteria
- Pipeline completes in <5 minutes; PDF <10s.
- P50/P80/P90 risk ranges; Monte Carlo 1000+ iterations.
- CAD extraction accuracy >95% (goal); estimate accuracy MAPE <15% initial, <10% target.
- Feedback loop present; professional PDF export.

