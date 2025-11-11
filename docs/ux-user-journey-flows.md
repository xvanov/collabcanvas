# CollabCanvas UX Design Specification - User Journey Flows

## Flow 1: Complete Project Estimation (Primary Flow)

**User Goal:** Generate accurate BOM and Critical Path from annotated construction plan

**Journey Steps:**

### Step 1: Project Setup
- **Screen:** Project Dashboard (Time/Space/Money tabs visible)
- **User sees:** List of projects or "New Project" button
- **User does:** Clicks "New Project" → enters project name
- **System responds:** Creates project, navigates to Space view (canvas)

### Step 2: Plan Upload & Scale Setup
- **Screen:** Space view (Canvas)
- **User sees:** Empty canvas with upload prompt
- **User does:** Uploads construction plan (PNG/JPG/PDF)
- **System responds:** Plan appears as canvas background
- **User does:** Sets scale reference (draws line, enters real-world measurement)
- **System responds:** Scale applied, measurements now accurate

### Step 3: Layer Creation & Annotation
- **Screen:** Space view (Canvas)
- **User sees:** Canvas with plan, layer panel, annotation tools
- **User does:** Creates layers (Walls, Floors, Cabinets, etc.)
- **User does:** Selects layer, uses polyline/polygon tools to annotate
- **System responds:** Real-time measurement display, layer totals update
- **User continues:** Annotates all relevant areas

### Step 4: Pre-Flight Completeness Check
- **Screen:** Space view → "Generate" button clicked
- **User sees:** Pre-flight checklist modal:
  ```
  ✓ Scale reference set
  ✓ At least one layer created
  ✓ At least one annotation drawn
  ⚠ Scope of work uploaded (optional but recommended)
  ⚠ Material preferences specified (optional but recommended)
  ```
- **System checks:**
  - Scale reference exists? → ✓ or ⚠
  - Layers exist with annotations? → ✓ or ⚠
  - Scope of work uploaded? → ✓ or ⚠
  - Material preferences set? → ✓ or ⚠
