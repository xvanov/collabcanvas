# CollabCanvas – MVP Product Requirements Document (PRD)

> **Goal**: Build a minimal, real-time collaborative canvas (Figma-style) using **Firebase** as the backend.

## 1) Problem & Goals

**Problem**: Users need a simple, real-time shared canvas to create and move shapes together without lag or sync conflicts.

**Goals**

* Single shared board accessible to all authenticated users
* Real-time collaborative canvas with shape locking
* Create and move shapes (rectangles only for MVP)
* No shape editing - only creation and movement
* Show presence and cursors for active users
* Simple authentication (no user roles or permissions)
* Persistent board state
* High performance: 60 FPS, sub-100ms sync, 500+ objects, 5+ concurrent users

**Non-Goals**

* Multiple boards or board management
* Shape deletion (MVP only supports creation and movement)
* Advanced vector tools, images, comments, or prototyping
* AI assistant (future expansion)
* Complex permission systems or versioning

## 2) Users & Scenarios

**Primary User**: Any authenticated user accessing the single shared board.

**User Model**: All users have equal access and permissions. No ownership or admin roles.

**Key Scenarios**

1. Log in with Google and immediately access the shared board
2. View active users and their cursors in real-time
3. Click "Create Rectangle" button to create a new rectangle at a default position
4. Click a shape to select and lock it (prevents others from moving it simultaneously)
5. Drag locked shapes to new positions with smooth, real-time updates
6. Shape movements appear to all users in < 100ms
7. Cursor positions update in < 50ms
8. Release shape (mouse up) to unlock it for others
9. Refresh or reconnect and continue seamlessly with persisted state

## 3) Success Criteria

**Performance Requirements**
* Maintain 60 FPS during all interactions (pan, zoom, drag)
* Sync shape changes across users in < 100ms
* Sync cursor positions across users in < 50ms
* Support 500+ simple objects without FPS drops
* Support 5+ concurrent users without performance degradation

**Functional Requirements**
* Real-time shape position updates between users
* Shape locking prevents simultaneous movement conflicts
* Data persists and reloads correctly after refresh
* Multiple users can create and move shapes together without conflicts

## 4) Functional Requirements

