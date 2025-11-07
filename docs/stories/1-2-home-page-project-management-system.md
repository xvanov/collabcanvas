# Story 1.2: Home Page & Project Management System

Status: drafted

## Story

As a contractor,
I want a home page where I can manage all my projects with status tracking,
so that I can organize multiple projects and track their progress through the estimation lifecycle.

## Acceptance Criteria

1. **Project List Display**
   - **Given** I am logged into CollabCanvas
   - **When** I view the home page
   - **Then** I see a list of all my projects with status indicators (Estimating, Bid Ready, Bid Lost, Executing, Completed Profitable, Completed Unprofitable, Completed - Unknown)

2. **Project Creation**
   - **Given** I am logged into CollabCanvas
   - **When** I click "New Project"
   - **Then** I can create a project with name and description, and it appears in my project list with status "Estimating"

3. **Project Navigation**
   - **Given** I am logged into CollabCanvas
   - **When** I click on a project
   - **Then** I enter the project and see four-view navigation (Scope | Time | Space | Money)

4. **Status Update**
   - **Given** I am logged into CollabCanvas
   - **When** I change a project's status on the home page
   - **Then** The status updates immediately and persists

5. **Profit/Loss Calculation**
   - **Given** I am logged into CollabCanvas
   - **When** I mark a project "Completed Profitable" or "Completed Unprofitable"
   - **Then** The system automatically calculates profit/loss based on actual costs vs. estimate (if cost tracking provided)

6. **Unknown Status**
   - **Given** I am logged into CollabCanvas
   - **When** I mark a project complete without cost tracking
   - **Then** The status becomes "Completed - Unknown"

7. **Search/Filter**
   - **Given** I am logged into CollabCanvas
   - **When** I search or filter projects
   - **Then** The project list updates to show matching projects

8. **Project Deletion**
   - **Given** I am logged into CollabCanvas
   - **When** I delete a project
   - **Then** I am asked for confirmation and the project is permanently deleted

9. **Access Control - Not Logged In**
   - **Given** I am not logged in
   - **When** I try to access any projects
   - **Then** I cannot access any projects and am redirected to login

10. **Access Control - Unauthorized Project**
    - **Given** I am logged into CollabCanvas
    - **When** I try to access a project I don't own or haven't been invited to
    - **Then** I receive an access denied error and cannot view the project

11. **Project Sharing - Viewer Role**
    - **Given** I am logged into CollabCanvas
    - **When** I share a project with another user as "Viewer"
    - **Then** They can view but cannot modify the project

12. **Project Sharing - Editor Role**
    - **Given** I am logged into CollabCanvas
    - **When** I share a project with another user as "Editor"
    - **Then** They can view and modify the project

13. **Error Handling - Network Error**
    - **Given** I am logged into CollabCanvas
    - **When** A network error occurs while loading projects
    - **Then** I see a clear error message with retry option

14. **Error Handling - Project Creation Failure**
    - **Given** I am logged into CollabCanvas
    - **When** Project creation fails
    - **Then** I see a clear error message and can retry without losing entered data

15. **Error Handling - Project Deletion Failure**
    - **Given** I am logged into CollabCanvas
    - **When** Project deletion fails
    - **Then** I see a clear error message and the project is not deleted

## Tasks / Subtasks

