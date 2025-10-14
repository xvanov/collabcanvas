# CollabCanvas – MVP Implementation Tasks (Phase 1 Only)

### Legend

* [ ] = Open task (one PR each)
* **Tests** blocks: concise, high‑value unit/integration checks; use Firebase **Emulator Suite** for Firestore/RTDB/Auth where applicable; use React Testing Library + Vitest/Jest.

---

## [x] PR #1 — Project Bootstrap & Firebase Setup

**Work**

* Initialize React 18+ with Vite + TypeScript
* Install dependencies: `react`, `react-dom`, `konva`, `react-konva`, `zustand`, `firebase`, `tailwindcss`
* Configure Tailwind CSS for styling
* Create `services/firebase.ts` (app/init), `services/firestore.ts`, `services/rtdb.ts`
* Wire `.firebaserc`, `firebase.json`, emulator config for local development
* Set up environment variables for Firebase config

---

## [x] PR #2 — Authentication (Google Sign‑In)

**Work**

* `useAuth` hook + top toolbar with user info display (name, avatar)
* Implement Google Sign-In flow with Firebase Auth
* Persist user data: `uid`, `name`, `photoURL`
* Show login button when not authenticated
* Require authentication to access the canvas

**Tests (targeted)**

* **Unit**: `useAuth` initial state and transitions (logged out → logged in → logged out) with mocked Firebase Auth
* **Integration (emulator)**: guard canvas/board; only authenticated users can access

> Rationale: Ensures the app doesn't leak unauthenticated access and avoids flaky auth flows.

---

## [x] PR #3 — Canvas Renderer (Konva Integration)

**Work**

