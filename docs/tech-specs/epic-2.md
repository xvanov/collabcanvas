# Epic Technical Specification: Phase 2 - Advanced Annotation Tools & Multi-Floor Support

Date: 2025-01-27
Author: xvanov
Epic ID: 2
Status: Draft

---

## Overview

Epic 2 extends CollabCanvas with advanced annotation capabilities and multi-floor project support, building on the MVP foundation established in Epic 1. This epic introduces the counter tool for fixture counting and enables contractors to manage multi-story projects with floor-specific annotations and aggregated estimates. The epic addresses the need for accurate fixture counting (sinks, outlets, fixtures) and supports complex projects spanning multiple floors, which is common in residential remodeling work.

The epic focuses on two key enhancements: (1) a counter tool that allows contractors to mark and count instances of fixtures and other countable items, and (2) multi-floor support that enables contractors to add multiple floor plans to a single project, switch between floors, and aggregate BOMs across all floors for complete project estimates. These features are essential for accurate estimation of multi-story projects and reduce manual counting errors.

## Objectives and Scope

**In-Scope:**

- **Project Isolation (Story 2.1)**
  - Refactor Firestore data structure to store shapes, layers, and board state per project
  - Change shapes collection path from `/boards/global/shapes` to `/projects/{projectId}/shapes`
  - Change layers collection path from `/boards/global/layers` to `/projects/{projectId}/layers`
  - Change board document path from `/boards/global` to `/projects/{projectId}/board`
  - Update all services, hooks, and components to accept and use `projectId` parameter
  - Ensure proper subscription cleanup to prevent infinite loops and data leakage
  - Handle migration of existing data from global board to project-scoped collections

- **Counter Tool (Story 2.2)**
  - New annotation tool type: Counter (dot marker)
  - Click-to-place counter dots on fixtures, outlets, sinks, toilets, etc.
  - Store counter dots in Firestore with layer assignment
  - Display counter totals in LayerPanel component per layer
  - Counter dots are selectable, movable, and deletable like other shapes
  - Counter dots integrated with existing layer management system

- **Multi-Floor Project Support (Story 2.3)**
  - Add floors array to project document in Firestore
  - Floor creation: Upload floor plan image and name (e.g., "First Floor", "Second Floor")
  - Floor selector interface in Space view (dropdown/tabs)
  - Floor switching: Canvas shows selected floor's plan and annotations
  - Floor-specific annotations: Store annotations with floor ID
  - Aggregated BOM generation: Sum measurements across all floors
  - Layer totals: View totals per floor or aggregated across all floors

**Out-of-Scope:**

- Multi-supplier cost optimization (Epic 4)
- Advanced labor hours calculation (Epic 3)
- ML-based accuracy enhancement (Epic 5)
- AI annotation assistant (Epic 6)
- Multi-scenario support (Epic 4.5)
- Commercial construction support (Epic 7)

## System Architecture Alignment

Epic 2 builds on the React 19 SPA architecture with Firebase BaaS, extending the project-scoped data model established in Epic 1. The implementation aligns with:

- **Data Architecture**: Project-scoped Firestore collections (`/projects/{projectId}/shapes`, `/projects/{projectId}/layers`, `/projects/{projectId}/board`) replacing the global board structure
- **State Management**: Extend `canvasStore.ts` to support counter tool and floor switching state
- **Component Architecture**: Extend `components/canvas/` with counter tool component, floor selector component
- **Service Layer**: Refactor `services/firestore.ts` to accept `projectId` parameter in all functions, add floor management to `projectService.ts`
- **Real-time Collaboration**: Preserve existing real-time sync for shapes and layers, extend to floor-specific presence if needed
- **Performance**: Counter tool and multi-floor support must maintain 60 FPS canvas performance with 100+ objects

The architecture supports Epic 2's requirements through project isolation (foundation for multi-project support), counter tool integration (new shape type in existing canvas system), and multi-floor data model (extend project document with floors array).

## Detailed Design

### Services and Modules

