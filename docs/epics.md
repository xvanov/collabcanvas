# CollabCanvas - Epic Breakdown

**Author:** xvanov
**Date:** 2025-01-27
**Project Level:** Level 2-4 (PRD-based)
**Target Scale:** Production-ready MVP with Growth roadmap

---

## Overview

This document provides the complete epic and story breakdown for CollabCanvas, decomposing the requirements from the [PRD](./PRD.md) into implementable stories.

### Epic Structure (Mapped Directly from PRD Phases + UI/UX Improvements)

**Epic 1: MVP - Minimum Viable Product**
- **Goal**: Fix critical bugs, establish core workflow, and build project management infrastructure with three-view navigation
- **Scope**: 
  - **Critical Bug Fixes** (Must-Have Before Launch)
    - Plan deletion bug (reliable deletion that doesn't reappear on reload)
    - Scale deletion bug (reliable deletion that doesn't reappear on reload)
    - Home Depot price integration (90%+ success rate for exact prices)
    - AI shape creation commands (fix "add a red circle" errors)
    - Firefox performance degradation (60 FPS with 100+ objects across all browsers)
  
  - **Home Page & Project Dashboard** (New UI/UX - Same View)
    - Home page = Dashboard view (single unified view)
    - Project list showing all user's projects with status indicators
    - Project status options:
      - **Estimating** (default - project just created)
      - **Bid Ready** (Money estimate complete - estimate has BOM with prices; Time estimate less important but can exist)
      - **Bid Lost** (user marks project as lost bid)
      - **Executing** (currently working on project)
      - **Completed Profitable** (project finished, made money - auto-calculated if cost tracking provided)
      - **Completed Unprofitable** (project finished, lost money - auto-calculated if cost tracking provided)
      - **Completed - Unknown** (project finished, no cost tracking provided)
    - Project list with search and filter capabilities
    - Project creation (name, description, initial setup)
    - Project deletion (with confirmation)
    - Project status change (change status directly on home page - manual user action)
    - **Status transition rules**: User manually changes status (no automatic transitions)
    - **Automatic status calculation**: Only when marking "Completed Profitable" or "Completed Unprofitable"
      - System automatically calculates profit/loss based on actual costs vs. estimate
      - If no cost tracking was provided: Status becomes "Completed - Unknown"
    - Project sharing (invite links, Editor/Viewer roles, access control)
    - Select project → enter project → see four-view navigation (Scope | Time | Space | Money)
    - Navigate back to home and select different project
  
  - **Four-View Navigation Structure** (New UI/UX)
    - Top navigation bar with four tabs: **Scope | Time | Space | Money**
    - **Scope View**: Scope of work upload and display (CSV upload, displayed as structured content)
      - First view populated - users upload scope of work CSV here first
      - CSV template: 2 columns - "scope" (e.g., demo, roof, siding) and "description" (detailed description)
      - Scope content displayed and used by AI for BOM/Critical Path generation
    - **Space View**: Canvas/annotation (existing functionality - preserve)
    - **Money View**: Estimates/BOM with exact Home Depot prices (expand AI BOM generation)
    - **Time View**: Critical Path visualization (full CPM with calculations in MVP)
      - MVP: Full CPM generation with calculations (simple calcs)
      - Empty state placeholder: Blank page with "CPM to be implemented" (before CPM is generated)
      - Once generated: CPM graph visualization with task dependencies and durations
      - Epic 3: Enhanced CPM with labor hours integration and bid customization
    - Clear tab switching between views
    - **View indicators**: Tabs show indicators when new content is generated (e.g., BOM ready in Money, Critical Path ready in Time)
    - Indicators disappear when user clicks on that tab to view the content
    - Deep linking support (URLs support direct links to projects/views)
    - Real-time collaboration across views (like Google Sheets tabs):
      - See presence indicators showing who's in each view
      - See which users are on which tab/view
      - Changes sync across all views in real-time
  
  - **Money View - Estimate Section** (New UI/UX)
    - Expand existing AI BOM generation to Money view
    - Separate Money/Estimate section with accurate pricing
    - Display BOM with exact Home Depot prices (90%+ success rate)
    - Unit prices, total prices per line item
    - Price source links for verification
    - Price caching to reduce API calls
    - **Price fetch failure handling**: Show "Price unavailable" with manual entry option
    - **BOM generation blocking**: Block BOM generation until all prices are completed (either fetched or manually entered)
    - BOM table with quantities, prices, totals
    - Group materials by category (Walls, Floors, etc.)
    - **Single BOM for MVP** (easy to modify, see changes immediately)
    - **Material selection**: AI asks user to choose when material choice is unclear from scope of work/user input during BOM generation
    - **Margin calculation**: Estimate includes profit margin calculation
      - Material costs (from BOM with prices)
      - Labor costs (from CPM task durations with basic labor rates in MVP)
      - Margin calculation (user-configurable margin percentage)
    - **Two estimate views**:
      - **Customer View**: Shows material + labor totals + included margin (margin incorporated into labor line item)
        - Clean, professional view for client presentation
        - Margin is included in labor costs, not shown separately
      - **Contractor View**: Shows labor, materials costs, and margin separate
        - Margin shown in dollars (profit amount)
        - Margin shown in time/slack (buffer time added to ensure realistic estimate)
        - Detailed breakdown for contractor's internal use
    - Export estimate as PDF (can export customer view or contractor view)
    - **Actual cost input**: Input actual costs in Money view (voluntary - user chooses to track or not)
    - Cost tracking is optional - user can choose to do it or not
    - Basic estimate-to-actual tracking (compare estimate vs. actual, variance calculation)
  
  - **Pre-Flight Completeness Enforcement** (New UI/UX)
    - **No "Generate" button** - AI chat handles generation through conversation
    - User talks to AI in chat and tells it to generate BOM and CPM for the project
    - AI guides user through pre-flight checks with clarifying questions
    - AI asks clarifying questions if something is incomplete or unclear
    - System validates all required information before BOM AND Critical Path generation (both equally important in MVP)
    - Pre-flight checklist (validated by AI):
      - Critical items: Scale reference, layers, annotations (must be complete)
      - Recommended items: Scope of work uploaded (warnings, don't block)
    - **AI blocking behavior**: AI refuses to generate BOM if it doesn't have all required information
    - Prevents incomplete estimates that lead to project overruns
    - **Parallel generation**: Generate both BOM and Critical Path simultaneously in MVP
    - MVP generates full CPM with calculations (simple calcs)
    - **Post-generation navigation**: User chooses where to go (Money or Time view) - no automatic navigation
    - **View indicators**: Both Money and Time tabs show indicators when content is generated
    - Indicators disappear when user clicks on that tab to view the generated content
  
  - **Design System Implementation** (New UI/UX)
    - Implement shadcn/ui component library (25 standard components)
    - Modern Neutral theme (#0f172a primary, clean minimal design)
    - Typography system (system font stack, type scale)
    - Spacing system (4px base unit)
    - Responsive breakpoints (mobile 320-767px, tablet 768-1024px, desktop 1025px+)
    - WCAG 2.1 Level AA accessibility compliance
  
  - **Custom Component Implementation** (New UI/UX)
    - ScopeView (scope of work CSV upload and display)
    - CanvasToolbar (tool selection for annotation)
    - LayerPanel (layer creation and management)
    - MeasurementDisplay (real-time measurement display)
    - BOMTable (display Bill of Materials with prices)
    - PreFlightChecklist (completeness enforcement modal)
    - ExportMenu (export options for different views)
    - Responsive navigation (horizontal tabs desktop/tablet, bottom nav mobile)
  
  - **Performance Optimization**
    - Canvas performance maintains 60 FPS with 100+ objects on all browsers
    - Optimize rendering pipeline (object culling, viewport optimization, efficient update strategies)
    - Cross-browser performance testing and optimization
  
  - **AI Chat - Context-Aware Throughout App** (New UI/UX)
    - AI chat available in all views: Scope, Time, Space, Money
    - Context-aware: AI knows which view it's open in
    - AI can perform actions in the current view
    - If user tries to make edit affecting another view, AI suggests navigating to that view first
    - AI asks user to choose materials when material choice is unclear during BOM generation
  
  - **Preserve Existing Functionality**
    - Real-time collaboration (already works - preserve and integrate with four-view navigation)
    - User authentication & data persistence (already works - preserve and integrate)
    - Core plan management (already works - preserve and integrate)
    - AI BOM generation (already works - expand to Money view, make context-aware across views)
  
- **Value**: Production-ready MVP with complete workflow from project selection to accurate estimates, with modern UI/UX and four-view navigation (Scope | Time | Space | Money)

**Epic 2: Phase 2 - Advanced Annotation Tools & Multi-Floor Support**
- **Goal**: Add counter tool and multi-floor project support
- **Scope**: 
  - Counter tool (dot marker for counting fixtures, outlets, etc.)
  - Multi-floor projects (multiple floor plans per project, floor switching, aggregated BOMs)
  - Floor-specific layers and measurements
  - UI/UX: Floor selector in Space view, floor switching interface
- **Value**: Enhanced annotation capabilities for complex projects

**Epic 3: Phase 3 - Construction Project Bidding Engine**
- **Goal**: Comprehensive bidding system with labor hours, critical path enhancements, and customizable bid parameters
- **Scope**: 
  - **Enhanced CPM Integration** (builds on MVP CPM)
    - Integrate labor hours with CPM visualization
    - Enhanced task dependency analysis with labor considerations
  - **Advanced Labor Hours Calculation** (enhances MVP basic labor)
    - Industry standard labor rates per task type
    - Task complexity and scope analysis
    - Material installation requirements
    - Crew productivity factors
  - Critical Path Method (CPM) visualization enhancements in Time view
    - Enhanced CPM graph with labor hours displayed
    - Visualizes dependencies AND time AND labor simultaneously
    - Interactive visualization with zoom/pan
  - **Advanced Margin & Bid Customization**
    - User customization (crew size, pay rates, margins) with real-time recalculation
    - Advanced margin calculation with overhead and contingency factors
    - Margin in dollars and time/slack (buffer time) calculation
  - Total project cost calculation (materials + labor + overhead + profit + contingency)
  - Professional bid document generation (detailed cost breakdown, labor schedule, material list, project timeline, terms)
  - UI/UX: Enhanced Time view with labor-integrated CPM graph, bid parameter customization interface
  - **Note**: Builds on MVP CPM and basic margin calculation, adds advanced labor hours and bid customization
- **Value**: Complete bidding solution beyond material estimates

**Epic 4: Phase 4 - Multi-Supplier Cost Optimization & Advanced Features**
- **Goal**: Automatically compare and optimize prices across multiple suppliers
- **Scope**: 
  - Multi-supplier cost optimization (Home Depot, Lowe's, Amazon, Wayfair, contractor supply stores)
  - Query all supplier APIs simultaneously
  - Find best price for each material automatically
  - Show savings breakdown per line item and total project
  - Allow contractor to review and selectively accept optimizations
  - Supplier preferences and settings (favorite suppliers, delivery options)
  - Additional supplier API integrations (Lowe's, Amazon, Wayfair, contractor supply stores)
  - Price comparison dashboard (side-by-side comparison, material availability checking, automatic re-pricing)
  - UI/UX: Cost optimization interface in Money view, price comparison dashboard, supplier preference settings
  - **Note**: Enhances Money view with optimization capabilities
- **Value**: Automatic cost savings (5-15% material cost reduction)

**Epic 4.5: Multi-Scenario Support** (Between Phase 4 and Phase 5)
- **Goal**: Save project states as scenarios and switch between them
- **Scope**: 
  - Save current state (Scope + Time + Space + Money) as a scenario
  - Scenario management (create, name, switch between scenarios)
  - Edit scenarios independently
  - Compare scenarios side-by-side
  - Each scenario represents one complete state of the project
  - UI/UX: Scenario selector/tabs, scenario creation modal, scenario comparison view
  - **Note**: Builds on single BOM modification capability from MVP
- **Value**: Enable multiple project scope options for client presentation

**Epic 5: Phase 5 - Machine Learning Enhancement & Historical Project Database**
- **Goal**: Improve estimation accuracy through ML and historical data
- **Scope**: 
  - ML model trained on estimate vs. actual data from completed projects
  - Historical project database (reference estimates from similar completed projects)
  - Pattern recognition for common estimation errors
  - Predictive accuracy scoring for new bids
  - Material waste factor calculations based on project type
  - Project similarity matching for accurate estimates
  - Historical accuracy trends and insights
  - Historical project data ingestion (6 projects available for training, require manual ingestion)
  - UI/UX: ML accuracy indicators in Money view, historical project reference interface, accuracy trend visualization
  - **Note**: Enhances Money view estimates with ML predictions
- **Value**: Continuous accuracy improvement (target ±5% accuracy)

**Epic 6: Phase 6 - AI-Powered Annotation & Workflow Automation**
- **Goal**: Automate repetitive annotation tasks with AI commands
- **Scope**: 
  - AI annotation assistant ("measure all walls", "measure all floors", "count all sinks")
  - High-level commands for automatic plan annotation
  - Natural language commands to automate repetitive annotation tasks
  - Reduces manual annotation time by 50-70%
  - Advanced collaboration features (client portal for estimate approval, team collaboration features - assign estimators, reviewers)
  - Integration expansion (accounting software like QuickBooks, mobile app for field measurements)
  - UI/UX: AI annotation command interface in Space view, client portal UI, team collaboration UI
  - **Note**: Enhances Space view with automation
- **Value**: 50-70% reduction in manual annotation time

**Epic 7: Phase 7 - Market Expansion**
- **Goal**: Expand beyond residential remodeling to commercial construction and specialty trades
- **Scope**: 
  - Commercial construction support
  - Specialty trades tools (electrical, plumbing, HVAC)
  - API for third-party integrations
  - UI/UX: Trade-specific tool interfaces, commercial project templates
- **Value**: Market expansion and platform extensibility

---

## Epic 1: MVP - Minimum Viable Product

**Goal**: Fix critical bugs, establish core workflow, and build project management infrastructure with four-view navigation

### Story 1.1: Critical Bug Fixes & Performance Optimization

**Covers:** FR-1.1, FR-1.2, FR-4.1, NFR-1.1

As a contractor,
I want all critical bugs fixed and consistent performance across browsers,
So that I can reliably use the tool for production work without frustration.

**Acceptance Criteria:**

**Given** I am using CollabCanvas
**When** I delete a plan or scale reference
**Then** The deletion persists after page reload and does not reappear

**And** When I generate a BOM with common materials
**Then** Home Depot prices are fetched successfully for 90%+ of materials

**And** When I use AI chat to create shapes (e.g., "add a red circle")
**Then** Shapes are created successfully without errors

**And** When I annotate with 100+ objects on Firefox
**Then** Canvas maintains 60 FPS performance matching Chrome performance

**And** When I annotate with 100+ objects on any browser (Chrome, Firefox, Safari, Edge)
**Then** Canvas maintains consistent 60 FPS performance

**Performance Optimization Details:**
**And** When I have many objects on the canvas (100+)
**Then** Only visible objects are rendered (object culling implemented)

**And** When I pan or zoom the canvas
**Then** Only objects within the viewport are updated (viewport optimization implemented)

**And** When multiple shape updates occur simultaneously
**Then** Updates are batched together to reduce render calls (batching optimization implemented)

**And** When I measure performance with browser dev tools
**Then** Canvas rendering maintains 60 FPS during pan, zoom, and drawing operations across all browsers

**Prerequisites:** None (foundation story)

**Technical Notes:** 
- Fix Firebase deletion persistence issues (check Firestore rules and client-side deletion logic)
- Debug Home Depot API integration (SerpAPI) - verify API keys, request format, error handling
- Fix AI shape creation command parsing and execution
- Profile Firefox performance - identify rendering bottlenecks, implement object culling and viewport optimization
- Cross-browser testing required for all fixes

---

### Story 1.2: Home Page & Project Management System

**Covers:** FR-7.1, FR-7.2, FR-7.3, FR-6.3

As a contractor,
I want a home page where I can manage all my projects with status tracking,
So that I can organize multiple projects and track their progress through the estimation lifecycle.

**Acceptance Criteria:**

**Given** I am logged into CollabCanvas
**When** I view the home page
**Then** I see a list of all my projects with status indicators (Estimating, Bid Ready, Bid Lost, Executing, Completed Profitable, Completed Unprofitable, Completed - Unknown)

**And** When I click "New Project"
**Then** I can create a project with name and description, and it appears in my project list with status "Estimating"

**And** When I click on a project
**Then** I enter the project and see four-view navigation (Scope | Time | Space | Money)

**And** When I change a project's status on the home page
**Then** The status updates immediately and persists

**And** When I mark a project "Completed Profitable" or "Completed Unprofitable"
**Then** The system automatically calculates profit/loss based on actual costs vs. estimate (if cost tracking provided)

**And** When I mark a project complete without cost tracking
**Then** The status becomes "Completed - Unknown"

**And** When I search or filter projects
**Then** The project list updates to show matching projects

**And** When I delete a project
**Then** I am asked for confirmation and the project is permanently deleted

**Security & Access Control:**
**And** When I am not logged in
**Then** I cannot access any projects and am redirected to login

**And** When I try to access a project I don't own or haven't been invited to
**Then** I receive an access denied error and cannot view the project

**And** When I share a project with another user as "Viewer"
**Then** They can view but cannot modify the project

**And** When I share a project with another user as "Editor"
**Then** They can view and modify the project

**Error Handling:**
**And** When a network error occurs while loading projects
**Then** I see a clear error message with retry option

**And** When project creation fails
**Then** I see a clear error message and can retry without losing entered data

**And** When project deletion fails
**Then** I see a clear error message and the project is not deleted

**Prerequisites:** Story 1.1 (bug fixes)

**Technical Notes:**
- Implement home page as single unified dashboard view
- Firebase Firestore structure: projects collection with status field
- Status calculation logic for Completed Profitable/Unprofitable
- Project sharing with invite links (Editor/Viewer roles) - Firebase security rules required
- Real-time project list updates using Firestore listeners
- **Security**: Implement Firebase Auth guards, Firestore security rules for project access control, validate user permissions before project operations
- **Error Handling**: Use centralized error handler, display user-friendly error messages, implement retry logic for network failures, handle offline scenarios gracefully

---

### Story 1.3: Four-View Navigation & Scope View

**Covers:** FR-2.1, FR-2.2, FR-2.3, FR-3.2, FR-9.1, FR-9.2, FR-9.3

As a contractor,
I want four distinct views (Scope, Time, Space, Money) with scope of work upload capability,
So that I can organize my project workflow and provide scope context for accurate estimates.

**Acceptance Criteria:**

**Given** I have selected a project
**When** I view the project
**Then** I see top navigation bar with four tabs: Scope | Time | Space | Money

**And** When I click on the Scope tab
**Then** I see Scope view with CSV upload capability

**And** When I upload a CSV file with 2 columns (scope, description)
**Then** The scope content is parsed and displayed as structured content

**And** When I switch between tabs (Scope, Time, Space, Money)
**Then** The view changes smoothly and my current view is highlighted

**And** When content is generated (BOM in Money, CPM in Time)
**Then** The corresponding tab shows an indicator badge

**And** When I click on a tab with an indicator
**Then** The indicator disappears and I see the generated content

**And** When other users are viewing the same project
**Then** I see presence indicators showing who is in each view/tab

**And** When I make changes in any view
**Then** Changes sync in real-time across all views for all users

**Prerequisites:** Story 1.2 (project management)

**Technical Notes:**
- Implement four-view navigation using React Router
- Scope view: CSV parser for 2-column format (scope, description)
- View indicators: Badge/notification system on tabs
- Real-time presence: Firebase Realtime Database for view/tab presence tracking
- Deep linking: URL structure like `/project/{projectId}/scope`, `/project/{projectId}/money`, etc.
- Preserve existing Space view functionality (canvas/annotation)

---

### Story 1.4: Money View with BOM, Pricing, Margin Calculation & AI Chat Integration

**Covers:** FR-3.1, FR-3.3, FR-4.1, FR-4.2, FR-4.3, FR-5.1, FR-5.2, FR-6.1, FR-6.2

As a contractor,
I want to generate accurate BOMs with real prices, calculate margins, and view estimates in customer/contractor formats,
So that I can create professional estimates with proper profit margins for client presentation and internal tracking.

**Acceptance Criteria:**

**Given** I have completed annotations in Space view and scope in Scope view
**When** I open AI chat (available in any view) and say "Generate BOM and Critical Path for this project"
**Then** AI guides me through pre-flight checks with clarifying questions

**And** When AI detects missing required information (scale, layers, annotations)
**Then** AI refuses to generate and asks me to complete the missing items

**And** When all required information is complete
**Then** AI generates both BOM and Critical Path simultaneously in parallel

**And** When BOM is generated
**Then** System automatically fetches Home Depot prices for each material (90%+ success rate)

**And** When price fetch fails for a material
**Then** System shows "Price unavailable" with manual entry option

**And** When I have not entered prices for all materials (fetched or manual)
**Then** BOM completion is blocked until all prices are entered

**And** When all prices are complete
**Then** I can view the estimate in two formats:
  - **Customer View**: Material + labor totals + included margin (margin incorporated into labor)
  - **Contractor View**: Labor, materials, and margin separate (margin in dollars and time/slack)

**And** When I modify the BOM
**Then** Changes reflect immediately in both views

**And** When I export the estimate
**Then** I can choose to export Customer View or Contractor View as PDF

**FR-6.1: Actual Cost Input (Voluntary)**
**And** When I want to track actual costs (voluntary)
**Then** I can input actual cost per material line item in Money view

**And** When I input actual costs
**Then** I can enter costs incrementally as materials are purchased (not all at once)

**And** When I save actual costs
**Then** They persist across sessions and can be edited later

**And** When I edit an actual cost
**Then** The change is saved and variance calculations update automatically

**FR-6.2: Estimate vs. Actual Comparison**
**And** When I have entered actual costs for one or more line items
**Then** I can view a side-by-side comparison (estimate vs. actual) in Money view

**And** When viewing the comparison
**Then** Variance percentage is calculated and displayed per line item (positive for over-estimate, negative for under-estimate)

**And** When viewing the comparison
**Then** Total variance is calculated and displayed (sum of all line item variances)

**And** When variance exists
**Then** Over-estimates and under-estimates are visually highlighted (e.g., green for under-estimate, red for over-estimate)

**And** When I have multiple completed projects with actual costs
**Then** Historical accuracy trends can be displayed (future enhancement - Epic 5, can be deferred for MVP)

**Error Handling:**
**And** When AI BOM generation fails (API error, timeout, etc.)
**Then** I see a clear error message with retry option and can try again

**And** When price fetch fails for multiple materials
**Then** System shows "Price unavailable" for each failed item with manual entry option for all

**And** When price fetch API is unavailable (service down)
**Then** System shows clear error message and allows manual entry for all materials

**And** When actual cost input fails to save
**Then** I see an error message and can retry without losing entered data

**And** When variance calculation fails (e.g., invalid data)
**Then** System shows error message and allows me to correct the data

**Prerequisites:** Story 1.3 (four-view navigation)

**Technical Notes:**
- Expand existing AI BOM generation to Money view
- Integrate Home Depot API (SerpAPI) with retry logic and caching
- Margin calculation: Material costs + Labor costs (from CPM) × margin percentage
- Two-view toggle: Customer View vs Contractor View in Money view
- PDF export: Use library like jsPDF or react-pdf
- Price blocking logic: Check all BOM items have prices before allowing completion
- AI chat context-awareness: Track which view chat is open in, suggest navigation if needed
- **Actual cost input**: Add editable "Actual Cost" field per BOM line item in Money view, store in Firestore BOM document
- **Variance calculation**: Calculate per-item variance = ((actual - estimate) / estimate) × 100%, total variance = sum of all item variances
- **Comparison view**: Side-by-side table showing Estimate | Actual | Variance columns, with color coding for over/under estimates
- **Data persistence**: Actual costs stored in Firestore `/projects/{projectId}/bom` document, persist across sessions
- **Error Handling**: Use centralized error handler for all API calls, implement retry logic with exponential backoff for price fetching, handle AI generation failures gracefully with user-friendly messages, validate data before variance calculations

---

## Epic 2: Phase 2 - Advanced Annotation Tools & Multi-Floor Support

**Goal**: Add counter tool and multi-floor project support

### Story 2.1: Project Isolation - Canvas, BOM, and Views Per Project

**Covers:** Critical foundation for multi-project support (FR-1.1 project management)

As a contractor,
I want each project to have its own isolated canvas (Space view), bill of materials, and all view data,
So that shapes, annotations, and estimates from one project don't appear in other projects.

**Acceptance Criteria:**

**Given** I have multiple projects
**When** I create a shape in Project A's Space view
**Then** The shape is stored in Firestore at `/projects/{projectId}/shapes/{shapeId}` and does not appear in Project B

**And** When I create a layer in Project A's Space view
**Then** The layer is stored in Firestore at `/projects/{projectId}/layers/{layerId}` and does not appear in Project B

**And** When I upload a background image or create a scale line in Project A's Space view
**Then** The board state is stored in Firestore at `/projects/{projectId}/board` and does not affect Project B

**And** When I switch between projects
**Then** All Firestore subscriptions for the previous project are properly cleaned up and new subscriptions for the current project are established

**And** When I create, update, or delete shapes
**Then** No infinite re-render loops occur and subscriptions do not trigger cascading updates

**Prerequisites:** Story 1.2 (Project Management System), Story 1.3 (Four-View Navigation)

**Technical Notes:**
- Refactor `services/firestore.ts` to accept `projectId` parameter in all functions
- Change shapes collection path from `/boards/global/shapes` to `/projects/{projectId}/shapes`
- Change layers collection path from `/boards/global/layers` to `/projects/{projectId}/layers`
- Change board document path from `/boards/global` to `/projects/{projectId}/board`
- Update `useShapes` and `useLayers` hooks to accept projectId with proper cleanup
- Update all components to pass projectId to hooks and services
- Update Firestore security rules for project-scoped collections
- Handle migration of existing data from global board to project-scoped collections
- Ensure proper subscription cleanup to prevent infinite loops
- Test project isolation thoroughly to prevent data leakage

**Dependencies:**
- Blocks: Story 2.2 (Counter Tool), Story 2.3 (Multi-Floor Support) - both need project isolation first

---

### Story 2.2: Counter Tool for Fixture Counting

**Covers:** New annotation tool capability (enhances FR-2 annotation capabilities)

As a contractor,
I want a counter tool to mark and count fixtures, outlets, and other countable items,
So that I can accurately count instances without manual tracking.

**Acceptance Criteria:**

**Given** I am in Space view with a project open
**When** I select the counter tool
**Then** I can click on the canvas to place counter dots

**And** When I place counter dots on fixtures (sinks, toilets, outlets, etc.)
**Then** Each dot is counted and displayed in the layer totals

**And** When I view layer totals
**Then** I see total count of counter dots per layer

**And** When I assign counter dots to different layers
**Then** Counts are tracked separately per layer

**Prerequisites:** Story 1.3 (four-view navigation)

**Technical Notes:**
- New annotation tool type: Counter (dot marker)
- Store counter dots in Firebase with layer assignment
- Display counter totals in LayerPanel component
- Counter dots should be selectable, movable, and deletable like other shapes

---

### Story 2.3: Multi-Floor Project Support

**Covers:** FR-1.1 (enhanced with multi-floor support)

As a contractor,
I want to add multiple floor plans to a single project and switch between them,
So that I can estimate multi-story projects accurately with floor-specific annotations.

**Acceptance Criteria:**

**Given** I have a project open
**When** I am in Space view
**Then** I see a floor selector interface

**And** When I add a new floor plan
**Then** I can upload a floor plan image and name it (e.g., "First Floor", "Second Floor")

**And** When I switch between floors
**Then** The canvas shows the selected floor's plan and annotations

**And** When I annotate on different floors
**Then** Annotations are stored separately per floor

**And** When I generate a BOM
**Then** System aggregates measurements across all floors for complete project estimate

**And** When I view layer totals
**Then** I can see totals per floor or aggregated across all floors

**Prerequisites:** Story 2.1 (counter tool - for complete annotation toolset)

**Technical Notes:**
- Firebase structure: Add floors array to project document
- Floor switching: State management for current floor selection
- Floor-specific annotations: Store annotations with floor ID
- Aggregated BOM: Sum measurements across floors when generating BOM
- UI: Floor selector dropdown/tabs in Space view

---

## Epic 3: Phase 3 - Construction Project Bidding Engine

**Goal**: Comprehensive bidding system with labor hours, critical path enhancements, and customizable bid parameters

### Story 3.1: Advanced Labor Hours Calculation

**Covers:** FR-5 (enhanced with advanced labor calculation - builds on MVP basic labor)

As a contractor,
I want accurate labor hour estimates based on industry standards and task complexity,
So that I can calculate realistic labor costs for my bids.

**Acceptance Criteria:**

**Given** I have generated a Critical Path with tasks
**When** The system calculates labor hours
**Then** It uses industry standard labor rates per task type

**And** When calculating labor hours
**Then** System considers task complexity, scope, and material installation requirements

**And** When I view labor hours in Time view
**Then** I see labor hours displayed alongside task durations

**And** When tasks have dependencies
**Then** Labor hours account for crew productivity factors and task sequencing

**Prerequisites:** Story 1.4 (MVP CPM generation)

**Technical Notes:**
- Industry standard labor rate database (e.g., RSMeans data or contractor-configurable rates)
- Task type classification: Match CPM tasks to labor categories
- Labor calculation formula: Base hours × complexity factor × productivity factor
- Display labor hours in Time view CPM graph nodes

---

### Story 3.2: Enhanced CPM with Labor Integration & Visualization

**Covers:** FR-5 (enhanced CPM visualization - builds on MVP CPM)

As a contractor,
I want to see labor hours integrated into the Critical Path visualization,
So that I can understand both time and labor requirements for each task.

**Acceptance Criteria:**

**Given** I have labor hours calculated for tasks
**When** I view Time view
**Then** I see enhanced CPM graph with labor hours displayed on task nodes

**And** When I view the CPM graph
**Then** Task nodes show: task name, duration, labor hours, dependencies

**And** When I interact with the graph
**Then** I can zoom, pan, and click nodes for detailed information

**And** When I view the critical path
**Then** It highlights tasks that affect both project duration AND labor requirements

**Prerequisites:** Story 3.1 (advanced labor hours calculation)

**Technical Notes:**
- Enhance existing CPM graph visualization (from MVP)
- Add labor hours display to task nodes
- Interactive graph: Use library like D3.js or vis.js for CPM visualization
- Critical path calculation: Include labor constraints in critical path analysis

---

### Story 3.3: Advanced Margin Calculation & Bid Customization

**Covers:** FR-5 (enhanced margin calculation and bid customization - builds on MVP basic margin)

As a contractor,
I want to customize bid parameters (crew size, pay rates, margins) and see real-time recalculation,
So that I can adjust bids to match my business model and generate accurate, competitive quotes.

**Acceptance Criteria:**

**Given** I have a BOM and Critical Path with labor hours
**When** I am in Money view
**Then** I see bid customization interface

**And** When I adjust crew size per task/phase
**Then** Labor costs recalculate in real-time

**And** When I adjust crew pay rates (hourly rates for different roles)
**Then** Labor costs recalculate in real-time

**And** When I adjust company overhead and profit margin percentages
**Then** Total project cost recalculates in real-time

**And** When I view the estimate
**Then** Margin is shown in dollars (profit amount) and time/slack (buffer time)

**And** When I generate a professional bid document
**Then** It includes: detailed cost breakdown, labor schedule, material list, project timeline, terms and conditions

**Prerequisites:** Story 3.2 (enhanced CPM with labor)

**Technical Notes:**
- Bid parameter customization UI in Money view
- Real-time recalculation: Update costs as parameters change
- Margin calculation: (Materials + Labor) × margin percentage + overhead + contingency
- Time/slack calculation: Add buffer time based on margin percentage
- PDF bid document generation: Professional formatting with all components

---

## Epic 4: Phase 4 - Multi-Supplier Cost Optimization & Advanced Features

**Goal**: Automatically compare and optimize prices across multiple suppliers

### Story 4.1: Multi-Supplier Cost Optimization

**Covers:** FR-4 (enhanced with multi-supplier price comparison - builds on MVP single-supplier pricing)

As a contractor,
I want the system to automatically compare prices across multiple suppliers and find the best price for each material,
So that I can save 5-15% on material costs with minimal effort.

**Acceptance Criteria:**

**Given** I have generated a BOM with initial prices
**When** I trigger cost optimization in Money view
**Then** System queries all supplier APIs simultaneously (Home Depot, Lowe's, Amazon, Wayfair, contractor supply stores)

**And** When optimization completes
**Then** System shows optimized prices with savings breakdown per line item

**And** When I review optimizations
**Then** I can see original price/supplier vs. optimized price/supplier for each material

**And** When I review optimizations
**Then** I can selectively accept or reject individual optimizations

**And** When I accept optimizations
**Then** BOM updates with optimized prices and total project savings is displayed

**Prerequisites:** Story 1.4 (Money view with BOM and pricing)

**Technical Notes:**
- Parallel API queries: Use Promise.all() to query all suppliers simultaneously
- Supplier API integrations: Lowe's, Amazon, Wayfair APIs (research API access requirements)
- Optimization algorithm: Find best price per material across all suppliers
- Savings calculation: Compare original vs. optimized totals
- UI: Optimization results modal/panel in Money view

---

### Story 4.2: Additional Supplier Integrations & Price Comparison Dashboard

**Covers:** FR-4 (enhanced with additional supplier APIs and comparison dashboard)

As a contractor,
I want to see side-by-side price comparisons from all suppliers and set supplier preferences,
So that I can make informed decisions about material sourcing.

**Acceptance Criteria:**

**Given** I have multiple supplier APIs integrated
**When** I view price comparison in Money view
**Then** I see side-by-side comparison of all suppliers for each material

**And** When I set supplier preferences (favorite suppliers, delivery options)
**Then** Optimization algorithm considers my preferences when selecting best prices

**And** When prices change
**Then** System can automatically re-price materials (with user confirmation)

**And** When I view the price comparison dashboard
**Then** I can see material availability checking across suppliers (if APIs support it)

**Prerequisites:** Story 4.1 (multi-supplier cost optimization)

**Technical Notes:**
- Price comparison dashboard UI component
- Supplier preference settings: Store in user profile/settings
- Automatic re-pricing: Background job to check price updates, notify user
- Material availability: Integrate supplier inventory APIs if available
- Caching strategy: Cache prices with TTL, handle stale data gracefully

---

## Epic 4.5: Multi-Scenario Support

**Goal**: Save project states as scenarios and switch between them

### Story 4.5.1: Scenario Saving & Management

**Covers:** New capability (scenario management - builds on MVP single BOM)

As a contractor,
I want to save the current project state (Scope + Time + Space + Money) as a scenario,
So that I can create multiple project scope options for client presentation.

**Acceptance Criteria:**

**Given** I have a project with complete state (Scope, Time, Space, Money views populated)
**When** I save the current state as a scenario
**Then** I can name the scenario (e.g., "Shower Only", "Shower + Tub")

**And** When I create multiple scenarios
**Then** I can switch between scenarios using scenario tabs/selector

**And** When I switch scenarios
**Then** All four views (Scope, Time, Space, Money) update to show that scenario's state

**And** When I edit a scenario
**Then** Changes are saved to that specific scenario only

**Prerequisites:** Story 1.4 (Money view), Story 3.3 (bid customization)

**Technical Notes:**
- Scenario data structure: Store complete project state snapshot (Scope CSV, CPM data, annotations, BOM)
- Scenario management: Create, name, switch, delete scenarios
- State persistence: Firebase structure to store multiple scenario states per project
- UI: Scenario selector/tabs above four-view navigation

---

### Story 4.5.2: Scenario Comparison & Editing

**Covers:** Scenario management capability (enhances Story 4.5.1)

As a contractor,
I want to compare scenarios side-by-side and edit them independently,
So that I can present different project options to clients with clear cost differences.

**Acceptance Criteria:**

**Given** I have multiple scenarios saved
**When** I view scenario comparison
**Then** I see side-by-side comparison showing cost differences between scenarios

**And** When I edit a scenario
**Then** I can modify Scope, annotations, BOM, or bid parameters independently

**And** When I export scenarios
**Then** I can export individual scenarios or combined comparison document

**And** When I delete a scenario
**Then** Other scenarios remain unaffected

**Prerequisites:** Story 4.5.1 (scenario saving)

**Technical Notes:**
- Scenario comparison UI: Side-by-side view showing key differences
- Independent editing: Each scenario maintains its own state
- Export: PDF generation for individual or comparison views
- Scenario deletion: Remove scenario data from Firebase

---

## Epic 5: Phase 5 - Machine Learning Enhancement & Historical Project Database

**Goal**: Improve estimation accuracy through ML and historical data

### Story 5.1: ML Model & Historical Project Database

**Covers:** FR-6 (enhanced with ML and historical database - builds on MVP estimate-to-actual tracking)

As a contractor,
I want the system to learn from my completed projects to improve future estimates,
So that estimation accuracy improves over time and approaches ±5% target.

**Acceptance Criteria:**

**Given** I have completed projects with actual cost data
**When** The system trains the ML model
**Then** It learns patterns from estimate vs. actual comparisons

**And** When I generate a new estimate
**Then** System references similar completed projects from historical database

**And** When I view estimate accuracy indicators
**Then** I see predictive accuracy score based on ML model

**And** When I view historical project database
**Then** I can browse similar completed projects and their accuracy metrics

**Prerequisites:** Story 1.4 (estimate-to-actual tracking)

**Technical Notes:**
- ML model: Train on estimate vs. actual data (6 historical projects available for initial training)
- Historical project database: Store completed projects with actual costs
- Project similarity matching: Match new projects to similar historical projects
- Accuracy scoring: ML model predicts accuracy range for new estimates
- Data ingestion: Manual ingestion process for historical projects

---

### Story 5.2: Predictive Accuracy & Pattern Recognition

**Covers:** FR-6 (enhanced with ML pattern recognition - builds on Story 5.1)

As a contractor,
I want the system to recognize common estimation errors and suggest improvements,
So that I can avoid repeating mistakes and continuously improve accuracy.

**Acceptance Criteria:**

**Given** The ML model has been trained on historical data
**When** I generate a new estimate
**Then** System identifies potential estimation errors based on learned patterns

**And** When system detects potential errors
**Then** It suggests corrections or warnings (e.g., "Material waste factor may be low for this project type")

**And** When I view accuracy trends
**Then** I see historical accuracy improvements over time

**And** When I view material waste factor calculations
**Then** They are adjusted based on project type and historical data

**Prerequisites:** Story 5.1 (ML model & historical database)

**Technical Notes:**
- Pattern recognition: ML model identifies common error patterns
- Error detection: Compare current estimate to historical patterns
- Waste factor calculation: Adjust material quantities based on project type and historical accuracy
- Accuracy trend visualization: Chart showing accuracy improvements over time

---

## Epic 6: Phase 6 - AI-Powered Annotation & Workflow Automation

**Goal**: Automate repetitive annotation tasks with AI commands

### Story 6.1: AI Annotation Assistant

**Covers:** FR-2 (enhanced with AI-powered automatic annotation - builds on MVP manual annotation)

As a contractor,
I want to use high-level AI commands to automatically annotate plans,
So that I can reduce manual annotation time by 50-70%.

**Acceptance Criteria:**

**Given** I have uploaded a plan in Space view
**When** I use AI chat and say "measure all walls"
**Then** AI automatically traces walls using polyline tool

**And** When I say "measure all floors"
**Then** AI automatically outlines floor areas using polygon tool

**And** When I say "count all sinks"
**Then** AI identifies and counts fixtures using counter tool

**And** When AI annotates automatically
**Then** Annotations are created on appropriate layers

**And** When I use natural language commands
**Then** AI understands and executes annotation tasks without manual drawing

**Prerequisites:** Story 1.3 (four-view navigation), Story 2.1 (counter tool)

**Technical Notes:**
- AI vision integration: Use OpenAI Vision API or similar to analyze plan images
- Automatic annotation: AI generates shape coordinates and creates annotations programmatically
- Layer assignment: AI assigns annotations to appropriate layers based on context
- Command parsing: Natural language understanding for annotation commands
- Integration with existing annotation tools (polyline, polygon, counter)

---

### Story 6.2: Advanced Collaboration & Integrations

**Covers:** FR-9 (enhanced with client portal and integrations - builds on MVP collaboration)

As a contractor,
I want client portal access and integrations with accounting software,
So that I can streamline my workflow beyond estimation.

**Acceptance Criteria:**

**Given** I have generated an estimate
**When** I share estimate with client via client portal
**Then** Client can view and approve estimate online

**And** When I integrate with accounting software (QuickBooks, etc.)
**Then** I can export project data and estimates to accounting system

**And** When I use team collaboration features
**Then** I can assign estimators and reviewers to projects

**And** When mobile app is available
**Then** I can take field measurements and sync to project

**Prerequisites:** Story 1.4 (Money view with estimates)

**Technical Notes:**
- Client portal: Separate view/access for clients (read-only estimate viewing)
- Accounting integration: API integration with QuickBooks or similar (research API access)
- Team collaboration: Role assignments (estimator, reviewer) with permissions
- Mobile app: Future consideration - field measurement sync

---

## Epic 7: Phase 7 - Market Expansion

**Goal**: Expand beyond residential remodeling to commercial construction and specialty trades

### Story 7.1: Commercial Construction Support

**Covers:** FR-3 (enhanced for commercial construction - builds on MVP residential focus)

As a contractor,
I want to use CollabCanvas for commercial construction projects,
So that I can expand my business to commercial work using the same tool.

**Acceptance Criteria:**

**Given** I am creating a new project
**When** I select "Commercial Construction" project type
**Then** System provides commercial-specific templates and material categories

**And** When I generate estimates for commercial projects
**Then** System uses commercial construction labor rates and material databases

**And** When I view commercial project estimates
**Then** They account for commercial-specific requirements (permits, inspections, etc.)

**Prerequisites:** Story 1.4 (core estimation workflow)

**Technical Notes:**
- Project type classification: Add project type field (residential vs. commercial)
- Commercial templates: Pre-configured project templates for common commercial types
- Commercial material database: Expand material categories for commercial construction
- Commercial labor rates: Different labor rate tables for commercial work

---

### Story 7.2: Specialty Trades & API

**Covers:** FR-3 (enhanced for specialty trades - builds on Story 7.1), New API capability

As a contractor,
I want specialty trade tools (electrical, plumbing, HVAC) and API access,
So that I can use CollabCanvas for specialized work and integrate with other tools.

**Acceptance Criteria:**

**Given** I am working on a specialty trade project (electrical, plumbing, HVAC)
**When** I select the trade type
**Then** System provides trade-specific annotation tools and material categories

**And** When I generate estimates for specialty trades
**Then** System uses trade-specific labor rates and material requirements

**And** When I use the API
**Then** Third-party tools can integrate with CollabCanvas to access project data and estimates

**Prerequisites:** Story 7.1 (commercial construction support)

**Technical Notes:**
- Trade-specific tools: Custom annotation tools for each trade (e.g., electrical circuit mapping)
- Trade material databases: Specialized material catalogs per trade
- Trade labor rates: Trade-specific labor rate tables
- API development: RESTful API for third-party integrations
- API authentication: Secure API key management

---

_For implementation: Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown._

