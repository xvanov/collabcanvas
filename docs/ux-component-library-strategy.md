# CollabCanvas Component Library Strategy

## Design System Foundation

**Base System:** shadcn/ui (Tailwind CSS + Radix UI primitives)

**Theme:** Modern Neutral
- Primary: #0f172a (dark slate)
- Clean, minimal, approachable
- Content-first design

---

## Components from shadcn/ui (Standard)

### Form Components
- **Button** - Primary, secondary, outline variants
- **Input** - Text inputs, number inputs
- **Label** - Form labels
- **Select** - Dropdown selects
- **Checkbox** - Checkboxes
- **Radio Group** - Radio buttons
- **Textarea** - Multi-line text input
- **Switch** - Toggle switches

### Navigation Components
- **Tabs** - Tab navigation (for Time/Space/Money views)
- **Navigation Menu** - Top navigation bar
- **Breadcrumbs** - Breadcrumb navigation (if needed)

### Feedback Components
- **Alert** - Success, error, warning, info messages
- **Toast** - Notification toasts
- **Dialog** - Modal dialogs
- **Popover** - Popover menus
- **Tooltip** - Hover tooltips
- **Progress** - Progress bars/indicators
- **Skeleton** - Loading skeletons

### Data Display Components
- **Table** - Data tables (for BOM display)
- **Card** - Card containers
- **Badge** - Status badges
- **Separator** - Visual separators

### Layout Components
- **Sheet** - Side panels/drawers
- **Dropdown Menu** - Context menus
- **Accordion** - Collapsible sections

---

## Custom Components Required

### 1. Canvas Annotation Tools

**Component:** `CanvasToolbar`
- **Purpose:** Tool selection for annotation (polyline, polygon, etc.)
- **Anatomy:**
  - Tool buttons (polyline, polygon, select, pan, zoom)
  - Active tool indicator
  - Layer selector dropdown
- **States:**
  - Default: Tool buttons visible
  - Active: Selected tool highlighted
  - Disabled: Tool unavailable
- **Behavior:**
  - Click tool → activates tool, updates canvas mode
  - Tool selection persists until changed
- **Accessibility:**
  - ARIA role: toolbar
  - Keyboard navigation: Arrow keys to select tools
  - Screen reader: "Polyline tool selected"

**Component:** `LayerPanel`
- **Purpose:** Layer creation and management
- **Anatomy:**
  - Layer list (name, visibility toggle, color indicator)
  - "Create Layer" button
  - Layer totals display (total length/area per layer)
- **States:**
  - Default: Layer list displayed
  - Active: Selected layer highlighted
  - Hidden: Layer visibility toggled off
- **Behavior:**
  - Click layer → selects layer for annotation
  - Toggle visibility → shows/hides layer annotations
  - Create layer → opens dialog for layer name
- **Accessibility:**
  - ARIA role: list
  - Keyboard navigation: Arrow keys, Enter to select
  - Screen reader: "Layer Walls selected, total length 45 feet"

**Component:** `MeasurementDisplay`
- **Purpose:** Real-time measurement display as user draws
- **Anatomy:**
  - Current measurement value
  - Unit indicator
  - Running total (for layer)
- **States:**
  - Drawing: Shows live measurement
  - Complete: Shows final measurement
  - Hidden: Not drawing
- **Behavior:**
  - Updates in real-time as user draws
  - Displays in canvas coordinate space
- **Accessibility:**
  - Screen reader: "Current measurement: 12 feet"

### 2. Critical Path Visualization

**Component:** `CPMGraph`
- **Purpose:** Visualize critical path method graph
- **Anatomy:**
  - Task nodes (boxes) - size proportional to duration
  - Dependency arrows (connecting tasks)
  - Critical path highlight (different color/thickness)
  - Task labels and durations
- **States:**
  - Default: All tasks visible
  - Hover: Task details tooltip
  - Selected: Task highlighted, edit options shown
  - Completed: Task grayed out (during project)
