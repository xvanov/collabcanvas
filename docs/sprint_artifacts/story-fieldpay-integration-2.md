# Story 1.2: Project-Crew Assignment

**Status:** ready-for-dev

---

## User Story

As an **admin**,
I want to assign crews to projects with date ranges,
So that crew members can clock in to authorized projects and admins can track labor allocation.

---

## Acceptance Criteria

**AC #1:** Admin can view all crews
- **Given** demo crews exist in database
- **When** admin navigates to Crew Management page
- **Then** all 3 crews are displayed with foreman name and member count
- **And** each crew card shows active/inactive status

**AC #2:** Admin can assign crew to project
- **Given** admin selects a crew and a project
- **When** admin enters start_date and end_date and clicks "Assign"
- **Then** assignment is created in project_crew_assignments table
- **And** success message displays "Crew assigned to [Project Name]"

**AC #3:** Assignment validation prevents invalid date ranges
- **Given** admin is creating assignment
- **When** end_date is before start_date
- **Then** error displays "End date must be after start date"
- **And** assignment is not saved

**AC #4:** Assignment validation prevents overlapping assignments
- **Given** crew is already assigned to Project A from 2025-01-15 to 2025-01-31
- **When** admin assigns same crew to Project A from 2025-01-20 to 2025-02-05
- **Then** error displays "Crew already assigned to this project during this period"
- **And** assignment is not saved

**AC #5:** UI shows active and inactive assignments
- **Given** assignments exist with past, current, and future dates
- **When** admin views project details
- **Then** current assignments (today within date range) are highlighted in green
- **And** past assignments (end_date < today) are grayed out
- **And** future assignments (start_date > today) are shown in blue

---

## Implementation Details

### Tasks / Subtasks

