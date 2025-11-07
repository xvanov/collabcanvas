# Story 1.3: Four-View Navigation & Scope View

Status: ready-for-dev

## Story

As a contractor,
I want four distinct views (Scope, Time, Space, Money) with scope of work upload capability,
so that I can organize my project workflow and provide scope context for accurate estimates.

## Acceptance Criteria

1. **Four-View Navigation**
   - **Given** I have selected a project
   - **When** I view the project
   - **Then** I see top navigation bar with four tabs: Scope | Time | Space | Money

2. **Scope View Display**
   - **Given** I have selected a project
   - **When** I click on the Scope tab
   - **Then** I see Scope view with CSV upload capability

3. **CSV Upload and Parsing**
   - **Given** I am in Scope view
   - **When** I upload a CSV file with 2 columns (scope, description)
   - **Then** The scope content is parsed and displayed as structured content

4. **Tab Switching**
   - **Given** I am viewing a project
   - **When** I switch between tabs (Scope, Time, Space, Money)
   - **Then** The view changes smoothly and my current view is highlighted

5. **View Indicators**
   - **Given** I am viewing a project
   - **When** content is generated (BOM in Money, CPM in Time)
   - **Then** The corresponding tab shows an indicator badge

6. **Indicator Dismissal**
   - **Given** I am viewing a project with generated content
   - **When** I click on a tab with an indicator
   - **Then** The indicator disappears and I see the generated content

7. **Presence Indicators**
   - **Given** I am viewing a project
   - **When** other users are viewing the same project
   - **Then** I see presence indicators showing who is in each view/tab

8. **Real-time Sync**
   - **Given** I am viewing a project with other users
   - **When** I make changes in any view
   - **Then** Changes sync in real-time across all views for all users

## Tasks / Subtasks

