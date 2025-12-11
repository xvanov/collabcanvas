# System Patterns

## Architecture & Flow
- 7-agent sequential pipeline: Clarification → CAD Analysis → Location → Scope → Cost → Risk → Final. Each agent writes status/output to Firestore `/estimates/{id}/agentOutputs/{agent}` and updates `pipelineStatus`.
- UI organized into three sections: Input (description + voice + CAD upload + clarification), Plan (CAD data review, BoQ, location overrides), Final Estimate (summary, breakdown, risk, PDF, price comparison).
- API pattern: Firebase callable functions (start_estimate, send_clarification_message, get_estimate_pdf) + Firestore listeners for real-time updates.
- Firestore schema (planned):
  - `/estimates/{estimateId}`: userId, status (draft → clarifying → processing → plan_review → final → exported), cadFileRef, projectBrief, extractedData, billOfQuantities, costEstimate, riskAnalysis, finalEstimate, pipelineStatus.
  - Subcollections: `/agentOutputs/{agent}` {status, output, summary, confidence, tokensUsed, duration}; `/conversations/{msg}`; `/versions/{v}`; feedback collection for actuals.
- CAD processing: DWG/DXF via ezdxf (programmatic), PDF/images via GPT-4o Vision; low-confidence items flagged for user verification.
- Cost/risk: RSMeans-schema mock data for materials/labor/equipment; location factors (labor rates, permit costs, weather, union flag); Monte Carlo (triangular distributions, 1000+ iterations) to produce P50/P80/P90 and contingency.
- PDF generation: Jinja2 HTML template + WeasyPrint; stored in Firebase Storage `/pdfs/{estimateId}/estimate.pdf`.
- Error handling: standard response `{success, data?, error?}`; agent status supports failed/retrying; graceful degradation on data lookup failures (use defaults, flag needsReview).

## Patterns to Reuse from CollabCanvas
- React 19 + Zustand state slices, feature folders.
- Firebase Auth (Google), Firestore/RTDB patterns, Storage upload helpers.
- Realtime presence/listeners, optimistic UI, structured logging.
- **Import Pattern:** Relative imports (`../components/`, `../../services/`) - no `@/` alias.

## Epic 3 Testing Pattern (Established)
- **Separate Test Lab:** `/epic3-lab` route - isolated from main app, accessible via dashboard button.
- **Progressive Unlocking:** Each PR unlocks its test panel (PR1 ✅, PR2-8 🔒).
- **Test UI Structure:**
  - Sidebar: PR navigation with status indicators (✅/🔨/🔒)
  - Main panel: PR-specific test interface with live validation/results
  - Each panel explains what it tests, shows implementation details
- **Development Flow:** Build backend → Create test UI → Test in lab → Unlock next PR.

## Status Transitions
- Estimate status: draft → clarifying → processing → plan_review → final → exported (PDF).
- Agent status: pending → running → completed | failed (with retry path).
- PR status (Epic 3 Lab): locked → in-progress → completed.

