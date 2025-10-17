# CollabCanvas – Final Product Requirements Document (PRD)

> **Goal**: Transform the completed MVP into a high-scoring collaborative canvas application that maximizes rubric points (target: 100-105/105).

## Executive Summary

CollabCanvas MVP is **COMPLETE** with all core collaborative infrastructure working at target performance levels. This final PRD outlines a strategic roadmap to achieve maximum rubric points (target: 100-105/105) by implementing high-ROI features that build upon the solid foundation.

**⚠️ RUBRIC BONUS POINTS**: The rubric allows for bonus points - you can score up to 105/100 by exceeding expectations in any section. All calculations below work toward the maximum achievable score.

**Current Status**: ✅ MVP Complete (9/9 PRs done)
- Real-time collaboration: ✅ Working
- Performance targets: ✅ Achieved (60 FPS, <50ms cursor, <100ms shape sync)
- Multi-user support: ✅ Stable (2-3 users tested)
- Authentication: ✅ Google Sign-In working
- Shape locking: ✅ Conflict prevention working
- Offline handling: ✅ Resync working

---

## 1) Current Implementation Assessment

### ✅ Completed Features (MVP)
- **Authentication**: Google Sign-In with Firebase Auth
- **Canvas**: Konva-based rendering with pan/zoom at 60 FPS
- **Shapes**: Rectangle creation and movement (100x100px, #3B82F6)
- **Real-time Sync**: Firestore for shapes, RTDB for presence/cursors/locks
- **Shape Locking**: First-click locking prevents conflicts
- **Presence**: Live cursors with user names and colors
- **Performance**: All targets met (60 FPS, <100ms shape sync, <50ms cursor)
- **Offline**: Firestore persistence with resync
- **Security**: Firestore + RTDB rules deployed
- **Deployment**: Firebase Hosting ready

### 🎯 Rubric Score Analysis

**Current Estimated Score: 45-52/100**

| Section | Current Score | Max Possible | Gap Analysis |
|---------|---------------|--------------|--------------|
| **Core Collaborative Infrastructure (30 pts)** | 25-28 pts | 30 pts | Excellent sync, good conflict resolution, solid persistence |
| **Canvas Features & Performance (20 pts)** | 8-10 pts | 20 pts | **MAJOR GAP**: Only rectangles, no advanced features |
| **Advanced Figma Features (15 pts)** | 0 pts | 15 pts | **MAJOR GAP**: No advanced features implemented |
| **AI Canvas Agent (25 pts)** | 0 pts | 25 pts | **MAJOR GAP**: Not implemented |
| **Technical Implementation (10 pts)** | 8-9 pts | 10 pts | Good architecture, solid auth |
| **Documentation & Deployment (5 pts)** | 4-5 pts | 5 pts | Good docs, ready for deployment |

**Key Insight**: Focus on Canvas Features (20 pts) and Advanced Features (15 pts) for highest ROI.

---

## 2) Strategic Feature Roadmap (ROI-Optimized)

### Phase 1: High-ROI Canvas Features (Target: +10-12 points)
**Points**: 10-12 | **ROI**: Very High

#### 1.1 Additional Shape Types (4 points)
- **Circles**: Add circle creation tool
- **Text**: Add text input with basic formatting
- **Lines**: Add line drawing tool
- **Impact**: Moves from "Poor" to "Satisfactory" in Canvas Functionality

#### 1.2 Shape Editing & Properties (3 points)
- **Color Picker**: Allow shape color changes
- **Size Editing**: Enable resizing (maintain aspect ratio)
- **Text Editing**: Click-to-edit text content
- **Impact**: Moves from "Basic" to "Good" functionality

#### 1.3 Multi-Select & Operations (3 points)
- **Shift+Click**: Multi-select shapes
- **Delete Key**: Delete selected shapes
- **Duplicate**: Ctrl+D to duplicate selected shapes
- **Impact**: Essential for "Good" rating

#### 1.4 Transform Operations (2 points)
- **Resize Handles**: Visual resize controls
- **Rotation**: Basic rotation (90° increments)
- **Move with Arrow Keys**: Keyboard navigation
- **Impact**: Completes "Good" functionality rating

### Phase 2: Advanced Figma Features (Target: +12 points)
**Points**: 12 | **ROI**: High

#### 2.1 Tier 1 Features (6 points - pick 3)
- **Color Picker with Recent Colors** (2 pts)
- **Undo/Redo with Keyboard Shortcuts** (2 pts)
- **Keyboard Shortcuts** (Delete, Duplicate, Arrow keys) (2 pts)

#### 2.2 Tier 2 Features (6 points - pick 2)
- **Layers Panel with Drag-to-Reorder** (3 pts)
- **Alignment Tools** (align left/right/center) (3 pts)

### Phase 3: AI Canvas Agent (Target: +25 points)
**Points**: 25 | **ROI**: Medium-High

#### 3.1 Basic AI Commands (10 points)
- **Creation Commands**: "Create a red circle", "Add text saying Hello"
- **Manipulation Commands**: "Move the blue rectangle to center"
- **Layout Commands**: "Arrange shapes in a row"
- **Complex Commands**: "Create a login form"

#### 3.2 AI Performance & Reliability (7 points)
- **Sub-2 second responses**
- **90%+ accuracy**
- **Natural UX with feedback**
- **Shared state integration**

#### 3.3 Complex Command Execution (8 points)
- **Multi-step operations work**
- **Smart positioning and styling**
- **Handles ambiguity well**

---

## 3) Detailed Implementation Plan

### Phase 1: Canvas Feature Expansion

#### 1.1 Shape Type System
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
  // New properties
  text?: string;
  fontSize?: number;
  strokeWidth?: number;
  // ... existing properties
}
```

**Implementation Strategy**:
- Extend existing Shape component with type discrimination
- Add new Konva components (Circle, Text, Line)
- Update Firestore schema (backward compatible)
- Add shape creation buttons to toolbar

#### 1.2 Shape Editing System
```typescript
// Add editing state to store
interface CanvasState {
  editingShapeId: string | null;
  setEditingShape: (id: string | null) => void;
  updateShapeProperty: (id: string, property: string, value: any) => void;
}
```

**Implementation Strategy**:
- Add property editing UI (color picker, size inputs)
- Implement click-to-edit for text
- Add visual feedback for editing mode
- Update Firestore with new properties

#### 1.3 Multi-Select System
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
```