- **Variants:**
  - Compact view: Smaller nodes, less detail
  - Detailed view: Larger nodes, full task info
- **Behavior:**
  - Click task → Opens edit modal
  - Hover task → Shows tooltip with details
  - Drag nodes → Repositions (optional, for layout)
  - Zoom/Pan → Navigate large graphs
- **Accessibility:**
  - ARIA role: graph
  - Keyboard navigation: Tab through tasks
  - Screen reader: "Task Demo, duration 2 days, dependencies: none, next: Framing"

**Component:** `TaskNode`
- **Purpose:** Individual task in CPM graph
- **Anatomy:**
  - Task name
  - Duration (days)
  - Status indicator (optional)
- **States:**
  - Default: Normal appearance
  - Critical path: Highlighted border/background
  - Completed: Grayed out
  - Selected: Highlighted
- **Behavior:**
  - Click → Opens edit modal
  - Hover → Shows tooltip
- **Accessibility:**
  - ARIA role: button
  - Keyboard: Enter to edit
  - Screen reader: "Task Demo, 2 days"

**Component:** `TaskEditModal`
- **Purpose:** Edit task details (duration, dependencies)
- **Anatomy:**
  - Task name input (read-only or editable)
  - Duration input (number, days)
  - Dependencies multi-select
  - Notes textarea
  - Save/Cancel buttons
- **States:**
  - Open: Modal visible
  - Valid: Save enabled
  - Invalid: Save disabled, error shown
- **Behavior:**
  - Change duration → Recalculates critical path
  - Change dependencies → Validates, updates graph
  - Save → Updates graph, closes modal
- **Accessibility:**
  - ARIA role: dialog
  - Focus trap: Focus stays in modal
  - Screen reader: "Edit task dialog, Demo, duration 2 days"

### 3. BOM Display & Management

**Component:** `BOMTable`
- **Purpose:** Display Bill of Materials with prices
- **Anatomy:**
  - Table columns: Material, Quantity, Unit, Unit Price, Total Price, Source Link
  - Grouping by category (Walls, Floors, etc.)
  - Grand total row
  - Export buttons
- **States:**
  - Loading: Skeleton rows
  - Loaded: Full table with data
  - Price fetching: Loading indicator per row
  - Price error: "Price unavailable" with manual entry
- **Variants:**
  - Compact: Smaller rows, less spacing
  - Detailed: Larger rows, more information
- **Behavior:**
  - Sort by column → Reorders rows
  - Filter by category → Shows/hides groups
  - Click source link → Opens supplier page
  - Edit inline → Updates BOM
- **Accessibility:**
  - ARIA role: table
  - Keyboard navigation: Arrow keys, Tab
  - Screen reader: "BOM table, 24 rows, Material column, Quantity column..."

**Component:** `ScenarioSelector`
- **Purpose:** Switch between BOM scenarios
- **Anatomy:**
  - Scenario tabs (Base, Scenario 1, Scenario 2, etc.)
  - "Create Scenario" button
  - Scenario comparison summary (optional)
- **States:**
  - Default: Tabs displayed
  - Active: Selected scenario highlighted
  - Creating: Modal open
- **Behavior:**
  - Click tab → Switches BOM view
  - Click "Create Scenario" → Opens creation modal
  - Delete scenario → Confirmation dialog
- **Accessibility:**
  - ARIA role: tablist
  - Keyboard navigation: Arrow keys to switch tabs
  - Screen reader: "Scenario tabs, Base selected"

**Component:** `ScenarioCreationModal`
- **Purpose:** Create new BOM scenario
- **Anatomy:**
  - Scenario name input
  - Layer selection checkboxes
  - Material inclusion/exclusion options
  - Create/Cancel buttons
- **States:**
  - Open: Modal visible
  - Valid: Create enabled (name entered, layers selected)
  - Invalid: Create disabled
