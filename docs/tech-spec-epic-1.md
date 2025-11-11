# Epic Technical Specification: MVP - Minimum Viable Product

Date: 2025-11-06
Author: xvanov
Epic ID: 1
Status: Draft

---

## Overview

Epic 1 establishes the foundation for CollabCanvas as a production-ready MVP construction takeoff and estimation platform. This epic addresses critical bug fixes, implements core project management infrastructure, and delivers a complete four-view navigation system (Scope | Time | Space | Money) that enables contractors to generate accurate material estimates and critical path schedules from construction plans and scope documents.

The epic transforms CollabCanvas from a basic annotation tool into a comprehensive estimation workflow, reducing manual estimation time from 4-8 hours to 30 minutes through AI-powered BOM generation, real-time supplier pricing integration, and automated critical path calculation. The MVP focuses on fixing production-blocking bugs, establishing reliable data persistence, and building the project management foundation that enables contractors to manage multiple projects with status tracking and collaboration.

## Objectives and Scope

**In-Scope:**

- **Critical Bug Fixes** (Must-Have Before Launch)
  - Plan deletion persistence (reliable deletion that doesn't reappear on reload)
  - Scale deletion persistence (reliable deletion that doesn't reappear on reload)
  - Home Depot price integration (90%+ success rate for exact prices)
  - AI shape creation commands (fix "add a red circle" errors)
  - Firefox performance degradation (60 FPS with 100+ objects across all browsers)

- **Home Page & Project Dashboard**
  - Project list with status indicators (Estimating, Bid Ready, Bid Lost, Executing, Completed Profitable, Completed Unprofitable, Completed - Unknown)
  - Project creation, deletion, search, and filtering
  - Project status management with manual transitions
  - Automatic profit/loss calculation for completed projects
  - Project sharing with Editor/Viewer roles

- **Four-View Navigation Structure**
  - Top navigation bar: Scope | Time | Space | Money
  - Scope View: CSV upload (2 columns: scope, description) and display
  - Space View: Canvas/annotation (preserve existing functionality)
  - Money View: BOM with exact Home Depot prices, margin calculation, customer/contractor views
  - Time View: Critical Path visualization (full CPM with calculations)
  - View indicators for generated content
  - Real-time presence tracking per view
  - Deep linking support

- **Money View - Estimate Section**
  - AI BOM generation via context-aware chat
  - Pre-flight completeness enforcement (blocks generation until required info complete)
  - Automatic Home Depot price fetching (90%+ success rate)
  - Price fetch failure handling with manual entry option
  - BOM completion blocking until all prices entered
  - Margin calculation (materials + labor × margin percentage)
  - Customer View and Contractor View toggle
  - PDF export (customer or contractor view)
  - Actual cost input (voluntary) and estimate vs. actual comparison

- **Design System Implementation**
  - shadcn/ui component library (25 standard components)
  - Modern Neutral theme (#0f172a primary)
  - Typography, spacing, responsive breakpoints
  - WCAG 2.1 Level AA accessibility compliance

- **Performance Optimization**
  - Canvas performance: 60 FPS with 100+ objects on all browsers
  - Object culling, viewport optimization, batch updates
  - Cross-browser performance testing

**Out-of-Scope:**

- Multi-supplier cost optimization (Epic 4)
- Counter tool (Epic 2)
- Multi-floor projects (Epic 2)
- Advanced labor hours calculation (Epic 3)
- ML-based accuracy enhancement (Epic 5)
- AI annotation assistant (Epic 6)
- Multi-scenario support (Epic 4.5)

## System Architecture Alignment

Epic 1 aligns with the established React 19 SPA architecture using Firebase BaaS and Konva.js for canvas rendering. The implementation leverages:

- **Routing**: React Router for four-view navigation with deep linking (`/projects/:projectId/scope`, `/projects/:projectId/time`, `/projects/:projectId/space`, `/projects/:projectId/money`)
- **State Management**: Hybrid Zustand stores (projectStore + view-specific stores: scopeStore, timeStore, moneyStore, canvasStore)
- **Data Persistence**: Firestore collections for projects, scope, CPM, and BOM documents; RTDB for presence tracking with `currentView` field
- **API Integration**: Cloud Functions route all external APIs (Home Depot pricing via SerpAPI, AI commands via OpenAI) for security and caching
- **Performance**: Canvas rendering optimizations (object culling, viewport optimization, batch updates) critical for 60 FPS with 100+ objects
- **Real-time Collaboration**: Extended RTDB presence system tracks user presence per view, enabling collaborative workflows across all four views

The architecture supports Epic 1's requirements through component-based structure (`pages/Dashboard.tsx`, `pages/Project.tsx`, view-specific components), service layer abstraction (`projectService.ts`, `scopeService.ts`, `cpmService.ts`, `bomService.ts`), and Firebase security rules for project-level access control.

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Inputs | Outputs | Owner |
|----------------|----------------|--------|---------|-------|
| **projectService.ts** | Project CRUD operations, status management, sharing | Project name, description, status, collaborators | Project objects, project lists | Project Management |
| **scopeService.ts** | Scope CSV upload, parsing, storage, retrieval | CSV file (2 columns: scope, description) | Parsed scope items array | Scope View |
| **cpmService.ts** | CPM generation, task management, dependency calculation | Annotations, scope, AI-generated tasks | CPM document with tasks array | Time View |
| **bomService.ts** | BOM generation, price fetching, margin calculation, export | Annotations, scope, material requests | BOM document with calculations, prices | Money View |
| **pricingService.ts** | Home Depot price fetching via Cloud Functions | Material name, unit | Price USD, source link | Money View |
| **aiService.ts** | AI command processing, context-aware chat, pre-flight validation | User command text, current view context | AI responses, BOM/CPM generation | All Views |
| **projectStore.ts** | Project state management, project list, current project | Project CRUD operations | Project state, project list | Project Management |
| **scopeStore.ts** | Scope view state, CSV upload state | Scope upload, scope updates | Scope state | Scope View |
| **timeStore.ts** | CPM state, task management | CPM generation, task updates | CPM state | Time View |
| **moneyStore.ts** | BOM state, price state, margin state | BOM generation, price updates, margin changes | BOM state, estimate views | Money View |
| **canvasStore.ts** | Canvas state, shapes, layers (existing) | Shape operations, layer operations | Canvas state | Space View |

**Cloud Functions:**

| Function | Purpose | Inputs | Outputs |
|----------|---------|--------|---------|
| **getHomeDepotPrice** | Fetch price from Home Depot via SerpAPI | Material name, unit, store number | Price USD, source link |
| **aiCommand** | Process AI commands, generate BOM/CPM | Command text, userId, project context | AI response, executed commands |
| **materialEstimateCommand** | Generate material estimates from annotations | Project ID, annotations, scope | BOM with materials and quantities |

### Data Models and Contracts

**Project Document (`/projects/{projectId}`):**
```typescript
interface Project {
  name: string;
  description: string;
  status: 'estimating' | 'bid-ready' | 'bid-lost' | 'executing' | 'completed-profitable' | 'completed-unprofitable' | 'completed-unknown';
  ownerId: string; // userId
  collaborators: Array<{
    userId: string;
    role: 'editor' | 'viewer';
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // userId
  updatedBy: string; // userId
}
```

**Scope Document (`/projects/{projectId}/scope`):**
```typescript
interface Scope {
  items: Array<{
    scope: string; // e.g., "demo", "roof", "siding"
    description: string; // Detailed description
  }>;
  uploadedAt: Timestamp;
  uploadedBy: string; // userId
}
```

**CPM Document (`/projects/{projectId}/cpm`):**
```typescript
interface CPM {
  tasks: Array<{
    id: string;
    name: string;
    duration: number; // hours or days
    dependencies: string[]; // task IDs
    startDate?: Timestamp;
    endDate?: Timestamp;
  }>;
  generatedAt: Timestamp;
  generatedBy: string; // userId
}
```

**BOM Document (`/projects/{projectId}/bom`):**
```typescript
interface BOM {
  calculations: Array<MaterialCalculation>;
  totalCost: number;
  margin: number;
  marginPercentage: number;
  lastUpdated: Timestamp;
}

interface MaterialCalculation {
  material: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  actualCost?: number; // Optional actual cost input
  priceSource?: string; // Home Depot link or "manual"
  category: string; // e.g., "Walls", "Floors"
}
```

**Presence (`/presence/{userId}` in RTDB):**
```typescript
interface Presence {
  userId: string;
  name: string;
  color: string;
  currentView: 'scope' | 'time' | 'space' | 'money';
  cursor: { x: number; y: number };
  lastSeen: number; // timestamp
  isActive: boolean;
}
```

### APIs and Interfaces

**Project Service API:**
- `createProject(name: string, description: string): Promise<Project>`
- `getProject(projectId: string): Promise<Project>`
- `updateProject(projectId: string, updates: Partial<Project>): Promise<void>`
- `deleteProject(projectId: string): Promise<void>`
- `getUserProjects(userId: string): Promise<Project[]>`
- `updateProjectStatus(projectId: string, status: Project['status']): Promise<void>`
- `shareProject(projectId: string, userId: string, role: 'editor' | 'viewer'): Promise<void>`

**Scope Service API:**
- `uploadScope(projectId: string, items: Scope['items']): Promise<void>`
- `getScope(projectId: string): Promise<Scope>`
- `updateScope(projectId: string, items: Scope['items']): Promise<void>`

**CPM Service API:**
- `generateCPM(projectId: string, tasks: CPM['tasks']): Promise<void>`
- `getCPM(projectId: string): Promise<CPM>`
- `updateCPM(projectId: string, tasks: CPM['tasks']): Promise<void>`

**BOM Service API:**
- `generateBOM(projectId: string): Promise<BillOfMaterials>`
- `getBOM(projectId: string): Promise<BillOfMaterials>`
- `updateBOM(projectId: string, bom: BOM): Promise<void>`
- `fetchPrices(bom: BOM): Promise<BOM>` // Fetches prices for all materials
- `updateActualCost(projectId: string, materialIndex: number, actualCost: number): Promise<void>`
- `exportEstimate(projectId: string, view: 'customer' | 'contractor'): Promise<Blob>` // PDF export

**Pricing Service API:**
- `fetchHomeDepotPrice(materialName: string, unit?: string): Promise<{ priceUSD: number | null; link: string | null }>`

**Cloud Function APIs:**

**getHomeDepotPrice:**
```typescript
Request: {
  materialName: string;
  unit?: string;
  storeNumber?: string;
}
Response: {
  success: boolean;
  priceUSD: number | null;
  link: string | null;
  error?: string;
}
```

**aiCommand:**
```typescript
Request: {
  commandText: string;
  userId: string;
  projectId: string;
  currentView: 'scope' | 'time' | 'space' | 'money';
}
Response: {
  success: boolean;
  message: string;
  executedCommands: AICommand[];
  error?: string;
}
```

### Workflows and Sequencing

**Workflow 1: New Project Estimation (Primary Flow)**

1. **User creates project** → `projectService.createProject()` → Project created in Firestore
2. **User navigates to Scope view** → `scopeService.uploadScope()` → CSV parsed, stored in Firestore
3. **User navigates to Space view** → Upload plan, set scale, create layers, annotate → Shapes stored in Firestore
4. **User opens AI chat** (any view) → `aiService.processCommand()` → Pre-flight validation checks:
   - Scale reference exists? (required)
   - Layers exist? (required)
   - Annotations exist? (required)
   - Scope uploaded? (recommended, warning if missing)
5. **If validation passes** → `aiService.generateBOMAndCPM()` → Parallel generation:
   - BOM generation: Analyze annotations + scope → Generate material list → `bomService.generateBOM()`
   - CPM generation: Analyze tasks from scope → Generate task dependencies → `cpmService.generateCPM()`
6. **Price fetching** → `pricingService.fetchHomeDepotPrice()` for each material → Prices stored in BOM
7. **If price fetch fails** → Show "Price unavailable" → User can manually enter price
8. **BOM completion check** → All materials must have prices (fetched or manual) → Block completion until satisfied
9. **Margin calculation** → `bomService.calculateMargin()` → Material costs + Labor costs (from CPM) × margin percentage
10. **Display results** → Money view shows BOM, Time view shows CPM graph

**Workflow 2: Project Status Management**

1. **User views dashboard** → `projectService.getUserProjects()` → Projects loaded with status
2. **User changes status** → `projectService.updateProjectStatus()` → Status updated in Firestore
3. **If status = "Completed Profitable" or "Completed Unprofitable"**:
   - Check if actual costs exist in BOM
   - Calculate profit/loss: `(actualCosts - estimateTotal)`
   - If profit > 0 → "Completed Profitable", else → "Completed Unprofitable"
   - If no actual costs → "Completed - Unknown"

**Workflow 3: Real-time Collaboration**

1. **User enters project** → RTDB presence updated: `currentView` set to active view
2. **User switches views** → RTDB presence updated: `currentView` changed
3. **Other users see presence** → RTDB listener on `/presence` → Display presence indicators per view
4. **User makes changes** → Firestore update → Real-time sync to all users via Firestore listeners
5. **User leaves** → RTDB presence cleared → `isActive: false`

## Non-Functional Requirements

### Performance

**Canvas Rendering Performance (NFR-1.1):**
- **Target**: Maintain 60 FPS canvas rendering with 100+ objects across all browsers (Chrome, Firefox, Safari, Edge)
- **Measurement**: FPS monitoring during annotation with 100+ objects
- **Implementation**: Object culling (only render visible shapes), viewport optimization (only update visible area), batch updates (group multiple shape updates)
- **Critical Fix**: Firefox performance degradation must be resolved to match Chrome performance

**Shape Sync Latency (NFR-1.2):**
- **Target**: < 100ms latency for shape updates across users
- **Measurement**: Time from shape change to visibility on other users' screens
- **Implementation**: Optimized Firestore writes, throttled updates

**Cursor Update Latency (NFR-1.3):**
- **Target**: < 50ms latency for cursor position updates
- **Measurement**: Time from cursor move to visibility on other users' screens
- **Implementation**: RTDB for ephemeral cursor data, optimized update frequency

**BOM Generation Performance (NFR-1.4):**
- **Target**: < 30 seconds for typical project BOM generation
- **Measurement**: Time from AI prompt to complete BOM display
- **Implementation**: Parallel BOM and CPM generation, optimized AI API calls

**Price Fetch Performance (NFR-1.5):**
- **Target**: < 5 seconds per material (with caching)
- **Measurement**: Time from BOM generation to all prices displayed
- **Implementation**: Price caching (24-hour TTL), parallel price fetches, Cloud Function caching

### Security

**User Authentication Security (NFR-2.1):**
- **Requirement**: Secure Google OAuth implementation with proper token handling
- **Implementation**: Firebase Auth with Google OAuth, token validation, secure session management
- **Measurement**: Security audit, penetration testing

**Data Access Control (NFR-2.2):**
- **Requirement**: Firebase security rules enforce project-level access control
- **Implementation**: Firestore rules check `ownerId` and `collaborators` array, RTDB rules for presence/locks
- **Rules**: Authenticated users only, project access: Owner or collaborator, Write access: Owner or editor role, Read access: Owner, editor, or viewer role

**API Key Security (NFR-2.3):**
- **Requirement**: API keys stored securely in Firebase Functions (not exposed to client)
- **Implementation**: SerpAPI key and OpenAI API key stored as Firebase Functions secrets
- **Measurement**: Code review, security audit

### Reliability/Availability

**Price Integration Reliability (NFR-4.1):**
- **Target**: 90%+ success rate for price fetching (with graceful degradation)
- **Implementation**: Retry logic with exponential backoff, manual entry fallback, error handling
- **Measurement**: Monitor price fetch success rate, track failures

**Data Persistence Reliability (NFR-4.2):**
- **Target**: 99.9% data persistence reliability (Firebase SLA)
- **Implementation**: Firestore with automatic retries, offline queue for network failures
- **Measurement**: Monitor Firebase service health, track data loss incidents

**Offline Capability (NFR-4.3):**
- **Requirement**: Basic offline support for annotation (with sync on reconnect)
- **Implementation**: Local state persistence, offline queue, sync on reconnect, conflict resolution
- **Measurement**: Offline testing, sync verification

### Observability

**Logging Requirements:**
- **Format**: Structured logging with levels (DEBUG, INFO, WARN, ERROR)
- **Structure**: `{ level, message, context?, timestamp }`
- **Location**: Console in dev, Firebase Analytics/Logging in prod
- **Key Events**: Project CRUD, BOM generation, price fetches, errors

**Metrics Requirements:**
- **Performance Metrics**: Canvas FPS, sync latency, BOM generation time, price fetch time
- **Business Metrics**: Projects created, BOMs generated, price fetch success rate, user actions
- **Error Metrics**: Error rates by type, failed API calls, validation failures

**Tracing Requirements:**
- **User Actions**: Track user flows (project creation → scope upload → annotation → BOM generation)
- **API Calls**: Trace Cloud Function calls, external API calls (SerpAPI, OpenAI)
- **Performance**: Identify bottlenecks in BOM generation, price fetching, canvas rendering

## Dependencies and Integrations

**Core Dependencies:**
- **React**: ^19.2.0 - UI framework
- **TypeScript**: ~5.9.3 - Type safety
- **Vite**: ^7.1.7 - Build tool
- **React Router**: Latest stable - Client-side routing for four-view navigation
- **Konva**: ^10.0.2 - Canvas rendering
- **react-konva**: ^19.0.10 - React bindings for Konva
- **Zustand**: ^5.0.8 - State management
- **Tailwind CSS**: ^3.4.18 - Styling
- **Firebase**: ^12.4.0 - Backend platform
- **Firebase Auth**: ^12.4.0 - Authentication (Google OAuth)
- **Cloud Firestore**: ^12.4.0 - Persistent database
- **Realtime Database**: ^12.4.0 - Ephemeral real-time data (presence, cursors)
- **Cloud Functions**: ^4.8.0 - Serverless functions
- **Firebase Storage**: ^12.4.0 - File storage

**External API Integrations:**
- **SerpAPI**: Home Depot price fetching (via Cloud Function `getHomeDepotPrice`)
- **OpenAI API**: AI command processing and BOM/CPM generation (via Cloud Function `aiCommand`)

**Design System:**
- **shadcn/ui**: Component library (25 standard components) - Copy-paste components, not npm dependency
- **Radix UI**: Primitives used by shadcn/ui for accessibility

**PDF Export:**
- **jsPDF** or **react-pdf**: For estimate PDF export (to be determined during implementation)

**Version Constraints:**
- All Firebase packages must be same major version (^12.4.0) for compatibility
- React 19 requires compatible versions of react-konva and other React-dependent packages
- TypeScript ~5.9.3 for type checking compatibility

## Acceptance Criteria (Authoritative)

**Story 1.1: Critical Bug Fixes & Performance Optimization**

1. **Plan Deletion Persistence**: When a plan is deleted, it does not reappear after page reload
2. **Scale Deletion Persistence**: When a scale reference is deleted, it does not reappear after page reload
3. **Home Depot Price Integration**: When generating a BOM with common materials, Home Depot prices are fetched successfully for 90%+ of materials
4. **AI Shape Creation**: When using AI chat to create shapes (e.g., "add a red circle"), shapes are created successfully without errors
5. **Firefox Performance**: When annotating with 100+ objects on Firefox, canvas maintains 60 FPS performance matching Chrome performance
6. **Cross-Browser Performance**: When annotating with 100+ objects on any browser (Chrome, Firefox, Safari, Edge), canvas maintains consistent 60 FPS performance
7. **Object Culling**: When there are many objects on the canvas (100+), only visible objects are rendered
8. **Viewport Optimization**: When panning or zooming the canvas, only objects within the viewport are updated
9. **Batch Updates**: When multiple shape updates occur simultaneously, updates are batched together to reduce render calls

**Story 1.2: Home Page & Project Management System**

10. **Project List Display**: When viewing the home page, user sees a list of all projects with status indicators (Estimating, Bid Ready, Bid Lost, Executing, Completed Profitable, Completed Unprofitable, Completed - Unknown)
11. **Project Creation**: When clicking "New Project", user can create a project with name and description, and it appears in project list with status "Estimating"
12. **Project Navigation**: When clicking on a project, user enters the project and sees four-view navigation (Scope | Time | Space | Money)
13. **Status Update**: When changing a project's status on the home page, status updates immediately and persists
14. **Profit/Loss Calculation**: When marking a project "Completed Profitable" or "Completed Unprofitable", system automatically calculates profit/loss based on actual costs vs. estimate (if cost tracking provided)
15. **Unknown Status**: When marking a project complete without cost tracking, status becomes "Completed - Unknown"
16. **Search/Filter**: When searching or filtering projects, project list updates to show matching projects
17. **Project Deletion**: When deleting a project, user is asked for confirmation and project is permanently deleted
18. **Access Control**: When not logged in, user cannot access any projects and is redirected to login
19. **Project Sharing**: When sharing a project with another user as "Viewer", they can view but cannot modify; as "Editor", they can view and modify

**Story 1.3: Four-View Navigation & Scope View**

20. **Four-View Navigation**: When viewing a project, user sees top navigation bar with four tabs: Scope | Time | Space | Money
21. **Scope View**: When clicking on the Scope tab, user sees Scope view with CSV upload capability
22. **CSV Upload**: When uploading a CSV file with 2 columns (scope, description), scope content is parsed and displayed as structured content
23. **Tab Switching**: When switching between tabs (Scope, Time, Space, Money), view changes smoothly and current view is highlighted
24. **View Indicators**: When content is generated (BOM in Money, CPM in Time), corresponding tab shows an indicator badge
25. **Indicator Dismissal**: When clicking on a tab with an indicator, indicator disappears and user sees generated content
26. **Presence Indicators**: When other users are viewing the same project, user sees presence indicators showing who is in each view/tab
27. **Real-time Sync**: When making changes in any view, changes sync in real-time across all views for all users

**Story 1.4: Money View with BOM, Pricing, Margin Calculation & AI Chat Integration**

28. **AI Chat Availability**: AI chat is available in all views (Scope, Time, Space, Money)
29. **Pre-flight Validation**: When opening AI chat and requesting BOM/Critical Path generation, AI guides user through pre-flight checks with clarifying questions
30. **Validation Blocking**: When AI detects missing required information (scale, layers, annotations), AI refuses to generate and asks user to complete missing items
31. **Parallel Generation**: When all required information is complete, AI generates both BOM and Critical Path simultaneously in parallel
32. **Price Fetching**: When BOM is generated, system automatically fetches Home Depot prices for each material (90%+ success rate)
33. **Price Failure Handling**: When price fetch fails for a material, system shows "Price unavailable" with manual entry option
34. **BOM Completion Blocking**: When prices are not entered for all materials (fetched or manual), BOM completion is blocked until all prices are entered
35. **Customer View**: When all prices are complete, user can view estimate in Customer View (material + labor totals + included margin)
36. **Contractor View**: When all prices are complete, user can view estimate in Contractor View (labor, materials, and margin separate)
37. **BOM Modification**: When modifying the BOM, changes reflect immediately in both views
38. **PDF Export**: When exporting the estimate, user can choose to export Customer View or Contractor View as PDF
39. **Actual Cost Input**: When wanting to track actual costs (voluntary), user can input actual cost per material line item in Money view
40. **Actual Cost Persistence**: When saving actual costs, they persist across sessions and can be edited later
41. **Variance Calculation**: When viewing estimate vs. actual comparison, variance percentage is calculated and displayed per line item and total variance is displayed
42. **Variance Highlighting**: When variance exists, over-estimates and under-estimates are visually highlighted

## Traceability Mapping

| AC | Spec Section | Component(s)/API(s) | Test Idea |
|----|--------------|---------------------|-----------|
| AC 1-9 | Story 1.1 | `firestore.ts`, `Canvas.tsx`, `pricingService.ts`, `aiService.ts` | E2E: Delete plan, reload, verify gone. E2E: Generate BOM, verify 90%+ prices fetched. E2E: AI chat "add red circle", verify shape created. Performance: 100+ objects, measure FPS across browsers |
| AC 10-19 | Story 1.2 | `projectService.ts`, `projectStore.ts`, `pages/Dashboard.tsx` | E2E: Create project, verify appears. E2E: Change status, reload, verify persists. E2E: Share project, verify access control. Unit: Profit/loss calculation logic |
| AC 20-27 | Story 1.3 | React Router, `scopeService.ts`, `scopeStore.ts`, RTDB presence | E2E: Upload CSV, verify parsed. E2E: Switch views, verify navigation. E2E: Multiple users, verify presence indicators. Integration: Real-time sync across views |
| AC 28-42 | Story 1.4 | `aiService.ts`, `bomService.ts`, `pricingService.ts`, `components/money/MoneyView.tsx` | E2E: AI chat pre-flight validation. E2E: Generate BOM, verify prices fetched. E2E: Enter actual costs, verify variance calculation. Unit: Margin calculation logic. Integration: PDF export |

## Risks, Assumptions, Open Questions

**Risks:**

1. **Firefox Performance Risk**: Firefox performance degradation may require browser-specific optimizations beyond standard object culling/viewport optimization. **Mitigation**: Profile Firefox rendering, implement browser-specific optimizations if needed, extensive cross-browser testing.

2. **Price API Reliability Risk**: SerpAPI may not achieve 90%+ success rate for all materials, impacting core value proposition. **Mitigation**: Implement robust retry logic, manual entry fallback, cache prices aggressively, monitor success rates.

3. **AI Generation Accuracy Risk**: AI-generated BOMs may contain inaccuracies that require significant manual correction, reducing time savings. **Mitigation**: Pre-flight validation ensures required inputs, AI asks clarifying questions, BOM is editable after generation.

4. **Real-time Sync Complexity Risk**: Four-view navigation with real-time sync may introduce race conditions or performance issues. **Mitigation**: Use Firestore for persistent data, RTDB for ephemeral presence, implement proper conflict resolution.

5. **Project Management Scalability Risk**: Large number of projects per user may cause performance issues in dashboard. **Mitigation**: Implement pagination, virtual scrolling, efficient Firestore queries with indexes.

**Assumptions:**

1. **Firebase Availability**: Assuming Firebase services maintain 99.9% uptime SLA
2. **API Rate Limits**: Assuming SerpAPI and OpenAI API rate limits are sufficient for expected usage
3. **Browser Support**: Assuming users primarily use Chrome, Firefox, Safari, or Edge (latest 2 versions)
4. **User Behavior**: Assuming contractors will use the tool primarily on desktop/laptop (not mobile annotation)
5. **Data Volume**: Assuming typical projects have < 200 annotations, < 50 BOM items

**Open Questions:**

1. **PDF Export Library**: Should we use jsPDF or react-pdf for PDF export? **Decision Needed**: Evaluate both libraries for React 19 compatibility, bundle size, feature set.

2. **CPM Visualization Library**: What library should we use for CPM graph visualization? **Decision Needed**: Evaluate D3.js, vis.js, or custom solution for interactive CPM graph.

3. **Price Caching Strategy**: Should price cache be per-user or global? **Decision Needed**: Consider privacy, accuracy, API costs.

4. **Offline Support Scope**: How much offline functionality is needed for MVP? **Decision Needed**: Define offline capabilities (annotation only? BOM viewing?).

5. **Error Recovery**: How should we handle partial BOM generation failures? **Decision Needed**: Define retry strategy, partial success handling.

## Test Strategy Summary

**Test Levels:**

1. **Unit Tests**: Service layer functions (projectService, scopeService, bomService, cpmService), utility functions, calculation logic (margin, variance)
2. **Integration Tests**: Firebase service integration, Cloud Function integration, real-time sync across views
3. **E2E Tests**: Complete user flows (project creation → scope upload → annotation → BOM generation → export), cross-browser testing
4. **Performance Tests**: Canvas FPS with 100+ objects, BOM generation time, price fetch time, sync latency

**Test Coverage Targets:**

- **Unit Tests**: 80%+ coverage for service layer, 90%+ for calculation logic
- **Integration Tests**: All Firebase operations, all Cloud Function calls
- **E2E Tests**: All critical user flows, all acceptance criteria
- **Performance Tests**: All NFR targets validated

**Critical Paths to Test:**

1. **Project Creation → BOM Generation → Export**: Complete estimation workflow
2. **Multi-user Collaboration**: Real-time sync across views, presence tracking
3. **Error Scenarios**: Price fetch failures, AI generation failures, network failures
4. **Cross-browser**: All critical flows on Chrome, Firefox, Safari, Edge

**Test Frameworks:**

- **Unit/Integration**: Vitest (already in use)
- **E2E**: Playwright (already in use)
- **Performance**: Playwright performance tests, browser DevTools profiling

**Test Data:**

- **Test Projects**: Create test projects with various annotation counts (10, 50, 100+ objects)
- **Test Materials**: Common residential remodeling materials for price testing
- **Test Scenarios**: Various project types (bathroom remodel, kitchen remodel, whole house)

