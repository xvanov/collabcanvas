# Story 1.3: AI Labor Estimation + CPM Calculation

**Status:** Draft

---

## User Story

As a **project manager**,
I want AI to generate detailed labor estimates with task dependencies and critical path analysis,
So that I can accurately estimate project timelines and labor costs before starting work.

---

## Acceptance Criteria

**AC #1:** AI generates task breakdown from scope of work
- **Given** user enters project scope: "Remodel kitchen: demo cabinets, install new cabinets, countertops, backsplash, paint"
- **When** user clicks "Generate Labor Estimate"
- **Then** AI returns 5-10 tasks with names, descriptions, estimated hours
- **And** each task has clear dependencies (e.g., "Install Cabinets" depends on "Demo Cabinets")

**AC #2:** Task dependencies form valid DAG (no cycles)
- **Given** AI generates tasks with dependencies
- **When** system validates dependency graph
- **Then** no circular dependencies exist
- **And** all dependency references point to valid task IDs

**AC #3:** CPM algorithm calculates critical path
- **Given** tasks with dependencies and durations
- **When** system runs CPM calculation
- **Then** earliest start/finish and latest start/finish are calculated for each task
- **And** tasks with zero float are marked as critical path
- **And** at least one critical path exists (or all tasks have float)

**AC #4:** Labor estimate includes total cost and duration
- **Given** tasks with hours and crew-specific rates
- **When** system calculates totals
- **Then** total estimated labor cost = sum(task hours × crew base rate)
- **And** total estimated duration = length of critical path in days

**AC #5:** User can manually adjust tasks
- **Given** AI-generated task list
- **When** user edits task hours or adds/removes dependencies
- **Then** system recalculates CPM automatically
- **And** updates critical path and totals

**AC #6:** Labor estimate persists in database
- **Given** user saves labor estimate
- **When** system stores in Supabase
- **Then** labor_estimates and cpm_tasks tables contain all data
- **And** estimate is linked to project_id in Firestore

---

## Implementation Details

### Tasks / Subtasks