| Service/Module | Responsibility | Inputs | Outputs | Owner |
|----------------|----------------|--------|---------|-------|
| **firestore.ts (refactored)** | Project-scoped shape, layer, and board operations | projectId, shape/layer/board data | Shape/layer/board documents | Canvas/Annotation |
| **projectService.ts (extended)** | Floor management (create, update, delete, switch) | projectId, floor data (name, image) | Floor objects, floors array | Project Management |
| **canvasStore.ts (extended)** | Counter tool state, floor switching state, active floor | Counter tool selection, floor selection | Counter tool active flag, current floor ID | Space View |
| **CounterTool.tsx** | Counter dot placement and rendering | Canvas click events, layer assignment | Counter dot shapes | Canvas Components |
| **FloorSelector.tsx** | Floor selection interface (dropdown/tabs) | Floors array, current floor ID | Floor selection events | Space View Components |

**Key Changes:**
- `firestore.ts`: All functions now require `projectId` parameter; collection paths changed from `/boards/global/*` to `/projects/{projectId}/*`
- `projectService.ts`: Add `createFloor(projectId, floorData)`, `updateFloor(projectId, floorId, updates)`, `deleteFloor(projectId, floorId)`, `getFloors(projectId)`, `switchFloor(projectId, floorId)`
- `canvasStore.ts`: Add `activeTool: 'counter'`, `currentFloorId: string | null`, `floors: Floor[]` state; add actions for counter tool and floor switching
- New component: `CounterTool.tsx` - handles counter dot placement, similar to `PolylineTool.tsx` and `PolygonTool.tsx`
- New component: `FloorSelector.tsx` - floor selection UI in Space view toolbar

### Data Models and Contracts

**Firestore Collections (Refactored for Project Isolation):**

**Shapes Collection:**
```
/projects/{projectId}/shapes/{shapeId}
  - id: string
  - type: ShapeType ('rect' | 'circle' | 'text' | 'line' | 'polyline' | 'polygon' | 'counter')
  - x: number
  - y: number
  - w: number
  - h: number
  - color: string
  - layerId?: string
  - floorId?: string (NEW - for multi-floor support)
  - createdAt: serverTimestamp
  - createdBy: string
  - updatedAt: serverTimestamp
  - updatedBy: string
  - clientUpdatedAt: number
  // Type-specific properties
  - points?: number[] (for polyline, polygon)
  - radius?: number (for circle, counter)
  - text?: string (for text)
```

**Layers Collection:**
```
/projects/{projectId}/layers/{layerId}
  - id: string
  - name: string
  - shapes: string[] (array of shape IDs)
  - visible: boolean
  - locked: boolean
  - order: number
  - color?: string
  - floorId?: string (NEW - for multi-floor support)
  - createdAt: serverTimestamp
  - createdBy: string
  - updatedAt: serverTimestamp
  - updatedBy: string
  - clientUpdatedAt: number
```

**Board Document:**
```
/projects/{projectId}/board
  - activeLayerId: string
  - currentFloorId?: string (NEW - currently active floor)
  - updatedAt: serverTimestamp
  - updatedBy: string
  - backgroundImage?: {
      url: string
      width: number
      height: number
      uploadedAt: serverTimestamp
      uploadedBy: string
      floorId?: string (NEW - floor-specific background images)
    }
  - scaleLine?: {
      id: string
      startX: number
      startY: number
      endX: number
      endY: number
      realWorldLength: number
      unit: string
      isVisible: boolean
      floorId?: string (NEW - floor-specific scale lines)
      createdAt: serverTimestamp
      createdBy: string
      updatedAt: serverTimestamp
      updatedBy: string
    }
```

**Project Document (Extended for Multi-Floor):**
```
/projects/{projectId}
  - name: string
  - description: string
  - status: string
  - ownerId: string
  - collaborators: Array<{userId: string, role: 'editor' | 'viewer'}>
  - floors: Array<{ (NEW)
      id: string
      name: string (e.g., "First Floor", "Second Floor")
      imageUrl?: string (Firebase Storage URL)
      imageWidth?: number
      imageHeight?: number
      order: number (display order)
      createdAt: serverTimestamp
      createdBy: string
    }>
  - createdAt: serverTimestamp
  - updatedAt: serverTimestamp
```

