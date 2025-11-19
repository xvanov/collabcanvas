# Story 1.6: Admin Payroll UI + Daily Automation + Testing

**Status:** Draft

---

## User Story

**As an admin**,
I want to review and approve payroll records with anomaly detection,
So that I can ensure accurate payments before exporting to Paychex.

**As a system**,
I want to automatically process payroll daily at 10:30 AM,
So that timesheets from the previous day are calculated without manual intervention.

---

## Acceptance Criteria

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

---

## Implementation Details

### Tasks / Subtasks

**Backend Tasks:**
- [ ] Create scheduled payroll service (AC: #1)
  - [ ] Create `backend/src/services/scheduledPayrollService.ts`
  - [ ] Function: `processYesterday()` - calculates payroll for previous day
  - [ ] Query timesheets where clock_out date = yesterday
  - [ ] For each timesheet: call payrollCalculationService.calculateP4PPay()
  - [ ] Save payroll records to database with status="calculated"
  - [ ] Log processing summary (count, total pay, anomalies)
  - [ ] Handle errors gracefully (log, continue processing)
- [ ] Implement cron job (AC: #1)
  - [ ] Install node-cron: `npm install node-cron @types/node-cron`
  - [ ] Add cron job to `backend/src/server.ts`
  - [ ] Schedule: `cron.schedule('30 10 * * *', processYesterday)` (10:30 AM daily)
  - [ ] Only enable if ENABLE_CRON=true in environment
  - [ ] Log cron job start/completion
- [ ] Create mock Service Autopilot API (AC: #2)
  - [ ] Create `backend/src/services/mockServiceAutopilotApi.ts`
  - [ ] Function: `getTimesheets(date)` - returns mock timesheet data
  - [ ] Generate realistic data: 5 employees, varied clock-in times, lunch durations
  - [ ] Include edge cases: late arrival, long lunch
  - [ ] Use if USE_MOCK_APIS=true, otherwise call real API
- [ ] Create mock Paychex API (AC: #3)
  - [ ] Create `backend/src/services/mockPaychexApi.ts`
  - [ ] Function: `submitPayroll(csvData)` - accepts CSV payload
  - [ ] Log CSV content for verification
  - [ ] Return success response
  - [ ] Use if USE_MOCK_APIS=true, otherwise call real API
- [ ] Create admin payroll store (AC: #4, #5)
  - [ ] Extend `backend/src/routes/payroll.ts`
  - [ ] POST /api/payroll/approve - approve payroll records
  - [ ] POST /api/payroll/reject - reject payroll records
  - [ ] POST /api/payroll/export - export CSV
  - [ ] POST /api/payroll/notify - send notifications
  - [ ] Add RBAC middleware (admin only)
- [ ] Create notification service (AC: #7)
  - [ ] Create `backend/src/services/notificationService.ts`
  - [ ] Function: `sendManagerSummary(managerEmail, summary)` - sends email to manager
  - [ ] Function: `sendCrewPayout(crewEmail, payoutDetails)` - sends email to crew member
  - [ ] Use nodemailer or SendGrid for email
  - [ ] Template: HTML email with payroll details
  - [ ] Include: date, hours worked, base pay, penalties, total pay
- [ ] Create CSV export service (AC: #6)
  - [ ] Create `backend/src/services/csvExportService.ts`
  - [ ] Function: `generatePaychexCSV(payrollRecords)` - generates CSV string
  - [ ] Columns: employee_id, date, hours_worked, base_pay, total_pay
  - [ ] Format: Paychex specification (comma-separated, quoted strings)
  - [ ] Header row: "Employee ID,Date,Hours Worked,Base Pay,Total Pay"
  - [ ] Date format: YYYY-MM-DD
  - [ ] Currency format: $X,XXX.XX (no symbol in CSV, just number)
- [ ] Write E2E tests (AC: #8)
  - [ ] Create `collabcanvas/tests/e2e/payrollFlow.spec.ts`
  - [ ] Test 1: Admin assigns crew to project
  - [ ] Test 2: Crew member clocks in
  - [ ] Test 3: Crew member clocks out
  - [ ] Test 4: Cron job calculates payroll
  - [ ] Test 5: Admin reviews and approves payroll
  - [ ] Test 6: Admin exports CSV
  - [ ] Test 7: CSV contains correct data
  - [ ] Use Playwright for browser automation
- [ ] Write performance tests (AC: #9)
  - [ ] Create `backend/tests/performance/payrollProcessing.test.ts`
  - [ ] Seed database with 50 timesheets
  - [ ] Measure time to process all timesheets
  - [ ] Assert < 10 minutes (600,000ms)
  - [ ] Measure database query times
  - [ ] Assert < 100ms per query (95th percentile)
  - [ ] Use artillery or k6 for load testing

**Frontend Tasks:**
- [ ] Create admin payroll store (AC: #4, #5)
  - [ ] Create `collabcanvas/src/store/usePayrollStore.ts`
  - [ ] State: payrollRecords, loading, error
  - [ ] Action: fetchPendingPayroll() - gets records with status="calculated"
  - [ ] Action: approvePayroll(recordIds) - approves selected records
  - [ ] Action: rejectPayroll(recordIds) - rejects selected records
  - [ ] Action: exportCSV() - downloads CSV file
  - [ ] Action: sendNotifications() - triggers email notifications
- [ ] Build admin payroll dashboard (AC: #4, #5)
  - [ ] Create `collabcanvas/src/pages/AdminPayrollPage.tsx`
  - [ ] Table showing payroll records: employee, date, hours, base pay, total pay, status, anomalies
  - [ ] Checkbox for bulk selection
  - [ ] "Approve Selected" button (bulk approve)
  - [ ] "Reject Selected" button (bulk reject)
  - [ ] Filter by status: calculated, approved, rejected
  - [ ] Filter by date range
  - [ ] Pagination (20 records per page)
  - [ ] Restrict to admin role only
- [ ] Build payroll approval component (AC: #5)
  - [ ] Create `collabcanvas/src/components/payroll/PayrollApprovalPanel.tsx`
  - [ ] Display individual payroll record details
  - [ ] Show timesheet details (clock-in, clock-out, lunch duration)
  - [ ] Show P4P calculation breakdown (base pay, penalties, total pay)
  - [ ] "Approve" and "Reject" buttons
  - [ ] Confirmation dialog before approval
- [ ] Build payroll export component (AC: #6)
  - [ ] Create `collabcanvas/src/components/payroll/PayrollExport.tsx`
  - [ ] "Export CSV" button
  - [ ] Select date range for export
  - [ ] Only export approved records
  - [ ] Show preview of CSV before download
  - [ ] Trigger browser download
- [ ] Build anomaly list component (AC: #4)
  - [ ] Create `collabcanvas/src/components/payroll/AnomalyList.tsx`
  - [ ] Display payroll records with anomalies
  - [ ] Highlight anomaly flags in red
  - [ ] Show anomaly descriptions (e.g., "Negative hours worked")
  - [ ] Link to timesheet for review
  - [ ] Filter by anomaly type
- [ ] Add CSV export functionality (AC: #6)
  - [ ] Function: `downloadCSV(csvString, filename)` - triggers browser download
  - [ ] Create Blob from CSV string
  - [ ] Create temporary anchor element with download attribute
  - [ ] Trigger click to download
  - [ ] Clean up anchor element
- [ ] Add email notifications (AC: #7)
  - [ ] "Send Notifications" button on admin payroll page
  - [ ] Confirmation dialog: "Send notifications to X managers and Y crew members?"
  - [ ] Call API endpoint to send notifications
  - [ ] Show toast notification on success
  - [ ] Handle errors (e.g., email service unavailable)
- [ ] Write frontend tests (AC: #4, #5, #6)
  - [ ] Create `collabcanvas/tests/pages/AdminPayrollPage.test.tsx`
  - [ ] Test payroll table renders
  - [ ] Test approval flow
  - [ ] Test CSV export
  - [ ] Mock API calls

**Testing Tasks:**
- [ ] Create E2E test suite (AC: #8)
  - [ ] Install Playwright: `npm install --save-dev @playwright/test`
  - [ ] Create `collabcanvas/tests/e2e/payrollApproval.spec.ts`
  - [ ] Test admin login → navigate to payroll page → approve records → export CSV
  - [ ] Create `collabcanvas/tests/e2e/clockIn.spec.ts`
  - [ ] Test crew member login → clock in → clock out
  - [ ] Create `collabcanvas/tests/e2e/crewAssignment.spec.ts`
  - [ ] Test admin assigns crew → crew appears in dropdown at clock-in
- [ ] Create performance test suite (AC: #9)
  - [ ] Create `backend/tests/performance/payrollProcessing.test.ts`
  - [ ] Seed 50 timesheets in database
  - [ ] Measure payroll processing time
  - [ ] Assert < 10 minutes
  - [ ] Measure individual query times
  - [ ] Assert < 100ms (95th percentile)
- [ ] Create integration test suite (AC: all)
  - [ ] Create `backend/tests/integration/completePayrollFlow.test.ts`
  - [ ] Test: create crew → assign to project → clock in → clock out → calculate payroll → approve → export → verify CSV
  - [ ] Test anomaly detection throughout flow
  - [ ] Test notification sending

---

### Technical Summary

This story completes the P4P integration by adding admin payroll management UI, daily automated payroll processing via cron job, and comprehensive testing. Admins can review payroll records, approve/reject them, and export CSV files in Paychex format. The system automatically processes payroll at 10:30 AM daily, eliminating 4+ hours of manual work. Mock APIs for Service Autopilot and Paychex enable development and testing without real API access.

**Key Technical Decisions:**
- **Cron Job:** node-cron library for scheduling, runs at 10:30 AM daily
- **Mock APIs:** USE_MOCK_APIS flag switches between mock and real APIs
- **CSV Format:** Paychex-compatible format (employee_id, date, hours_worked, base_pay, total_pay)
- **Email Notifications:** nodemailer or SendGrid for sending payroll notifications
- **E2E Testing:** Playwright for complete user flow testing
- **Performance Testing:** Artillery or k6 for load testing with 50+ employees
- **Bulk Operations:** Admin can approve/reject multiple payroll records at once

**Files/Modules Involved:**
- Backend: scheduledPayrollService.ts, mockServiceAutopilotApi.ts, mockPaychexApi.ts, notificationService.ts, csvExportService.ts
- Frontend: AdminPayrollPage.tsx, PayrollApprovalPanel.tsx, PayrollExport.tsx, AnomalyList.tsx
- Store: usePayrollStore.ts
- Testing: E2E tests (Playwright), performance tests (Jest), integration tests

### Project Structure Notes

- **Files to modify:**
  - `backend/src/server.ts` - Add cron job
  - `collabcanvas/src/App.tsx` - Add route for /admin/payroll
- **Files to create:**
  - `backend/src/services/scheduledPayrollService.ts` - Cron job handler
  - `backend/src/services/mockServiceAutopilotApi.ts` - Mock SA API
  - `backend/src/services/mockPaychexApi.ts` - Mock Paychex API
  - `backend/src/services/notificationService.ts` - Email notifications
  - `backend/src/services/csvExportService.ts` - CSV generation
  - `collabcanvas/src/store/usePayrollStore.ts` - Payroll state
  - `collabcanvas/src/pages/AdminPayrollPage.tsx` - Admin payroll page
  - `collabcanvas/src/components/payroll/PayrollApprovalPanel.tsx` - Approval UI
  - `collabcanvas/src/components/payroll/PayrollExport.tsx` - CSV export UI
  - `collabcanvas/src/components/payroll/AnomalyList.tsx` - Anomaly display
  - `collabcanvas/tests/e2e/payrollApproval.spec.ts` - E2E tests
  - `collabcanvas/tests/e2e/clockIn.spec.ts` - E2E tests
  - `collabcanvas/tests/e2e/crewAssignment.spec.ts` - E2E tests
  - `backend/tests/performance/payrollProcessing.test.ts` - Performance tests
  - `backend/tests/integration/completePayrollFlow.test.ts` - Integration tests
- **Expected test locations:**
  - `collabcanvas/tests/e2e/` - All E2E tests
  - `backend/tests/performance/` - Performance tests
  - `backend/tests/integration/` - Integration tests
  - `collabcanvas/tests/pages/AdminPayrollPage.test.tsx` - Component tests
- **Estimated effort:** 4 story points (~2 days)
- **Prerequisites:** Story 1.5 (requires payroll calculation service)

### Key Code References

**Tech-Spec References:**
- Cron job configuration: tech-spec.md:1545-1547
- Mock API strategy: tech-spec.md:1533-1539
- CSV export format: tech-spec.md:1788-1789
- Performance targets: tech-spec.md:1856-1857
- E2E testing approach: tech-spec.md:2274-2310

---

## Context References

**Tech-Spec:** [tech-spec.md](../tech-spec.md) - Primary context document containing:

- Daily automation strategy (cron job)
- Mock API implementation patterns
- CSV export specification
- Complete testing approach (unit, integration, E2E, performance)
- Notification service patterns

**Architecture:** Express backend with cron job, React frontend with admin UI, comprehensive test suite

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