**Backend Tasks:**
- [ ] Create crew assignment service (AC: #2, #3, #4)
  - [ ] Create `backend/src/services/crewAssignmentService.ts`
  - [ ] Function: `listCrews()` - returns all crews with member count
  - [ ] Function: `getCrewsByProject(projectId)` - returns crews assigned to project
  - [ ] Function: `assignCrewToProject(crewId, projectId, startDate, endDate)` - creates assignment
  - [ ] Function: `validateAssignment(crewId, projectId, startDate, endDate)` - validates no overlaps
  - [ ] Function: `updateAssignment(assignmentId, startDate, endDate)` - updates existing assignment
  - [ ] Function: `deleteAssignment(assignmentId)` - soft deletes assignment
- [ ] Create assignment API routes (AC: all)
  - [ ] Create `backend/src/routes/assignments.ts`
  - [ ] GET /api/assignments - list all crews with assignments
  - [ ] GET /api/assignments/:projectId - get assignments for specific project
  - [ ] POST /api/assignments - create new assignment (requires admin role)
  - [ ] PUT /api/assignments/:id - update assignment (requires admin role)
  - [ ] DELETE /api/assignments/:id - delete assignment (requires admin role)
  - [ ] Add RBAC middleware to all routes (admin only)
- [ ] Assignment validation logic (AC: #3, #4)
  - [ ] Validate start_date < end_date
  - [ ] Query database for existing assignments overlapping date range
  - [ ] Return 400 error with clear message if validation fails
- [ ] Write backend tests (AC: all)
  - [ ] Create `backend/tests/services/crewAssignmentService.test.ts`
  - [ ] Test listCrews returns all crews
  - [ ] Test assignCrewToProject creates assignment
  - [ ] Test validateAssignment catches overlaps
  - [ ] Test validateAssignment catches invalid date ranges
  - [ ] Create `backend/tests/routes/assignments.test.ts`
  - [ ] Test all endpoints with valid/invalid data
  - [ ] Test RBAC enforcement (non-admin should get 403)

**Frontend Tasks:**
- [ ] Create crew management service (AC: #1, #2)
  - [ ] Create `collabcanvas/src/services/crewService.ts`
  - [ ] Function: `fetchCrews()` - calls GET /api/assignments
  - [ ] Function: `fetchCrewsByProject(projectId)` - calls GET /api/assignments/:projectId
  - [ ] Function: `assignCrew(crewId, projectId, startDate, endDate)` - calls POST /api/assignments
  - [ ] Function: `updateAssignment(assignmentId, startDate, endDate)` - calls PUT
  - [ ] Function: `deleteAssignment(assignmentId)` - calls DELETE
  - [ ] Add error handling and toast notifications
- [ ] Create crew assignment store (AC: #1, #2)
  - [ ] Create `collabcanvas/src/store/useCrewStore.ts`
  - [ ] State: crews (array), assignments (array), loading, error
  - [ ] Action: loadCrews() - fetches all crews
  - [ ] Action: loadAssignmentsByProject(projectId) - fetches project assignments
  - [ ] Action: createAssignment(data) - creates new assignment
  - [ ] Action: removeAssignment(id) - deletes assignment
- [ ] Build crew management page (AC: #1, #2, #5)
  - [ ] Create `collabcanvas/src/pages/CrewManagementPage.tsx`
  - [ ] Display crew list in grid layout (3 columns)
  - [ ] Show foreman name, member count, active status
  - [ ] Add "Assign to Project" button (opens modal)
  - [ ] Modal: Select project dropdown, date range inputs, submit button
  - [ ] Restrict page to admin role only (check Firebase custom claims)
- [ ] Build project-crew assignment component (AC: #2, #3, #4, #5)
  - [ ] Create `collabcanvas/src/components/crew/ProjectCrewAssignment.tsx`
  - [ ] Props: projectId
  - [ ] Display list of assigned crews
  - [ ] Color code by status: green (active), gray (past), blue (future)
  - [ ] Show start_date and end_date for each assignment
  - [ ] Add "Edit" and "Remove" buttons for each assignment
- [ ] Build crew card component (AC: #1)
  - [ ] Create `collabcanvas/src/components/crew/CrewCard.tsx`
  - [ ] Props: crew (Crew object)
  - [ ] Display crew name, foreman name, member count
  - [ ] Show active/inactive badge
  - [ ] Clickable to expand and show all members
- [ ] Build crew list component (AC: #1)
  - [ ] Create `collabcanvas/src/components/crew/CrewList.tsx`
  - [ ] Props: crews (array)
  - [ ] Map over crews and render CrewCard for each
  - [ ] Add loading skeleton while fetching
  - [ ] Handle empty state (no crews)
- [ ] Add validation UI (AC: #3, #4)
  - [ ] Display inline error messages for date validation
  - [ ] Show toast notification for overlap errors
  - [ ] Disable submit button until validation passes
- [ ] Write frontend tests (AC: all)
  - [ ] Create `collabcanvas/tests/components/crew/CrewManagementPage.test.tsx`
  - [ ] Test crew list renders correctly
  - [ ] Test assignment modal opens and closes
  - [ ] Test form validation (invalid dates)
  - [ ] Mock API calls

**Integration Tests:**
- [ ] Create `backend/tests/integration/crewAssignment.test.ts` (AC: all)
  - [ ] Test complete flow: create crew → assign to project → verify in database
  - [ ] Test overlap prevention
  - [ ] Test date range validation

---

### Technical Summary

This story implements the project-crew assignment system, enabling admins to assign crews to projects for specific date ranges. This is a prerequisite for crew members to clock in to projects (Story 1.5). The system validates date ranges and prevents overlapping assignments to the same project.

**Key Technical Decisions:**
- **Backend Service Layer:** crewAssignmentService.ts handles business logic and validation
- **Validation Strategy:** Check database for overlapping assignments before insert
- **Status Calculation:** Client-side calculation (compare dates) to determine active/past/future status
- **RBAC:** Only admins can create/update/delete assignments
- **Color Coding:** Green (active), gray (past), blue (future) for visual status indication

**Files/Modules Involved:**
- Backend: crewAssignmentService.ts, routes/assignments.ts
- Frontend: CrewManagementPage.tsx, ProjectCrewAssignment.tsx, CrewCard.tsx, CrewList.tsx
- Store: useCrewStore.ts (Zustand state management)
- Service: crewService.ts (API client)

### Project Structure Notes

- **Files to modify:**
  - `collabcanvas/src/App.tsx` - Add route for /crew-management (admin only)
- **Files to create:**
  - `backend/src/services/crewAssignmentService.ts` - Assignment business logic
  - `backend/src/routes/assignments.ts` - Assignment API endpoints
  - `collabcanvas/src/services/crewService.ts` - Crew API client
  - `collabcanvas/src/store/useCrewStore.ts` - Crew state management
  - `collabcanvas/src/pages/CrewManagementPage.tsx` - Admin crew management page
  - `collabcanvas/src/components/crew/ProjectCrewAssignment.tsx` - Assignment component
  - `collabcanvas/src/components/crew/CrewCard.tsx` - Crew card component
  - `collabcanvas/src/components/crew/CrewList.tsx` - Crew list component
  - `collabcanvas/src/types/crew.ts` - TypeScript types for crews and assignments
- **Expected test locations:**
  - `backend/tests/services/crewAssignmentService.test.ts` - Service tests
  - `backend/tests/routes/assignments.test.ts` - API endpoint tests
  - `backend/tests/integration/crewAssignment.test.ts` - Integration tests
  - `collabcanvas/tests/components/crew/CrewManagementPage.test.tsx` - Component tests
- **Estimated effort:** 2 story points (~1 day)
- **Prerequisites:** Story 1.1 (requires backend server, database schema, authentication)

### Key Code References

**Existing Patterns to Follow:**
- **Service Layer:** See existing `collabcanvas/src/services/authService.ts` for API client pattern
- **Zustand Store:** See existing `collabcanvas/src/store/useAuthStore.ts` for state management pattern
- **Component Structure:** See existing `collabcanvas/src/components/project/ProjectCard.tsx` for card component pattern
- **Page Layout:** See existing `collabcanvas/src/pages/DashboardPage.tsx` for admin page layout

**Tech-Spec References:**
- Backend service pattern: tech-spec.md:820-830
- Frontend component organization: tech-spec.md:840-850
- RBAC middleware usage: tech-spec.md:890-900
- Assignment validation logic: tech-spec.md:1460-1465

---

## Context References

**Tech-Spec:** [tech-spec.md](../tech-spec.md) - Primary context document containing:

- Brownfield codebase analysis (existing Projective patterns)
- Framework and library details with versions
- Existing patterns to follow (service layer, Zustand stores, React components)
- Integration points and dependencies
- Complete implementation guidance

**Architecture:** Express backend with Supabase, React frontend with Zustand, RBAC enforcement

---

## Dev Agent Record

### Context Reference

- **Story Context File:** `docs/sprint_artifacts/1-2-project-crew-assignment.context.xml`
- **Generated:** 2025-11-19
- **Contains:** Documentation artifacts, code patterns, API interfaces, testing strategies

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
