# Story 4.3: PDF Report Generation

Status: review

## Story

As a **user (contractor/homeowner)**,
I want **to receive a professional PDF estimate report**,
so that **I can review, share, and present the cost estimate to clients or stakeholders**.

## Acceptance Criteria

| AC# | Criterion | Verification |
|-----|-----------|--------------|
| 4.3.1 | PDF contains Executive Summary with total cost, timeline, and confidence range | Visual inspection |
| 4.3.2 | PDF contains Cost Breakdown by CSI division with subtotals | Visual inspection |
| 4.3.3 | PDF contains Bill of Quantities with all line items | Visual inspection |
| 4.3.4 | PDF contains Labor Analysis with trades and hours | Visual inspection |
| 4.3.5 | PDF contains Schedule section with task list or timeline | Visual inspection |
| 4.3.6 | PDF contains Risk Analysis with P50/P80/P90 and top risks | Visual inspection |
| 4.3.7 | PDF contains Assumptions and Exclusions section | Visual inspection |
| 4.3.8 | CAD plan image included with annotations (if available) | Visual inspection |
| 4.3.9 | PDF generated in < 10 seconds | Performance test |
| 4.3.10 | PDF uploaded to Firebase Storage and download URL returned | Integration test |
| 4.3.11 | Section filtering works (can exclude specific sections) | Unit test |
| 4.3.12 | Client-ready mode produces simplified client-facing output | Visual inspection |

### AC 4.3.12 Detailed Requirements (Client-Ready Mode)

The client-ready PDF must be distinctly different from the contractor/internal PDF. The following table defines what should change:

| Section | Contractor PDF (Current) | Client PDF (Required) |
|---------|--------------------------|----------------------|
| **Cover Page** | Shows P50/P80/P90 values with labels | Single "Total Estimate" price (use P80 as final) |
| **Executive Summary** | "Monte Carlo simulation with 1000 iterations" | No mention of Monte Carlo methodology |
| **Cost Breakdown** | "Overhead & Profit" as separate visible line | O&P rolled into line item prices (hidden from client) |
| **Risk Analysis** | Full section with histogram, P50/P80/P90 percentiles, iteration counts | Either **excluded entirely** OR simplified to "Contingency recommendation: X%" without Monte Carlo details |
| **Internal Notes** | Hidden | Hidden (already working) |

**Bug Report:** The current implementation only hides internal notes but does NOT implement the full client-ready experience described above. Templates expose contractor-level detail to clients.

## Tasks / Subtasks

- [x] **Task 1: Create Jinja2 Templates** (AC: 4.3.1-4.3.8) ✅
  - [x] 1.1 Create `functions/templates/` directory
  - [x] 1.2 Create `estimate_report.html` base template
  - [x] 1.3 Create `_executive_summary.html` partial
  - [x] 1.4 Create `_cost_breakdown.html` partial with CSI division tables
  - [x] 1.5 Create `_bill_of_quantities.html` partial
  - [x] 1.6 Create `_labor_analysis.html` partial
  - [x] 1.7 Create `_schedule.html` partial
  - [x] 1.8 Create `_risk_analysis.html` partial with histogram chart
  - [x] 1.9 Create `_assumptions.html` partial
  - [x] 1.10 Create `_cad_plan.html` partial for CAD image
  - [x] 1.11 Create `styles.css` for PDF styling

- [x] **Task 2: Implement PDF Generator Service** (AC: 4.3.9-4.3.12) ✅
  - [x] 2.1 Create `functions/services/pdf_generator.py`
  - [x] 2.2 Implement `async def generate_pdf(estimate_id, sections, client_ready) -> PDFGenerationResult`
  - [x] 2.3 Load estimate data from Firestore `/estimates/{id}`
  - [x] 2.4 Load related data: costEstimate, riskAnalysis, billOfQuantities, cadData
  - [x] 2.5 Render Jinja2 template with context
  - [x] 2.6 Convert HTML to PDF using WeasyPrint
  - [x] 2.7 Upload PDF to Firebase Storage `/pdfs/{estimateId}/estimate.pdf`
  - [x] 2.8 Generate signed download URL
  - [x] 2.9 Implement section filtering (skip sections not in list)
  - [x] 2.10 Implement client-ready mode (hide internal notes, raw data)

- [x] **Task 3: Create Data Models** (AC: 4.3.10) ✅
  - [x] 3.1 Create `PDFGenerationRequest` dataclass
  - [x] 3.2 Create `PDFGenerationResult` dataclass with pdf_url, storage_path, page_count, file_size

