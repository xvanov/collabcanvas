# CollabCanvas - Complete Feature Implementation Task List

> **Goal**: 6 PRs to achieve 100/100 rubric points through strategic feature implementation

## ⚠️ CRITICAL FOR 100/100 POINTS

**PR #15 MUST include a Tier 3 feature (Version History)** to achieve the full 15/15 points in Advanced Features!

The rubric requires for "Excellent" rating (13-15 points):
- ✅ 3 Tier 1 features (6 pts) - PR #13
- ✅ 2 Tier 2 features (6 pts) - PR #14  
- ⭐ **1 Tier 3 feature (3 pts) - PR #15** ← CRITICAL!

Without the Tier 3 feature, you can only achieve 12/15 points in Advanced Features, limiting your total score to ~94-97/100.

---

## Current Status
- ✅ MVP Complete (All 9 PRs done)
- ✅ Performance Solid (60 FPS, <100ms shape sync)
- ⚠️ Cursor latency target (<50ms end-to-end) not yet achieved in current throttling (maybe achieved, unknown)
- ✅ Collaborative Infrastructure Excellent (25-28/30 points)
- ✅ Technical Implementation Solid (8-9/10 points)
- ✅ Documentation & Deployment Ready (4-5/5 points)

**Current Estimated Score: 65-70/100**

---

## Week 1: Canvas Foundation & Core Features

### [ ] PR #11 — Shape Type System & Basic Editing
**Target Points**: +10-12 | **Effort**: 2-3 days | **Priority**: HIGH

**Features to Implement**:
- [ ] **Additional Shape Types** (6 points)
  - [ ] Circle shape creation and rendering
  - [ ] Text shape creation and rendering  
  - [ ] Line shape creation and rendering
  - [ ] Shape type selection toolbar
  - [ ] Update Firestore schema (backward compatible)
  - [ ] Type discrimination in Shape component

- [ ] **Basic Shape Editing** (4 points)
  - [ ] Color picker for shape colors
  - [ ] Size editing (maintain aspect ratio)
  - [ ] Text editing (click-to-edit text content)
  - [ ] Property panel UI
  - [ ] Visual feedback for editing mode

**Technical Implementation**:
```typescript
// Extend types.ts
export type ShapeType = 'rect' | 'circle' | 'text' | 'line';

export interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  text?: string;
  fontSize?: number;
  strokeWidth?: number;
  // ... existing properties
}

// Update Shape component with type discrimination
// Add new Konva components (Circle, Text, Line)
// Update Firestore schema (backward compatible)
```

**Acceptance Criteria**:
- [ ] 4+ shape types available (rect, circle, text, line)
- [ ] Color picker changes shape colors
- [ ] Text shapes are editable by clicking
- [ ] Size editing works with aspect ratio
- [ ] Performance maintains 60 FPS target
- [ ] All features work in multi-user environment
- [ ] Backward compatibility with existing rectangles

⚠️ Note: Firestore rules currently constrain `type` to `'rect'` and fixed properties. This PR must include a rules update plan (staged rollout) to support new shape types and editable properties while preserving backward compatibility.

**Testing Strategy** (fast, practical):
- [ ] Unit: Type guards and rendering discrimination for each shape (`Shape`/new components)
- [ ] Component: Create + render + edit cycles for circle/text/line (Vitest + JSDOM)
- [ ] Integration (Emulator): Firestore create/update for new types passes rules; legacy rect writes remain valid
- [ ] Manual: 3 users sanity pass to verify multi-user consistency

---

### [ ] PR #12 — Multi-Select & Transform Operations
**Target Points**: +8-10 | **Effort**: 2-3 days | **Priority**: HIGH

**Features to Implement**:
- [ ] **Multi-Select System** (4 points)
  - [ ] Shift+Click multi-select
  - [ ] Drag selection box
  - [ ] Visual selection indicators
  - [ ] Selection state management

- [ ] **Bulk Operations** (2 points)
  - [ ] Delete key removes selected shapes
  - [ ] Ctrl+D duplicates selected shapes
  - [ ] Bulk operations UI feedback