**TypeScript Types:**

```typescript
// Extended ShapeType to include counter
export type ShapeType = 'rect' | 'circle' | 'text' | 'line' | 'polyline' | 'polygon' | 'counter';

// Extended Shape interface
export interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  layerId?: string;
  floorId?: string; // NEW
  // ... other properties
  radius?: number; // For counter dots
}

// New Floor interface
export interface Floor {
  id: string;
  name: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  order: number;
  createdAt: number;
  createdBy: string;
}
```

### APIs and Interfaces

**Service Layer APIs:**

**Firestore Service (Refactored):**
```typescript
// All functions now require projectId
createShape(projectId: string, shapeId: string, shapeType: ShapeType, x: number, y: number, userId: string, layerId?: string, floorId?: string): Promise<void>
updateShape(projectId: string, shapeId: string, updates: Partial<Shape>, userId: string): Promise<void>
deleteShape(projectId: string, shapeId: string): Promise<void>
subscribeToShapes(projectId: string, callback: (shapes: Shape[]) => void): Unsubscribe
subscribeToLayers(projectId: string, callback: (layers: Layer[]) => void): Unsubscribe
getBoardState(projectId: string): Promise<BoardState>
updateBoardState(projectId: string, updates: Partial<BoardState>, userId: string): Promise<void>
```

**Project Service (Extended):**
```typescript
// Existing functions (from Epic 1)
createProject(name: string, description: string): Promise<Project>
getProject(projectId: string): Promise<Project>
updateProject(projectId: string, updates: Partial<Project>): Promise<void>
deleteProject(projectId: string): Promise<void>
getUserProjects(userId: string): Promise<Project[]>

// NEW: Floor management functions
createFloor(projectId: string, floorData: {name: string, imageFile?: File, order: number}): Promise<Floor>
updateFloor(projectId: string, floorId: string, updates: Partial<Floor>): Promise<void>
deleteFloor(projectId: string, floorId: string): Promise<void>
getFloors(projectId: string): Promise<Floor[]>
switchFloor(projectId: string, floorId: string): Promise<void>
```

**Canvas Store (Extended):**
```typescript
interface CanvasStore {
  // Existing state
  activeTool: ToolType;
  shapes: Map<string, Shape>;
  layers: Map<string, Layer>;
  // NEW state
  currentFloorId: string | null;
  floors: Floor[];
  
  // Existing actions
  setActiveTool(tool: ToolType): void;
  // NEW actions
  setCurrentFloor(floorId: string | null): void;
  loadFloors(projectId: string): Promise<void>;
  createCounterDot(x: number, y: number, layerId?: string, floorId?: string): void;
}
```

### Workflows and Sequencing

**Story 2.1: Project Isolation Workflow**

1. **Refactor Firestore Service**
   - Update `firestore.ts` to accept `projectId` parameter in all functions
   - Change collection paths from `/boards/global/*` to `/projects/{projectId}/*`
   - Update `useShapes` and `useLayers` hooks to accept `projectId` and pass to service functions
   - Ensure proper subscription cleanup (unsubscribe on component unmount or project change)

2. **Update Components**
   - Update all canvas components to receive `projectId` from route params or props
   - Pass `projectId` to hooks and service functions
   - Test project isolation: Create shape in Project A, verify it doesn't appear in Project B

3. **Data Migration (if needed)**
   - If existing data exists in `/boards/global/*`, create migration script
   - Migrate shapes, layers, and board state to project-scoped collections
   - Assign migrated data to a default project or user's first project

**Story 2.2: Counter Tool Workflow**

1. **Add Counter Tool Type**
   - Extend `ShapeType` to include `'counter'`
   - Update `Shape` interface to support counter-specific properties (radius for dot size)

2. **Create CounterTool Component**
   - Similar to `PolylineTool.tsx` and `PolygonTool.tsx`
   - On canvas click, create counter dot shape at click position
   - Assign counter dot to active layer (if layer selected)

3. **Update LayerPanel**
   - Add counter count display per layer
   - Calculate count: `shapes.filter(s => s.type === 'counter' && s.layerId === layerId).length`
   - Display count in layer totals section