**Backend Tasks:**
- [ ] Create labor estimation service (AC: #1, #4, #6)
  - [ ] Create `backend/src/services/laborEstimationService.ts`
  - [ ] Function: `generateLaborEstimate(scopeOfWork, projectType, crewId)` - calls AI and returns estimate
  - [ ] AI prompt engineering: Request JSON with tasks, dependencies, hours
  - [ ] Parse AI response into structured LaborEstimate object
  - [ ] Calculate total cost using crew-specific base rate
  - [ ] Function: `saveLaborEstimate(estimate)` - saves to Supabase
  - [ ] Function: `getLaborEstimate(projectId)` - retrieves estimate by project
  - [ ] Function: `updateLaborEstimate(estimateId, tasks)` - updates tasks and recalculates
- [ ] Implement AI integration (AC: #1)
  - [ ] Create or extend `backend/src/services/aiService.ts`
  - [ ] Function: `generateTaskBreakdown(scopeOfWork, projectType)` - calls OpenAI
  - [ ] Use structured output mode (JSON schema) for consistent task format
  - [ ] Retry logic for AI failures (max 2 retries)
  - [ ] Fallback to manual entry form if AI fails
- [ ] Implement CPM calculation algorithm (AC: #2, #3, #4)
  - [ ] Create `backend/src/services/cpmService.ts`
  - [ ] Function: `calculateCriticalPath(tasks)` - returns tasks with CPM data
  - [ ] Step 1: Validate DAG (detect circular dependencies using DFS)
  - [ ] Step 2: Topological sort tasks
  - [ ] Step 3: Forward pass (calculate ES and EF for each task)
  - [ ] Step 4: Backward pass (calculate LS and LF for each task)
  - [ ] Step 5: Calculate float (LS - ES) for each task
  - [ ] Step 6: Mark critical path (tasks with float = 0)
  - [ ] Return total project duration (max EF among all tasks)
- [ ] Create labor estimation API routes (AC: all)
  - [ ] Create `backend/src/routes/laborEstimates.ts`
  - [ ] POST /api/labor-estimates - generate new estimate (calls AI)
  - [ ] GET /api/labor-estimates/:projectId - get estimate by project
  - [ ] PUT /api/labor-estimates/:id - update estimate (recalculates CPM)
  - [ ] DELETE /api/labor-estimates/:id - delete estimate
  - [ ] Add authentication middleware (all routes)
- [ ] Add CPM calculation tests (AC: #3)
  - [ ] Create `backend/tests/services/cpmService.test.ts`
  - [ ] Test simple linear path (A → B → C)
  - [ ] Test parallel paths (A → B, A → C → D)
  - [ ] Test diamond pattern (A → B → D, A → C → D)
  - [ ] Test circular dependency detection (should throw error)
  - [ ] Test float calculation
  - [ ] Test critical path identification
- [ ] Add AI prompt validation (AC: #1)
  - [ ] Validate AI response has required fields (name, hours, dependencies)
  - [ ] Validate hours > 0 for all tasks
  - [ ] Validate dependencies reference valid task IDs
  - [ ] Retry with refined prompt if validation fails

**Frontend Tasks:**
- [ ] Create frontend labor estimation service (AC: #1, #6)
  - [ ] Create `collabcanvas/src/services/laborEstimationService.ts`
  - [ ] Function: `generateEstimate(projectId, scopeOfWork, projectType, crewId)` - calls POST
  - [ ] Function: `fetchEstimate(projectId)` - calls GET
  - [ ] Function: `updateEstimate(estimateId, tasks)` - calls PUT
  - [ ] Function: `deleteEstimate(estimateId)` - calls DELETE
  - [ ] Add loading states and error handling
- [ ] Create labor estimation store (AC: all)
  - [ ] Create `collabcanvas/src/store/useLaborEstimateStore.ts`
  - [ ] State: estimate, tasks, loading, error
  - [ ] Action: generateEstimate(projectId, scopeOfWork) - triggers AI generation
  - [ ] Action: loadEstimate(projectId) - fetches existing estimate
  - [ ] Action: updateTask(taskId, updates) - updates task and recalculates CPM
  - [ ] Action: addTask(task) - adds new task and recalculates
  - [ ] Action: removeTask(taskId) - removes task and recalculates
- [ ] Build labor estimation panel component (AC: #1, #5)
  - [ ] Create `collabcanvas/src/components/labor/LaborEstimationPanel.tsx`
  - [ ] Text area for scope of work (multiline, 500 char max)
  - [ ] Dropdown for project type (residential, commercial, industrial)
  - [ ] Dropdown for crew selection (fetches crews from API)
  - [ ] "Generate Labor Estimate" button
  - [ ] Loading spinner during AI generation
  - [ ] Error message display if AI fails
  - [ ] Option to retry or switch to manual entry
- [ ] Build task breakdown component (AC: #5)
  - [ ] Create `collabcanvas/src/components/labor/TaskBreakdown.tsx`
  - [ ] Table showing tasks with columns: name, hours, dependencies, critical path flag
  - [ ] Inline editing for hours (editable input field)
  - [ ] Dependency selector (dropdown to add/remove dependencies)
  - [ ] Visual indicator for critical path tasks (red badge)
  - [ ] Add/remove task buttons
  - [ ] Auto-recalculate CPM on any change (debounced 500ms)
- [ ] Build cost summary component (AC: #4)
  - [ ] Create `collabcanvas/src/components/labor/CostSummary.tsx`
  - [ ] Display total estimated labor cost
  - [ ] Display total estimated duration (in days)
  - [ ] Display crew base rate
  - [ ] Display number of tasks
  - [ ] Display number of critical path tasks
- [ ] Add to project creation flow (AC: #1)
  - [ ] Modify project creation wizard to include labor estimation step
  - [ ] Step 3: "Labor Estimate" (after Scope of Work)
  - [ ] Show LaborEstimationPanel
  - [ ] Allow skip (optional step)
  - [ ] Save estimate when project created
- [ ] Write frontend tests (AC: all)
  - [ ] Create `collabcanvas/tests/components/labor/LaborEstimationPanel.test.tsx`
  - [ ] Test AI generation trigger
  - [ ] Test loading states
  - [ ] Test error handling
  - [ ] Mock API calls

**Integration Tests:**
- [ ] Create `backend/tests/integration/laborEstimation.test.ts` (AC: all)
  - [ ] Test complete flow: generate AI estimate → save to database → retrieve → update tasks → recalculate CPM
  - [ ] Test CPM calculation with real task data
  - [ ] Test circular dependency rejection

---

### Technical Summary

This story adds AI-powered labor estimation with Critical Path Method (CPM) scheduling. Users enter a scope of work (text description), and AI generates a detailed task breakdown with dependencies. The CPM algorithm then calculates the critical path, identifying which tasks directly impact the project timeline. This closes a major gap in Projective, which previously only estimated material costs (BOMs) but had no labor estimation capability.

**Key Technical Decisions:**
- **AI Task Generation:** Use OpenAI with structured output (JSON schema) for consistent format
- **CPM Algorithm:** Classic forward pass + backward pass algorithm for critical path analysis
- **DAG Validation:** Use Depth-First Search (DFS) to detect circular dependencies before CPM
- **Crew-Specific Rates:** Labor cost = task hours × crew base rate (retrieved from database)
- **Manual Override:** Users can edit AI-generated tasks, triggering automatic CPM recalculation
- **Data Storage:** labor_estimates table stores metadata, cpm_tasks table stores individual tasks

**Files/Modules Involved:**
- Backend: laborEstimationService.ts, cpmService.ts, aiService.ts, routes/laborEstimates.ts
- Frontend: LaborEstimationPanel.tsx, TaskBreakdown.tsx, CostSummary.tsx
- Store: useLaborEstimateStore.ts
- Algorithm: CPM calculation (ES, EF, LS, LF, float, critical path)

### Project Structure Notes

- **Files to modify:**
  - `collabcanvas/src/pages/ProjectCreationWizard.tsx` - Add labor estimation step
- **Files to create:**
  - `backend/src/services/laborEstimationService.ts` - Labor estimation logic
  - `backend/src/services/cpmService.ts` - CPM algorithm
  - `backend/src/services/aiService.ts` - AI integration (or extend existing)
  - `backend/src/routes/laborEstimates.ts` - Labor estimation API
  - `collabcanvas/src/services/laborEstimationService.ts` - Labor estimation API client
  - `collabcanvas/src/store/useLaborEstimateStore.ts` - Labor estimation state
  - `collabcanvas/src/components/labor/LaborEstimationPanel.tsx` - AI generation UI
  - `collabcanvas/src/components/labor/TaskBreakdown.tsx` - Task table with editing
  - `collabcanvas/src/components/labor/CostSummary.tsx` - Cost/duration summary
  - `collabcanvas/src/types/laborEstimate.ts` - TypeScript types
- **Expected test locations:**
  - `backend/tests/services/cpmService.test.ts` - CPM algorithm tests
  - `backend/tests/services/laborEstimationService.test.ts` - Service tests
  - `backend/tests/integration/laborEstimation.test.ts` - Integration tests
  - `collabcanvas/tests/components/labor/LaborEstimationPanel.test.tsx` - Component tests
- **Estimated effort:** 3 story points (~1.5 days)
- **Prerequisites:** Story 1.1 (requires backend, AI service integration)

### Key Code References

**Existing Patterns to Follow:**
- **AI Integration:** See existing `collabcanvas/src/services/aiService.ts` for AI prompt patterns
- **Store Pattern:** See existing `collabcanvas/src/store/useBOMStore.ts` for BOM state management (similar pattern for labor estimates)

**Tech-Spec References:**
- AI labor estimation: tech-spec.md:580-630
- CPM algorithm: tech-spec.md:1280-1310
- Data structures: tech-spec.md:1330-1350 (LaborEstimate, CPMTask interfaces)

---

## Context References

**Tech-Spec:** [tech-spec.md](../tech-spec.md) - Primary context document containing:

- AI labor estimation algorithm and prompt engineering
- CPM calculation algorithm (forward/backward pass)
- Data structures (LaborEstimate, CPMTask)
- Integration with existing AI service patterns

**Architecture:** Express backend with AI service, React frontend with Zustand state management

---

## Dev Agent Record

### Agent Model Used

<!-- Will be populated during dev-story execution -->

### Debug Log References

<!-- Will be populated during dev-story execution -->

### Completion Notes

<!-- Will be populated during dev-story execution -->

### Files Modified

<!-- Will be populated during dev-story execution -->

### Test Results

<!-- Will be populated during dev-story execution -->

---

## Review Notes

<!-- Will be populated during code review -->
