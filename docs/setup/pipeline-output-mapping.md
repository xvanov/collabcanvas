# Pipeline Output Mapping Plan (Dev 2 → Dev 4)

Objective: Align the Deep Agent Pipeline outputs with the integration contract in `memory-bank/dev2-integration-spec.md` so Dev 4 (PDF + Monte Carlo) can consume `/estimates/{estimateId}` directly.

## Target Output (root `/estimates/{id}`)
- Identification: `projectName`, `address`, `projectType`, `scope`, `squareFootage`
- Cost summary: `totalCost`, `p50`, `p80`, `p90`, `contingencyPct`, `timelineWeeks`, `monteCarloIterations`
- Lists/objects: `costDrivers`, `laborAnalysis`, `schedule`, `cost_breakdown`, `risk_analysis`, `bill_of_quantities`, `assumptions`, `cad_data`
- Keep existing `finalOutput` for backward compatibility.

## Mapping Strategy
- Source data:
  - `clarificationOutput.projectBrief`: name/address/type/scope/size
  - `scopeOutput`: BoQ → `bill_of_quantities`
  - `costOutput`: totals/divisions → `cost_breakdown`, `totalCost` (P50), `p50/p80/p90`
  - `riskOutput`: `monteCarlo` + `contingency` → `risk_analysis`, `contingencyPct`, `monteCarloIterations`
  - `timelineOutput`: tasks/milestones/duration → `schedule`, `timelineWeeks`
  - `finalOutput`/LLM: assumptions/exclusions/recommendations (fallback defaults)

## Implementation Steps
1) FinalAgent: build a spec-compliant payload and `update_estimate` with those root fields (alongside saving `finalOutput`).
2) Derive fields:
   - `projectName`: project type + address (fallback)
   - `address`: `projectBrief.location.fullAddress` or concatenated components
   - `scope`: `projectBrief.scopeSummary.description`
   - `squareFootage`: `projectBrief.scopeSummary.totalSqft`
   - Cost summary: map `costOutput.total` (P50/P80/P90) → `totalCost/p50/p80/p90`; `contingencyPct` from `riskOutput.contingency.recommended`; `timelineWeeks` from `timelineOutput.totalDuration/5`; `monteCarloIterations` from `riskOutput.monteCarlo.iterations`
   - `costDrivers`: top divisions by total
   - `risk_analysis`: Monte Carlo percentiles, iterations, contingency_pct, top_risks (histogram optional placeholder)
   - `schedule`: map timeline tasks/milestones; `total_weeks`
   - `laborAnalysis`: aggregate from cost line items:
     - per-trade hours = Σ(quantity × unit_labor_hours)
     - rate = labor_rate.low; base_cost = hours × rate; burden = base_cost × 0.35; total = base + burden
     - labor_pct = total_labor / p50 * 100; estimated_days = hours / 8
     - trades[] with name/hours/rate/base_cost/burden/total
   - `cost_breakdown`: totals + per-division rollup from `costOutput.divisions`; add material_pct/labor_pct/permits_pct/overhead_pct and per-division percentages
   - `bill_of_quantities`: include permits/overhead/profit totals and per-line unit_cost/material_cost/labor_cost defaults to 0 when absent
   - `bill_of_quantities`: flatten scope divisions/items with CSI code, quantity, unit, total
   - `assumptions`: merge scope exclusions/special requirements + risk assumptions (fallback defaults)
3) Add a validation test (integration) using `docs/clarification-output-example.json` to ensure the payload contains required fields and percentile ordering.

## Residual Notes
- Risk: MonteCarloService emits histogram (~20 bins) and top_risks (expected impact/variance). RiskAgent passes through; FinalAgent consumes and includes in `risk_analysis`.
- Keep current agent outputs intact; new root fields augment, not replace, existing data.

