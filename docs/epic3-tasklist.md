# Epic 3 Task List (User Input & Clarification)

> **Note:** Each PR includes both backend services AND UI test components to verify functionality as we progress.

## PR 1: Storage & CAD upload plumbing
**Backend:**
- Add Storage helper for CAD uploads (PDF/DWG/DXF/PNG/JPG) with type/size validation.
- Store at `cad/{estimateId}/filename`; return fileUrl + metadata.
- Wire basic error handling for invalid types/oversize.

**Frontend (Test UI):**
- Dashboard button: "Epic 3 Test Lab" → `/epic3-lab`
- PR1 Test Panel: File upload with validation feedback, size/type checks, upload simulation
- Display upload results (fileUrl, metadata, errors)

Files:
- Backend: `functions/services/storage_service.py`, `functions/config/settings.py`, `functions/tests/unit/test_storage_service.py`
- Frontend: `src/services/cadUploadMock.ts`, `src/components/epic3/Epic3Lab.tsx`, `src/components/epic3/PR1StorageTest.tsx`

## PR 2: CAD parsing services (DWG/DXF + Vision)
**Backend:**
- Implement ezdxf parser for DWG/DXF to unified `ExtractionResult` (rooms, walls, openings, scale, confidences).
- Implement GPT-4o Vision path for PDF/images; same schema; include extractionMethod, extractionConfidence, rawExtraction.
- Add unified types/schemas; unit tests with fixtures/mocks.

**Frontend (Test UI):**
- PR2 Test Panel: Upload CAD file → trigger parsing → display `ExtractionResult`
- Show extraction method (ezdxf vs Vision), confidence scores
- Visualize rooms, walls, openings, dimensions in table/JSON view
- Display raw extraction data with confidence indicators

Files:
- Backend: `functions/services/cad_parser.py`, `functions/services/vision_service.py`, `functions/types/extraction.py`, `functions/tests/unit/test_cad_parser.py`, `functions/tests/unit/test_vision_service.py`
- Fixtures: `functions/tests/fixtures/sample.dwg`, `sample.pdf`
- Frontend: `src/components/epic3/PR2ParsingTest.tsx`, `src/types/extraction.ts`

## PR 3: Voice transcription fallback
**Backend:**
- Implement Whisper fallback service for browsers without Web Speech API.
- Support webm/mp3/wav; return `{text, confidence}`; add unit tests.

**Frontend (Test UI):**
- PR3 Test Panel: Record audio button with waveform visualization
- Upload pre-recorded audio file for transcription
- Display transcription result with confidence score
- Show fallback indicator (Web Speech API vs Whisper)

Files:
- Backend: `functions/services/whisper_service.py`, `functions/tests/unit/test_whisper_service.py`
- Fixture: `functions/tests/fixtures/sample.webm`
- Frontend: `src/components/epic3/PR3VoiceTest.tsx`, `src/hooks/useWhisperTranscription.ts`

## PR 4: Clarification Agent core + endpoints
**Backend:**
- Add callable functions: `start_estimate` (init, status=clarifying) and `send_clarification_message` (chat turns).
- Clarification Agent: enforce CAD presence, pull CAD extraction, collect projectBrief (full address), scope details, timeline, finishes; persist conversation to `/estimates/{id}/conversations`; update `/agentOutputs/clarification`.

**Frontend (Test UI):**
- PR4 Test Panel: Full clarification chat interface
- "Start New Estimate" button → calls `start_estimate`
- Chat UI with message history from Firestore
- CAD upload requirement indicator
- Real-time agent typing indicator
- Display extracted project brief fields as they're collected
- Show conversation persistence status

Files:
- Backend: `functions/main.py`, `functions/agents/clarification_agent.py`, `functions/services/firestore_service.py`, `functions/types/clarification.py`, `functions/tests/integration/test_clarification_agent.py`, `functions/tests/unit/test_main_clarification.py`
- Frontend: `src/components/epic3/PR4ClarificationTest.tsx`, `src/hooks/useClarificationAgent.ts`, `src/services/clarificationService.ts`

## PR 5: ClarificationOutput assembly & validation
**Backend:**
- Build ClarificationOutput (v3.0.0-like): metadata, projectBrief, csiScope (24 divisions + status/exclusionReason), cadData, conversation, flags, schemaVersion.
- Add validator: require all divisions, exclusion reasons, cadData.fileUrl, layoutNarrative length, schemaVersion; set flags for low confidence/missing data.
- Write `clarificationOutput` to `/estimates/{id}`; update `/agentOutputs/clarification` summary/status.

**Frontend (Test UI):**
- PR5 Test Panel: ClarificationOutput viewer
- Display complete schema (v3.0.0) in organized sections
- Show all 24 CSI divisions with status indicators (included/excluded/pending)
- Display validation results with error highlighting
- Show flags (lowConfidence, missingData, needsReview)
- JSON/Pretty toggle view
- Schema version indicator

Files:
- Backend: `functions/types/clarification_output.py`, `functions/services/clarification_output_builder.py`, `functions/services/clarification_validator.py`, `functions/tests/unit/test_clarification_output_builder.py`, `functions/tests/unit/test_clarification_validator.py`
- Updates: `functions/main.py`, `functions/agents/clarification_agent.py`
- Frontend: `src/components/epic3/PR5OutputViewer.tsx`, `src/types/clarificationOutput.ts`

## PR 6: Handoff to Deep Pipeline + error surfaces
**Backend:**
- On validation success, call Dev 2 entry (`start_deep_pipeline` or stub) with ClarificationOutput.
- Ensure status transitions: draft → clarifying → processing (handoff) or needs_review on validation errors.
- Improve error responses (missing CAD, schema errors, missing env keys).

