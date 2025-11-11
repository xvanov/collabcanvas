# CollabCanvas UX Design Specification

_Created on January 27, 2025 by xvanov_  
_Generated using BMad Method - Create UX Design Workflow v1.0_

---

## Executive Summary

CollabCanvas transforms construction estimation from a 4-8 hour manual process into a 30-minute automated workflow. The platform enables residential remodeling contractors to generate accurate, real-time material estimates (BOMs) and pricing directly from construction plans and scope of work documents.

**Core Philosophy:** Simple, Stoic, Down-to-Earth - Simplify to the true meaning of things.

**Three-View Navigation:** Time (Critical Path) | Space (Canvas) | Money (Estimate)

**Key Differentiator:** AI-first task/dependency generation with completeness enforcement - the system requires all necessary information before outputting estimates to prevent inaccuracies.

---

## 1. Design System Foundation

### 1.1 Design System Choice

**System:** shadcn/ui (Tailwind CSS + Radix UI primitives)

**Rationale:**
- Built on Tailwind CSS (already in use)
- Copy-paste components (not a dependency)
- Highly customizable
- Modern, clean design
- Excellent accessibility (Radix UI primitives)
- Perfect for React + TypeScript
- Fast development with great defaults

**Version:** Latest stable version
**Provides:** ~25 standard components (buttons, forms, navigation, feedback, data display, layout)
**Customization:** Full control over styling via Tailwind CSS

**Components Provided:**
- Forms: Button, Input, Select, Checkbox, Radio, Textarea, Switch
- Navigation: Tabs, Navigation Menu, Breadcrumbs
- Feedback: Alert, Toast, Dialog, Popover, Tooltip, Progress, Skeleton
- Data Display: Table, Card, Badge, Separator
- Layout: Sheet, Dropdown Menu, Accordion

---

## 2. Core User Experience

### 2.1 Defining Experience

**The ONE thing that defines CollabCanvas:**

"Generate accurate estimates with AI-first automation - tasks, dependencies, and BOMs auto-generated, then customizable."

**Core Experience Principles:**
- **Speed:** Effortless BOM generation - fast but accurate
- **Accuracy:** Completeness enforcement - system requires all necessary information before output
- **Simplicity:** Simple, stoic, down-to-earth - simplify to the true meaning
- **Confidence:** Users feel confident and accurate that the system reflects reality

**Desired Emotional Response:** Confident and Accurate

Users should feel:
- Confident that estimates are accurate
- Trust that the system reflects reality
- Empowered by AI-first automation
- In control with ability to customize

### 2.2 Novel UX Patterns