- [x] **Task 4: Add Structured Logging** (AC: all) ✅
  - [x] 4.1 Log `pdf_generated` with estimate_id, page_count, file_size_kb, duration_ms
  - [x] 4.2 Log `pdf_generation_error` with estimate_id, error details
  - [x] 4.3 Log `storage_upload` with path, size

- [x] **Task 5: Write Unit Tests** (AC: 4.3.9, 4.3.11) ✅
  - [x] 5.1 Create `functions/tests/unit/test_pdf_generator.py`
  - [x] 5.2 Test: Template renders with all sections
  - [x] 5.3 Test: Section filtering excludes specified sections
  - [x] 5.4 Test: Client-ready mode hides internal notes
  - [x] 5.5 Test: PDF generation completes < 10 seconds
  - [x] 5.6 Test: Result contains valid URL and metadata

- [x] **Task 6: Create Demo Script for User Verification** (AC: all) ✅
  - [x] 6.1 Create `functions/demo_pdf_generator.py`
  - [x] 6.2 Create mock estimate data (kitchen remodel, ~$34k)
  - [x] 6.3 Generate `sample_estimate.pdf` in current directory
  - [x] 6.4 Generate `sample_estimate_client.pdf` (client-ready version)
  - [x] 6.5 Print file info: page count, size, generation time
  - [x] 6.6 Add `--sections` argument to test filtering
  - [x] 6.7 Auto-open PDF in default viewer (optional --open flag)

- [x] **Task 7: Fix Client-Ready Mode Templates** (AC: 4.3.12) ✅
  - [x] 7.1 Update `estimate_report.html` base template to support `client_ready` conditional logic throughout
  - [x] 7.2 Update Cover Page: Show single "Total Estimate" (P80) instead of P50/P80/P90 breakdown when `client_ready=True`
  - [x] 7.3 Update `_executive_summary.html`: Remove all Monte Carlo methodology references ("1000 iterations", "simulation", percentile explanations)
  - [x] 7.4 Update `_cost_breakdown.html`: Hide "Overhead & Profit" line item; bake O&P into individual line item prices
  - [x] 7.5 Create `_risk_analysis_client.html`: Simplified "Contingency Recommendation" section (no histogram, no P50/P80/P90)
  - [x] 7.6 Update `pdf_generator.py`: Ensure `client_ready` flag is properly passed to all template contexts
  - [x] 7.7 Add logic in templates to compute adjusted line item prices (with O&P baked in) for client mode

- [x] **Task 8: Update Unit Tests for Client-Ready Mode** (AC: 4.3.12) ✅
  - [x] 8.1 Add test: Client PDF does NOT contain "Monte Carlo" text
  - [x] 8.2 Add test: Client PDF does NOT contain "P50", "P80", "P90" labels
  - [x] 8.3 Add test: Client PDF does NOT contain "Overhead & Profit" visible line
  - [x] 8.4 Add test: Client PDF shows single total estimate value
  - [x] 8.5 Add test: Client PDF risk section is either excluded OR simplified

- [x] **Task 9: Update Demo Script Verification** (AC: 4.3.12) ✅
  - [x] 9.1 Update demo output to show contractor vs client PDF differences
  - [x] 9.2 Add comparison print showing what's hidden in client mode

## User Verification

After completing this story, run these commands to verify it works:

| Command | What You See |
|---------|--------------|
| `cd functions && python3 demo_pdf_generator.py` | Generates `sample_estimate.pdf`, prints file info |
| Open `functions/sample_estimate.pdf` | Professional PDF with all 8 sections |
| `cd functions && python3 demo_pdf_generator.py --client-ready` | Generates simplified `sample_estimate_client.pdf` |
| `cd functions && python3 demo_pdf_generator.py --sections executive_summary,cost_breakdown` | Generates PDF with only 2 sections |
| `cd functions && python3 -m pytest tests/unit/test_pdf_generator.py -v` | All tests pass |

