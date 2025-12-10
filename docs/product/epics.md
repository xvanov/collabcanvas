# Projective - Epic Breakdown

**Date:** 2025-11-19
**Project Level:** 3 (Method - Brownfield)

---

## Epic 1: FieldPay-Pro P4P Integration

**Slug:** fieldpay-integration

### Goal

Expand Projective from an estimation-only platform into a complete end-to-end construction management platform by integrating FieldPay-Pro's Pay-for-Performance (P4P) payroll system. This enables contractors to track real labor costs against estimates, measure project profitability, manage crews, and automate daily payroll with performance-based pay calculations.

**Business Value:**
- Close the validation loop: Compare estimated vs actual labor costs
- Enable accurate profitability tracking at project level
- Automate 4+ hours/day of manual payroll processing
- Improve estimate accuracy over time with real cost data
- Provide crews with transparent, fair performance-based compensation

### Scope

**In Scope:**
- Backend Express server with Firebase Admin + Supabase integration
- Complete database schema for payroll, crews, timesheets, assignments
- AI labor estimation with detailed task breakdown and CPM scheduling
- Timeline visualization using Mermaid.js (Gantt charts, dependency graphs)
- Project-crew assignment system with date ranges
- Multi-project time tracking (crew selects project at clock-in)
- P4P payroll calculation engine (base pay - late penalty - long lunch penalty)
- Profitability dashboard showing estimated vs actual variance
- Admin payroll approval UI with anomaly detection
- Daily automated payroll processing (10:30 AM cron job)
- CSV export in Paychex-compatible format
- Mock Service Autopilot + Paychex APIs for development
- AI-generated demo crews (3 crews, 9 workers)
- Role-Based Access Control (Admin, Manager, Foreman, Crew Member)

**Out of Scope (Deferred to Phase 2):**
- Mobile crew app (bilingual EN/ES)
- Real Service Autopilot + Paychex API integration
- Advanced analytics and trend forecasting
- Material cost tracking (already exists in Projective)
- Multi-currency support
- Offline mode for mobile app
- Custom hardware (timeclocks, badges)

### Success Criteria

**Functional:**
1. Backend server runs and responds to health checks
2. Database migrations create all 7 payroll tables (crews, assignments, labor_estimates, cpm_tasks, timesheets, payroll_records, profitability_metrics)
3. AI generates 3 demo crews with 9 workers total
4. Admin can assign crews to projects with date ranges
5. AI generates detailed labor estimates from scope of work with task dependencies
6. CPM algorithm calculates critical path correctly (validates DAG, no circular deps)
7. Mermaid.js displays Gantt charts and dependency graphs
8. Crew members can clock in/out selecting from assigned projects
9. Payroll calculates P4P correctly (base pay - penalties for late arrival and long lunch)
10. Profitability dashboard shows variance between estimated and actual labor costs
11. Admin can review and approve payroll with anomaly flags
12. CSV export works in Paychex-compatible format
13. Daily cron job runs at 10:30 AM processing previous day's timesheets
14. Anomalies flagged: negative hours, missing rates, duplicate clock-ins, unusually long shifts
15. Notifications sent to managers and crews (email)

**Non-Functional:**
1. Payroll processing completes in < 10 minutes for 50 employees
2. API response times < 500ms (95th percentile)
3. Frontend renders without layout shifts (CLS < 0.1)
4. No console errors in browser
5. All tests pass (unit, integration, E2E) with ≥80% coverage
6. Security: Authentication required for all protected endpoints
7. Security: RBAC enforces role permissions
8. Accessibility: WCAG 2.1 AA compliance

**Data Integrity:**
1. No data loss during cross-database operations (Firestore ↔ Supabase)
2. Payroll calculations match manual verification
3. CPM critical path matches professional project management tools
4. Time tracking prevents duplicate clock-ins
5. Audit trail preserved for all payroll changes (status updates, approvals)

### Dependencies

**External Systems:**
- Firebase Authentication (existing)
- Firebase Firestore (existing - projects, shapes, BOMs)
- Supabase PostgreSQL (new - payroll data)
- OpenAI API (existing - for AI labor estimation and crew generation)
- Service Autopilot API (mocked initially via `USE_MOCK_APIS=true`)
- Paychex API (mocked initially via `USE_MOCK_APIS=true`)

