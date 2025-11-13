# UI Component Inventory

## Overview

CollabCanvas uses React 19 with TypeScript for all UI components. Components are organized by functionality: canvas rendering, tools, panels, overlays, and dialogs.

## Component Categories

### Canvas Components

#### `Canvas.tsx`
**Purpose**: Main Konva canvas component with pan/zoom support

**Features**:
- Konva Stage and Layer setup
- Pan (click and drag)
- Zoom (mouse wheel, 0.1x to 5x)
- Viewport-sized bounded canvas
- Auto-resize with window
- FPS tracking
- Shape rendering
- Drawing tools (polyline, polygon)
- Selection box
- Transform controls
- Snap indicators
- Scale line rendering
- Background image rendering

**Props**:
```typescript
interface CanvasProps {
  onFpsUpdate?: (fps: number) => void;
  onZoomChange?: (scale: number) => void;
  showLayersPanel?: boolean;
  showAlignmentToolbar?: boolean;
  onCloseLayersPanel?: () => void;
  onCloseAlignmentToolbar?: () => void;
}
```

**Ref Methods**:
- `getViewportCenter()` - Get viewport center coordinates
- `getStage()` - Get Konva Stage instance
- `activatePolylineTool()` - Activate polyline drawing tool
- `activatePolygonTool()` - Activate polygon drawing tool
- `deactivateDrawingTools()` - Deactivate all drawing tools

#### `Shape.tsx`
**Purpose**: Render individual Konva shapes

**Supported Types**: rect, circle, text, line, polyline, polygon

**Features**:
- Shape rendering based on type
- Selection highlighting
- Transform handles
- Click and drag interaction
- Property updates

### Tool Components

#### `Toolbar.tsx`
**Purpose**: Top navigation bar with controls

**Features**:
- User authentication display
- FPS counter
- Zoom indicator
- Shape creation buttons
- Undo/redo controls
- Delete/duplicate controls
- Export dialog trigger
- Layers panel toggle
- Alignment toolbar toggle
- Grid toggle
- Shortcuts help
- File upload
- Scale tool
- Material estimation panel
- AI chat interface

#### `ScaleTool.tsx`
**Purpose**: Scale reference tool for construction plans

**Features**:
- Two-point scale line creation
- Measurement input dialog
- Unit selection (feet, meters, inches, etc.)
- Scale line visualization

#### `PolylineTool.tsx`
**Purpose**: Polyline drawing tool for wall measurements

**Features**:
- Click-to-click drawing
- Real-time length calculation
- Measurement display
- Preview line rendering

#### `PolygonTool.tsx`
**Purpose**: Polygon drawing tool for room area measurements

**Features**:
- Click-to-click drawing
- Real-time area calculation
- Measurement display
- Preview polygon rendering

### Panel Components

#### `LayersPanel.tsx`
**Purpose**: Layer management panel

**Features**:
- Layer list display
- Create new layer
- Delete layer
- Toggle layer visibility
- Toggle layer lock
- Set active layer
- Reorder layers
- Layer color assignment
- Shape count per layer
- Layer totals (measurements)

#### `ShapePropertiesPanel.tsx`
**Purpose**: Properties editor for selected shapes

**Features**:
- Position editing (x, y)
- Size editing (width, height)
- Color picker
- Rotation control
- Text editing (for text shapes)
- Font size control (for text shapes)

#### `MaterialEstimationPanel.tsx`
**Purpose**: Material estimation and BOM panel

**Features**:
- Material calculation display
- Bill of Materials (BOM)
- Material dialogue interface
- Export BOM functionality
- User preferences

#### `AlignmentToolbar.tsx`
**Purpose**: Alignment and distribution tools

**Features**:
- Align left/center/right
- Align top/middle/bottom
- Distribute horizontally
- Distribute vertically

### Overlay Components

#### `CursorOverlay.tsx`
**Purpose**: Display other users' cursors

**Features**:
- Real-time cursor positions
- User name display
- User color coding
- Active/inactive state

#### `LockOverlay.tsx`
**Purpose**: Display shape locks

**Features**:
- Lock indicator on shapes
- User name display
- Lock duration display

#### `SelectionBox.tsx`
**Purpose**: Drag selection box

**Features**:
- Drag-to-select functionality
- Visual selection rectangle
- Multi-shape selection

#### `TransformControls.tsx`
**Purpose**: Transform handles for selected shapes

**Features**:
- Move handles
- Resize handles (8 directions)
- Rotate handle
- Visual feedback

#### `SnapIndicators.tsx`
**Purpose**: Visual snap-to-grid indicators

**Features**:
- Horizontal snap lines
- Vertical snap lines
- Corner snap indicators

### Display Components

#### `FPSCounter.tsx`
**Purpose**: Display FPS counter

**Features**:
- Real-time FPS display
- Color-coded (green/yellow/red)
- Throttled updates (1Hz)

#### `ZoomIndicator.tsx`
**Purpose**: Display zoom level

**Features**:
- Current zoom percentage
- Zoom controls

#### `MeasurementDisplay.tsx`
**Purpose**: Display measurements for shapes