4. **Counter Dot Behavior**
   - Counter dots are selectable, movable, deletable like other shapes
   - Counter dots respect layer visibility and locking
   - Counter dots included in layer totals calculation

**Story 2.3: Multi-Floor Support Workflow**

1. **Extend Project Data Model**
   - Add `floors` array to project document in Firestore
   - Update `Project` TypeScript interface

2. **Floor Creation**
   - User clicks "Add Floor" in Space view
   - Modal/form: Enter floor name, upload floor plan image (optional)
   - Create floor document in project's `floors` array
   - Upload floor plan image to Firebase Storage if provided
   - Store image URL in floor document

3. **Floor Selector UI**
   - Add `FloorSelector` component to Space view toolbar
   - Display floors as dropdown or tabs
   - Show current floor name/indicator
   - Allow switching between floors

4. **Floor Switching**
   - On floor selection, update `currentFloorId` in canvas store
   - Filter shapes and layers by `floorId` (show only shapes/layers for current floor)
   - Load floor-specific background image if exists
   - Load floor-specific scale line if exists
   - Update canvas to show selected floor's annotations

5. **Floor-Specific Annotations**
   - When creating shapes/layers, assign `floorId` from current floor
   - Store annotations with `floorId` field
   - Filter annotations by `floorId` when displaying

6. **Aggregated BOM Generation**
   - When generating BOM, aggregate measurements across all floors
   - Sum wall lengths, areas, counter counts from all floors
   - Include floor breakdown in BOM display (optional: show per-floor totals)

7. **Layer Totals per Floor**
   - Update LayerPanel to show totals per floor or aggregated
   - Add toggle: "Show per floor" vs "Show aggregated"
   - Calculate totals: Filter shapes by `floorId` and `layerId` for per-floor view

## Non-Functional Requirements

### Performance

- **Canvas Performance**: Maintain 60 FPS with 100+ objects across all browsers (Chrome, Firefox, Safari, Edge) - Epic 2 features must not degrade performance
- **Counter Tool Performance**: Counter dot placement and rendering must be instant (< 50ms) with no lag
- **Multi-Floor Switching**: Floor switching must complete in < 200ms (load floor-specific shapes, layers, background image)
- **Subscription Performance**: Project-scoped subscriptions must not cause performance degradation; proper cleanup prevents memory leaks
- **BOM Aggregation**: Aggregating measurements across multiple floors must complete in < 1 second for projects with 5+ floors and 100+ shapes per floor
- **Layer Totals Calculation**: Counter count calculation per layer must be efficient (O(n) where n = shapes in layer), no noticeable lag when displaying layer totals

**Performance Targets:**
- Counter dot placement: < 50ms
- Floor switching: < 200ms
- BOM aggregation (5 floors, 100 shapes/floor): < 1 second
- Layer totals calculation: < 100ms

### Security

- **Project Isolation**: Firestore security rules must enforce project-level access control - users can only access shapes, layers, and board state for projects they own or are invited to
- **Floor Access Control**: Floor creation, update, delete operations must respect project permissions (owner or editor role required)
- **Data Validation**: All floor data (name, image) must be validated client-side and server-side (Firestore rules)
- **Image Upload Security**: Floor plan image uploads must be validated (file type, size limits) and stored securely in Firebase Storage with project-scoped paths
- **Subscription Security**: Real-time subscriptions must only receive data for projects the user has access to (enforced by Firestore security rules)

**Security Rules Updates Required:**
- Update Firestore rules to allow read/write access to `/projects/{projectId}/shapes`, `/projects/{projectId}/layers`, `/projects/{projectId}/board` only for project owners/collaborators
- Update Storage rules to allow floor plan image uploads to project-scoped paths: `/projects/{projectId}/floors/{floorId}/image`

### Reliability/Availability