**Expected Console Output:**
```
============================================================
  PDF Report Generator - Sample Estimate
============================================================

  Generating PDF for: Kitchen Remodel - 123 Main St
  Total Estimate: $45,230 (P50) / $49,850 (P80)

  Rendering sections:
    [x] Executive Summary
    [x] Cost Breakdown
    [x] Bill of Quantities
    [x] Labor Analysis
    [x] Schedule
    [x] Risk Analysis
    [x] Assumptions & Exclusions
    [x] CAD Plan

  Converting HTML to PDF...
  Uploading to storage... (skipped in demo mode)

  PDF Generated Successfully!
  ---------------------------
  File: sample_estimate.pdf
  Pages: 12
  Size: 847 KB
  Time: 6.2 seconds

  Open the PDF to verify all sections are present.
============================================================
```

**PDF Visual Verification Checklist:**

| Section | What to Check |
|---------|---------------|
| Executive Summary | Project name, address, total cost, confidence range, timeline |
| Cost Breakdown | Table by CSI division, subtotals, grand total matches |
| Bill of Quantities | Line items with quantity, unit, unit cost, total |
| Labor Analysis | Table of trades, hours, rates, labor subtotal |
| Schedule | Task list or Gantt-style timeline |
| Risk Analysis | P50/P80/P90 percentiles, histogram chart, top 5 risks |
| Assumptions | Listed assumptions and exclusions |
| CAD Plan | Annotated floor plan image (if included) |

## Dev Notes

### Architecture Alignment

This story implements the **PDF Generator Service** component of Epic 4. The service is called by the Final Agent (Epic 2) after the estimate is complete, and can also be called directly from the frontend API.

**Ownership (Dev 4 Exclusive):**
- `functions/services/pdf_generator.py`
- `functions/templates/**`

**Architecture Decisions:**
- **ADR-006**: WeasyPrint + Jinja2 for PDF generation (CSS-based styling, Python native)

### Data Model Reference

```python
@dataclass
class PDFGenerationRequest:
    estimate_id: str
    sections: Optional[List[str]] = None  # None = all sections
    # Options: "executive_summary", "cost_breakdown", "boq",
    #          "labor_analysis", "schedule", "risk_analysis",
    #          "assumptions", "cad_plan"
    client_ready: bool = False

@dataclass
class PDFGenerationResult:
    pdf_url: str  # Firebase Storage download URL
    storage_path: str  # gs://bucket/pdfs/{estimateId}/estimate.pdf
    page_count: int
    file_size_bytes: int
    generated_at: str  # ISO timestamp
```

### API Interface

```python
async def generate_pdf(
    estimate_id: str,
    sections: Optional[List[str]] = None,
    client_ready: bool = False
) -> PDFGenerationResult:
    """
    Generate professional PDF estimate report.

    Args:
        estimate_id: Firestore estimate document ID
        sections: Optional list of sections to include (None = all)
        client_ready: If True, generate simplified client version

    Returns:
        PDFGenerationResult with Storage URL and metadata
    """
```

### Template Structure

```
functions/templates/
├── estimate_report.html      # Base template
├── styles.css                # PDF styling (WeasyPrint compatible)
├── _executive_summary.html   # Section partials
├── _cost_breakdown.html
├── _bill_of_quantities.html
├── _labor_analysis.html
├── _schedule.html
├── _risk_analysis.html
├── _assumptions.html
└── _cad_plan.html
```

### Section Identifiers

| Section ID | Display Name | Client-Ready |
|------------|--------------|--------------|
| `executive_summary` | Executive Summary | Yes |
| `cost_breakdown` | Cost Breakdown | Yes |
| `boq` | Bill of Quantities | Yes |
| `labor_analysis` | Labor Analysis | Yes |
| `schedule` | Project Schedule | Yes |
| `risk_analysis` | Risk Analysis | Yes |
| `assumptions` | Assumptions & Exclusions | Yes |
| `cad_plan` | CAD Floor Plan | Yes |

### Performance Requirements

| Metric | Target | Implementation |
|--------|--------|----------------|
| PDF generation | < 10 seconds | WeasyPrint with pre-compiled CSS |
| PDF file size | < 5MB typical | Optimized images, compressed CSS |

### Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| weasyprint | 60.x | HTML to PDF conversion |
| jinja2 | 3.1.x | Template rendering |
| firebase-admin | 6.x | Storage upload |
| structlog | 23.x | Structured logging |

### WeasyPrint Notes

- WeasyPrint uses CSS for styling (not PDF-specific libraries)
- Page breaks: Use `page-break-before: always` in CSS
- Headers/footers: Use `@page` CSS rules
- Image handling: Compress CAD images to 150dpi max
- Font loading: Bundle fonts or use web-safe fonts

### Project Structure Notes