**Infrastructure:**
- Node.js 20.x runtime
- Express backend server
- Daily cron job scheduler (node-cron)
- Email service for notifications

**Development:**
- Firebase project with Admin SDK credentials
- Supabase project with service role key
- Environment configuration (.env files)

---

## Story Map - Epic 1

```
Epic 1: FieldPay-Pro P4P Integration (18 points, ~9-12 days)
│
├── Story 1.1: Backend Integration + Database Schema + AI Crew Generation (3 points)
│   Dependencies: None
│   Deliverable: Express server, Supabase schema, auth/RBAC middleware, 3 demo crews
│
├── Story 1.2: Project-Crew Assignment (2 points)
│   Dependencies: Story 1.1 (requires backend + database)
│   Deliverable: Admin can assign crews to projects with validation
│
├── Story 1.3: AI Labor Estimation + CPM Calculation (3 points)
│   Dependencies: Story 1.1 (requires backend + AI service)
│   Deliverable: AI generates task breakdown with CPM critical path
│
├── Story 1.4: Timeline Visualization (Mermaid.js) (2 points)
│   Dependencies: Story 1.3 (requires labor estimates and CPM data)
│   Deliverable: Gantt charts and dependency graphs with export
│
├── Story 1.5: Multi-Project Time Tracking + Profitability Dashboard (4 points)
│   Dependencies: Stories 1.1, 1.2 (requires backend, crews, assignments)
│   Deliverable: Clock-in/out, P4P calculation, profitability variance tracking
│
└── Story 1.6: Admin Payroll UI + Daily Automation + Testing (4 points)
    Dependencies: Story 1.5 (requires payroll calculation)
    Deliverable: Admin approval UI, cron job, CSV export, E2E tests
```

**Implementation Sequence:**
1. **Foundation** (Story 1.1): Build backend infrastructure and database
2. **Crew Management** (Story 1.2): Enable project-crew assignments
3. **Estimation** (Story 1.3): Add AI labor estimation with CPM
4. **Visualization** (Story 1.4): Display timelines with Mermaid.js
5. **Tracking** (Story 1.5): Implement time tracking and profitability
6. **Automation** (Story 1.6): Complete with admin UI and daily automation

---

## Stories - Epic 1

### Story 1.1: Backend Integration + Database Schema + AI Crew Generation

As a **system administrator**,
I want to set up the Express backend with Firebase Admin SDK, Supabase, and generate demo crews,
So that the foundation is ready for payroll, crew management, and time tracking features.

**Acceptance Criteria:**

**AC #1:** Express server starts successfully on port 3000
- **Given** backend dependencies are installed
- **When** I run `npm run dev` in backend directory
- **Then** server starts without errors and logs "Server running on port 3000"

**AC #2:** Health check endpoints return 200 OK
- **Given** server is running
- **When** I call GET /api/health
- **Then** response is `{"status":"ok","timestamp":"..."}`
- **And** GET /api/health/db returns `{"firebase":"connected","supabase":"connected"}`

**AC #3:** Database migrations create all required tables
- **Given** Supabase credentials are configured
- **When** I run `npm run db:migrate`
- **Then** 7 tables are created: crews, project_crew_assignments, labor_estimates, cpm_tasks, timesheets, payroll_records, profitability_metrics
- **And** indexes are created on foreign keys and date columns

**AC #4:** Auth middleware validates Firebase tokens
- **Given** protected endpoint exists
- **When** I call endpoint without Authorization header
- **Then** response is 401 Unauthorized
- **And** with valid Firebase token, response is 200 OK

**AC #5:** RBAC middleware enforces role permissions
- **Given** endpoint requires "admin" role
- **When** I call endpoint with "crew_member" token
- **Then** response is 403 Forbidden
- **And** with "admin" token, response is 200 OK

**AC #6:** AI generates 3 demo crews with 9 workers
- **Given** OpenAI API is configured
- **When** I run `npm run generate:demo-crews`
- **Then** 3 crews are created in database
- **And** each crew has 1 foreman and 2 crew members
- **And** all workers have realistic names, roles, and base rates

**Prerequisites:** None (foundation story)