- **Behavior:**
  - Select layers → Updates preview
  - Enter name → Enables create button
  - Create → Generates scenario, adds tab
- **Accessibility:**
  - ARIA role: dialog
  - Focus trap
  - Screen reader: "Create scenario dialog"

**Component:** `PreFlightChecklist`
- **Purpose:** Completeness enforcement before generation
- **Anatomy:**
  - Checklist items (Critical and Recommended sections)
  - Status indicators (✓, ⚠, ✗)
  - Action buttons for missing items
  - Generate options (BOM, Critical Path checkboxes)
  - Generate button
- **States:**
  - Checking: Validating requirements
  - Complete: All critical items ✓, Generate enabled
  - Incomplete: Missing critical items, Generate disabled
- **Behavior:**
  - Auto-checks on open
  - Click action button → Navigates to fix issue
  - All critical ✓ → Enable Generate button
  - Generate → Closes modal, starts generation
- **Accessibility:**
  - ARIA role: dialog
  - Screen reader: "Pre-flight checklist, Scale reference: complete, Layers: complete..."

### 4. Export Components

**Component:** `ExportMenu`
- **Purpose:** Export options for different views
- **Anatomy:**
  - Export button/dropdown
  - Format options (PDF, CSV, PNG for canvas)
  - Export-specific options (e.g., include prices, include totals)
- **States:**
  - Default: Button visible
  - Open: Dropdown menu visible
  - Exporting: Progress indicator
- **Behavior:**
  - Click export → Shows format options
  - Select format → Generates file, downloads
  - CSV exports: Separate files for materials, labor, critical path
- **Accessibility:**
  - ARIA role: button/menu
  - Keyboard navigation: Arrow keys, Enter
  - Screen reader: "Export menu, PDF, CSV options"

---

## Component Customization Needs

### shadcn/ui Components Requiring Customization:

1. **Table Component**
   - Custom styling for BOM table
   - Grouping by category
   - Inline editing capability
   - Price formatting

2. **Tabs Component**
   - Custom styling for Time/Space/Money navigation
   - Icon integration
   - Active state styling

3. **Dialog Component**
   - Custom sizing for PreFlightChecklist
   - Custom styling for modals
   - Focus management

4. **Button Component**
   - Custom variants for canvas tools
   - Icon-only buttons for toolbar
   - Active state styling

---

## Component Specifications Summary

### Standard Components (shadcn/ui)
- Forms: Button, Input, Select, Checkbox, Radio, Textarea, Switch
- Navigation: Tabs, Navigation Menu, Breadcrumbs
- Feedback: Alert, Toast, Dialog, Popover, Tooltip, Progress, Skeleton
- Data Display: Table, Card, Badge, Separator
- Layout: Sheet, Dropdown Menu, Accordion

### Custom Components Required
1. **Canvas Tools:**
   - CanvasToolbar
   - LayerPanel
   - MeasurementDisplay

2. **Critical Path:**
   - CPMGraph
   - TaskNode
   - TaskEditModal

3. **BOM Management:**
   - BOMTable
   - ScenarioSelector
   - ScenarioCreationModal
   - PreFlightChecklist

4. **Export:**
   - ExportMenu

### Total Component Count
- **Standard (shadcn/ui):** ~25 components
- **Custom Components:** 11 components
- **Total:** 36 components

---

## Implementation Priority

### Phase 1 (MVP):
1. CanvasToolbar
2. LayerPanel
3. MeasurementDisplay
4. BOMTable
5. PreFlightChecklist
6. ExportMenu

### Phase 2 (Critical Path):
7. CPMGraph
8. TaskNode
9. TaskEditModal

### Phase 3 (Multi-Scenario):
10. ScenarioSelector
11. ScenarioCreationModal

---

_This component library strategy balances shadcn/ui's proven components with custom components needed for CollabCanvas's unique canvas annotation, critical path visualization, and BOM management features._





