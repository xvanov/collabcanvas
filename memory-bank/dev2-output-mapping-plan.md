# Dev 2 Output Mapping Plan (to Dev 4 Spec)

Goal: Align the pipeline outputs to the integration contract in `memory-bank/dev2-integration-spec.md` so Dev 4’s PDF/Monte Carlo services can consume `/estimates/{estimateId}` directly.

Key actions:
- Build a spec-compliant payload in FinalAgent and persist it on the estimate root (in addition to existing `finalOutput`).
- Persist granular cost components to a Firestore subcollection for UI transparency without bloating the root estimate document:
  - `/estimates/{estimateId}/costItems`
  - Root estimate carries discoverability metadata (`costItemsCount`, `costItemsCollectionPath`)
- Map existing outputs to required fields:
  - Identification: `projectName`, `address`, `projectType`, `scope`, `squareFootage` (from `clarificationOutput.projectBrief`)
  - Cost summary: `totalCost`/`p50`/`p80`/`p90` from `costOutput.total`; `contingencyPct` from `riskOutput.contingency`; `timelineWeeks` from `timelineOutput`; `monteCarloIterations` from `riskOutput.monteCarlo`
  - `costDrivers`: top CSI divisions by total
  - `risk_analysis`: Monte Carlo percentiles, contingency, iterations; histogram (~20 bins) and top_risks emitted from MonteCarloService mock and passed through RiskAgent → FinalAgent
  - `schedule`: map timeline tasks/milestones; `total_weeks`
  - `laborAnalysis`: aggregate trades from cost line items:
    - hours = Σ(quantity × unit_labor_hours); rate = labor_rate.low; base_cost = hours × rate; burden = base_cost × 0.35; total = base + burden
    - labor_pct = total_labor / p50 * 100; estimated_days = hours / 8
    - trades[] with name/hours/rate/base_cost/burden/total
  - `cost_breakdown`: totals + division breakdown from `costOutput.divisions`; include material_pct/labor_pct/permits_pct/overhead_pct and per-division percentages
  - `bill_of_quantities`: flatten scope divisions/items (CSI code, qty, unit, total) and include permits/overhead/profit totals; per-line unit_cost/material_cost/labor_cost default to 0 if missing
  - `assumptions`: merge scope exclusions/special requirements + risk/final assumptions
- Add a validation test using `docs/clarification-output-example.json` to ensure required fields and percentile ordering.

Reference doc: `docs/setup/pipeline-output-mapping.md`