**Technical Notes:**
- Use Express 4.18.2 with TypeScript
- Firebase Admin SDK for authentication
- Supabase client for PostgreSQL access
- JWT middleware for token validation
- RBAC middleware checks user role from Firebase custom claims
- AI crew generation uses OpenAI to create realistic worker data

**Estimated Effort:** 3 story points (~1.5 days)

---

### Story 1.2: Project-Crew Assignment

As an **admin**,
I want to assign crews to projects with date ranges,
So that crew members can clock in to authorized projects and admins can track labor allocation.

**Acceptance Criteria:**

**AC #1:** Admin can view all crews
- **Given** demo crews exist in database
- **When** admin navigates to Crew Management page
- **Then** all 3 crews are displayed with foreman name and member count
- **And** each crew card shows active/inactive status

**AC #2:** Admin can assign crew to project
- **Given** admin selects a crew and a project
- **When** admin enters start_date and end_date and clicks "Assign"
- **Then** assignment is created in project_crew_assignments table
- **And** success message displays "Crew assigned to [Project Name]"

**AC #3:** Assignment validation prevents invalid date ranges
- **Given** admin is creating assignment
- **When** end_date is before start_date
- **Then** error displays "End date must be after start date"
- **And** assignment is not saved

**AC #4:** Assignment validation prevents overlapping assignments
- **Given** crew is already assigned to Project A from 2025-01-15 to 2025-01-31
- **When** admin assigns same crew to Project A from 2025-01-20 to 2025-02-05
- **Then** error displays "Crew already assigned to this project during this period"
- **And** assignment is not saved

**AC #5:** UI shows active and inactive assignments
- **Given** assignments exist with past, current, and future dates
- **When** admin views project details
- **Then** current assignments (today within date range) are highlighted in green
- **And** past assignments (end_date < today) are grayed out
- **And** future assignments (start_date > today) are shown in blue

**Prerequisites:** Story 1.1 (requires backend, database, authentication)

**Technical Notes:**
- Backend: crewAssignmentService.ts with CRUD operations
- Frontend: CrewManagementPage.tsx (admin only)
- Validation: Check date overlap in database before insert
- API: POST /api/assignments, GET /api/assignments/:projectId

**Estimated Effort:** 2 story points (~1 day)

---

### Story 1.3: AI Labor Estimation + CPM Calculation

As a **project manager**,
I want AI to generate detailed labor estimates with task dependencies and critical path analysis,
So that I can accurately estimate project timelines and labor costs before starting work.

**Acceptance Criteria:**

**AC #1:** AI generates task breakdown from scope of work
- **Given** user enters project scope: "Remodel kitchen: demo cabinets, install new cabinets, countertops, backsplash, paint"
- **When** user clicks "Generate Labor Estimate"
- **Then** AI returns 5-10 tasks with names, descriptions, estimated hours
- **And** each task has clear dependencies (e.g., "Install Cabinets" depends on "Demo Cabinets")

**AC #2:** Task dependencies form valid DAG (no cycles)
- **Given** AI generates tasks with dependencies
- **When** system validates dependency graph
- **Then** no circular dependencies exist
- **And** all dependency references point to valid task IDs

**AC #3:** CPM algorithm calculates critical path
- **Given** tasks with dependencies and durations
- **When** system runs CPM calculation
- **Then** earliest start/finish and latest start/finish are calculated for each task
- **And** tasks with zero float are marked as critical path
- **And** at least one critical path exists (or all tasks have float)

**AC #4:** Labor estimate includes total cost and duration
- **Given** tasks with hours and crew-specific rates
- **When** system calculates totals
- **Then** total estimated labor cost = sum(task hours × crew base rate)
- **And** total estimated duration = length of critical path in days

**AC #5:** User can manually adjust tasks
- **Given** AI-generated task list
- **When** user edits task hours or adds/removes dependencies
- **Then** system recalculates CPM automatically
- **And** updates critical path and totals

**AC #6:** Labor estimate persists in database
- **Given** user saves labor estimate
- **When** system stores in Supabase
- **Then** labor_estimates and cpm_tasks tables contain all data
- **And** estimate is linked to project_id in Firestore

**Prerequisites:** Story 1.1 (requires backend and AI service)