- **Project Isolation Reliability**: Project-scoped data must remain isolated - no data leakage between projects under any conditions (network errors, race conditions, etc.)
- **Subscription Cleanup**: Proper cleanup of Firestore subscriptions when switching projects or unmounting components - prevent memory leaks and infinite re-render loops
- **Floor Switching Reliability**: Floor switching must handle edge cases gracefully (missing floor data, network errors, invalid floor IDs)
- **Counter Tool Reliability**: Counter dots must persist correctly across page reloads and real-time sync updates
- **Data Migration**: If migrating existing global board data, migration must be idempotent and handle partial failures gracefully
- **Offline Support**: Counter tool and floor switching should work offline with sync on reconnect (extend existing offline support from Epic 1)

**Availability Targets:**
- Project isolation: 100% data isolation (no cross-project data leakage)
- Subscription cleanup: 100% cleanup rate (no memory leaks)
- Floor switching success rate: 99%+ (handle network errors gracefully)

### Observability

- **Logging**: Log all project-scoped operations (shape creation, floor creation, floor switching) with projectId context for debugging
- **Error Tracking**: Track errors related to project isolation (subscription failures, data leakage, migration issues)
- **Performance Monitoring**: Monitor floor switching latency, counter tool performance, BOM aggregation time
- **Usage Metrics**: Track counter tool usage (number of counter dots created per project), multi-floor project adoption (percentage of projects with multiple floors)

**Logging Requirements:**
- Log level: INFO for project operations, WARN for subscription cleanup issues, ERROR for data isolation failures
- Log context: Include projectId, userId, floorId (if applicable) in all logs
- Metrics: Track counter dots created, floors per project, floor switching frequency

## Dependencies and Integrations

**Existing Dependencies (from Epic 1):**
- React 19.2.0 - UI framework
- TypeScript ~5.9.3 - Type safety
- Firebase ^12.4.0 - Backend platform (Firestore, Storage, Auth)
- Konva ^10.0.2 - Canvas rendering
- react-konva ^19.0.10 - React bindings for Konva
- Zustand ^5.0.8 - State management
- React Router ^7.9.5 - Client-side routing

**No New Dependencies Required:**
- Counter tool uses existing Konva/react-konva infrastructure
- Multi-floor support uses existing Firebase Firestore and Storage
- Project isolation refactoring uses existing Firebase services

**Integration Points:**
- **Firestore**: Project-scoped collections (`/projects/{projectId}/shapes`, `/projects/{projectId}/layers`, `/projects/{projectId}/board`)
- **Firebase Storage**: Floor plan image storage (`/projects/{projectId}/floors/{floorId}/image`)
- **React Router**: Project ID from route params (`/projects/:projectId/space`)
- **Zustand Stores**: Extended `canvasStore.ts` for counter tool and floor state
- **Existing Canvas Components**: Counter tool integrates with existing `Canvas.tsx`, `Shape.tsx` components

**Breaking Changes:**
- Firestore collection paths change from `/boards/global/*` to `/projects/{projectId}/*` (requires refactoring)
- All `firestore.ts` service functions now require `projectId` parameter (breaking API change)
- `useShapes` and `useLayers` hooks now require `projectId` parameter (breaking hook API change)

## Acceptance Criteria (Authoritative)

**Story 2.1: Project Isolation - Canvas, BOM, and Views Per Project**

1. **Given** I have multiple projects  
   **When** I create a shape in Project A's Space view  
   **Then** The shape is stored in Firestore at `/projects/{projectId}/shapes/{shapeId}` and does not appear in Project B

2. **Given** I have multiple projects  
   **When** I create a layer in Project A's Space view  
   **Then** The layer is stored in Firestore at `/projects/{projectId}/layers/{layerId}` and does not appear in Project B

3. **Given** I have multiple projects  
   **When** I upload a background image or create a scale line in Project A's Space view  
   **Then** The board state is stored in Firestore at `/projects/{projectId}/board` and does not affect Project B

4. **Given** I am viewing Project A  
   **When** I switch to Project B  
   **Then** All Firestore subscriptions for Project A are properly cleaned up and new subscriptions for Project B are established

5. **Given** I am working in a project  
   **When** I create, update, or delete shapes  
   **Then** No infinite re-render loops occur and subscriptions do not trigger cascading updates

**Story 2.2: Counter Tool for Fixture Counting**

6. **Given** I am in Space view with a project open  
   **When** I select the counter tool  
   **Then** I can click on the canvas to place counter dots

