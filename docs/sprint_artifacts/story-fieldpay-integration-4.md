# Story 1.4: Timeline Visualization (Mermaid.js)

**Status:** Draft

---

## User Story

As a **project manager**,
I want to visualize project timelines with Gantt charts and dependency graphs,
So that I can understand task sequencing and critical path at a glance.

---

## Acceptance Criteria

**AC #1:** Gantt chart displays all tasks with durations
- **Given** labor estimate with CPM tasks exists
- **When** user navigates to Timeline View
- **Then** Mermaid.js Gantt chart renders showing all tasks
- **And** each task bar shows duration (start to end date)
- **And** task bars are positioned based on earliest start dates

**AC #2:** Critical path tasks are highlighted in red
- **Given** CPM calculation has identified critical path
- **When** Gantt chart renders
- **Then** critical path tasks have red fill color
- **And** non-critical tasks have default blue fill color

**AC #3:** Dependency graph shows task relationships
- **Given** tasks have dependencies
- **When** user clicks "Dependency Graph" tab
- **Then** Mermaid.js flowchart renders showing task nodes and arrows
- **And** arrows point from predecessor to successor
- **And** critical path edges are highlighted in red

**AC #4:** Chart export works for PNG and SVG
- **Given** timeline view is displayed
- **When** user clicks "Export as PNG"
- **Then** chart downloads as PNG file with current viewport
- **And** clicking "Export as SVG" downloads scalable vector version

**AC #5:** Charts are responsive and performant
- **Given** project has 50+ tasks
- **When** chart renders
- **Then** render completes in < 2 seconds
- **And** chart scales to fit container without horizontal scroll (unless zoomed)

---

## Implementation Details

### Tasks / Subtasks

**Backend Tasks:**
- [ ] No backend changes required for this story (uses existing labor estimate data from Story 1.3)