* **Authentication**: Firebase Auth (Google Sign-In) - all users have equal access
* **Board Access**: Single global board, no board discovery or creation needed
* **Canvas Bounds**: Viewport-sized bounded canvas (no infinite canvas)
* **Canvas Controls**: Pan and zoom with 60 FPS performance
* **Presence**: Real-time Database (RTDB) for active user tracking and cursor positions
* **Cursors**: Real-time cursor positions (< 50ms latency) with display names and colors
* **Shape Creation**: Button-based creation (one button: "Create Rectangle")
* **Shape Properties**: 
  - Rectangles only (MVP)
  - Fixed size: 100x100px default dimensions
  - Uniform color: All shapes use same default color (#3B82F6 - blue)
  - Position: Created at canvas center or near user's cursor
* **Shape Interaction**: Movement only - no resizing, rotating, or property editing
* **Shape Locking**: 
  - First user to click a shape locks it for movement
  - Locked shape displays the user's name as overlay
  - Others cannot move locked shapes until released (mouse up or disconnect)
* **Sync**: Real-time position updates via Firestore listeners (< 100ms latency)
* **Persistence**: Firestore for persistent shape storage (position, creation metadata)
* **Deployment**: Public hosting with Firebase Hosting

## 5) Data Model

* **Board**: Single global board (hardcoded ID: 'global')
* **Shape** (Firestore): 
  - id: string (auto-generated)
  - type: 'rect' (fixed for MVP)
  - x: number (position)
  - y: number (position)
  - w: 100 (fixed, not editable)
  - h: 100 (fixed, not editable)
  - color: '#3B82F6' (fixed, not editable)
  - createdAt: serverTimestamp
  - createdBy: userId
  - updatedAt: serverTimestamp (for position changes)
  - updatedBy: userId
* **Lock** (RTDB): { shapeId → { userId, userName, lockedAt } }
* **Presence** (RTDB): { userId → { name, color, cursor: {x, y}, lastSeen, isActive } }
* **User**: { uid, name, photoURL }

## 6) Architecture

**Stack Overview**

* **Frontend**: 
  - React 18+ with TypeScript
  - Konva.js + react-konva for canvas rendering
  - Zustand for state management
  - Tailwind CSS for styling
  - Vite for build tooling (fast dev server, optimized builds)
* **Backend**: Firebase (Firestore, Realtime Database, Auth, Hosting)
* **Data Flow**: Client <—> Firestore (persistent shapes) + RTDB (presence, cursors, locks)

**Components**

* Firebase Auth for sign-in (Google OAuth)
* Firestore for persistent shapes with **single collection listener** (not per-shape)
* Realtime Database (RTDB) for cursors, presence, and shape locks
* Shape locking via RTDB to prevent simultaneous edits
* Firebase Hosting for deployment

**Technology Rationale**

* **Firestore**: Used for persistent shape data. Single listener on the shapes collection is more efficient than per-shape listeners, especially with 500+ shapes target.
* **RTDB**: Used for ephemeral data (cursors, presence, locks) because it has lower latency (< 50ms) and better performance for high-frequency updates.
* **Zustand**: Single source of truth for client state, avoiding prop drilling and simplifying real-time sync logic.

**Pitfalls & Simplifications**

* Use single Firestore collection listener for all shapes (not per-shape)
* Limit to one shape type (rectangles) for MVP
* Throttle drag writes during movement (batch updates every 16ms for 60 FPS)
* Cursor updates via RTDB for < 50ms latency (≈60Hz)
* Shape locks stored in RTDB for real-time locking/unlocking

## 7) Sync & Conflict Handling

**Shape Locking (Primary Conflict Prevention)**
* First user to click/select a shape locks it in RTDB
* Locked shape cannot be moved by other users until released
* Locked shape displays the user's name as text overlay
* Lock automatically releases on:
  - Mouse up (drag complete)
  - User disconnect (RTDB `.onDisconnect()`)
  - Timeout after 30 seconds of inactivity
* Prevents simultaneous movement conflicts entirely

**Fallback Conflict Resolution**
* If conflicts still occur (rare edge cases), Last-Write-Wins (LWW) using serverTimestamp
* Clients optimistically update local state for smooth UX
* Firestore listeners sync changes to all clients

**Cursor & Presence**
* Cursor updates via RTDB are transient (not persisted)
* Presence status auto-expires after disconnect detection

## 8) UI/UX Layout

**Main Interface**
* Full viewport canvas (no scrolling, bounded to window size)
* Top toolbar with:
  - "Create Rectangle" button (primary action)
  - User info display (current user's name and avatar)
  - Active users count indicator
  - FPS counter (performance monitoring)
* Canvas area:
  - Shapes rendered at their positions
  - Other users' cursors with name labels
  - Username overlays on locked shapes
  - Pan: Click and drag empty space
  - Zoom: Mouse wheel or pinch gesture

**Visual Design**
* Clean, minimal interface (Figma-inspired aesthetic)
* Canvas background: Light gray (#F5F5F5)
* Shapes: Blue (#3B82F6), fixed 100x100px
* Cursors: Colored per user (random assignment)
* Lock indicator: Username in small text above locked shape
* Toolbar: White background with subtle shadow

## 9) Client Architecture

* **Rendering**: Konva canvas with optimized layer management
* **State Management**: Zustand store for centralized state (shapes, presence, locks, user data)
* **Realtime Sync**: 
  - Firestore: Single collection listener for all shapes
  - RTDB: Presence, cursors, and shape locks
* **Performance Optimizations**:
  - Throttle drag updates to 16ms intervals (60 FPS)
  - Optimistic UI updates for immediate feedback
  - Efficient re-rendering with Konva layer caching
  - Cursor position throttling for network efficiency
* **Offline Handling**: Firestore offline persistence queues updates and resyncs on reconnect
* **Code Architecture**: Design for future AI integration with clean command/action abstractions

## 10) Security & Privacy

* Firebase Auth required for all access (Google Sign-In)
* All authenticated users have equal read/write access to the global board
* Firestore security rules:
  - Validate shape field types and ranges
  - Prevent writes to system fields (createdAt, etc.)
  - Ensure updatedBy matches authenticated user
* RTDB security rules:
  - Allow presence writes only for authenticated user's own entry
  - Allow lock writes only for the locking user
* Client-side throttling to prevent spam writes and reduce costs

## 11) Observability

* Real-time FPS counter displayed on canvas
* Console logs for key events:
  - User connection/disconnection
  - Shape creation and updates
  - Lock acquisition/release
  - Sync latency measurements
* Performance metrics tracking:
  - Frame rate (target: 60 FPS)
  - Sync latency (target: < 100ms for shapes, < 50ms for cursors)
  - Number of active shapes
  - Number of concurrent users

## 12) Risks & Mitigations

* **Lag under load (500+ shapes)** → Use single Firestore listener, Konva layer caching, throttled updates
* **Cursor lag** → Use RTDB instead of Firestore for < 50ms latency
* **Write limits/costs** → Batch updates every 16ms, throttle cursor updates, use RTDB for ephemeral data
* **Connection loss** → Firestore offline persistence + auto-resync; RTDB automatic reconnection
* **Simultaneous edit conflicts** → Shape locking via RTDB prevents conflicts
* **Lock not released (user crash)** → Implement lock timeout and auto-release on disconnect
* **Performance degradation** → Profile with FPS counter, optimize render loops, lazy loading if needed

## 13) Deployment

* Firebase Hosting with environment variables
* Single Firebase project with:
  - Firestore database (for shapes)
  - Realtime Database (for presence, cursors, locks)
  - Authentication enabled (Google provider)
* Security rules deployed for both Firestore and RTDB
* Publicly accessible URL (no authentication required to view URL, but login required to edit)

## 14) Acceptance Criteria

**Performance Benchmarks**
1. Maintain 60 FPS during pan, zoom, and drag operations
2. Shape changes sync to all users in < 100ms
3. Cursor positions sync to all users in < 50ms
4. Support 500+ rectangles without FPS drops
5. Support 5+ concurrent users without performance degradation

**Functional Validation**
1. Multiple users see each other's cursors in real-time with < 50ms latency
2. "Create Rectangle" button spawns 100x100px blue rectangle at canvas center
3. Shape creation syncs to all users immediately
4. First user to click a shape locks it; others see username overlay and cannot move it
5. Locked shapes move smoothly with real-time position updates
6. Shape locks release on mouse up or user disconnect
7. Shapes maintain fixed size (100x100px) and color (#3B82F6) - no editing
8. State persists correctly after browser refresh
9. Users can reconnect after connection loss and continue
10. Empty canvas on first load
11. Canvas bounds match viewport size; shapes cannot be dragged outside bounds

## 15) Future Expansion

**Phase 2 Features**
* Additional shape types (circles, text, lines)
* Shape properties (fill color, stroke, opacity)
* Shape deletion and undo/redo
* Multiple named boards with board management

**AI Integration (Phase 3)**
* Natural language command interface: "create a blue rectangle"
* AI-powered shape generation from descriptions
* Collaborative AI suggestions for layout and design
* Voice command support
* Smart shape arrangement and alignment

**Code Preparation for AI**
* Use command/action pattern for all shape operations
* Centralize shape creation logic for easy AI integration
* Keep business logic separate from UI components
* Design extensible shape type system