7. **Given** I have selected the counter tool  
   **When** I place counter dots on fixtures (sinks, toilets, outlets, etc.)  
   **Then** Each dot is counted and displayed in the layer totals

8. **Given** I have placed counter dots on multiple layers  
   **When** I view layer totals  
   **Then** I see total count of counter dots per layer

9. **Given** I have counter dots assigned to different layers  
   **When** I view layer totals  
   **Then** Counts are tracked separately per layer

10. **Given** I have placed counter dots  
    **When** I select, move, or delete counter dots  
    **Then** Counter dots behave like other shapes (selectable, movable, deletable)

**Story 2.3: Multi-Floor Project Support**

11. **Given** I have a project open  
    **When** I am in Space view  
    **Then** I see a floor selector interface

12. **Given** I am in Space view  
    **When** I add a new floor plan  
    **Then** I can upload a floor plan image and name it (e.g., "First Floor", "Second Floor")

13. **Given** I have multiple floors in a project  
    **When** I switch between floors  
    **Then** The canvas shows the selected floor's plan and annotations

14. **Given** I have multiple floors  
    **When** I annotate on different floors  
    **Then** Annotations are stored separately per floor (shapes have `floorId` field)

15. **Given** I have annotations on multiple floors  
    **When** I generate a BOM  
    **Then** System aggregates measurements across all floors for complete project estimate

16. **Given** I have annotations on multiple floors  
    **When** I view layer totals  
    **Then** I can see totals per floor or aggregated across all floors

## Traceability Mapping

| AC # | Acceptance Criteria | Spec Section | Component/API | Test Idea |
|------|-------------------|--------------|---------------|-----------|
| 1 | Shape isolation per project | Data Models (Shapes Collection) | `firestore.ts::createShape(projectId, ...)` | Create shape in Project A, verify not in Project B |
| 2 | Layer isolation per project | Data Models (Layers Collection) | `firestore.ts::createLayer(projectId, ...)` | Create layer in Project A, verify not in Project B |
| 3 | Board state isolation per project | Data Models (Board Document) | `firestore.ts::updateBoardState(projectId, ...)` | Upload image in Project A, verify not in Project B |
| 4 | Subscription cleanup on project switch | Workflows (Project Isolation) | `useShapes(projectId)`, `useLayers(projectId)` | Switch projects, verify old subscriptions cleaned up |
| 5 | No infinite re-render loops | Workflows (Project Isolation) | All canvas components | Create/update shapes, verify no render loops |
| 6 | Counter tool placement | Workflows (Counter Tool) | `CounterTool.tsx` | Select counter tool, click canvas, verify dot created |
| 7 | Counter dots in layer totals | Workflows (Counter Tool) | `LayerPanel.tsx` | Place counter dots, verify count in layer totals |
| 8 | Counter count per layer | Workflows (Counter Tool) | `LayerPanel.tsx` | Place dots on different layers, verify separate counts |
| 9 | Counter dots on different layers | Workflows (Counter Tool) | `firestore.ts`, `LayerPanel.tsx` | Assign dots to layers, verify layer-specific counts |
| 10 | Counter dots selectable/movable/deletable | Workflows (Counter Tool) | `Shape.tsx`, `Canvas.tsx` | Select, move, delete counter dots, verify behavior |
| 11 | Floor selector interface | Workflows (Multi-Floor) | `FloorSelector.tsx` | Open Space view, verify floor selector visible |
| 12 | Floor creation with image | Workflows (Multi-Floor) | `projectService.ts::createFloor()` | Add floor, upload image, verify floor created |
| 13 | Floor switching | Workflows (Multi-Floor) | `canvasStore.ts::setCurrentFloor()` | Switch floors, verify canvas updates |
| 14 | Floor-specific annotations | Data Models (Shapes Collection) | `firestore.ts::createShape(..., floorId)` | Annotate on different floors, verify `floorId` stored |
| 15 | Aggregated BOM across floors | Workflows (Multi-Floor) | `bomService.ts::generateBOM()` | Generate BOM with multi-floor project, verify aggregation |
| 16 | Layer totals per floor or aggregated | Workflows (Multi-Floor) | `LayerPanel.tsx` | View layer totals, toggle per-floor/aggregated view |