- [ ] **Transform Operations** (4 points)
  - [ ] Resize handles on selected shapes
  - [ ] Rotation controls (90° increments)
  - [ ] Arrow key movement
  - [ ] Transform controls UI

**Technical Implementation**:
```typescript
// Extend selection state
interface CanvasState {
  selectedShapeIds: string[];
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  clearSelection: () => void;
  deleteSelectedShapes: () => void;
  duplicateSelectedShapes: () => void;
}

// Add transform controls
interface TransformControls {
  resizeHandles: ResizeHandles;
  rotation: RotationControl;
  keyboardMovement: KeyboardMovement;
}
```

**Acceptance Criteria**:
- [ ] Multi-select works with Shift+Click
- [ ] Drag selection box works
- [ ] Delete key removes selected shapes
- [ ] Ctrl+D duplicates selected shapes
- [ ] Resize handles appear on selected shapes
- [ ] Rotation works (90° increments)
- [ ] Arrow keys move selected shapes
- [ ] Visual feedback for all operations
- [ ] Performance maintains 60 FPS target

**Testing Strategy** (fast, practical):
- [ ] Unit: Selection reducer/add/remove/clear; transform math helpers
- [ ] Component: Shift+Click, marquee selection, keyboard ops (arrow, delete, duplicate)
- [ ] Integration (Harness): Move/duplicate multiple shapes, verify LWW consistency
- [ ] Manual: 2-browser session multi-select/drag/rotate sanity

---

## Week 2: Advanced Features & Professional Tools

### [ ] PR #13 — Color System & Undo/Redo
**Target Points**: +6-8 | **Effort**: 2-3 days | **Priority**: HIGH

**Features to Implement**:
- [ ] **Color Picker with Recent Colors** (2 points)
  - [ ] Color picker component
  - [ ] Recent colors storage
  - [ ] Color palette persistence
  - [ ] Saved color palettes

- [ ] **Undo/Redo System** (2 points)
  - [ ] Command history system
  - [ ] Cmd+Z / Cmd+Shift+Z shortcuts
  - [ ] Action tracking and replay
  - [ ] History UI indicators

- [ ] **Keyboard Shortcuts** (2 points)
  - [ ] Delete key for shapes
  - [ ] Duplicate (Ctrl+D)
  - [ ] Arrow keys for movement
  - [ ] Escape to deselect
  - [ ] Shortcuts help panel

**Technical Implementation**:
```typescript
// Color system
interface ColorPalette {
  recent: string[];
  saved: string[];
  default: string[];
}

// History system
interface HistoryState {
  past: CanvasAction[];
  present: CanvasAction;
  future: CanvasAction[];
}

interface CanvasAction {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE';
  shapeId: string;
  data: any;
  timestamp: number;
}
```

**Acceptance Criteria**:
- [ ] Color picker shows recent colors
- [ ] Colors persist between sessions
- [ ] Undo/Redo works with Cmd+Z/Cmd+Shift+Z
- [ ] All keyboard shortcuts work
- [ ] History UI shows available actions
- [ ] Performance maintains 60 FPS target

⚠️ Note: Firestore/RTDB rules must remain consistent with editing capabilities (e.g., allow color/size updates if enabled). Include a security rules update.

**Testing Strategy** (fast, practical):
- [ ] Unit: Color palette reducers; history push/undo/redo correctness
- [ ] Component: Shortcut handlers (Cmd+Z/Shift+Z), palette persistence (localStorage)
- [ ] Integration (Harness): Undo/redo after remote updates doesn’t corrupt state
- [ ] Manual: Quick smoke for undo/redo across 2 tabs

---

### [ ] PR #14 — Layers Panel & Alignment Tools
**Target Points**: +6-8 | **Effort**: 2-3 days | **Priority**: HIGH

**Features to Implement**:
- [ ] **Layers Panel with Drag-to-Reorder** (3 points)
  - [ ] Layers panel UI
  - [ ] Shape hierarchy display
  - [ ] Drag-to-reorder functionality
  - [ ] Z-index management
  - [ ] Layer visibility controls