**Frontend Tasks:**
- [ ] Install Mermaid.js dependency (AC: #1)
  - [ ] Run `npm install mermaid` in collabcanvas directory
  - [ ] Install types: `npm install --save-dev @types/mermaid`
- [ ] Create Mermaid chart service (AC: #1, #2, #3)
  - [ ] Create `collabcanvas/src/services/mermaidService.ts`
  - [ ] Function: `generateGanttChart(tasks: CPMTask[])` - returns Mermaid syntax string
  - [ ] Build Gantt chart syntax: `gantt` header + `dateFormat YYYY-MM-DD` + task lines
  - [ ] For each task: `[name] :[crit,] [id], [startDate], [durationDays]d`
  - [ ] Add `:crit,` prefix for critical path tasks (red highlight)
  - [ ] Function: `generateDependencyGraph(tasks: CPMTask[])` - returns Mermaid syntax string
  - [ ] Build flowchart syntax: `graph TD` + node definitions + edge definitions
  - [ ] Node format: `[id][name]`
  - [ ] Edge format: `[predecessor] --> [successor]`
  - [ ] Style critical path edges in red: `linkStyle [edgeIndex] stroke:red,stroke-width:2px`
- [ ] Build Gantt chart component (AC: #1, #2, #4, #5)
  - [ ] Create `collabcanvas/src/components/timeline/GanttChart.tsx`
  - [ ] Props: tasks (CPMTask[]), projectStartDate (Date)
  - [ ] Use Mermaid.js API: `mermaid.render(id, syntax)` to generate SVG
  - [ ] Display rendered SVG in container div
  - [ ] Add zoom controls (+/- buttons)
  - [ ] Add pan controls (drag to pan)
  - [ ] Add "Export as PNG" button (converts SVG to PNG using canvas)
  - [ ] Add "Export as SVG" button (downloads SVG directly)
  - [ ] Style container to match app theme (Tailwind classes)
  - [ ] Handle large task counts (> 50 tasks): lazy render, virtualization
- [ ] Build dependency graph component (AC: #3, #4, #5)
  - [ ] Create `collabcanvas/src/components/timeline/DependencyGraph.tsx`
  - [ ] Props: tasks (CPMTask[])
  - [ ] Use Mermaid.js to render flowchart
  - [ ] Display nodes in topological order (tasks sorted by dependencies)
  - [ ] Highlight critical path nodes in red border
  - [ ] Add export buttons (PNG and SVG)
  - [ ] Add zoom/pan controls
- [ ] Build timeline view page (AC: #1, #3)
  - [ ] Create `collabcanvas/src/pages/TimelineViewPage.tsx`
  - [ ] Fetch labor estimate for current project (useParams to get projectId)
  - [ ] If no labor estimate exists, show "No labor estimate found" message
  - [ ] Tabs: "Gantt Chart" and "Dependency Graph"
  - [ ] Default to Gantt Chart tab
  - [ ] Render GanttChart component in first tab
  - [ ] Render DependencyGraph component in second tab
  - [ ] Add loading skeleton while fetching data
- [ ] Add chart export functionality (AC: #4)
  - [ ] Function: `exportChartAsPNG(svgElement, filename)` - converts SVG to PNG
  - [ ] Use html-to-image library for SVG → PNG conversion
  - [ ] Function: `exportChartAsSVG(svgElement, filename)` - downloads SVG
  - [ ] Trigger browser download with generated file
- [ ] Add chart zoom/pan controls (AC: #5)
  - [ ] Use d3-zoom or react-zoom-pan-pinch library
  - [ ] Zoom in/out buttons (±10% per click)
  - [ ] Pan by dragging (mouse or touch)
  - [ ] Reset zoom button (return to 100%)
  - [ ] Mouse wheel zoom support
- [ ] Style Mermaid charts to match app theme (AC: #1, #2)
  - [ ] Configure Mermaid theme in `mermaid.initialize()`
  - [ ] Set colors: primary (blue), critical (red), background (gray-50)
  - [ ] Set fonts to match app (Inter or system font)
  - [ ] Adjust task bar height, spacing, margins
- [ ] Add to project navigation (AC: #1)
  - [ ] Modify project page navigation bar
  - [ ] Add "Timeline" tab (between "Money" and "Settings")
  - [ ] Route to TimelineViewPage when clicked
- [ ] Write frontend tests (AC: all)
  - [ ] Create `collabcanvas/tests/components/timeline/GanttChart.test.tsx`
  - [ ] Test Gantt chart renders with tasks
  - [ ] Test critical path highlighting
  - [ ] Test export functionality
  - [ ] Mock Mermaid.js render function
  - [ ] Create `collabcanvas/tests/components/timeline/DependencyGraph.test.tsx`
  - [ ] Test dependency graph renders
  - [ ] Test zoom/pan controls

**Performance Optimization:**
- [ ] Implement lazy loading for large task lists (> 50 tasks) (AC: #5)
  - [ ] Render only visible tasks in viewport
  - [ ] Use react-window for virtualization
  - [ ] Paginate tasks if necessary
- [ ] Debounce zoom/pan events (AC: #5)
  - [ ] Avoid excessive re-renders during zoom/pan
  - [ ] Debounce by 100ms

---

### Technical Summary

This story adds timeline visualization using Mermaid.js, a lightweight library for rendering diagrams from text syntax. It creates two views: a Gantt chart showing tasks over time, and a dependency graph showing task relationships. Both views highlight the critical path (tasks that directly impact project duration) in red, making it easy to identify scheduling bottlenecks.

**Key Technical Decisions:**
- **Mermaid.js 10.6.1:** Lightweight, declarative syntax, no heavy dependencies like D3
- **SVG Output:** Scalable, exportable, theme-able
- **Separate from Canvas:** Timeline view is separate from construction canvas (Konva), avoiding complexity
- **Critical Path Highlighting:** Use Mermaid's `:crit` flag for red coloring
- **Export Strategy:** SVG → PNG conversion using canvas API for raster export
- **Performance:** Lazy render for 50+ tasks, debounced zoom/pan

**Files/Modules Involved:**
- Frontend: GanttChart.tsx, DependencyGraph.tsx, TimelineViewPage.tsx, mermaidService.ts
- Library: Mermaid.js for chart generation, html-to-image for PNG export

### Project Structure Notes

- **Files to modify:**
  - `collabcanvas/src/App.tsx` - Add route for /project/:id/timeline
  - `collabcanvas/src/components/project/ProjectNavigation.tsx` - Add Timeline tab
- **Files to create:**
  - `collabcanvas/src/services/mermaidService.ts` - Mermaid chart generation
  - `collabcanvas/src/components/timeline/GanttChart.tsx` - Gantt chart component
  - `collabcanvas/src/components/timeline/DependencyGraph.tsx` - Dependency graph component
  - `collabcanvas/src/pages/TimelineViewPage.tsx` - Timeline view page
  - `collabcanvas/src/utils/chartExport.ts` - Chart export utilities
- **Expected test locations:**
  - `collabcanvas/tests/components/timeline/GanttChart.test.tsx` - Gantt chart tests
  - `collabcanvas/tests/components/timeline/DependencyGraph.test.tsx` - Dependency graph tests
  - `collabcanvas/tests/pages/TimelineViewPage.test.tsx` - Page tests
- **Estimated effort:** 2 story points (~1 day)
- **Prerequisites:** Story 1.3 (requires labor estimates and CPM data)

### Key Code References

**Existing Patterns to Follow:**
- **Page Layout:** See existing `collabcanvas/src/pages/MoneyViewPage.tsx` for tabbed layout pattern
- **Component Structure:** See existing `collabcanvas/src/components/canvas/CanvasRenderer.tsx` for rendering logic

**Tech-Spec References:**
- Mermaid chart generation: tech-spec.md:630-680
- Timeline visualization approach: tech-spec.md:2014-2017
- Chart export functionality: tech-spec.md:1740-1745

---

## Context References

**Tech-Spec:** [tech-spec.md](../tech-spec.md) - Primary context document containing:

- Mermaid.js integration examples (Gantt chart and dependency graph syntax)
- Chart export strategy (SVG → PNG conversion)
- Performance considerations for large task lists

**Architecture:** React frontend with Mermaid.js for declarative chart generation

---

## Dev Agent Record

### Agent Model Used

<!-- Will be populated during dev-story execution -->

### Debug Log References

<!-- Will be populated during dev-story execution -->

### Completion Notes

<!-- Will be populated during dev-story execution -->

### Files Modified

<!-- Will be populated during dev-story execution -->

### Test Results

<!-- Will be populated during dev-story execution -->

---

## Review Notes

<!-- Will be populated during code review -->