**Technical Notes:**
- Backend: laborEstimationService.ts, cpmService.ts, aiService.ts
- Frontend: LaborEstimationPanel.tsx, TaskBreakdown.tsx
- Algorithm: Forward pass (ES/EF), backward pass (LS/LF), float = LS - ES
- API: POST /api/labor-estimates, PUT /api/labor-estimates/:id

**Estimated Effort:** 3 story points (~1.5 days)

---

### Story 1.4: Timeline Visualization (Mermaid.js)

As a **project manager**,
I want to visualize project timelines with Gantt charts and dependency graphs,
So that I can understand task sequencing and critical path at a glance.

**Acceptance Criteria:**

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

**Prerequisites:** Story 1.3 (requires labor estimates and CPM data)

**Technical Notes:**
- Frontend: GanttChart.tsx, DependencyGraph.tsx, TimelineViewPage.tsx
- Library: Mermaid.js 10.6.1 for chart generation
- Service: mermaidService.ts generates Mermaid syntax strings
- Export: Use mermaid.render() with canvas conversion for PNG

**Estimated Effort:** 2 story points (~1 day)

---

### Story 1.5: Multi-Project Time Tracking + Profitability Dashboard

As a **crew member**,
I want to clock in to my assigned projects and see accurate pay calculations,
So that I can track my hours and earnings transparently.

As a **manager**,
I want to see profitability metrics comparing estimated vs actual labor costs,
So that I can identify projects that are over/under budget and improve future estimates.

**Acceptance Criteria:**

**AC #1:** Crew member can select assigned project at clock-in
- **Given** crew member is assigned to 2 projects: Project A (2025-01-15 to 2025-01-31) and Project B (2025-01-20 to 2025-02-15)
- **When** crew member navigates to Clock-In page on 2025-01-22
- **Then** dropdown shows both Project A and Project B
- **And** selecting Project A and clicking "Clock In" creates timesheet with project_id

**AC #2:** Clock-in validation prevents unauthorized projects
- **Given** crew member is NOT assigned to Project C
- **When** crew member attempts to clock in to Project C
- **Then** error displays "You are not assigned to this project"
- **And** clock-in is rejected

**AC #3:** P4P calculation applies base pay correctly
- **Given** crew member worked 8 hours, base rate = $20/hr, clock-in = 7:00 AM, lunch = 30 min
- **When** system calculates payroll
- **Then** base_pay = 8 × 20 = $160
- **And** total_pay = $160 (no penalties)

**AC #4:** P4P calculation applies late penalty
- **Given** crew member clocked in at 7:15 AM (15 minutes late)
- **When** system calculates payroll
- **Then** late_penalty = base_pay × 0.05 = $8
- **And** total_pay = $160 - $8 = $152

**AC #5:** P4P calculation applies long lunch penalty
- **Given** crew member took 45 minute lunch (exceeds 30 min limit)
- **When** system calculates payroll
- **Then** long_lunch_penalty = base_pay × 0.02 = $3.20
- **And** total_pay = $160 - $3.20 = $156.80

**AC #6:** Profitability dashboard shows variance
- **Given** Project A has estimated labor = $5,000 and actual labor = $5,500
- **When** manager navigates to Profitability Dashboard
- **Then** Project A card shows:
  - Estimated Labor: $5,000
  - Actual Labor: $5,500
  - Variance: -$500 (over budget)
  - Margin: -10%

**AC #7:** Anomalies are flagged
- **Given** payroll record has negative hours worked
- **When** system calculates payroll
- **Then** has_anomalies = true
- **And** anomaly_flags = ["negative_hours"]
- **And** record is marked for admin review

**Prerequisites:** Stories 1.1, 1.2 (requires backend, crews, assignments)

**Technical Notes:**
- Backend: timesheetService.ts, payrollCalculationService.ts, profitabilityService.ts
- Frontend: ClockInForm.tsx, ProfitabilityDashboard.tsx
- Formula: basePay = hours × rate; latePenalty = basePay × 0.05 if late; longLunchPenalty = basePay × 0.02 if lunch > 30min
- API: POST /api/timesheets/clock-in, POST /api/timesheets/clock-out, POST /api/payroll/calculate, GET /api/profitability/:projectId