* Basic Konva stage & layer setup with viewport-sized bounded canvas
* Implement pan (click and drag empty space) and zoom (mouse wheel) at 60 FPS
* Canvas background: light gray (#F5F5F5)
* Real-time FPS counter display in toolbar (required for performance monitoring)
* Prevent shapes from being dragged outside viewport bounds

**Tests (minimal)**

* **Unit**: utility math for zoom clamping and viewport transforms
* **Unit**: boundary checking prevents objects from leaving canvas bounds
* **No heavy integration tests** (Konva DOM drag perf is visual; covered later by shape ops integration)

> Rationale: Keep tests lean; focus on pure utilities that often regress.

---

## [x] PR #4 — Shape Creation & Movement (Local State)

**Work**

* `Shape.tsx` component for rendering rectangles (100x100px, #3B82F6 blue, fixed properties)
* "Create Rectangle" button in toolbar - creates shape at canvas center
* Drag-to-move interaction (movement only, no resizing or editing)
* Zustand store in `store/canvasStore.ts` for shapes, selection, and locks
* Store actions: `createShape`, `updateShapePosition`, `selectShape`, `deselectShape`
* Shapes cannot be edited - only position (x, y) can change

**Tests (high‑value)**

* **Unit**: store actions: create shape with correct default properties (100x100, #3B82F6)
* **Unit**: updateShapePosition only updates x,y coordinates, not size or color
* **Unit**: selection logic correctly tracks selected shape
* **Integration (DOM)**: using React Testing Library, click button to create + drag; verify DOM props reflect new position

> Rationale: Catches slop in core UX—creation and movement must be exact and stable.

---

## [x] PR #5 — Firestore Realtime Sync (Shapes)

**Work**

* Single Firestore collection listener for global board (hardcoded ID: 'global')
* Listen to `shapes` collection, handle document changes efficiently
* Create and Update operations only (no deletion in MVP)
* Last-Write-Wins (LWW) conflict resolution using `serverTimestamp`
* Throttle drag writes to 16ms intervals (60 FPS, ~62.5 updates/sec max)
* Target < 100ms sync latency between users
* Optimistic UI updates for smooth local experience

**Tests (critical path)**

* **Integration (emulator)**:
  * **Create**: creating a shape writes correct schema (id, type: 'rect', x, y, w: 100, h: 100, color: '#3B82F6', createdAt, createdBy, updatedAt, updatedBy)
  * **Update**: moving a shape updates only position (x, y) and updatedAt/updatedBy fields; preserves size, color, and createdAt
  * **Conflict policy**: two clients write different positions—doc's final state matches server timestamp order (LWW)
  * **Single listener**: verify only one Firestore listener active, not per-shape
* **Unit**: throttle utility (16ms) coalesces rapid drag updates

> Rationale: Validates real‑time correctness and conflict handling—the most error‑prone area.

---

## [x] PR #6 — Presence & Cursors (RTDB)

**Work**

* `usePresence` hook for ephemeral data in RTDB: `presence/{userId}`
* Cursor overlay component showing other users' cursors with name labels
* Each user assigned a random color for their cursor
* Cursor update rate ≈60Hz (target < 50ms latency)
* Active users count indicator in toolbar
* Auto-cleanup on disconnect using RTDB `.onDisconnect()`
* Presence data: `{ userId, name, color, cursor: {x, y}, lastSeen, isActive }`

**Tests (focused)**

* **Integration (emulator)**: user joins/leaves → presence node appears/disappears; cursor updates propagate to listeners within 50ms
* **Unit**: throttle/rate-limit for cursor publishing (≈60Hz)
* **Integration**: verify `.onDisconnect()` removes presence on user disconnect

> Rationale: Ensures no ghost users and avoids cursor floods while maintaining < 50ms latency target.

---

## [x] PR #7 — Shape Locking (RTDB)

**Work**

* Implement shape locking mechanism in RTDB: `locks/{shapeId} → { userId, userName, lockedAt }`
* First user to click a shape locks it; others cannot move it
* Username overlay displayed on locked shapes
* Lock automatically releases on:
  - Mouse up (drag complete)
  - User disconnect (`.onDisconnect()`)
  - Timeout after 30 seconds of inactivity
* Visual feedback: show username text above locked shape
* Disable drag interaction for shapes locked by other users

**Tests (critical)**

* **Integration (emulator)**:
  * User A locks shape → User B cannot move it
  * Lock released on mouse up → shape becomes available
  * Lock auto-releases on disconnect
  * Lock auto-releases after 30-second timeout
* **Unit**: lock state management in store
* **Integration**: username overlay renders correctly on locked shapes

> Rationale: Shape locking is core to conflict prevention; must work reliably across all disconnect scenarios.

---

## [x] PR #8 — Security Rules (Firestore + RTDB)

**Work**

* Firestore rules: schema validation, auth checks, field constraints
* RTDB rules: presence and lock write constraints
* Validate shape properties: fixed w: 100, h: 100, color: '#3B82F6'
* Ensure users can only write their own presence entry
* Ensure users can only acquire locks with their own userId

**Tests (must‑have)**

* **Rules Unit Tests (emulator)**:
  * Auth required for all reads and writes
  * Shape schema enforced: type must be 'rect', w must be 100, h must be 100, color must be '#3B82F6'
  * Position fields (x, y) must be numbers
  * Users cannot modify createdAt, createdBy fields
  * updatedBy must match authenticated user
  * Users can only write their own presence path
  * Users can only create locks with their own userId in the lock data

> Rationale: Prevents accidental broad writes, schema drift, and security vulnerabilities.

---

## [x] PR #9 — Offline Handling & Resync

**Work**

* Firestore offline persistence automatically queues unsent updates
* Retry queued updates on reconnect
* Full reload pulls all shapes from Firestore on page refresh
* Handle RTDB reconnection for presence and locks
* Clear stale locks on reconnect

**Tests (integration)**

* **Emulator**: simulate offline → queue shape position updates → go online → verify Firestore state reflects queued changes exactly once (no dupes)
* **Integration**: verify presence and locks resync correctly after reconnect

> Rationale: Protects against data loss, duplicate writes, and stale locks.

---

## [ ] PR #10 — Deployment (Firebase Hosting)

**Work**

* Configure Firebase Hosting in `firebase.json`
* Set up production environment variables
* Build optimized production bundle with Vite
* Deploy to Firebase Hosting
* Generate public URL for access
* Verify all Firebase services (Auth, Firestore, RTDB) work in production

**Tests**

* **Manual verification** (out of automated scope): 
  * Auth flow works on deployed URL
  * Shape creation and movement sync in real-time across multiple browsers
  * Cursors and presence update correctly
  * Shape locking works across users
  * Performance targets met: 60 FPS, < 100ms shape sync, < 50ms cursor updates

---

### Notes on Test Strategy

* Prefer **emulator‑backed integration** for data‑layer behaviors (Firestore/RTDB/Auth).
* Keep Konva/UI tests **thin**; focus on reducers/props and a single end‑to‑end creation/drag flow.
* Avoid snapshot sprawl; assert specific state transitions and document shapes.
* CI can run `firebase emulators:exec` to wrap integration suites.
* Focus on critical paths: shape locking, conflict resolution, presence management.
* Performance tests: verify 60 FPS during operations, < 100ms shape sync, < 50ms cursor updates.

---

## Project File Structure

```
collabcanvas/
├── public/                        # Static assets
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Canvas.tsx             # Main Konva canvas with pan/zoom
│   │   ├── Shape.tsx              # Rectangle component (100x100px, #3B82F6)
│   │   ├── Toolbar.tsx            # Top toolbar with create button, user info, FPS counter
│   │   ├── CursorOverlay.tsx      # Live cursors with name labels
│   │   ├── LockOverlay.tsx        # Username display on locked shapes
│   │   └── AuthButton.tsx         # Google Sign-In button
│   ├── hooks/
│   │   ├── useShapes.ts           # Firestore sync (single collection listener)
│   │   ├── usePresence.ts         # RTDB presence + cursors (60Hz updates)
│   │   ├── useLocks.ts            # RTDB shape locking logic
│   │   └── useAuth.ts             # Firebase auth hook
│   ├── pages/
│   │   ├── Board.tsx              # Main board view (global board)
│   │   └── Login.tsx              # Login page
│   ├── services/
│   │   ├── firebase.ts            # Firebase init + config
│   │   ├── firestore.ts           # Shape CRUD (create, update position only)
│   │   └── rtdb.ts                # Presence, cursors, locks
│   ├── store/
│   │   └── canvasStore.ts         # Zustand store (shapes, locks, presence, user)
│   ├── utils/
│   │   ├── throttle.ts            # Throttling utilities (16ms for shapes, 60Hz for cursors)
│   │   └── colors.ts              # Random color assignment for users
│   ├── App.tsx
│   ├── main.tsx
│   └── types.ts                   # Shared types (Shape, User, Presence, Lock)
├── .firebaserc
├── firebase.json                  # Firebase config (Hosting, Emulators)
├── firestore.rules                # Firestore security rules
├── database.rules.json            # RTDB security rules
├── package.json
├── tsconfig.json
├── vite.config.ts                 # Vite configuration
├── tailwind.config.js             # Tailwind CSS config
├── postcss.config.js              # PostCSS config
├── README.md
└── .env                           # Firebase environment variables
```

---

## MVP Phase 1 Scope Summary

**Included:**
- ✅ Single global board (hardcoded ID: 'global')
- ✅ Rectangle creation only (100x100px, #3B82F6, button-based)
- ✅ Movement only (no editing, resizing, or property changes)
- ✅ Shape locking (first-click locks, username overlay)
- ✅ Real-time sync (Firestore for shapes, RTDB for presence/cursors/locks)
- ✅ Multiplayer cursors with name labels
- ✅ Presence awareness (active users count)
- ✅ Google Sign-In authentication
- ✅ Pan and zoom canvas (viewport-sized, bounded)
- ✅ 60 FPS performance, < 100ms shape sync, < 50ms cursor updates
- ✅ Deployed on Firebase Hosting

**Excluded (Phase 2+):**
- ❌ Shape deletion
- ❌ Multiple boards or board management
- ❌ Shape editing (resize, color change, properties)
- ❌ Additional shape types (circles, text, lines)
- ❌ Undo/redo
- ❌ AI integration