- [ ] **Alignment Tools** (3 points)
  - [ ] Align left/right/center
  - [ ] Distribute evenly
  - [ ] Alignment toolbar
  - [ ] Smart guides during alignment

- [ ] **Additional Professional Features** (2 points)
  - [ ] Snap-to-grid functionality
  - [ ] Grid toggle
  - [ ] Snap indicators

**Technical Implementation**:
```typescript
// Layers system
interface Layer {
  id: string;
  name: string;
  shapes: string[];
  visible: boolean;
  locked: boolean;
  order: number;
}

// Alignment tools
interface AlignmentTools {
  alignLeft: () => void;
  alignCenter: () => void;
  alignRight: () => void;
  distributeEvenly: () => void;
}
```

**Acceptance Criteria**:
- [ ] Layers panel shows shape hierarchy
- [ ] Drag-to-reorder works
- [ ] Alignment tools work for selected shapes
- [ ] Snap-to-grid works during drag
- [ ] Grid can be toggled on/off
- [ ] All features maintain real-time sync

**Testing Strategy** (fast, practical):
- [ ] Unit: Layer ordering reducers; alignment math (left/center/right, distribute)
- [ ] Component: Drag-to-reorder calls correct actions; guides toggle
- [ ] Integration (Harness): Reorder + align in one client reflects correctly in peer
- [ ] Manual: Snap-to-grid feel check under pan/zoom

---

## Week 3: Advanced Features & AI Integration

### [ ] PR #15 — Version History & Export Features (TIER 3 REQUIRED!)
**Target Points**: +3 (Tier 3) + Additional Polish | **Effort**: 3-4 days | **Priority**: HIGH

**Features to Implement**:
- [ ] **Version History with Restore** (3 points - TIER 3) ⭐ CRITICAL FOR 100/100
  - [ ] Automatic canvas snapshots (every 5 minutes or on significant changes)
  - [ ] Version history panel showing timestamps and preview thumbnails
  - [ ] Restore to previous version functionality
  - [ ] Version comparison view (show diff between versions)
  - [ ] Store versions in Firestore with pagination
  - [ ] Limit to last 20 versions per board

- [ ] **Export Functionality** (Polish/UX)
  - [ ] Canvas to PNG export
  - [ ] Canvas to SVG export
  - [ ] Export button in toolbar
  - [ ] Export options dialog

- [ ] **Copy/Paste Functionality** (Polish/UX)
  - [ ] Copy selected shapes (Ctrl+C)
  - [ ] Paste shapes (Ctrl+V)
  - [ ] Clipboard management
  - [ ] Smart paste positioning

**Technical Implementation**:
```typescript
// Version history system (TIER 3)
interface CanvasVersion {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  shapesSnapshot: Shape[];
  thumbnailUrl?: string;
  changeDescription?: string;
}

interface VersionHistoryStore {
  versions: CanvasVersion[];
  createVersion: (description?: string) => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
  loadVersionHistory: () => Promise<void>;
  compareVersions: (v1: string, v2: string) => VersionDiff;
}

// Export system
interface ExportOptions {
  format: 'PNG' | 'SVG';
  quality: number;
  includeBackground: boolean;
  selectedOnly: boolean;
}

// Clipboard system
interface Clipboard {
  shapes: Shape[];
  timestamp: number;
  sourceUser: string;
}
```

**Acceptance Criteria**:
- [ ] **Version History Panel** shows all canvas versions
- [ ] **Auto-save** creates versions every 5 minutes
- [ ] **Manual snapshots** can be created with descriptions
- [ ] **Restore functionality** works without data loss
- [ ] **Version comparison** highlights changes between versions
- [ ] PNG/SVG export works for full canvas and selected shapes
- [ ] Copy/paste works with Ctrl+C/Ctrl+V
- [ ] All features maintain 60 FPS performance
- [ ] Version storage is efficient (< 1MB per version)
- [ ] Works correctly in multi-user environment

⚠️ Note: Add Firestore rules for versions collection under `boards/{boardId}/versions/{versionId}` with read/write constraints.