**Estimated Effort:** 4 story points (~2 days)

---

### Story 1.6: Admin Payroll UI + Daily Automation + Testing

As an **admin**,
I want to review and approve payroll records with anomaly detection,
So that I can ensure accurate payments before exporting to Paychex.

As a **system**,
I want to automatically process payroll daily at 10:30 AM,
So that timesheets from the previous day are calculated without manual intervention.

**Acceptance Criteria:**

**AC #1:** Cron job runs daily at 10:30 AM
- **Given** ENABLE_CRON=true in environment
- **When** system reaches 10:30 AM
- **Then** scheduledPayrollService.processYesterday() is invoked
- **And** all timesheets from previous day are processed
- **And** payroll records are created with status="calculated"

**AC #2:** Mock Service Autopilot API returns timesheet data
- **Given** USE_MOCK_APIS=true
- **When** system calls Service Autopilot API
- **Then** mock API returns realistic timesheet data for 5 employees
- **And** data includes clock-in, clock-out, lunch duration

**AC #3:** Mock Paychex API accepts CSV export
- **Given** USE_MOCK_APIS=true
- **When** system calls Paychex API with CSV payload
- **Then** mock API returns success response
- **And** logs CSV content for verification

**AC #4:** Admin can view pending payroll
- **Given** payroll records exist with status="calculated"
- **When** admin navigates to Admin Payroll page
- **Then** table displays all pending records
- **And** anomalies are highlighted in red

**AC #5:** Admin can approve payroll records
- **Given** admin reviews payroll record
- **When** admin clicks "Approve"
- **Then** record status changes to "approved"
- **And** approved=true is saved to database

**AC #6:** CSV export matches Paychex format
- **Given** approved payroll records exist
- **When** admin clicks "Export CSV"
- **Then** CSV file downloads with columns: employee_id, date, hours_worked, base_pay, total_pay
- **And** format matches Paychex specification

**AC #7:** Notifications sent to managers and crews
- **Given** payroll is approved
- **When** admin clicks "Send Notifications"
- **Then** email sent to managers with summary
- **And** email sent to each crew member with individual payout

**AC #8:** E2E tests cover complete payroll flow
- **Given** E2E test suite runs
- **When** test simulates: assign crew → clock in → clock out → calculate payroll → approve → export
- **Then** all steps pass without errors
- **And** exported CSV contains correct data

**AC #9:** Performance test processes 50 employees in < 10 minutes
- **Given** 50 timesheets exist for processing
- **When** payroll calculation runs
- **Then** all 50 records are processed in < 10 minutes
- **And** database queries are optimized (< 100ms per query)

**Prerequisites:** Story 1.5 (requires payroll calculation service)

**Technical Notes:**
- Backend: scheduledPayrollService.ts, mockServiceAutopilotApi.ts, mockPaychexApi.ts, notificationService.ts, csvExportService.ts
- Frontend: AdminPayrollPage.tsx, PayrollApprovalPanel.tsx, PayrollExport.tsx
- Cron: node-cron with schedule "30 10 * * *"
- Testing: Playwright E2E tests, Jest performance tests
- API: POST /api/payroll/approve, POST /api/payroll/export, POST /api/payroll/notify

**Estimated Effort:** 4 story points (~2 days)

---

## Implementation Timeline - Epic 1

**Total Story Points:** 18 points

**Estimated Timeline:** 9-12 days (assuming 1.5-2 points per day per developer)

**Recommended Approach:**
- **Week 1 (Days 1-5):** Stories 1.1, 1.2, 1.3 (Foundation + Crew Management + Estimation)
- **Week 2 (Days 6-10):** Stories 1.4, 1.5 (Timeline Viz + Time Tracking + Profitability)
- **Week 3 (Days 11-12):** Story 1.6 (Admin UI + Automation + Testing)

**Parallel Opportunities:**
- Story 1.4 can be started while Story 1.3 is in testing
- Frontend components can be developed in parallel with backend services (with mock data)

**Critical Path:**
Story 1.1 → Story 1.2 → Story 1.5 → Story 1.6 (core payroll flow)
Story 1.1 → Story 1.3 → Story 1.4 (estimation and visualization)

---