- Template directory: `functions/templates/` (new directory)
- Main service: `functions/services/pdf_generator.py` (new file)
- Tests: `functions/tests/unit/test_pdf_generator.py` (new file)
- Demo script: `functions/demo_pdf_generator.py` (new file)
- Uses `structlog` for structured logging (per architecture.md)
- Leverages existing `functions/services/` package structure from Story 4.1

### References

- [Source: docs/sprint-artifacts/tech-spec-epic-4.md#Story-4.3]
- [Source: docs/epics.md#Epic-4]
- [Source: docs/architecture.md#PDF-Generation]
- [Source: docs/prd.md#FR59-61, FR63-64, FR75]
- [WeasyPrint Documentation](https://doc.courtbouillon.org/weasyprint/)

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/4-3-pdf-report-generation.context.xml

### Agent Model Used

- Claude Code (claude-opus-4-5-20251101)

### Debug Log References

- N/A (implementation completed without significant debugging)

### Completion Notes List

1. **Templates created** - All 9 Jinja2 templates + CSS created in `functions/templates/`
2. **Service implemented** - `functions/services/pdf_generator.py` with async and local generation
3. **Data models** - `PDFGenerationRequest` and `PDFGenerationResult` dataclasses
4. **Structured logging** - Using structlog for pdf_generated, pdf_generation_error, storage_upload events
5. **27 unit tests** - All passing in `functions/tests/unit/test_pdf_generator.py`
6. **Demo script** - `functions/demo_pdf_generator.py` with Monte Carlo integration
7. **Performance** - PDF generation in ~2.7 seconds (well under 10s target)
8. **File size** - ~160KB for full report (well under 5MB target)
9. **Client-Ready Mode REWORK (2025-12-10):**
   - Created `_risk_analysis_client.html` - Simplified contingency section without Monte Carlo details
   - Updated `estimate_report.html` - Cover page shows single "Total Estimate" (P80) for client mode
   - Updated `_executive_summary.html` - No Monte Carlo methodology references for clients
   - Updated `_cost_breakdown.html` - O&P hidden and baked into line item prices for clients
   - Added professional disclaimers in footer for client PDFs
   - Added 8 new client-ready tests (35 total tests, all passing)
   - Updated demo script with contractor vs client comparison output

### File List

**New Files:**
- `functions/templates/styles.css` - Professional CSS for PDF styling
- `functions/templates/estimate_report.html` - Base template
- `functions/templates/_executive_summary.html` - Executive Summary section
- `functions/templates/_cost_breakdown.html` - Cost Breakdown section
- `functions/templates/_bill_of_quantities.html` - Bill of Quantities section
- `functions/templates/_labor_analysis.html` - Labor Analysis section
- `functions/templates/_schedule.html` - Schedule section
- `functions/templates/_risk_analysis.html` - Risk Analysis with histogram (contractor)
- `functions/templates/_risk_analysis_client.html` - Simplified contingency section (client)
- `functions/templates/_assumptions.html` - Assumptions & Exclusions section
- `functions/templates/_cad_plan.html` - CAD Plan section
- `functions/services/pdf_generator.py` - PDF Generator Service
- `functions/tests/unit/test_pdf_generator.py` - Unit tests (35 tests)
- `functions/demo_pdf_generator.py` - Demo script

**Modified Files:**
- `functions/services/__init__.py` - Export PDF generator functions
- `functions/requirements.txt` - Enable weasyprint and jinja2 dependencies

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-12-10 | PM Agent (John) | Initial story creation with user verification tasks |
| 2025-12-10 | Dev Agent (Claude) | Implemented all tasks, 27 tests passing, PDF generation ~2.7s |
| 2025-12-10 | SM Agent (Bob) | **REWORK**: Reopened story. AC 4.3.12 client-ready mode incomplete. Added Tasks 7-9 to fix: cover page shows P50/P80/P90 instead of single price, Monte Carlo details exposed, O&P visible as separate line, risk analysis shows full histogram. Templates need significant rework for proper contractor vs client differentiation. |
| 2025-12-10 | Dev Agent (Claude) | **REWORK COMPLETE**: Implemented full client-ready mode. Cover page shows single authoritative total (P80). Executive summary removes Monte Carlo references. Cost breakdown hides O&P and bakes into line items. Created simplified `_risk_analysis_client.html` with contingency info only. Added professional disclaimers. 35 tests passing, all AC 4.3.12 requirements met. |
