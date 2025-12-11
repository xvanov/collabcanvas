# Active Context

## Current State (2025-12-11)
- **Epic 3 PR1 Complete** ✅: Python storage service with CAD upload validation implemented in `functions_py/`.
- **Epic 3 PR2 Complete + Enhanced** ✅: CAD parsing services with improved wall/window detection:
  - **DXF path**: 6-pass ezdxf extraction with 5 wall strategies + 4 window strategies
  - **PDF/PNG/JPG path**: 3-pass GPT-4o Vision with enhanced wall/window prompts
  - **DWG path**: Returns placeholder (ezdxf cannot parse DWG binary format)
- **Epic 3 Test Lab**: Separate isolated UI (`/epic3-lab`) with PR1 & PR2 panels fully functional.
- Frontend sends file bytes as base64 directly to backend (avoids mock URL issues).
- PDF files are converted to PNG via PyMuPDF at 200 DPI before sending to Vision API.

## Immediate Focus (Epic 3 - User Input & Clarification)
**Current:** PR1-2 complete ✅, working on PR3-8
- **PR3**: Whisper voice transcription fallback
- **PR4**: Clarification Agent with `start_estimate` and `send_clarification_message` endpoints
- **PR5**: ClarificationOutput assembly & validation (schema v3.0.0)
- **PR6**: Pipeline handoff to Dev 2 (Epic 2) with status transitions
- **PR7**: Firestore/Storage security rules + emulator configs
- **PR8**: End-to-end mocks, fixtures, test harness

## Architecture Decisions Made
- **Backend:** Python Functions in `functions_py/` (confirmed) - coexists with Node functions
- **Testing Strategy:** Epic 3 Test Lab at `/epic3-lab` - isolated from main TrueCost UI, progressively unlocks PRs
- **Import Pattern:** Relative imports (`../`) used throughout frontend (no `@/` alias)
- **Storage Path:** CAD files at `cad/{estimateId}/{filename}` with 50MB limit, supports PDF/DWG/DXF/PNG/JPG
- **Type Package:** CAD extraction TypedDicts live in `functions_py/tc_types/` to avoid clashing with Python's standard-library `types` module.
- **Local CAD Parsing Endpoint:** A dev-only HTTP server (`functions_py/demo_cad_server.py`) exposes `POST /parse-cad` on `localhost:8081` so the Epic 3 Lab PR2 panel can call real Python parsing services before Cloud Functions are wired.
- **Frontend CAD Parsing Client:** `collabcanvas/src/services/cadParsingService.ts` sends file bytes (base64) to backend. Configured via `VITE_CAD_PARSE_URL` + `VITE_USE_BACKEND_CAD_PARSE`.
- **PDF Conversion:** PyMuPDF converts PDF to PNG (200 DPI) before sending to Vision API (OpenAI only accepts images).
- **Vision Model:** GPT-4o with 3-pass expert prompts (rooms → openings → walls/spatial).

## CAD Parsing Accuracy Status (Enhanced 2025-12-11)
| Format | Method | Room Detection | Wall Detection | Window Detection | Accuracy |
|--------|--------|----------------|----------------|------------------|----------|
| DXF | ezdxf (6-pass) | Closed polylines + centroid text | Building outline + room boundaries + parallel pairs | Blocks + rectangles + gaps + layer patterns | High |
| PDF | GPT-4o Vision (3-pass) | Multi-pass rooms | Exterior + interior from Pass 3 | Visual guidance + per-room counts | Medium-High |
| PNG/JPG | GPT-4o Vision (3-pass) | Multi-pass rooms | Exterior + interior from Pass 3 | Visual guidance + per-room counts | Medium-High |
| DWG | Placeholder | None | None | None | N/A |

### Enhanced Extraction Features (v2 - 2025-12-11)

**DXF Wall Detection (5 strategies):**
1. Parallel line pairs with thickness measurement
2. Building outline (largest closed polyline = exterior walls)
3. Room boundary edges as interior walls
4. Layer-based detection (walls, a-wall, partition)
5. Position-based classification (edge of drawing = exterior)

**DXF Window Detection (4 strategies):**
1. Block references with window keywords
2. Small rectangles on exterior walls
3. Parallel short lines on glazing layers
4. Gap detection in exterior wall lines

**Vision Wall Detection:**
- Pass 3 asks for exterior wall lengths per direction (N/S/E/W)
- Window count per exterior wall
- Interior wall count estimate
- Building shape detection

**Vision Window Detection:**
- Detailed visual guide for window symbols
- Per-room window count (windowsByRoom)
- Window type classification (double-hung, casement, slider, etc.)
- Wall direction for each window

## Risks / Decisions
- Mixed-language stack (TS + Python) deployment complexity acknowledged; both function types will coexist.
- Epic 3 Test Lab provides isolated testing environment - no integration with main CollabCanvas features until Epic 1 (Frontend) is built.
- Vision path requires valid `OPENAI_API_KEY` in `functions_py/.env`.
- Vision-based extraction estimates dimensions (no actual scale detection) - accuracy limited without dimension labels in the drawing.
- DWG support requires external converter (ODA File Converter) - not yet implemented.

## Next Steps
1. **Continue PR3-8** in sequence (each PR includes backend + test UI component)
2. **Start PR3**: Whisper voice transcription service + Epic 3 Lab panel
3. **Remaining CAD Enhancements** (future improvements):
   - DWG support via ODA File Converter integration
   - User verification workflow for low-confidence detections
   - Learning from user corrections to improve accuracy