**Testing Strategy** (fast, practical):
- [ ] Unit: Diff/comparison function correctness on sample shape arrays
- [ ] Component: Export PNG/SVG produces a non-empty blob; clipboard copy/paste roundtrip
- [ ] Integration (Emulator): Create/restore versions; verify snapshot count limit
- [ ] Manual: Restore under 300+ shapes does not corrupt state

---

### [ ] PR #16 — AI Canvas Agent
**Target Points**: +15-20 | **Effort**: 3-4 days | **Priority**: MEDIUM-HIGH

**Features to Implement**:
- [ ] **Basic AI Commands** (10 points)
  - [ ] Command parser for natural language
  - [ ] Creation commands ("Create a red circle")
  - [ ] Manipulation commands ("Move the blue rectangle")
  - [ ] Layout commands ("Arrange shapes in a row")
  - [ ] Complex commands ("Create a login form")
  - [ ] Command input UI

- [ ] **AI Performance & Reliability** (7 points)
  - [ ] Sub-2 second response times
  - [ ] 90%+ accuracy target
  - [ ] Natural UX with feedback
  - [ ] Shared state integration
  - [ ] Error handling and fallbacks

- [ ] **AI Integration Features** (3 points)
  - [ ] Voice command support (optional)
  - [ ] Command history
  - [ ] AI status indicators

**Technical Implementation**:
```typescript
// AI command system
interface AICommand {
  type: 'CREATE' | 'MANIPULATE' | 'LAYOUT' | 'COMPLEX';
  action: string;
  parameters: Record<string, any>;
  confidence: number;
}

class AICommandParser {
  parseCommand(text: string): AICommand;
  executeCommand(command: AICommand): Promise<void>;
  commandTypes: CommandType[];
}

// AI service integration
interface AIService {
  processCommand: (text: string) => Promise<AICommand>;
  executeCommand: (command: AICommand) => Promise<void>;
  getStatus: () => AIStatus;
}
```

**Acceptance Criteria**:
- [ ] AI understands 8+ command types
- [ ] Commands execute in <2 seconds
- [ ] 90%+ accuracy on command interpretation
- [ ] Complex commands create multiple elements
- [ ] AI works in multi-user environment
- [ ] Fallback to manual interface available
- [ ] Error handling works gracefully

**Testing Strategy** (fast, practical):
- [ ] Unit: Parser maps representative commands to structured intent
- [ ] Component: Command input lifecycle; status indicator transitions
- [ ] Integration (Harness): Execute 6–8 canonical commands successfully
- [ ] Manual: Latency spot-check (<2s) and failure fallback
---

## Complete Feature Coverage (Aligned with Rubric)

### Canvas Features & Performance (20 points)
**Canvas Functionality** (8 points) - Target: Excellent (7-8 pts)
- ✅ Smooth pan/zoom (already working)
- 🎯 3+ shape types (rect, circle, text, line) - PR #11 (target)
- 🎯 Text with formatting - PR #11 (target)
- 🎯 Multi-select (shift-click, drag selection) - PR #12 (target)
- 🎯 Layer management - PR #14 (target)
- 🎯 Transform operations (move, resize, rotate) - PR #12 (target)
- 🎯 Duplicate/delete - PR #12 (target)

