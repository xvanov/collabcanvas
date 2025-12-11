# Progress

## Current Status (Updated 2025-12-11)
- Planning artifacts complete (Product Brief, PRD v1.1, Epics, Architecture docs).
- **Epic 3 PR1 Complete** ✅: Python storage service implemented with comprehensive tests.
- **Epic 3 PR2 Complete + Enhanced** ✅: CAD parsing with improved wall/window detection (v2).
- **Epic 3 Test Lab Created** ✅: Isolated testing UI at `/epic3-lab` with PR1 & PR2 panels working.
- Python backend foundation established in `functions_py/` (coexists with Node functions).
- CollabCanvas frontend foundation intact; TrueCost main UI (Epic 1) not yet started.

## What Works

### Epic 3 PR1 (Complete ✅)
**Backend:**
- `functions_py/services/storage_service.py` - CAD file upload with validation (245 lines)
- `functions_py/config/settings.py` - Configuration & validation helpers (119 lines)
- 40+ unit tests in `test_storage_service.py` (520+ lines)
- Supports PDF, DWG, DXF, PNG, JPG files (max 50MB)
- Storage path: `cad/{estimateId}/{filename}`

**Frontend:**
- `cadUploadMock.ts` - Mock service for frontend development (165 lines)
- Epic 3 Test Lab UI with PR navigation sidebar
- PR1 test panel: file upload, validation, simulation, results display
- Dashboard button to access `/epic3-lab` route

### Epic 3 PR2 (Complete ✅)
**Backend:**
- `functions_py/services/cad_parser.py` - DXF parsing with ezdxf, extracts walls/rooms/openings from geometry
- `functions_py/services/vision_service.py` - GPT-4o Vision for PDF/images, detailed floor plan analysis
- `functions_py/demo_cad_server.py` - Dev HTTP server on port 8081, accepts base64 file uploads
- Supports: DXF (full parsing), PDF/PNG/JPG (Vision), DWG (placeholder)
- PDF→PNG conversion via PyMuPDF for Vision API compatibility

**Frontend:**
- `cadParsingService.ts` - Sends file bytes (base64) to backend
- `PR2ParsingTest.tsx` - Upload CAD files, display ExtractionResult (rooms, walls, openings)
- Summary view with tables + JSON view toggle

**Documentation:**
- `docs/epic3-tasklist.md` updated with frontend UI tasks for all 8 PRs
- `PR1-SUMMARY.md` - Complete implementation details
- Setup guides created

### Foundation from CollabCanvas
- Auth (Google), Firestore/RTDB patterns, canvas tools, BOM/CPM structures, AI chat scaffolding, Firebase hosting/deployment scripts.

## What's Outstanding

### Epic 3 (PR3-8 Pending)
- **PR3**: Whisper voice transcription + test UI
- **PR4**: Clarification Agent (start_estimate, send_clarification_message) + chat test UI
- **PR5**: ClarificationOutput assembly/validation (v3.0.0) + viewer test UI
- **PR6**: Pipeline handoff + status transitions + flow test UI
- **PR7**: Security rules + emulator configs + rules tester UI
- **PR8**: End-to-end mocks/tests + test runner UI

### Other Epics (Not Started)
- **Epic 1**: Main TrueCost UI (Input/Plan/Final sections) - Dev 1
- **Epic 2**: Deep Agent Pipeline (Location/Scope/Cost/Risk/Final agents) - Dev 2
- **Epic 4**: Data Services & PDF (cost data, Monte Carlo, PDF generation) - Dev 4
- **Epic 5**: Stretch features - Dev 5

### Infrastructure
- Seed RSMeans-schema mock data and location factors
- Firestore schema implementation (`/estimates`, `/agentOutputs`, `/conversations`)
- Python Functions deployment configuration
- Integration between Epic 3 output and Epic 2 input

## Completed Components