**1. Pre-Flight Completeness Enforcement**
- System checks all required information before BOM/Critical Path generation
- Prevents incomplete estimates that lead to project overruns
- Critical items: Scale reference, layers, annotations
- Recommended items: Scope of work, material preferences (warnings, don't block)

**2. Parallel Generation**
- After Space annotation complete, generate BOM and Critical Path in parallel
- User can choose both, BOM only, or Critical Path only
- Saves time, provides comprehensive project view

**3. Multi-Scenario BOMs**
- Generate different BOM versions for different project scopes within single project
- Example: Shower only, Shower + Tub, Shower + Tub + Floor
- Easy comparison and client presentation

**4. Three-View Navigation: Time | Space | Money**
- Simple, stoic naming - simplify to true meaning
- Equal importance to all three views
- Clear mental model: break down by time, by space, by money

**5. CPM Visualization with Time Encoding**
- Critical Path Method graph (not Gantt chart)
- Task nodes sized proportionally to duration
- Visualizes dependencies AND time simultaneously
- Modern, interactive visualization

---

## 3. Visual Foundation

### 3.1 Color System

**Chosen Theme:** Modern Neutral

**Color Palette:**
- **Primary:** #0f172a (Dark Slate)
- **Primary Foreground:** #ffffff (White)
- **Secondary:** #f8fafc (Light Gray)
- **Secondary Foreground:** #0f172a (Dark Slate)
- **Background:** #ffffff (White)
- **Foreground:** #0f172a (Dark Slate)
- **Border:** #e2e8f0 (Light Gray Border)
- **Muted:** #f8fafc (Light Gray Background)
- **Muted Foreground:** #64748b (Gray Text)

**Semantic Colors:**
- **Success:** #10b981 (Green)
- **Warning:** #f59e0b (Orange)
- **Error:** #ef4444 (Red)
- **Info:** #64748b (Gray)

**Theme Personality:** Clean, Minimal, Approachable

**Rationale:** Content-first design that reduces visual noise and lets the canvas and data take center stage. Modern and approachable without being intimidating. Perfect for data-heavy workflows and focus on content.

**Interactive Visualizations:**
- Color Theme Explorer: [ux-color-themes.html](./ux-color-themes.html)

### 3.2 Typography

**Font Families:**
- **Headings & Body:** System font stack (-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', etc.)
- **Monospace:** 'Courier New', Courier, monospace (for code/data if needed)

**Type Scale:**
- **H1:** 2rem (32px) - Page titles
- **H2:** 1.5rem (24px) - Section titles
- **H3:** 1.25rem (20px) - Subsection titles
- **H4:** 1.125rem (18px) - Card titles
- **Body:** 1rem (16px) - Default text
- **Small:** 0.875rem (14px) - Captions, help text
- **Tiny:** 0.75rem (12px) - Labels, metadata

**Font Weights:**
- **Regular:** 400 - Body text
- **Medium:** 500 - Labels, buttons
- **Semibold:** 600 - Headings, emphasis
- **Bold:** 700 - Page titles, strong emphasis

**Line Heights:**
- **Headings:** 1.2
- **Body:** 1.6
- **Small:** 1.5

### 3.3 Spacing & Layout

**Base Unit:** 4px system

**Spacing Scale:**
- **xs:** 4px
- **sm:** 8px
- **md:** 16px
- **lg:** 24px
- **xl:** 32px
- **2xl:** 48px
- **3xl:** 64px

**Layout Grid:**
- **Desktop:** 12-column grid (if needed)
- **Tablet:** 12-column grid
- **Mobile:** Single column, stacked

**Container Widths:**
- **Desktop:** Max-width 1400px, centered
- **Tablet:** Max-width 1024px
- **Mobile:** Full width, padding 16px

---

## 4. Design Direction

### 4.1 Chosen Design Approach

**Layout:** Top Navigation

**Navigation Pattern:** Three main tabs: **Time | Space | Money**

**Design Philosophy:** Simple, Stoic, Down-to-Earth - Simplify to the true meaning of things

**Key Characteristics:**
- **Layout:** Top navigation bar with three equal tabs
- **Density:** Balanced - not too dense, not too spacious
- **Navigation:** Clear tab switching between Time (Critical Path), Space (Canvas), Money (Estimate)
- **Visual Hierarchy:** Content-first, minimal chrome
- **Best For:** Equal emphasis on all three views, clear mental model

**Rationale:**
- Top navigation provides clear, equal access to all three views
- Simple naming (Time/Space/Money) aligns with philosophy of simplifying to true meaning
- Balanced density provides information without overwhelming
- Content-first design puts focus on canvas, BOM, and critical path

**Interactive Mockups:**
- Design Direction Showcase: [ux-design-directions.html](./ux-design-directions.html)

---

## 5. User Journey Flows

### 5.1 Critical User Paths

**Flow 1: Complete Project Estimation (Primary Flow)**
1. Project Setup → Create new project
2. Plan Upload & Scale Setup → Upload plan, set scale reference
3. Layer Creation & Annotation → Create layers, annotate on canvas (Space view)
4. Pre-Flight Completeness Check → System validates all required information
5. Generate Selection → Choose BOM, Critical Path, or both
6. Parallel Generation → AI generates both in parallel (if selected)
7. Results Display → BOM in Money view, Critical Path in Time view
8. Multi-Scenario BOM Creation (Optional) → Create different scope versions
9. Export & Share → Export PDF/CSV

**Flow 2: Multi-Scenario BOM Comparison**
- Create multiple BOM versions for different project scopes
- Compare scenarios side-by-side
- Export individual or combined scenarios

**Flow 3: Critical Path Visualization & Editing**
- View CPM graph in Time view
- Edit task durations and dependencies
- Mark tasks complete during project
- Export Critical Path data

**Flow 4: Completeness Enforcement**
- Pre-flight checklist validates requirements
- Critical items must be complete (scale, layers, annotations)
- Recommended items show warnings but don't block

**Detailed Flows:** See [ux-user-journey-flows.md](./ux-user-journey-flows.md)

---

## 6. Component Library

### 6.1 Component Strategy

**Base System:** shadcn/ui (~25 standard components)

**Custom Components Required:** 11 components

**Canvas Tools:**
- CanvasToolbar - Tool selection for annotation
- LayerPanel - Layer creation and management
- MeasurementDisplay - Real-time measurement display

**Critical Path:**
- CPMGraph - Visualize critical path method graph
- TaskNode - Individual task in CPM graph
- TaskEditModal - Edit task details

**BOM Management:**
- BOMTable - Display Bill of Materials with prices
- ScenarioSelector - Switch between BOM scenarios
- ScenarioCreationModal - Create new BOM scenario
- PreFlightChecklist - Completeness enforcement

**Export:**
- ExportMenu - Export options for different views

**Total Components:** 36 components (25 standard + 11 custom)

**Detailed Specifications:** See [ux-component-library-strategy.md](./ux-component-library-strategy.md)

---

## 7. UX Pattern Decisions

### 7.1 Consistency Rules

**Button Hierarchy:**
- Primary: Solid dark background (#0f172a), white text - Main actions
- Secondary: Light background, dark text, border - Supporting actions
- Tertiary: Text-only or outline - Less important actions
- Destructive: Red background or red text - Delete/remove actions

**Feedback Patterns:**
- Success: Toast (top-right, auto-dismiss 3s) - Green background
- Error: Toast (top-right, manual dismiss) OR inline - Red background
- Warning: Alert banner OR warning icon - Yellow/orange background
- Info: Subtle text OR info icon with tooltip - Gray text
- Loading: Skeleton loaders OR spinner - Gray skeleton/spinner

**Form Patterns:**
- Labels: Above input
- Required: Asterisk (*) after label
- Validation: On blur + on submit
- Errors: Inline below input, red text
- Help: Caption below input, gray text

**Modal Patterns:**
- Sizes: Small (400px), Medium (600px), Large (800px)
- Dismiss: Click outside OR Escape OR Close button
- Focus: Auto-focus first element, focus trap
- Stacking: One modal at a time (except confirmations)

**Navigation Patterns:**
- Active State: Underline on tab + bold text
- Breadcrumbs: Show when > 2 levels deep
- Back Button: Browser back works, preserves state
- Deep Linking: URLs support direct links to projects/views

**Detailed Patterns:** See [ux-pattern-consistency-rules.md](./ux-pattern-consistency-rules.md)

---

## 8. Responsive Design & Accessibility

### 8.1 Responsive Strategy

**Breakpoints:**
- **Mobile:** 320px - 767px
  - Single column layout
  - Bottom navigation or hamburger menu
  - Canvas read-only (no annotation tools)
  - Touch-optimized controls (44x44px minimum)
- **Tablet:** 768px - 1024px
  - Two-column layout where appropriate
  - Top navigation (Time/Space/Money tabs)
  - Touch-friendly canvas tools
- **Desktop:** 1025px+
  - Full multi-column layouts
  - Top navigation with all features
  - Mouse/trackpad optimized canvas tools

**Adaptation Patterns:**
- Navigation: Horizontal tabs (desktop/tablet) → Bottom nav (mobile)
- Canvas: Full tools (desktop/tablet) → Read-only (mobile)
- BOM Table: Full table (desktop) → Horizontal scroll (tablet) → Card layout (mobile)
- Critical Path: Full graph (desktop) → Medium detail (tablet) → List view (mobile)

### 8.2 Accessibility Strategy

**WCAG Compliance:** Level 2.1 Level AA (Recommended Standard)

**Key Requirements:**
- **Color Contrast:** 4.5:1 normal text, 3:1 large text
- **Keyboard Navigation:** All interactive elements accessible
- **Screen Reader Support:** ARIA labels, semantic HTML, live regions
- **Focus Indicators:** 2px solid outline, high contrast
- **Form Accessibility:** Labels, error association, help text
- **Canvas Accessibility:** Keyboard-accessible tools, text alternatives
- **Critical Path Accessibility:** Text list view, keyboard navigation

**Testing Strategy:**
- Automated: Lighthouse, axe DevTools, WAVE
- Manual: Keyboard-only navigation, screen reader testing
- User Testing: Involve users with disabilities

**Detailed Strategy:** See [ux-responsive-accessibility-strategy.md](./ux-responsive-accessibility-strategy.md)

---

## 9. Implementation Guidance

### 9.1 Completion Summary

**What We Created Together:**

- **Design System:** shadcn/ui with Modern Neutral theme
- **Visual Foundation:** Modern Neutral color palette with complete typography and spacing system
- **Design Direction:** Top Navigation with Time/Space/Money tabs - Simple, Stoic, Down-to-Earth
- **User Journeys:** 4 critical flows designed with completeness enforcement and parallel generation
- **Component Library:** 36 components (25 standard + 11 custom) with full specifications
- **UX Patterns:** 10 consistency rule categories ensuring cohesive experience
- **Responsive Strategy:** 3 breakpoints with adaptation patterns for all device sizes
- **Accessibility:** WCAG 2.1 Level AA compliance requirements defined

**Your Deliverables:**

- **UX Design Specification:** This document
- **Interactive Color Themes:** [ux-color-themes.html](./ux-color-themes.html)
- **Design Direction Mockups:** [ux-design-directions.html](./ux-design-directions.html)
- **User Journey Flows:** [ux-user-journey-flows.md](./ux-user-journey-flows.md)
- **Component Library Strategy:** [ux-component-library-strategy.md](./ux-component-library-strategy.md)
- **UX Pattern Consistency Rules:** [ux-pattern-consistency-rules.md](./ux-pattern-consistency-rules.md)
- **Responsive & Accessibility Strategy:** [ux-responsive-accessibility-strategy.md](./ux-responsive-accessibility-strategy.md)

**What Happens Next:**

- **Designers** can create high-fidelity mockups from this foundation
- **Developers** can implement with clear UX guidance and rationale
- **All design decisions** are documented with reasoning for future reference

**Key Design Decisions:**

1. **Three-View Navigation:** Time | Space | Money - Simple, stoic naming
2. **Pre-Flight Completeness:** Enforces accuracy before generation
3. **Parallel Generation:** BOM and Critical Path generated simultaneously
4. **Multi-Scenario BOMs:** Different scope versions within single project
5. **Modern Neutral Theme:** Content-first, minimal, approachable
6. **Top Navigation:** Equal access to all three views
7. **CSV Export:** Materials, labor, and critical path for Excel integration

You've made thoughtful choices through visual collaboration that will create a great user experience. Ready for design refinement and implementation!

---

## Appendix

### Related Documents

- Product Requirements: [PRD.md](./PRD.md)
- Product Brief: [product-brief-collabcanvas-2025-01-27.md](./product-brief-collabcanvas-2025-01-27.md)

### Core Interactive Deliverables

This UX Design Specification was created through visual collaboration:

- **Color Theme Visualizer**: [ux-color-themes.html](./ux-color-themes.html)
  - Interactive HTML showing all color theme options explored
  - Live UI component examples in each theme
  - Side-by-side comparison and semantic color usage

- **Design Direction Mockups**: [ux-design-directions.html](./ux-design-directions.html)
  - Interactive HTML with 6 complete design approaches
  - Full-screen mockups of key screens
  - Design philosophy and rationale for each direction

### Supporting Documentation

- **User Journey Flows**: [ux-user-journey-flows.md](./ux-user-journey-flows.md)
- **Component Library Strategy**: [ux-component-library-strategy.md](./ux-component-library-strategy.md)
- **UX Pattern Consistency Rules**: [ux-pattern-consistency-rules.md](./ux-pattern-consistency-rules.md)
- **Responsive & Accessibility Strategy**: [ux-responsive-accessibility-strategy.md](./ux-responsive-accessibility-strategy.md)

### Next Steps & Follow-Up Workflows

This UX Design Specification can serve as input to:

- **Wireframe Generation Workflow** - Create detailed wireframes from user flows
- **Figma Design Workflow** - Generate Figma files via MCP integration
- **Interactive Prototype Workflow** - Build clickable HTML prototypes
- **Component Showcase Workflow** - Create interactive component library
- **AI Frontend Prompt Workflow** - Generate prompts for v0, Lovable, Bolt, etc.
- **Solution Architecture Workflow** - Define technical architecture with UX context

### Version History

| Date     | Version | Changes                         | Author        |
| -------- | ------- | ------------------------------- | ------------- |
| 2025-01-27 | 1.0     | Initial UX Design Specification | xvanov |

---

_This UX Design Specification was created through collaborative design facilitation, not template generation. All decisions were made with user input and are documented with rationale._

**Design Philosophy:** Simple, Stoic, Down-to-Earth - Simplify to the true meaning of things.





