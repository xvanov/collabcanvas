# CollabCanvas UX Pattern Consistency Rules

## Design Philosophy
**Simple, Stoic, Down-to-Earth** - Simplify to the true meaning of things

---

## 1. Button Hierarchy

**How users know what's most important:**

### Primary Action Button
- **Style:** Solid background (#0f172a), white text
- **Usage:** Main action on screen (Generate BOM, Save Project, Export)
- **Examples:** 
  - "Generate BOM" in Space view
  - "Create Project" on dashboard
  - "Export Estimate" in Money view
- **Visual Weight:** Highest - draws attention immediately

### Secondary Action Button
- **Style:** Light background (#f8fafc), dark text, border (#e2e8f0)
- **Usage:** Supporting actions, alternative options
- **Examples:**
  - "Save Draft" alongside "Generate"
  - "Cancel" in modals
  - "Edit" for inline editing
- **Visual Weight:** Medium - visible but not primary

### Tertiary Action Button
- **Style:** Text-only or outline style, minimal visual weight
- **Usage:** Less important actions, navigation
- **Examples:**
  - "View Details" links
  - "Learn More" links
- **Visual Weight:** Low - present but subtle

### Destructive Action Button
- **Style:** Red background (#ef4444) or red text with border
- **Usage:** Delete, remove, destructive actions
- **Examples:**
  - "Delete Project"
  - "Remove Layer"
- **Visual Weight:** High (for visibility) but distinct from primary
- **Requirement:** Always requires confirmation

**Rule:** Only ONE primary action per screen/section. Multiple primary buttons confuse hierarchy.

---

## 2. Feedback Patterns

**How system communicates with users:**

### Success Feedback
- **Pattern:** Toast notification (top-right, auto-dismiss 3 seconds)
- **Style:** Green background (#10b981), white text, checkmark icon
- **Usage:** 
  - "BOM generated successfully"
  - "Project saved"
  - "Export complete"
- **Accessibility:** Screen reader announcement: "BOM generated successfully"

### Error Feedback
- **Pattern:** Toast notification (top-right, manual dismiss) OR inline error message
- **Style:** Red background (#ef4444), white text, error icon
- **Usage:**
  - "Failed to generate BOM" (toast)
  - "Invalid scale measurement" (inline, below input)
- **Accessibility:** Screen reader announcement: "Error: [message]"
- **Requirement:** Error messages must be actionable - tell user what to do

### Warning Feedback
- **Pattern:** Alert banner (top of content area) OR warning icon with tooltip
- **Style:** Yellow/orange background (#f59e0b), dark text
- **Usage:**
  - "Price unavailable for some materials" (alert banner)
  - "Scope of work not uploaded" (pre-flight warning)
- **Accessibility:** Screen reader announcement: "Warning: [message]"

### Info Feedback
- **Pattern:** Subtle text or info icon with tooltip
- **Style:** Blue/gray text (#64748b), info icon
- **Usage:**
  - "Prices cached from 2 hours ago"
  - "Click to edit task duration"
- **Accessibility:** Tooltip accessible via keyboard

### Loading Feedback
- **Pattern:** Skeleton loaders for content, spinner for actions
- **Style:** Gray skeleton shapes, spinning indicator
- **Usage:**
  - BOM table skeleton while loading
  - Spinner on "Generate" button during processing
- **Accessibility:** Screen reader: "Loading BOM data" or "Generating, please wait"
- **Requirement:** Show progress for operations > 1 second

**Rule:** Feedback must be immediate (< 100ms) and clear. Users should never wonder "did that work?"

---

## 3. Form Patterns

**How users input data:**

### Label Position
- **Pattern:** Above input (not inline, not floating)
- **Rationale:** Clear, accessible, works for all input lengths
- **Example:**
  ```
  Project Name
  [________________]
  ```

### Required Field Indicator
- **Pattern:** Asterisk (*) after label + "Required" text for screen readers
- **Style:** Red asterisk (#ef4444)
- **Example:** "Project Name *"
- **Accessibility:** Screen reader: "Project Name, required"

### Validation Timing
- **Pattern:** Validate on blur (when user leaves field) + on submit
- **Rationale:** Don't interrupt typing, but catch errors before submission
- **Exception:** Real-time validation for scale measurements (show as user types)

### Error Display
- **Pattern:** Inline error message below input field
- **Style:** Red text (#ef4444), small font (0.875rem)
- **Example:**
  ```
  Scale Measurement
  [12 feet]
  Scale must be greater than 0
  ```
- **Accessibility:** Error associated with input via aria-describedby

### Help Text
- **Pattern:** Caption text below input (when needed)
- **Style:** Gray text (#64748b), smaller font (0.75rem)
- **Usage:** 
  - "Enter real-world measurement for reference line"
  - "Example: 10 feet"
- **Accessibility:** Associated with input via aria-describedby

### Form Submission
- **Pattern:** Disable submit button until form valid
- **Visual:** Submit button grayed out, cursor: not-allowed
- **Rationale:** Prevents invalid submissions, clear feedback

**Rule:** Forms should feel fast and forgiving. Validate gently, fix easily.

---

## 4. Modal Patterns

**How dialogs behave:**

### Modal Sizes
- **Small:** 400px width - Simple confirmations, single inputs
- **Medium:** 600px width - Pre-flight checklist, task edit
- **Large:** 800px width - Scenario creation, complex forms
- **Full Screen:** Mobile only - Large forms on small screens

### Dismiss Behavior
- **Pattern:** Click outside OR Escape key OR explicit Close button
- **Exception:** Destructive actions require explicit confirmation (no click-outside dismiss)
- **Rationale:** Users expect to close modals easily

### Focus Management
- **Auto-focus:** First interactive element when modal opens
- **Focus trap:** Tab stays within modal, cycles through elements
- **Return focus:** Focus returns to trigger element when modal closes
- **Accessibility:** Screen reader announces modal title on open

### Stacking
- **Pattern:** Only one modal open at a time
- **Exception:** Confirmation dialogs can stack (e.g., "Delete?" → "Are you sure?")
- **Rationale:** Prevents confusion, maintains focus

**Rule:** Modals should feel lightweight and easy to dismiss. Don't trap users.

---

## 5. Navigation Patterns

**How users move through app:**

### Active State Indication
- **Pattern:** Underline on tab + bold text (for Time/Space/Money tabs)
- **Style:** 2px solid underline (#0f172a), font-weight: 600
- **Example:** Time | Space | **Money** (underlined)
- **Accessibility:** aria-current="page" on active tab

### Breadcrumb Usage
- **Pattern:** Show when user is > 2 levels deep
- **Example:** Dashboard > Kitchen Remodel > BOM
- **Usage:** Quick navigation back to parent views
- **Style:** Gray text, separators (/), last item bold

### Back Button Behavior
- **Pattern:** Browser back button works, OR app back button in header
- **Behavior:** Returns to previous view, preserves state
- **Exception:** Canvas state preserved on navigation (don't lose annotations)

### Deep Linking
- **Pattern:** URLs support direct links to projects/views
- **Example:** `/project/123/money` → Opens project 123, Money view
- **Rationale:** Shareable links, bookmarkable views

**Rule:** Navigation should feel predictable. Users should always know where they are and how to get back.

---

## 6. Empty State Patterns

**What users see when no content:**

### First Use Empty State
- **Pattern:** Friendly message + primary action button
- **Example:**
  ```
  No projects yet
  Create your first project to get started
  [Create Project]
  ```
- **Style:** Centered, large icon (optional), clear message, CTA button

### No Results Empty State
- **Pattern:** Message explaining why + action to fix
- **Example:**
  ```
  No materials found
  Try adjusting your filters or generate a new BOM
  [Generate BOM]
  ```
- **Style:** Subtle, helpful, actionable

### Cleared Content Empty State
- **Pattern:** Brief message + undo option (if applicable)
- **Example:**
  ```
  Canvas cleared
  [Undo]
  ```
- **Style:** Minimal, with recovery option

**Rule:** Empty states should guide, not frustrate. Always offer a next step.

---

## 7. Confirmation Patterns

**When to confirm destructive actions:**

### Delete Confirmation
- **Pattern:** Always confirm deletions
- **Style:** Modal dialog with clear message
- **Example:**
  ```
  Delete Project?
  This will permanently delete "Kitchen Remodel" and all its data.
  This cannot be undone.
  [Cancel] [Delete Project]
  ```
- **Rationale:** Prevent accidental data loss

### Leave Unsaved Changes
- **Pattern:** Warn when leaving page with unsaved changes
- **Style:** Browser confirmation dialog OR custom modal
- **Message:** "You have unsaved changes. Are you sure you want to leave?"
- **Options:** [Stay] [Leave]

### Irreversible Actions
- **Pattern:** Confirm with clear consequences
- **Examples:**
  - Delete project
  - Clear all annotations
  - Reset scale reference
- **Requirement:** Explain what will be lost

**Rule:** Confirm destructive actions, but don't over-confirm. Trust users with non-destructive actions.

---

## 8. Notification Patterns

**How users stay informed:**

### Placement
- **Pattern:** Top-right corner for toasts
- **Rationale:** Doesn't block content, standard location
- **Exception:** Critical errors can be center modal

### Duration
- **Pattern:** Auto-dismiss after 3 seconds (success), manual dismiss (errors)
- **Rationale:** Success doesn't need attention, errors need review
- **User Control:** All toasts can be manually dismissed

### Stacking
- **Pattern:** Stack vertically, newest on top
- **Limit:** Max 3 toasts visible, older ones auto-dismiss
- **Rationale:** Prevent notification overload

### Priority Levels
- **Critical:** Modal dialog (blocks interaction)
- **Important:** Toast with manual dismiss (errors)
- **Info:** Toast with auto-dismiss (success, info)

**Rule:** Notifications should inform, not interrupt. Use appropriate level for importance.

---

## 9. Search Patterns

**How search behaves:**

### Trigger
- **Pattern:** Manual search (user clicks search icon or presses Cmd/Ctrl+K)
- **Rationale:** Don't auto-search while typing (too many results)
- **Exception:** Material search in BOM can be instant

### Results Display
- **Pattern:** Instant results as user types (for material search)
- **Style:** Dropdown below search input
- **Example:** Type "drywall" → See "Drywall 4x8", "Drywall 1/2 inch", etc.

### Filters
- **Pattern:** Filters shown below search (when applicable)
- **Usage:** Filter projects by status, date, etc.
- **Style:** Checkboxes or chips

### No Results
- **Pattern:** "No results found" + suggestion
- **Example:** "No materials found matching 'xyz'. Try 'drywall' or 'paint'."

**Rule:** Search should feel fast and helpful. Show results quickly, suggest alternatives.

---

## 10. Date/Time Patterns

**How temporal data appears:**

### Format
- **Pattern:** Relative for recent, absolute for older
- **Examples:**
  - "2 hours ago" (recent)
  - "January 27, 2025" (older)
- **Rationale:** Context-appropriate, easier to scan

### Timezone Handling
- **Pattern:** User's local timezone
- **Display:** Show timezone if ambiguous (e.g., "2:00 PM EST")
- **Rationale:** Users work in their timezone

### Date Pickers
- **Pattern:** Calendar picker for date selection
- **Style:** Dropdown calendar, click to select
- **Usage:** Project start dates, deadlines

**Rule:** Time should feel natural. Use relative when helpful, absolute when needed.

---

## 11. CSV Export Patterns

**How exports work (specific to CollabCanvas):**

### Export Options
- **Materials CSV:** Material name, quantity, unit, unit price, total price, supplier
- **Labor CSV:** Task name, duration (days), labor hours, hourly rate, total cost
- **Critical Path CSV:** Task name, duration, dependencies, start date, end date, critical path flag

### Export Trigger
- **Pattern:** Export button/dropdown in relevant view
- **Money view:** Export materials CSV
- **Time view:** Export critical path CSV
- **Estimate view:** Export all (materials + labor + critical path)

### File Naming
- **Pattern:** `{project-name}_{export-type}_{date}.csv`
- **Example:** `kitchen-remodel_materials_2025-01-27.csv`
- **Rationale:** Clear, sortable, identifiable

### Excel Compatibility
- **Pattern:** Standard CSV format, UTF-8 encoding
- **Headers:** First row contains column names
- **Rationale:** Easy import into Excel, no formatting issues

**Rule:** Exports should be ready to use. No manual cleanup needed.

---

## Pattern Consistency Summary

**Core Principles:**
1. **Simple:** Don't overcomplicate interactions
2. **Stoic:** Consistent, predictable patterns
3. **Down-to-Earth:** Clear, practical, no unnecessary decoration
4. **Accessible:** All patterns work with keyboard and screen readers
5. **Fast:** Immediate feedback, no waiting

**Key Rules:**
- One primary action per screen
- Feedback within 100ms
- Validate gently, fix easily
- Confirm destructive actions
- Guide, don't frustrate
- Inform, don't interrupt

---

_These UX pattern consistency rules ensure CollabCanvas feels cohesive, predictable, and professional. Every interaction follows these patterns, creating a unified user experience._