- [ ] Task 1: Implement Project Dashboard Component (AC: #1, #3)
  - [ ] Create `pages/Dashboard.tsx` component as home page
  - [ ] Implement project list display with status indicators
  - [ ] Add project card/item component for each project
  - [ ] Implement project click navigation to four-view navigation
  - [ ] Add loading state and empty state handling
  - [ ] Add unit tests for Dashboard component

- [ ] Task 2: Implement Project Store and Service (AC: #1, #2, #4)
  - [ ] Create `store/projectStore.ts` with Zustand store
  - [ ] Create `services/projectService.ts` for Firebase operations
  - [ ] Implement `getUserProjects(userId)` to fetch user's projects
  - [ ] Implement `createProject(name, description)` to create new project
  - [ ] Implement `updateProjectStatus(projectId, status)` to update status
  - [ ] Add real-time project list updates using Firestore listeners
  - [ ] Add unit tests for projectService functions
  - [ ] Add integration tests for Firestore operations

- [ ] Task 3: Implement Project Creation Flow (AC: #2)
  - [ ] Create "New Project" button/modal in Dashboard
  - [ ] Implement project creation form (name, description)
  - [ ] Set default status to "Estimating" on creation
  - [ ] Add validation for required fields
  - [ ] Handle creation success and error states
  - [ ] Add E2E tests for project creation flow

- [ ] Task 4: Implement Project Status Management (AC: #4, #5, #6)
  - [ ] Implement status change UI (dropdown/select) on project cards
  - [ ] Add status change handler that updates Firestore
  - [ ] Implement profit/loss calculation logic for "Completed Profitable/Unprofitable"
  - [ ] Check if actual costs exist in BOM document
  - [ ] Calculate profit/loss: `(actualCosts - estimateTotal)`
  - [ ] Set status to "Completed - Unknown" if no cost tracking provided
  - [ ] Add unit tests for profit/loss calculation logic
  - [ ] Add E2E tests for status transitions

- [ ] Task 5: Implement Project Search and Filter (AC: #7)
  - [ ] Add search input field to Dashboard
  - [ ] Implement search by project name/description
  - [ ] Add filter dropdown for status filtering
  - [ ] Implement filter by date (created date, updated date)
  - [ ] Update project list display based on search/filter criteria
  - [ ] Add unit tests for search/filter logic

- [ ] Task 6: Implement Project Deletion (AC: #8)
  - [ ] Add delete button/action to project cards
  - [ ] Implement confirmation dialog before deletion
  - [ ] Implement `deleteProject(projectId)` in projectService
  - [ ] Delete project document and all subcollections from Firestore
  - [ ] Handle deletion success and error states
  - [ ] Add E2E tests for project deletion with confirmation

- [ ] Task 7: Implement Authentication Guards (AC: #9)
  - [ ] Add Firebase Auth guard to Dashboard route
  - [ ] Redirect unauthenticated users to login page
  - [ ] Protect all project routes with auth guard
  - [ ] Add unit tests for auth guard logic

- [ ] Task 8: Implement Project Access Control (AC: #10)
  - [ ] Implement Firestore security rules for project access
  - [ ] Check `ownerId` and `collaborators` array in security rules
  - [ ] Add access denied error handling in projectService
  - [ ] Display access denied message to user
  - [ ] Add integration tests for security rules
  - [ ] Add E2E tests for unauthorized access attempts

- [ ] Task 9: Implement Project Sharing (AC: #11, #12)
  - [ ] Add "Share Project" button/action to project cards
  - [ ] Create share modal with invite link generation
  - [ ] Implement `shareProject(projectId, userId, role)` in projectService
  - [ ] Add user to `collaborators` array with role (editor/viewer)
  - [ ] Implement role-based access control in security rules
  - [ ] Add viewer role restrictions (read-only access)
  - [ ] Add editor role permissions (read and write access)
  - [ ] Add E2E tests for project sharing flow

- [ ] Task 10: Implement Error Handling (AC: #13, #14, #15)
  - [ ] Create centralized error handler utility
  - [ ] Implement network error detection and retry logic
  - [ ] Display user-friendly error messages for all error scenarios
  - [ ] Add retry button for network failures
  - [ ] Preserve form data on creation failure
  - [ ] Handle offline scenarios gracefully
  - [ ] Add unit tests for error handling logic
  - [ ] Add E2E tests for error scenarios

- [ ] Task 11: Implement Firestore Data Model
  - [ ] Create Project document structure in Firestore
  - [ ] Add fields: name, description, status, ownerId, collaborators, createdAt, updatedAt
  - [ ] Implement Firestore indexes for efficient queries
  - [ ] Add Firestore security rules for project collection
  - [ ] Test Firestore operations with Firebase emulator

- [ ] Task 12: Implement Real-time Project List Updates
  - [ ] Set up Firestore listener for user's projects
  - [ ] Update projectStore when projects change in real-time
  - [ ] Handle listener cleanup on component unmount
  - [ ] Test real-time updates with multiple users
  - [ ] Add integration tests for real-time sync

## Dev Notes

### Requirements Context

This story implements the foundational project management system that enables contractors to create, manage, and organize multiple projects. The home page serves as the project dashboard where users can see all their projects, track status, and navigate to individual projects.

**Key Features:**
- **Multi-Project Support**: Users can create and manage multiple projects
- **Status Tracking**: Seven status types with automatic profit/loss calculation
- **Project Sharing**: Invite collaborators with Editor/Viewer roles
- **Search and Filter**: Organize projects by name, status, date
- **Security**: Firebase Auth guards and Firestore security rules

**Source Documents:**
- Epic breakdown: [Source: docs/epics.md#Story-1.2]
- PRD requirements: [Source: docs/PRD.md#Project-Management-System]
- Architecture guidance: [Source: docs/architecture.md#Home-Page-&-Project-Dashboard]
- Tech spec: [Source: docs/tech-spec-epic-1.md#Story-1.2]

### Architecture Patterns and Constraints

**Project Data Model:**
- Firestore collection: `/projects/{projectId}`
- Document structure: `{name, description, status, ownerId, collaborators[], createdAt, updatedAt, createdBy, updatedBy}`
- Status enum: `'estimating' | 'bid-ready' | 'bid-lost' | 'executing' | 'completed-profitable' | 'completed-unprofitable' | 'completed-unknown'`
- Collaborators array: `Array<{userId: string, role: 'editor' | 'viewer'}>`

**State Management Pattern:**
- Zustand store: `projectStore.ts` for project list and current project state
- Service layer: `projectService.ts` for Firebase operations
- Real-time sync: Firestore listeners for live project updates

**Routing Pattern:**
- Home page route: `/` (Dashboard)
- Project route: `/projects/:projectId` (with four-view navigation)
- React Router for client-side navigation

**Security Pattern:**
- Firebase Auth guards: Protect routes with authentication check
- Firestore security rules: Enforce project-level access control
- Access control logic: Check `ownerId` or `collaborators` array before operations

**Error Handling Pattern:**
- Centralized error handler: `utils/errorHandler.ts`
- Standardized error format: `{code, message, details?}`
- User-friendly error messages: Display clear, actionable messages
- Retry logic: Implement retry for network failures
- Offline handling: Graceful degradation for offline scenarios

**Profit/Loss Calculation Pattern:**
- Trigger: When status changes to "Completed Profitable" or "Completed Unprofitable"
- Data source: BOM document with actual costs (if provided)
- Calculation: `profitLoss = actualCosts - estimateTotal`
- Status logic: If profit > 0 → "Completed Profitable", else → "Completed Unprofitable"
- Fallback: If no actual costs → "Completed - Unknown"

**Source References:**
- Project data model: [Source: docs/architecture.md#Data-Architecture]
- State management: [Source: docs/architecture.md#Implementation-Patterns]
- Security: [Source: docs/architecture.md#Consistency-Rules]
- Error handling: [Source: docs/architecture.md#Error-Handling]

### Project Structure Notes

**Files to Create:**
- `src/pages/Dashboard.tsx` - Home page component with project list
- `src/store/projectStore.ts` - Zustand store for project state
- `src/services/projectService.ts` - Firebase operations for projects
- `src/components/project/ProjectCard.tsx` - Project card component
- `src/components/project/ProjectForm.tsx` - Project creation/edit form
- `src/components/project/ShareProjectModal.tsx` - Project sharing modal
- `src/hooks/useProjects.ts` - Custom hook for project operations
- `src/types/project.ts` - TypeScript types for Project

**Files to Modify:**
- `src/App.tsx` - Add Dashboard route and auth guard
- `src/services/firebase.ts` - Ensure Firebase initialization
- `firestore.rules` - Add security rules for projects collection
- `firestore.indexes.json` - Add indexes for project queries

**Testing Standards:**
- Unit tests: Service layer functions (projectService.ts), calculation logic (profit/loss)
- Integration tests: Firebase operations, Firestore security rules, real-time listeners
- E2E tests: Project creation, status changes, sharing, deletion, error scenarios
- Security tests: Access control, unauthorized access attempts

**Source References:**
- Project structure: [Source: docs/architecture.md#Project-Structure]
- Testing strategy: [Source: docs/tech-spec-epic-1.md#Test-Strategy-Summary]

### Learnings from Previous Story

**From Story 1.1 (Status: in-progress)**

Story 1.1 is currently in-progress, so learnings are limited. However, the following patterns established in Story 1.1 should be applied:

- **Error Handling**: Use centralized error handler pattern established for API operations
- **Firebase Patterns**: Follow Firebase deletion patterns for project deletion (remove from Firestore and Storage)
- **Testing Approach**: Follow testing patterns established for service layer and integration tests

[Source: docs/stories/1-1-critical-bug-fixes-performance-optimization.md#Dev-Notes]

### References

- Epic breakdown: [Source: docs/epics.md#Story-1.2]
- PRD project management: [Source: docs/PRD.md#Project-Management-System]
- Architecture dashboard: [Source: docs/architecture.md#Home-Page-&-Project-Dashboard]
- Tech spec ACs: [Source: docs/tech-spec-epic-1.md#Story-1.2]
- Project data model: [Source: docs/architecture.md#Data-Architecture]
- State management: [Source: docs/architecture.md#Implementation-Patterns]
- Security: [Source: docs/architecture.md#Consistency-Rules]
- Error handling: [Source: docs/architecture.md#Error-Handling]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