**Performance & Scalability** (12 points) - Current: Good→Excellent path
- ✅ 60 FPS maintained
- ✅ < 100ms shape sync
- 🎯 < 50ms cursor updates (optimize throttles) — PR #R1 (see below)
- 🎯 500+ objects without degradation (validated after PR #11-14)
- 🎯 5+ concurrent users supported (validated across PRs)

### Advanced Figma Features (15 points) - Target: Excellent (13-15 pts)
**Tier 1 Features** (6 points max - need 3 features):
- ✅ Color picker with recent colors (2 pts) - PR #13
- ✅ Undo/redo with keyboard shortcuts (2 pts) - PR #13
- ✅ Keyboard shortcuts for operations (2 pts) - PR #13

**Tier 2 Features** (6 points max - need 2 features):
- ✅ Layers panel with drag-to-reorder (3 pts) - PR #14
- ✅ Alignment tools (3 pts) - PR #14

**Tier 3 Features** (3 points max - need 1 feature):
- ✅ **Version history with restore capability (3 pts) - PR #15** ⭐ CRITICAL FOR 100/100

### AI Canvas Agent (25 points)
- ✅ **Command Breadth** (10 points):
  - ✅ 8+ distinct command types
  - ✅ Covers all categories (creation, manipulation, layout, complex)
- ✅ **Complex Command Execution** (8 points):
  - ✅ Complex layouts execute correctly
  - ✅ Multi-step operations work
  - ✅ Smart positioning and styling
- ✅ **AI Performance & Reliability** (7 points):
  - ✅ Sub-2 second responses
  - ✅ 90%+ accuracy
  - ✅ Natural UX with feedback
  - ✅ Shared state integration

---

## Implementation Timeline

### Week 1: Canvas Foundation
- **PR #11**: Shape Type System & Basic Editing (2-3 days)
  - Adds: Circles, text, lines, color editing, text editing
  - Impact: Canvas Functionality moves from 3-4 pts → 5-6 pts
  
- **PR #12**: Multi-Select & Transform Operations (2-3 days)
  - Adds: Multi-select, transforms, duplicate/delete
  - Impact: Canvas Functionality reaches Excellent (7-8 pts)

### Week 2: Advanced Features (Tier 1 & 2)
- **PR #13**: Color System & Undo/Redo (2-3 days)
  - Adds: 3 Tier 1 features (6 pts)
  - Impact: Advanced Features 6/15 pts
  
- **PR #14**: Layers Panel & Alignment Tools (2-3 days)
  - Adds: 2 Tier 2 features (6 pts)
  - Impact: Advanced Features 12/15 pts

### Week 3: Tier 3 Feature & AI Integration
- **PR #15**: Version History & Export (3-4 days) ⭐ CRITICAL
  - Adds: 1 Tier 3 feature (Version History) + Export + Copy/Paste
  - Impact: Advanced Features reaches 15/15 pts ✅
  
- **PR #16**: AI Canvas Agent (3-4 days)
  - Adds: 8+ command types, complex execution, <2s performance
  - Impact: AI Agent 25/25 pts → **Total: 96-100/100** ✅

---

## Success Metrics

### Performance Targets (Maintain)
- ✅ 60 FPS during all interactions
- ✅ < 100ms shape sync between users
- ✅ < 50ms cursor position updates
- ✅ Support 5+ concurrent users
- ✅ Handle 500+ shapes without degradation

### Rubric Score Targets (Path to 100/100)
| Milestone | Section Scores | Total Score |
|-----------|----------------|-------------|
| **Current MVP** | Collab: 25-28, Canvas: 8-10, Advanced: 0, AI: 0, Tech: 8-9, Docs: 4-5 | **65-70/100** |
| **After PR #11-12** | Collab: 26-28, Canvas: 17-18, Advanced: 0, AI: 0, Tech: 8-9, Docs: 4-5 | **75-78/100** |
| **After PR #13-14** | Collab: 27-29, Canvas: 19-20, Advanced: 12, AI: 0, Tech: 9, Docs: 4-5 | **87-91/100** |
| **After PR #15** | Collab: 28-29, Canvas: 19-20, **Advanced: 15**, AI: 0, Tech: 9, Docs: 5 | **91-93/100** |
| **After PR #16** | Collab: 28-30, Canvas: 19-20, Advanced: 15, **AI: 25**, Tech: 9-10, Docs: 5 | **96-100/100** ✅ |

**Key Insight**: PR #15's Tier 3 feature (Version History) is CRITICAL to reach 15/15 on Advanced Features and achieve 100/100 total!

### Feature Completion Targets
- **PR #11-12**: 4+ shape types, multi-select, transforms, basic editing (Canvas Functionality: Excellent)
- **PR #13-14**: 3 Tier 1 features + 2 Tier 2 features (12/15 Advanced Features points)
- **PR #15**: 1 Tier 3 feature (Version History) + Export + Copy/Paste (15/15 Advanced Features points)
- **PR #16**: AI agent with 8+ command types, 90%+ accuracy, <2s responses (25/25 AI points)

---

## Risk Mitigation

### High-Risk PRs
- **PR #16 (AI Agent)**: Complex implementation, may be unreliable
  - **Mitigation**: Start with simple commands, add complexity gradually
  - **Fallback**: Manual command interface if AI fails

- **PR #15 (Version History - Tier 3)**: Complex storage and restore logic, CRITICAL for 100/100
  - **Risk**: Restoring large canvas states may be slow or buggy
  - **Mitigation**: 
    - Implement incremental snapshots (store diffs, not full canvas)
    - Limit to last 20 versions
    - Test restore with large canvases (500+ shapes)
    - Add version validation before restore
  - **Fallback**: If version history fails, still have Export/Copy/Paste for partial credit

### Medium-Risk PRs
- **PR #12 (Multi-Select)**: Complex state management
  - **Mitigation**: Leverage existing Zustand patterns
  - **Fallback**: Single-select mode if issues arise

### Low-Risk PRs
- **PR #11, #13, #14**: Well-defined features with clear implementation paths
  - **Mitigation**: Follow existing patterns and architecture
  - **Fallback**: Feature flags to disable if needed

---

## Next Steps

1. **Start with PR #11**: Shape Type System & Basic Editing
2. **Follow sequential implementation**: Each PR builds upon the previous
3. **Maintain performance**: Profile each addition to ensure 60 FPS target
4. **Test thoroughly**: Each PR must work in multi-user environment
5. **Document changes**: Update architecture docs with new features

**Ready to begin implementation!** 🚀

---

## Rubric Compliance Tasks (Cross-cutting)

### [ ] PR #R1 — Cursor Latency Optimization (< 50ms end-to-end)
- [ ] Reduce publish throttle to ~16ms-20ms when stable; adaptively back off on failures
- [ ] Increase other-users rendering update cadence (≤ 33ms) with batching to avoid jank
- [ ] Validate end-to-end latency under 5 concurrent users

**Testing Strategy** (fast, practical):
- [ ] Harness: Timestamp stamps on send/receive to compute E2E latency distribution
- [ ] Devtools sampling: Measure RAF-to-RAF propagation under throttle variants
- [ ] Manual: 2–3 client session, visually verify smoothness

### [ ] PR #R2 — Lock Semantics Alignment
- [ ] Confirm rubric-consistent behavior for lock release (mouse up vs drag end)
- [ ] If rubric requires mouse-up release, update `Shape`/`useLocks` to release on mouse up
- [ ] Maintain 30s stale lock cleanup and disconnect cleanup

**Testing Strategy** (fast, practical):
- [ ] Unit: Lock state transitions (acquire, release on mouse up, stale cleanup logic)
- [ ] Component: Click/drag/mouseup sequences lock/unlock correctly
- [ ] Integration (Harness): Two clients competing for same shape obey semantics

### [ ] PR #R3 — Security Rules Evolution for New Shapes/Editing
- [ ] Migrate Firestore rules from strict-rect to multi-shape schema safely
- [ ] Add rule validations per type (rect/circle/text/line)
- [ ] Ensure only allowed properties change on update per feature set
- [ ] Add tests for rules and backward compatibility

**Testing Strategy** (fast, practical):
- [ ] Emulator tests: Allow-list validations per type; reject forbidden updates
- [ ] Back-compat: Legacy rect create/update still permitted
- [ ] Negative tests: Type spoofing/forbidden field mutation blocked

---

### [ ] PR #R4 — Latency & Throughput Feasibility (Measurement Harness)
- [ ] Add lightweight, toggleable timestamps around cursor publish/consume
- [ ] Add shape-update latency sampling during drag (local vs remote)
- [ ] Export JSON summary (p50/p95) from perf harness
- [ ] Decide keep/tune throttles vs deeper changes based on data

**Testing Strategy** (fast, practical):
- [ ] Scripted run across 2–3 tabs for 60s; collect metrics JSON
- [ ] Short manual replay of movement to verify charts/metrics sanity