**Features**:
- Length display (for polylines)
- Area display (for polygons)
- Unit conversion
- Real-time updates

#### `MeasurementInput.tsx`
**Purpose**: Input dialog for scale measurements

**Features**:
- Measurement value input
- Unit selection
- Validation

### Dialog Components

#### `ExportDialog.tsx`
**Purpose**: Canvas export dialog

**Features**:
- Format selection (PNG/SVG)
- Quality settings
- Include background option
- Selected only option
- Dimensions input

#### `AIClarificationDialog.tsx`
**Purpose**: AI command clarification dialog

**Features**:
- Clarification questions
- Option selection
- Shape identification

#### `MaterialDialogueBox.tsx`
**Purpose**: Material estimation dialogue

**Features**:
- Conversation interface
- Clarification requests
- Refinement suggestions
- Material selection

### Input Components

#### `FileUpload.tsx`
**Purpose**: File upload for background images

**Features**:
- Drag and drop
- File selection dialog
- Image preview
- Validation (PNG/JPG)
- Firebase Storage upload

#### `ColorPicker.tsx`
**Purpose**: Color selection component

**Features**:
- Color wheel/picker
- Hex input
- Preset colors

#### `TextEditor.tsx`
**Purpose**: Text editing for text shapes

**Features**:
- Inline text editing
- Font size control
- Text formatting

#### `SizeEditor.tsx`
**Purpose**: Size editing component

**Features**:
- Width/height inputs
- Aspect ratio lock
- Validation

### AI Components

#### `AICommandInput.tsx`
**Purpose**: AI command input interface

**Features**:
- Natural language input
- Command history
- Status display
- Error handling

#### `UnifiedAIChat.tsx`
**Purpose**: Unified AI chat interface

**Features**:
- Chat interface
- Command processing
- History display
- Status indicators

### Utility Components

#### `AuthButton.tsx`
**Purpose**: Authentication button

**Features**:
- Sign in/Sign out toggle
- User info display
- Google OAuth integration

#### `ShortcutsHelp.tsx`
**Purpose**: Keyboard shortcuts help dialog

**Features**:
- Shortcut list
- Category organization
- Search functionality

#### `DiagnosticsHud.tsx`
**Purpose**: Performance diagnostics HUD

**Features**:
- FPS display
- Latency metrics
- Network status
- Performance warnings
- Toggle via Shift+D

#### `ScaleLine.tsx`
**Purpose**: Scale line visualization component

**Features**:
- Scale line rendering
- Measurement display
- Unit display

## Component Organization

### File Structure

```
src/components/
├── Canvas.tsx              # Main canvas
├── Shape.tsx               # Shape rendering
├── Toolbar.tsx             # Top toolbar
├── LayersPanel.tsx          # Layer management
├── ShapePropertiesPanel.tsx # Properties editor
├── MaterialEstimationPanel.tsx # Material estimation
├── AlignmentToolbar.tsx    # Alignment tools
├── CursorOverlay.tsx       # Cursor overlay
├── LockOverlay.tsx         # Lock overlay
├── SelectionBox.tsx        # Selection box
├── TransformControls.tsx   # Transform handles
├── SnapIndicators.tsx      # Snap indicators
├── FPSCounter.tsx          # FPS display
├── ZoomIndicator.tsx       # Zoom display
├── MeasurementDisplay.tsx  # Measurement display
├── MeasurementInput.tsx    # Measurement input
├── ExportDialog.tsx        # Export dialog
├── AIClarificationDialog.tsx # AI clarification
├── MaterialDialogueBox.tsx # Material dialogue
├── FileUpload.tsx          # File upload
├── ColorPicker.tsx         # Color picker
├── TextEditor.tsx          # Text editor
├── SizeEditor.tsx          # Size editor
├── AICommandInput.tsx      # AI input
├── UnifiedAIChat.tsx       # AI chat
├── AuthButton.tsx          # Auth button
├── ShortcutsHelp.tsx       # Shortcuts help
├── DiagnosticsHud.tsx      # Diagnostics HUD
├── ScaleLine.tsx           # Scale line
├── ScaleTool.tsx           # Scale tool
├── PolylineTool.tsx        # Polyline tool
└── PolygonTool.tsx         # Polygon tool
```

## Component Patterns

### State Management
- Components use `useCanvasStore` hook for state access
- Selective subscriptions to minimize re-renders
- Imperative refs for performance-critical operations

### Event Handling
- Canvas events handled imperatively via Konva
- React events for UI interactions
- Keyboard shortcuts via `useKeyboardShortcuts` hook

### Performance
- Memoization for expensive components
- Ref-based updates for canvas operations
- Throttled updates for frequent events

### Testing
- Component tests in `*.test.tsx` files
- Integration tests in `annotation.integration.test.ts`
- Test utilities in `src/test/`

## Reusable Components

### Design System
- Consistent styling with Tailwind CSS
- Color scheme: Blue primary (#3B82F6)
- Typography: System fonts
- Spacing: Tailwind spacing scale

### Common Patterns
- Modal dialogs with backdrop
- Panel slide-ins from sides
- Toolbar fixed at top
- Overlays for real-time data