### Files Created (Epic 3 PR1)
```
functions_py/
├── config/settings.py (119 lines)
├── services/storage_service.py (245 lines)
├── tests/unit/test_storage_service.py (520+ lines)
├── requirements.txt, setup.py, pytest.ini, README.md

collabcanvas/src/
├── services/cadUploadMock.ts (165 lines)
├── components/epic3/
│   ├── Epic3Lab.tsx (270 lines)
│   ├── PR1StorageTest.tsx (310 lines)
│   └── PRPlaceholder.tsx (40 lines)
├── pages/Epic3Lab.tsx
└── App.tsx (updated with /epic3-lab route)
```

### Tests
- 40+ unit tests for storage service (all passing)
- Coverage: validation, upload, helpers, error handling

## CAD Parsing Accuracy Improvements

### ✅ IMPLEMENTED: DXF Enhancement v2 (2025-12-11)
**Room Detection:**
- [x] Extract room areas from closed polylines (shoelace formula)
- [x] Room labeling via centroid-based text proximity matching
- [x] Room adjacency detection based on proximity
- [x] Entry point identification for exterior doors

**Wall Detection (5 strategies):**
- [x] Detect wall thickness from parallel line pairs (0.85 confidence)
- [x] Building outline detection (largest polyline = exterior walls)
- [x] Room boundary edges as interior walls
- [x] Layer-based detection (walls, a-wall, partition layers)
- [x] Position-based classification (edge of drawing = exterior)

**Window Detection (4 strategies):**
- [x] Block references with window keywords
- [x] Small rectangles on exterior walls
- [x] Parallel short lines on glazing layers
- [x] Gap detection in exterior wall lines

**Other:**
- [x] Scale detection from DIMENSION text entities
- [x] 6-pass extraction pipeline: geometry → walls → rooms → openings → scale → relationships

### ✅ IMPLEMENTED: Vision Multi-Pass Analysis v2 (2025-12-11)
**Pass 1 - Rooms:**
- [x] Identify all rooms with labels, types, sqft estimates

**Pass 2 - Openings (Enhanced):**
- [x] Detailed door identification guide with symbol descriptions
- [x] Detailed window identification guide with visual cues
- [x] Per-room window counts (windowsByRoom)
- [x] Interior vs exterior door classification

**Pass 3 - Walls & Spatial (Enhanced):**
- [x] Exterior wall analysis per direction (N/S/E/W)
- [x] Window count per exterior wall
- [x] Interior wall count estimate
- [x] Building shape detection (rectangular/L-shaped/U-shaped)
- [x] Analyze spatial relationships and layout narrative

**Infrastructure:**
- [x] Higher DPI (200) for PDF conversion
- [x] Chain-of-thought prompting for better reasoning
- [x] Expert system prompt with architectural knowledge

### PENDING: DWG Support
- Integrate ODA File Converter (free command-line tool)
- Auto-convert DWG → DXF before parsing
- Or: Route DWG to Vision path as fallback

### PENDING: Accuracy Validation
- Compare extracted vs. actual dimensions
- User verification workflow for low-confidence items

## Risks / Unknowns
- Mixed-language deployment (Node + Python Functions) - complexity accepted
- Vite cache issues when rapidly creating components (solution: use relative imports, clear cache with `--force`)
- Vision accuracy limited without scale/dimension labels in drawings
- DWG format not supported by ezdxf (binary proprietary format)
- Data licensing when moving beyond mocks
- Feedback adoption to reach accuracy targets

## Metrics
- **Lines of Code (PR1+PR2):** ~4500+ (backend + frontend + tests + docs)
- **Test Coverage:** 27 unit tests (all passing) + 40+ storage tests
- **PRs Complete:** 2/8 (25% of Epic 3)
- **Epics Complete:** 0/5 (0% of MVP)
- **CAD Formats Supported:** DXF (full), PDF/PNG/JPG (Vision), DWG (placeholder)
- **DXF Wall Strategies:** 5 (parallel pairs, building outline, room boundaries, layer-based, position-based)
- **DXF Window Strategies:** 4 (blocks, rectangles, line patterns, gap detection)
- **Vision Passes:** 3 (rooms → openings → walls/spatial)