**Implementation Strategy**:
- Modify Shape component for multi-select
- Add keyboard event handlers
- Implement bulk operations
- Add visual selection indicators

### Phase 2: Advanced Features

#### 2.1 Color System
```typescript
interface ColorPalette {
  recent: string[];
  saved: string[];
  default: string[];
}

// Add to store
interface CanvasState {
  colorPalette: ColorPalette;
  addRecentColor: (color: string) => void;
  saveColor: (color: string) => void;
}
```

#### 2.2 Undo/Redo System
```typescript
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

#### 2.3 Layers Panel
```typescript
interface Layer {
  id: string;
  name: string;
  shapes: string[];
  visible: boolean;
  locked: boolean;
  order: number;
}
```

### Phase 3: AI Integration

#### 3.1 Command Parser
```typescript
interface AICommand {
  type: 'CREATE' | 'MANIPULATE' | 'LAYOUT' | 'COMPLEX';
  action: string;
  parameters: Record<string, any>;
  confidence: number;
}

class AICommandParser {
  parseCommand(text: string): AICommand;
  executeCommand(command: AICommand): Promise<void>;
}
```

#### 3.2 AI Service Integration
- **Option A**: OpenAI GPT-4 API for command interpretation
- **Option B**: Local AI model (smaller, faster, private)
- **Option C**: Hybrid approach (local parsing + cloud AI for complex commands)

---

## 4) Risk Assessment & Mitigation

### High-Risk Areas
1. **AI Integration Complexity**
   - **Risk**: AI commands may be unreliable or slow
   - **Mitigation**: Start with simple, deterministic commands; add AI gradually
   - **Fallback**: Manual command interface if AI fails

2. **Performance Degradation**
   - **Risk**: Additional features may impact 60 FPS target
   - **Mitigation**: Maintain current optimization patterns; profile each addition
   - **Fallback**: Feature flags to disable heavy features if needed

3. **Firestore Schema Changes**
   - **Risk**: Breaking existing data or sync
   - **Mitigation**: Backward-compatible schema evolution
   - **Fallback**: Migration scripts for existing shapes

### Medium-Risk Areas
1. **Multi-Select Complexity**
   - **Risk**: Complex state management for selections
   - **Mitigation**: Leverage existing Zustand patterns
   - **Fallback**: Single-select mode if issues arise

2. **Shape Type System**
   - **Risk**: Different shapes may have different interaction patterns
   - **Mitigation**: Unified shape interface with type-specific behaviors
   - **Fallback**: Start with rectangles, add others incrementally

---

## 5) Success Metrics & Targets

### Performance Targets (Maintain)
- ✅ 60 FPS during all interactions
- ✅ < 100ms shape sync between users
- ✅ < 50ms cursor position updates
- ✅ Support 5+ concurrent users
- ✅ Handle 500+ shapes without degradation

### Feature Targets
- **Phase 1**: 4+ shape types, multi-select, basic editing
- **Phase 2**: 3+ Tier 1 features, 2+ Tier 2 features
- **Phase 3**: 8+ AI command types, 90%+ accuracy

### Rubric Score Targets
- **Current**: 45-52/105
- **Phase 1 Complete**: 55-64/105
- **Phase 2 Complete**: 71-80/105
- **Phase 3 Complete**: 96-105/105

---

## 7) Technical Architecture Updates

### Store Extensions
```typescript
interface CanvasState {
  // Existing state...
  
