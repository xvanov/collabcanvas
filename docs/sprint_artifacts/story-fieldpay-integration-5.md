# Story 1.5: Multi-Project Time Tracking + Profitability Dashboard

**Status:** Draft

---

## User Story

**As a crew member**,
I want to clock in to my assigned projects and see accurate pay calculations,
So that I can track my hours and earnings transparently.

**As a manager**,
I want to see profitability metrics comparing estimated vs actual labor costs,
So that I can identify projects that are over/under budget and improve future estimates.

---

## Acceptance Criteria

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

---

## Implementation Details

### Tasks / Subtasks

**Backend Tasks:**
- [ ] Create timesheet service (AC: #1, #2)
  - [ ] Create `backend/src/services/timesheetService.ts`
  - [ ] Function: `clockIn(employeeId, projectId)` - creates timesheet with clock_in timestamp
  - [ ] Function: `clockOut(timesheetId, lunchDuration)` - updates timesheet with clock_out timestamp
  - [ ] Function: `validateClockIn(employeeId, projectId)` - checks crew assignment exists for project
  - [ ] Function: `getActiveTimesheet(employeeId)` - returns active timesheet (no clock_out yet)
  - [ ] Function: `getTimesheetsByProject(projectId, date)` - returns all timesheets for project on date
  - [ ] Validate assignment exists before allowing clock-in
  - [ ] Validate no active timesheet exists (can't clock in twice)
- [ ] Implement multi-project clock-in validation (AC: #2)
  - [ ] Query project_crew_assignments table for active assignments
  - [ ] Filter assignments where today is between start_date and end_date
  - [ ] Return 403 if no valid assignment found
- [ ] Create payroll calculation service (AC: #3, #4, #5, #7)
  - [ ] Create `backend/src/services/payrollCalculationService.ts`
  - [ ] Function: `calculateP4PPay(timesheet, baseRate)` - returns PayrollRecord
  - [ ] Calculate hours_worked = (clock_out - clock_in - lunch_duration) / 3600 seconds
  - [ ] Calculate base_pay = hours_worked × baseRate
  - [ ] Calculate late_penalty = clock_in > 7:00 AM ? base_pay × 0.05 : 0
  - [ ] Calculate long_lunch_penalty = lunch_duration > 30min ? base_pay × 0.02 : 0
  - [ ] Calculate total_pay = MAX(0, base_pay - late_penalty - long_lunch_penalty)
  - [ ] Function: `detectAnomalies(payrollRecord)` - returns array of anomaly flags
  - [ ] Anomalies: negative hours, unusually long shift (> 14 hours), missing base rate, missing timesheet
  - [ ] Set has_anomalies = true if any anomalies found
- [ ] Implement P4P formula (AC: #3, #4, #5)
  - [ ] Base pay calculation: hours × rate
  - [ ] Late penalty: 5% of base pay if clock-in after 7:00 AM
  - [ ] Long lunch penalty: 2% of base pay if lunch > 30 minutes
  - [ ] Floor at $0 (never negative pay)
- [ ] Create profitability tracking service (AC: #6)
  - [ ] Create `backend/src/services/profitabilityService.ts`
  - [ ] Function: `calculateProfitability(projectId)` - returns ProfitabilityMetrics
  - [ ] Get estimated labor cost from labor_estimates table
  - [ ] Get actual labor cost = SUM(payroll_records.total_pay) for project
  - [ ] Get estimated materials from Firestore BOM
  - [ ] Get actual materials (future: from receipts; for now, same as estimated)
  - [ ] Calculate total_variance = (estimated_labor + estimated_materials) - (actual_labor + actual_materials)
  - [ ] Calculate margin_percent = (total_variance / (estimated_labor + estimated_materials)) × 100
  - [ ] Save to profitability_metrics table
  - [ ] Function: `getProfitabilityByProject(projectId)` - retrieves metrics
- [ ] Create timesheet API routes (AC: #1, #2)
  - [ ] Create `backend/src/routes/timesheets.ts`
  - [ ] POST /api/timesheets/clock-in - clock in to project
  - [ ] POST /api/timesheets/clock-out - clock out with lunch duration
  - [ ] GET /api/timesheets/active - get active timesheet for current user
  - [ ] GET /api/timesheets/:projectId - get timesheets for project
  - [ ] Add authentication middleware (all routes)
- [ ] Create payroll API routes (AC: #3, #4, #5, #7)
  - [ ] Create `backend/src/routes/payroll.ts`
  - [ ] POST /api/payroll/calculate - calculate payroll for date range
  - [ ] GET /api/payroll/:projectId - get payroll records for project
  - [ ] GET /api/payroll/anomalies - get all payroll records with anomalies
  - [ ] Add authentication middleware (all routes)
  - [ ] Restrict calculate endpoint to admin role
- [ ] Create profitability API routes (AC: #6)
  - [ ] Create `backend/src/routes/profitability.ts`
  - [ ] POST /api/profitability/:projectId - calculate profitability for project
  - [ ] GET /api/profitability/:projectId - get profitability metrics
  - [ ] GET /api/profitability/all - get profitability for all projects
  - [ ] Add authentication middleware (manager and admin roles)
- [ ] Add anomaly detection logic (AC: #7)
  - [ ] Negative hours worked (data error)
  - [ ] Unusually long shift (> 14 hours)
  - [ ] Missing base rate (crew member has no rate)
  - [ ] Duplicate clock-ins (multiple active timesheets)
  - [ ] Clock-out before clock-in (data error)
- [ ] Write payroll calculation tests (AC: #3, #4, #5)
  - [ ] Create `backend/tests/services/payrollCalculation.test.ts`
  - [ ] Test base pay calculation (no penalties)
  - [ ] Test late penalty application
  - [ ] Test long lunch penalty application
  - [ ] Test combined penalties
  - [ ] Test floor at $0 (never negative)
- [ ] Write profitability tests (AC: #6)
  - [ ] Create `backend/tests/services/profitabilityService.test.ts`
  - [ ] Test variance calculation
  - [ ] Test margin percentage calculation
  - [ ] Test cross-database query (Firestore + Supabase)

**Frontend Tasks:**
- [ ] Create timesheet store (AC: #1)
  - [ ] Create `collabcanvas/src/store/useTimesheetStore.ts`
  - [ ] State: activeTimesheet, assignedProjects, loading, error
  - [ ] Action: fetchAssignedProjects() - gets projects crew is assigned to
  - [ ] Action: clockIn(projectId) - creates timesheet
  - [ ] Action: clockOut(lunchDuration) - updates timesheet
  - [ ] Action: fetchActiveTimesheet() - gets current active timesheet
- [ ] Build crew clock-in component (AC: #1, #2)
  - [ ] Create `collabcanvas/src/components/timesheet/ClockInForm.tsx`
  - [ ] Dropdown to select project (fetches assigned projects)
  - [ ] Show project name and date range for each option
  - [ ] "Clock In" button (disabled until project selected)
  - [ ] Display active timesheet if exists (show elapsed time)
  - [ ] "Clock Out" button with lunch duration input (numeric, minutes)
  - [ ] Validation: lunch duration >= 0
  - [ ] Display error message if unauthorized project
- [ ] Build timesheet history component (AC: #1)
  - [ ] Create `collabcanvas/src/components/timesheet/TimesheetHistory.tsx`
  - [ ] Table showing past timesheets: date, project, hours worked, pay
  - [ ] Filter by date range
  - [ ] Pagination (10 records per page)
  - [ ] Show total hours and total pay for period
- [ ] Build profitability dashboard (AC: #6)
  - [ ] Create `collabcanvas/src/components/profitability/ProfitabilityDashboard.tsx`
  - [ ] Grid of project cards showing profitability metrics
  - [ ] Each card shows: project name, estimated labor, actual labor, variance, margin %
  - [ ] Color coding: green (profitable), red (unprofitable), gray (no data)
  - [ ] Sort by variance (biggest overruns first)
  - [ ] Filter by status: all, profitable, unprofitable
- [ ] Build variance chart component (AC: #6)
  - [ ] Create `collabcanvas/src/components/profitability/VarianceChart.tsx`
  - [ ] Bar chart showing estimated vs actual labor costs per project
  - [ ] Use recharts library for charting
  - [ ] X-axis: project names, Y-axis: cost ($)
  - [ ] Two bars per project: estimated (blue), actual (red)
  - [ ] Display variance as text label above bars
- [ ] Add to Money View page (AC: #6)
  - [ ] Modify `collabcanvas/src/pages/MoneyViewPage.tsx`
  - [ ] Add "Profitability" section below BOM
  - [ ] Display ProfitabilityDashboard component
  - [ ] Show variance chart
  - [ ] Only visible to manager and admin roles
- [ ] Add to crew member dashboard (AC: #1)
  - [ ] Modify crew member dashboard to show ClockInForm
  - [ ] Show TimesheetHistory component
  - [ ] Only visible to crew_member role
- [ ] Write frontend tests (AC: all)
  - [ ] Create `collabcanvas/tests/components/timesheet/ClockInForm.test.tsx`
  - [ ] Test clock-in flow
  - [ ] Test project selection
  - [ ] Test validation errors
  - [ ] Mock API calls

**Integration Tests:**
- [ ] Create `backend/tests/integration/payrollFlow.test.ts` (AC: all)
  - [ ] Test complete flow: clock-in → work → clock-out → calculate payroll → verify P4P
  - [ ] Test anomaly detection
  - [ ] Test profitability calculation

---

### Technical Summary

This story implements the core P4P payroll functionality: crew members clock in to assigned projects, and the system calculates their pay using the P4P formula (base pay minus penalties for late arrival and long lunch). It also adds profitability tracking by comparing estimated labor costs (from Story 1.3) against actual labor costs (from payroll). This closes the validation loop mentioned in the Product Brief, enabling contractors to measure project profitability and improve estimate accuracy over time.

**Key Technical Decisions:**
- **P4P Formula:** basePay - latePenalty - longLunchPenalty (with floor at $0)
- **Late Penalty:** 5% of base pay if clock-in after 7:00 AM
- **Long Lunch Penalty:** 2% of base pay if lunch exceeds 30 minutes
- **Anomaly Detection:** Automatic flagging of data errors (negative hours, missing rates, duplicate clock-ins)
- **Cross-Database Query:** Combine Firestore (estimated BOM) + Supabase (payroll records) for profitability
- **Multi-Project Clock-In:** Crew member selects from dropdown of assigned projects

**Files/Modules Involved:**
- Backend: timesheetService.ts, payrollCalculationService.ts, profitabilityService.ts, routes (timesheets, payroll, profitability)
- Frontend: ClockInForm.tsx, TimesheetHistory.tsx, ProfitabilityDashboard.tsx, VarianceChart.tsx
- Store: useTimesheetStore.ts

### Project Structure Notes

- **Files to modify:**
  - `collabcanvas/src/pages/MoneyViewPage.tsx` - Add profitability section
  - `collabcanvas/src/pages/DashboardPage.tsx` - Add clock-in for crew members
- **Files to create:**
  - `backend/src/services/timesheetService.ts` - Time tracking logic
  - `backend/src/services/payrollCalculationService.ts` - P4P calculation
  - `backend/src/services/profitabilityService.ts` - Profitability tracking
  - `backend/src/routes/timesheets.ts` - Timesheet API
  - `backend/src/routes/payroll.ts` - Payroll API
  - `backend/src/routes/profitability.ts` - Profitability API
  - `collabcanvas/src/store/useTimesheetStore.ts` - Timesheet state
  - `collabcanvas/src/components/timesheet/ClockInForm.tsx` - Clock-in UI
  - `collabcanvas/src/components/timesheet/TimesheetHistory.tsx` - History view
  - `collabcanvas/src/components/profitability/ProfitabilityDashboard.tsx` - Profitability UI
  - `collabcanvas/src/components/profitability/VarianceChart.tsx` - Variance chart
  - `collabcanvas/src/types/timesheet.ts` - Timesheet types
  - `collabcanvas/src/types/payroll.ts` - Payroll types
- **Expected test locations:**
  - `backend/tests/services/payrollCalculation.test.ts` - P4P tests
  - `backend/tests/services/profitabilityService.test.ts` - Profitability tests
  - `backend/tests/integration/payrollFlow.test.ts` - Integration tests
  - `collabcanvas/tests/components/timesheet/ClockInForm.test.tsx` - Component tests
- **Estimated effort:** 4 story points (~2 days)
- **Prerequisites:** Stories 1.1, 1.2 (requires backend, crews, assignments)

### Key Code References

**Tech-Spec References:**
- P4P calculation formula: tech-spec.md:1263-1280
- Profitability calculation: tech-spec.md:2008-2012
- Anomaly detection: tech-spec.md:1451-1478 (edge cases)
- Cross-database query pattern: tech-spec.md:891-920

---

## Context References

**Tech-Spec:** [tech-spec.md](../tech-spec.md) - Primary context document containing:

- P4P calculation formula and rules
- Profitability variance tracking algorithm
- Anomaly detection logic
- Cross-database integration patterns

**Architecture:** Express backend with dual-database (Firestore + Supabase), React frontend with Zustand state management

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