## Risks, Assumptions, Open Questions

**Risks:**

1. **Data Migration Risk**: If existing data exists in `/boards/global/*`, migration to project-scoped collections could be complex and error-prone
   - **Mitigation**: Create comprehensive migration script with rollback capability, test migration on staging data first, provide manual migration option for users

2. **Subscription Cleanup Risk**: Improper cleanup of Firestore subscriptions when switching projects could cause memory leaks and infinite re-render loops
   - **Mitigation**: Implement strict subscription cleanup in hooks (unsubscribe on unmount, project change), add React DevTools profiling to detect leaks, write tests for subscription cleanup

3. **Performance Risk**: Multi-floor support with many floors and shapes per floor could degrade canvas performance below 60 FPS
   - **Mitigation**: Implement efficient filtering by `floorId` (index shapes by floorId), lazy load floor data, optimize BOM aggregation algorithm

4. **Data Isolation Risk**: Race conditions or bugs in project-scoped data access could cause data leakage between projects
   - **Mitigation**: Comprehensive testing of project isolation, Firestore security rules enforcement, code review focused on projectId usage

**Assumptions:**

1. **Existing Data**: Assume existing data in `/boards/global/*` can be migrated to project-scoped collections (may need to assign to default project)
2. **Floor Limit**: Assume projects will have reasonable number of floors (1-10 floors typical, support up to 20 floors)
3. **Counter Tool Usage**: Assume counter tool will be used primarily for fixtures (sinks, outlets, toilets) - simple dot markers sufficient
4. **Floor Images**: Assume floor plan images are optional (projects can have floors without images)

**Open Questions:**

1. **Floor Ordering**: Should floors have a default order (alphabetical, creation date) or user-defined order?
   - **Decision Needed**: Recommend user-defined order with drag-and-drop reordering (can be simplified to manual order input for MVP)

2. **Floor Deletion**: What happens to annotations when a floor is deleted? Should deletion be allowed if floor has annotations?
   - **Decision Needed**: Recommend blocking deletion if floor has annotations, or require user confirmation with option to delete annotations

3. **Counter Dot Appearance**: Should counter dots have different visual appearance (size, color) than regular circles?
   - **Decision Needed**: Recommend distinct appearance (smaller, different default color) to differentiate from regular circles

4. **BOM Floor Breakdown**: Should BOM display show per-floor breakdown or only aggregated totals?
   - **Decision Needed**: Recommend both options - default to aggregated, optional toggle to show per-floor breakdown

## Test Strategy Summary

**Test Levels:**

1. **Unit Tests**
   - Test `firestore.ts` service functions with `projectId` parameter
   - Test `projectService.ts` floor management functions
   - Test `canvasStore.ts` counter tool and floor switching actions
   - Test counter count calculation logic in `LayerPanel.tsx`
   - Test BOM aggregation across floors

2. **Integration Tests**
   - Test project isolation: Create shapes in Project A, verify isolation in Project B
   - Test subscription cleanup: Switch projects, verify old subscriptions cleaned up
   - Test counter tool: Place dots, verify persistence and layer totals
   - Test floor switching: Switch floors, verify annotations filtered correctly
   - Test BOM generation: Generate BOM with multi-floor project, verify aggregation

3. **E2E Tests (Playwright)**
   - Test complete workflow: Create project → Add floors → Annotate on different floors → Generate BOM → Verify aggregation
   - Test counter tool workflow: Select counter tool → Place dots → Verify layer totals
   - Test project isolation: Create shapes in multiple projects → Verify no cross-project data leakage

**Test Coverage Targets:**
- Unit tests: 80%+ coverage for new/modified service functions
- Integration tests: All acceptance criteria covered
- E2E tests: Critical user workflows (project isolation, counter tool, multi-floor BOM)

**Edge Cases to Test:**
- Project switching with active subscriptions
- Floor deletion with existing annotations
- Counter dots on locked/invisible layers
- BOM generation with empty floors
- Floor switching during active annotation
- Network errors during floor creation/switching
- Subscription failures and recovery