  // New: Shape types and editing
  shapeTypes: ShapeType[];
  editingShapeId: string | null;
  
  // New: Multi-select
  selectedShapeIds: string[];
  
  // New: Color system
  colorPalette: ColorPalette;
  
  // New: History
  history: HistoryState;
  
  // New: Layers
  layers: Layer[];
  
  // New: AI
  aiCommands: AICommand[];
  aiStatus: 'idle' | 'processing' | 'error';
}
```

### Component Updates
```typescript
// New components needed
- ColorPicker.tsx
- LayersPanel.tsx
- AICommandInput.tsx
- ShapePropertyEditor.tsx
- MultiSelectOverlay.tsx
```

### Service Extensions
```typescript
// New services
- aiService.ts (command parsing and execution)
- historyService.ts (undo/redo management)
- layerService.ts (layer management)
- colorService.ts (color palette management)
```

---

## 8) Deployment Strategy

### Incremental Deployment
1. **Phase 1**: Deploy canvas features (backward compatible)
2. **Phase 2**: Deploy advanced features (with feature flags)
3. **Phase 3**: Deploy AI features (with fallback to manual)

### Feature Flags
```typescript
interface FeatureFlags {
  enableMultiSelect: boolean;
  enableShapeEditing: boolean;
  enableAICommands: boolean;
  enableAdvancedFeatures: boolean;
}
```

### Rollback Plan
- Each phase can be disabled via feature flags
- Database schema changes are backward compatible
- Performance monitoring alerts if targets missed

---

## 9) Acceptance Criteria

### Phase 1 Acceptance Criteria
- [ ] 4+ shape types available (rect, circle, text, line)
- [ ] Multi-select works with Shift+Click
- [ ] Delete key removes selected shapes
- [ ] Color picker changes shape colors
- [ ] Text shapes are editable by clicking
- [ ] Performance maintains 60 FPS target
- [ ] All features work in multi-user environment

### Phase 2 Acceptance Criteria
- [ ] Color picker shows recent colors
- [ ] Undo/Redo works with Cmd+Z/Cmd+Shift+Z
- [ ] Keyboard shortcuts work (Delete, Duplicate, Arrow keys)
- [ ] Layers panel shows shape hierarchy
- [ ] Alignment tools work for selected shapes
- [ ] All features maintain real-time sync

### Phase 3 Acceptance Criteria
- [ ] AI understands 8+ command types
- [ ] Commands execute in <2 seconds
- [ ] 90%+ accuracy on command interpretation
- [ ] Complex commands create multiple elements
- [ ] AI works in multi-user environment
- [ ] Fallback to manual interface available

---

## 10) Future Considerations

### Post-Rubric Enhancements
- **Additional Shape Types**: Polygons, arrows, connectors
- **Advanced AI**: Voice commands, image generation
- **Collaboration Features**: Comments, version history
- **Export Options**: PNG, SVG, PDF export
- **Mobile Support**: Touch-optimized interface

### Scalability Improvements
- **Infinite Canvas**: Remove viewport bounds
- **Board Management**: Multiple boards per user
- **Team Features**: User roles and permissions
- **Enterprise Features**: SSO, audit logs

---

## Summary

This final PRD transforms the completed CollabCanvas MVP into a high-scoring collaborative canvas application. By focusing on high-ROI features that build upon the solid foundation, we can achieve 100-105/105 rubric points with strategic implementation of:

1. **Canvas Feature Expansion** (10-12 points)
2. **Advanced Figma Features** (12 points)  
3. **AI Canvas Agent** (25 points)

The implementation is designed to maintain current performance levels while adding significant functionality that directly addresses rubric requirements. Each phase builds upon the previous, ensuring a stable evolution from MVP to full-featured application.