- **User sees:** 
  - If all critical items ✓: "Ready to generate" button enabled
  - If missing critical items: "Complete required items first" (button disabled, shows what's missing)
  - Optional items show as warnings but don't block

### Step 5: Generate Selection
- **Screen:** Pre-flight modal (after checklist passes)
- **User sees:** Generation options:
  ```
  Generate:
  ☑ BOM (Bill of Materials)
  ☑ Critical Path Graph
  
  [Generate Both] [Generate BOM Only] [Generate Critical Path Only]
  ```
- **User does:** Selects what to generate (default: both checked)
- **User does:** Clicks generate button
- **System responds:** Closes modal, shows progress indicator

### Step 6: Parallel Generation
- **Screen:** Space view → Progress overlay
- **User sees:** 
  ```
  Generating...
  ✓ Analyzing annotations
  ⏳ Generating BOM... (if selected)
  ⏳ Calculating Critical Path... (if selected)
  ```
- **System does:** 
  - AI analyzes annotations and scope of work
  - Generates BOM with materials and quantities (if selected)
  - Calculates task dependencies and durations for Critical Path (if selected)
  - Both processes run in parallel

### Step 7: Results Display
- **Screen:** After generation completes
- **If BOM generated:** User automatically navigated to Money view
  - **User sees:** Complete BOM table with:
    - Material name
    - Quantity
    - Unit
    - Unit price (auto-fetched from Home Depot)
    - Total price
    - Price source link
  - **User sees:** Multi-scenario selector (if applicable)
- **If Critical Path generated:** User can navigate to Time view
  - **User sees:** CPM graph with:
    - Task nodes (size proportional to duration)
    - Dependencies (arrows)
    - Critical path highlighted
    - Total project duration

### Step 8: Multi-Scenario BOM Creation (Optional)
- **Screen:** Money view (BOM displayed)
- **User sees:** Current BOM + "Create Scenario" button
- **User does:** Clicks "Create Scenario" → enters scenario name (e.g., "Shower Only")
- **User does:** Selects which layers/materials to include/exclude
- **System responds:** Generates new BOM variant
- **User sees:** Scenario tabs: "Base" | "Shower Only" | "Shower + Tub" | "Shower + Tub + Floor"
- **User does:** Switches between scenarios, compares totals
- **User does:** Exports specific scenario as PDF/CSV

### Step 9: Export & Share
- **Screen:** Money view or Time view
- **User sees:** Export button
- **User does:** Clicks export → selects format (PDF, CSV for materials, CSV for labor, CSV for critical path)
- **System responds:** Generates file, downloads
- **User does:** Shares with client or team

**Decision Points:**
- Generate both vs. one only → User choice at Step 5
- Multi-scenario creation → Optional at Step 8
- Export format → User choice at Step 9

**Error States:**
- Missing scale reference → Pre-flight check blocks, shows "Set scale reference first"
- No annotations → Pre-flight check blocks, shows "Annotate at least one area"
- Price fetch fails → Shows "Price unavailable" with manual entry option
- AI generation fails → Shows error message with retry option

**Success State:**
- BOM generated with all materials and prices
- Critical Path shows complete task sequence with durations
- User feels confident in accuracy and completeness

---

## Flow 2: Multi-Scenario BOM Comparison

**User Goal:** Generate multiple BOM versions for different project scopes to present options to client

**Journey Steps:**

### Step 1: Base BOM Exists
- **Screen:** Money view
- **User sees:** Complete BOM from base annotations
- **User sees:** "Create Scenario" button

### Step 2: Create First Scenario
- **User does:** Clicks "Create Scenario"
- **User sees:** Scenario creation modal:
  ```
  Scenario Name: [Shower Only]
  
  Include Layers:
  ☑ Walls (Interior)
  ☑ Flooring (Shower area)
  ☐ Flooring (Bathroom floor)
  ☐ Tub area
  ☐ Vanity
  
  [Create Scenario]
  ```
- **User does:** Names scenario, selects layers to include
- **System responds:** Generates new BOM variant, adds scenario tab

### Step 3: Create Additional Scenarios
- **User does:** Repeats Step 2 for "Shower + Tub" and "Shower + Tub + Floor"
- **User sees:** Multiple scenario tabs: "Base" | "Shower Only" | "Shower + Tub" | "Shower + Tub + Floor"

### Step 4: Compare Scenarios
- **Screen:** Money view with scenario tabs
- **User sees:** 
  - Scenario tabs at top
  - Current scenario's BOM table
  - Scenario comparison summary (if available):
    ```
    Base: $24,500
    Shower Only: $8,200
    Shower + Tub: $15,300
    Shower + Tub + Floor: $24,500
    ```
- **User does:** Switches between tabs to review each scenario
- **User does:** Can edit individual scenarios if needed

### Step 5: Export Scenarios
- **User does:** Selects scenario tab
- **User does:** Clicks export → selects format
- **System responds:** Exports that scenario's BOM
- **User can:** Export all scenarios as separate files or combined comparison

**Decision Points:**
- Which layers to include → User selects per scenario
- How many scenarios → User decides
- Export format → User choice

**Error States:**
- No layers selected → "Select at least one layer"
- Scenario name duplicate → "Scenario name already exists"

**Success State:**
- Multiple scenarios created and compared
- User can present options to client
- Clear cost differences visible

---

## Flow 3: Critical Path Visualization & Editing

**User Goal:** View and customize the AI-generated critical path for project scheduling

**Journey Steps:**

### Step 1: Navigate to Time View
- **Screen:** Any view
- **User does:** Clicks "Time" tab in top navigation
- **System responds:** Navigates to Time view

### Step 2: View Critical Path Graph
- **Screen:** Time view
- **User sees:** CPM graph visualization:
  - Task nodes (boxes) sized by duration
  - Dependencies (arrows between tasks)
  - Critical path highlighted (different color/thickness)
  - Task details on hover/click:
    ```
    Demo
    Duration: 2 days
    Dependencies: None
    Next: Framing
    ```
- **User sees:** If no Critical Path exists: "Generate Critical Path" button

### Step 3: Generate Critical Path (if needed)
- **User does:** Clicks "Generate Critical Path"
- **System checks:** Pre-flight checklist (same as BOM - annotations exist)
- **System responds:** Generates Critical Path from annotations and scope
- **User sees:** Progress → Results displayed

### Step 4: Edit Critical Path (Optional)
- **User sees:** Task nodes are interactive
- **User does:** Clicks task node → Edit modal opens:
  ```
  Task: Demo
  Duration: [2] days
  Dependencies: [None] → [Select: Framing, Plumbing]
  Notes: [Optional notes]
  
  [Save] [Cancel]
  ```
- **User does:** Modifies duration or dependencies
- **System responds:** Recalculates Critical Path, updates visualization
- **User sees:** Updated graph with new critical path highlighted

### Step 5: Mark Tasks Complete (During Project)
- **Screen:** Time view (project in progress)
- **User sees:** Task nodes with completion status
- **User does:** Clicks completed task → Marks as done
- **System responds:** Updates visualization, shows progress
- **User sees:** Completed tasks grayed out, remaining path highlighted

### Step 6: Export Critical Path
- **User does:** Clicks export → selects format (PDF, CSV)
- **System responds:** Exports Critical Path data:
  - CSV: Task, Duration, Dependencies, Start Date, End Date
  - PDF: Visual graph + task list

**Decision Points:**
- Edit tasks → User choice
- Mark complete → User updates as project progresses
- Export format → User choice

**Error States:**
- Circular dependency → "Cannot create circular dependency"
- Invalid duration → "Duration must be positive"

**Success State:**
- Critical Path visualized clearly
- User understands project timeline and dependencies
- Can export for scheduling

---

## Flow 4: Completeness Enforcement - Pre-Flight Check Details

**User Goal:** Ensure all required information is provided before BOM/Critical Path generation

**Pre-Flight Checklist Items:**

### Critical (Must Have):
1. **Scale Reference Set**
   - Check: Scale reference line exists on canvas
   - If missing: "Set scale reference to enable accurate measurements"
   - Action: User must draw scale line and enter measurement

2. **Layers Created**
   - Check: At least one layer exists
   - If missing: "Create at least one layer to organize annotations"
   - Action: User must create layer

3. **Annotations Exist**
   - Check: At least one annotation (polyline or polygon) exists on a layer
   - If missing: "Annotate at least one area on the canvas"
   - Action: User must draw annotations

### Recommended (Warnings, Don't Block):
4. **Scope of Work Uploaded**
   - Check: Scope of work document uploaded to project
   - If missing: ⚠ "Upload scope of work for more accurate BOM generation"
   - Action: User can proceed or upload

5. **Material Preferences Specified**
   - Check: Material preferences set (e.g., "prefer LVP over carpet")
   - If missing: ⚠ "Specify material preferences for better accuracy"
   - Action: User can proceed or set preferences

**Pre-Flight Modal UI:**
```
┌─────────────────────────────────────────┐
│ Pre-Flight Check                       │
├─────────────────────────────────────────┤
│                                         │
│ Critical Requirements:                 │
│ ✓ Scale reference set                  │
│ ✓ Layers created                       │
│ ✓ Annotations exist                    │
│                                         │
│ Recommended (Optional):                 │
│ ⚠ Scope of work uploaded               │
│ ⚠ Material preferences specified       │
│                                         │
│ [Upload Scope] [Set Preferences]       │
│                                         │
│ Generate:                               │
│ ☑ BOM                                  │
│ ☑ Critical Path                        │
│                                         │
│ [Generate] [Cancel]                     │
└─────────────────────────────────────────┘
```

**User Experience:**
- If all critical ✓: "Generate" button enabled, user proceeds
- If missing critical: "Generate" button disabled, shows what's needed
- Warnings shown but don't block generation
- User can address warnings or proceed

---

## Flow Summary: Three-View Navigation Pattern

**Time View (Critical Path):**
- CPM graph visualization
- Task dependencies and durations
- Project timeline
- Export: CSV for scheduling

**Space View (Canvas):**
- Plan upload and display
- Scale reference setup
- Layer creation and management
- Annotation tools (polyline, polygon)
- Measurement display
- Export: Canvas image

**Money View (Estimate):**
- BOM table with materials and prices
- Multi-scenario BOM comparison
- Cost totals and breakdowns
- Export: PDF estimate, CSV materials

**Navigation:**
- Top navigation bar with three tabs: Time | Space | Money
- Simple, stoic, down-to-earth naming
- Equal importance to all three views
- Easy switching between views

---

_These user journey flows ensure completeness enforcement while maintaining a smooth, efficient workflow. The pre-flight check prevents incomplete BOMs while the parallel generation of BOM and Critical Path saves time._