- [ ] Task 1: Implement Four-View Navigation Structure (AC: #1, #4)
  - [ ] Create `pages/Project.tsx` component with tab navigation
  - [ ] Set up React Router nested routes: `/projects/:projectId/scope`, `/projects/:projectId/time`, `/projects/:projectId/space`, `/projects/:projectId/money`
  - [ ] Implement tab navigation bar with four tabs: Scope | Time | Space | Money
  - [ ] Add active tab highlighting based on current route
  - [ ] Implement smooth view transitions
  - [ ] Add deep linking support (URL-based navigation)
  - [ ] Add unit tests for routing and navigation
  - [ ] Add E2E tests for tab switching and deep linking

- [ ] Task 2: Implement Scope View Component (AC: #2, #3)
  - [ ] Create `components/scope/ScopeView.tsx` component
  - [ ] Implement CSV file upload UI with drag-and-drop support
  - [ ] Create CSV parser for 2-column format (scope, description)
  - [ ] Validate CSV format (require exactly 2 columns: scope, description)
  - [ ] Display parsed scope content as structured list/table
  - [ ] Add empty state when no scope uploaded
  - [ ] Add loading state during CSV parsing
  - [ ] Add error handling for invalid CSV format
  - [ ] Add unit tests for CSV parser
  - [ ] Add E2E tests for CSV upload flow

- [ ] Task 3: Implement Scope Store and Service (AC: #3, #8)
  - [ ] Create `store/scopeStore.ts` with Zustand store
  - [ ] Create `services/scopeService.ts` for Firebase operations
  - [ ] Implement `uploadScope(projectId, items)` to save scope to Firestore
  - [ ] Implement `getScope(projectId)` to fetch scope from Firestore
  - [ ] Implement `updateScope(projectId, items)` to update scope
  - [ ] Add real-time scope updates using Firestore listeners
  - [ ] Store scope in Firestore: `/projects/{projectId}/scope` document
  - [ ] Add unit tests for scopeService functions
  - [ ] Add integration tests for Firestore operations

- [ ] Task 4: Implement View Indicators System (AC: #5, #6)
  - [ ] Create indicator badge component for tabs
  - [ ] Implement indicator state management (track which views have new content)
  - [ ] Add indicator display logic: show badge when BOM generated (Money tab), CPM generated (Time tab)
  - [ ] Implement indicator dismissal: remove badge when user clicks tab
  - [ ] Store indicator state in Zustand store or component state
  - [ ] Add unit tests for indicator logic
  - [ ] Add E2E tests for indicator display and dismissal

- [ ] Task 5: Implement Real-time Presence Tracking (AC: #7, #8)
  - [ ] Extend RTDB presence system with `currentView` field
  - [ ] Update presence when user switches views: set `currentView` to active view ('scope' | 'time' | 'space' | 'money')
  - [ ] Create presence indicator component showing users per view
  - [ ] Display presence indicators on tabs showing who is in each view
  - [ ] Set up RTDB listener for `/presence/{userId}` to track all users' current views
  - [ ] Update presence on view change and cleanup on component unmount
  - [ ] Add unit tests for presence tracking logic
  - [ ] Add integration tests for RTDB presence updates
  - [ ] Add E2E tests for multi-user presence indicators

- [ ] Task 6: Integrate Space View (Existing Canvas) (AC: #1, #4)
  - [ ] Ensure existing `components/canvas/Canvas.tsx` integrates with new routing structure
  - [ ] Update Canvas component to work with `/projects/:projectId/space` route
  - [ ] Verify existing canvas functionality preserved (annotation, layers, shapes)
  - [ ] Ensure canvas updates trigger real-time sync via existing Firestore listeners
  - [ ] Add E2E tests to verify canvas functionality in new routing structure

- [ ] Task 7: Implement Time View Placeholder (AC: #1, #4)
  - [ ] Create `components/time/TimeView.tsx` placeholder component
  - [ ] Display empty state: "CPM to be implemented" message
  - [ ] Ensure Time view is accessible via `/projects/:projectId/time` route
  - [ ] Add placeholder for future CPM visualization (Story 1.4 will implement CPM generation)

- [ ] Task 8: Implement Money View Placeholder (AC: #1, #4)
  - [ ] Create `components/money/MoneyView.tsx` placeholder component
  - [ ] Display empty state: "BOM to be implemented" message
  - [ ] Ensure Money view is accessible via `/projects/:projectId/money` route
  - [ ] Add placeholder for future BOM display (Story 1.4 will implement BOM generation)

- [ ] Task 9: Update Firestore Security Rules (AC: #8)
  - [ ] Add security rules for `/projects/{projectId}/scope` document
  - [ ] Allow read: authenticated users who own project or are collaborators
  - [ ] Allow write: authenticated users who own project or are editors
  - [ ] Test security rules with Firebase emulator
  - [ ] Add integration tests for security rules

- [ ] Task 10: Update RTDB Security Rules (AC: #7)
  - [ ] Update RTDB rules to allow `currentView` field in presence data
  - [ ] Ensure users can only update their own presence
  - [ ] Test RTDB rules with Firebase emulator
  - [ ] Add integration tests for RTDB presence rules

## Dev Notes

### Requirements Context

This story implements the foundational four-view navigation system that enables contractors to organize their project workflow across four distinct views: Scope (scope of work), Time (critical path), Space (canvas/annotation), and Money (BOM/estimates). The Scope view provides CSV upload capability for scope of work documents, which will be used by AI for accurate BOM and Critical Path generation in later stories.

**Key Features:**
- **Four-View Navigation**: Tab-based navigation with deep linking support
- **Scope View**: CSV upload and structured display of scope of work
- **View Indicators**: Badge system to show when content is generated in other views
- **Real-time Presence**: Track which users are in which view/tab
- **Real-time Sync**: Changes sync across all views for all users

**Source Documents:**
- Epic breakdown: [Source: docs/epics.md#Story-1.3]
- PRD requirements: [Source: docs/PRD.md#Four-View-Navigation-Structure]
- Architecture guidance: [Source: docs/architecture.md#Four-View-Navigation]
- Tech spec: [Source: docs/tech-spec-epic-1.md#Story-1.3]

### Architecture Patterns and Constraints

**Routing Pattern:**
- React Router with nested routes: `/projects/:projectId/scope`, `/projects/:projectId/time`, `/projects/:projectId/space`, `/projects/:projectId/money`
- Component: `pages/Project.tsx` with tab navigation
- Deep linking support for direct navigation to specific views
- URL-based navigation preserves browser history

**State Management Pattern:**
- Zustand store: `scopeStore.ts` for scope view state
- Service layer: `scopeService.ts` for Firebase operations
- Real-time sync: Firestore listeners for live scope updates
- View-specific stores: Each view has its own store (scopeStore, timeStore, moneyStore, canvasStore)

**Data Model:**
- Scope document: `/projects/{projectId}/scope` in Firestore
- Document structure: `{items: Array<{scope: string, description: string}>, uploadedAt: Timestamp, uploadedBy: string}`
- CSV format: 2 columns required - "scope" (e.g., demo, roof, siding) and "description" (detailed description)

**Presence Tracking Pattern:**
- RTDB: `/presence/{userId}` with `currentView` field
- `currentView`: 'scope' | 'time' | 'space' | 'money'
- Update presence when user switches views
- Display presence indicators per view/tab

**View Indicators Pattern:**
- Track which views have new content (BOM in Money, CPM in Time)
- Display badge/indicator on tabs when content is generated
- Dismiss indicator when user clicks tab to view content
- Store indicator state in component state or Zustand store

**Real-time Sync Pattern:**
- Firestore listeners for persistent data (scope, CPM, BOM)
- RTDB listeners for ephemeral data (presence, cursors)
- Changes sync automatically across all views for all users

**Source References:**
- Routing: [Source: docs/architecture.md#Four-View-Navigation]
- State management: [Source: docs/architecture.md#Implementation-Patterns]
- Presence tracking: [Source: docs/architecture.md#Real-time-Collaboration]
- Data model: [Source: docs/tech-spec-epic-1.md#Data-Models-and-Contracts]

### Project Structure Notes

**Files to Create:**
- `src/pages/Project.tsx` - Project page with four-view navigation tabs
- `src/components/scope/ScopeView.tsx` - Scope view component with CSV upload
- `src/components/scope/ScopeUpload.tsx` - CSV upload component
- `src/components/scope/ScopeDisplay.tsx` - Scope content display component
- `src/store/scopeStore.ts` - Zustand store for scope state
- `src/services/scopeService.ts` - Firebase operations for scope
- `src/components/time/TimeView.tsx` - Time view placeholder component
- `src/components/money/MoneyView.tsx` - Money view placeholder component
- `src/types/scope.ts` - TypeScript types for Scope

**Files to Modify:**
- `src/App.tsx` - Add Project route with nested routes for four views
- `src/components/canvas/Canvas.tsx` - Ensure integration with new routing structure
- `firestore.rules` - Add security rules for `/projects/{projectId}/scope` document
- `database.rules.json` - Update RTDB rules for `currentView` field in presence

**Testing Standards:**
- Unit tests: Service layer functions (scopeService.ts), CSV parser, indicator logic
- Integration tests: Firebase operations, Firestore security rules, RTDB presence updates, real-time listeners
- E2E tests: CSV upload flow, tab switching, deep linking, presence indicators, real-time sync across views

**Source References:**
- Project structure: [Source: docs/architecture.md#Project-Structure]
- Testing strategy: [Source: docs/tech-spec-epic-1.md#Test-Strategy-Summary]

### Learnings from Previous Story

**From Story 1.2 (Status: in-progress)**

Story 1.2 is currently in-progress, so learnings are limited. However, the following patterns established in Story 1.2 should be applied:

- **Project Service Pattern**: Use `services/projectService.ts` for Firebase operations - follow same pattern for `scopeService.ts`
- **Store Pattern**: Use Zustand store pattern from `store/projectStore.ts` - follow same pattern for `scopeStore.ts`
- **Routing Pattern**: Story 1.2 establishes project routing (`/projects/:projectId`) - extend this with nested routes for four views
- **Real-time Sync**: Follow Firestore listener patterns established for project list updates - apply to scope data
- **Error Handling**: Use centralized error handler pattern established for project operations
- **Security Rules**: Follow Firestore security rules pattern for project access - extend for scope document access

[Source: docs/stories/1-2-home-page-project-management-system.md#Dev-Notes]

### References

- Epic breakdown: [Source: docs/epics.md#Story-1.3]
- PRD four-view navigation: [Source: docs/PRD.md#Four-View-Navigation-Structure]
- Architecture routing: [Source: docs/architecture.md#Four-View-Navigation]
- Tech spec ACs: [Source: docs/tech-spec-epic-1.md#Story-1.3]
- Scope data model: [Source: docs/tech-spec-epic-1.md#Data-Models-and-Contracts]
- Presence tracking: [Source: docs/architecture.md#Real-time-Collaboration]
- State management: [Source: docs/architecture.md#Implementation-Patterns]

## Dev Agent Record

### Context Reference

- docs/stories/1-3-four-view-navigation-scope-view.context.xml

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