**Frontend (Test UI):**
- PR6 Test Panel: Status transition flow visualizer
- Show estimate status progression (draft → clarifying → processing → needs_review)
- Display handoff success/failure indicator
- Show error surfaces (missing CAD warning, schema validation errors, env key issues)
- Real-time Firestore status listener
- Handoff payload viewer (what gets sent to Dev 2)

Files:
- Backend: `functions/main.py`, `functions/agents/clarification_agent.py`, `functions/services/firestore_service.py`, `functions/tests/integration/test_clarification_handoff.py`
- Frontend: `src/components/epic3/PR6HandoffTest.tsx`, `src/components/epic3/StatusFlowDiagram.tsx`

## PR 7: Firestore/Storage rules + emulator configs
**Backend:**
- Update Firestore rules for `/estimates`, `/conversations`, `/agentOutputs` (owner-only access, basic validation).
- Update Storage rules for CAD uploads under `cad/{estimateId}/...`.
- Provide emulator config and env examples for Functions (OPENAI_API_KEY) and frontend (dummy Firebase config, emulator flags).

**Frontend (Test UI):**
- PR7 Test Panel: Security rules tester
- Test permitted operations (read/write own estimates)
- Test forbidden operations (access others' estimates)
- Display rule evaluation results (allow/deny with reason)
- Emulator connection status indicator
- Environment config validator

Files:
- Backend: `firestore.rules`, `storage.rules`, `firebase.json`, `functions/.env.example`, `collabcanvas/.env.example`
- Frontend: `src/components/epic3/PR7SecurityTest.tsx`, `src/utils/emulatorCheck.ts`

## PR 8: Mocks, fixtures, and test harness
**Backend:**
- Add mock CAD extraction outputs and Whisper responses for emulator runs.
- Add emulator scripts/tests for end-to-end ClarificationOutput generation.
- Document runbook for emulators/tests.

**Frontend (Test UI):**
- PR8 Test Panel: End-to-end test runner
- "Run Full Epic 3 Flow" button → complete mock flow
- Step-by-step progress indicator (upload → parse → clarify → validate → handoff)
- Display all intermediate outputs
- Mock data selector (choose different test scenarios)
- Test results summary with pass/fail indicators
- Integration test log viewer

Files:
- Backend: `functions/tests/fixtures/mock_extraction.json`, `functions/tests/fixtures/mock_clarification_output.json`, `functions/tests/integration/test_clarification_e2e.py`, `README.md` or `docs/dev-notes.md`
- Frontend: `src/components/epic3/PR8E2ETest.tsx`, `src/services/epic3TestRunner.ts`, `src/components/epic3/TestResultsViewer.tsx`

---

## Future Enhancements (Post-MVP)

### CAD Parsing Accuracy Improvements

#### Priority 1: Enhanced DXF Extraction ✅ IMPLEMENTED (v2)
- [x] Calculate room areas from closed polylines using shoelace formula
- [x] Detect wall thickness from parallel line pairs
- [x] Scale detection from dimension text entities (e.g., "12'-0"")
- [x] Improved room labeling via text proximity matching to polygon centroids
- [x] Support for blocks/groups containing room boundaries
- [x] Room adjacency detection based on proximity and shared walls
- [x] Entry point identification for exterior doors
- [x] **NEW: Building outline detection (largest polyline = exterior walls)**
- [x] **NEW: Room boundary edges as interior walls**
- [x] **NEW: Position-based wall classification (edge = exterior)**
- [x] **NEW: Window detection from blocks, rectangles, patterns, and gaps**
- [x] **NEW: Window detection from glazing/window layers**
- [x] **NEW: Gap detection in exterior walls as windows**

#### Priority 2: Multi-Pass Vision Analysis ✅ IMPLEMENTED (v2)
- [x] Pass 1: Identify all rooms and their labels
- [x] Pass 2: Count and locate all doors/windows with visual guidance
- [x] Pass 3: Analyze spatial relationships, walls, and adjacencies
- [x] Higher DPI option (200 DPI, configurable) for complex architectural plans
- [x] Chain-of-thought prompting for better reasoning
- [x] Expert system prompt with architectural knowledge
- [x] Structured JSON output with validation
- [x] **NEW: Detailed window identification guide with symbol descriptions**
- [x] **NEW: Per-room window counts (windowsByRoom)**
- [x] **NEW: Exterior wall analysis per direction (N/S/E/W)**
- [x] **NEW: Window count per exterior wall**
- [x] **NEW: Interior vs exterior wall differentiation**
- [x] **NEW: Building shape detection (rectangular/L-shaped/U-shaped)**

#### Priority 3: DWG Binary Format Support
- [ ] Integrate ODA File Converter (free command-line tool from opendesign.com)
- [ ] Auto-convert DWG → DXF before ezdxf parsing
- [ ] Fallback to Vision path if conversion fails
- [ ] Cache converted DXF files to avoid re-conversion

#### Priority 4: Accuracy Validation & Feedback
- [ ] Side-by-side comparison UI (extracted vs. user-corrected)
- [x] Confidence scoring based on extraction method and completeness
- [ ] User verification workflow for low-confidence items
- [ ] Learning from corrections to improve future extractions

### Technical Debt
- [ ] Add comprehensive unit tests for cad_parser.py geometry extraction
- [ ] Add unit tests for vision_service.py with mocked OpenAI responses
- [ ] Performance benchmarking for large CAD files
- [ ] Memory optimization for high-DPI PDF conversion

### Documentation
- [ ] API documentation for `/parse-cad` endpoint
- [ ] Supported CAD formats comparison table
- [ ] Troubleshooting guide for common parsing issues
- [ ] Example ExtractionResult outputs for each format

