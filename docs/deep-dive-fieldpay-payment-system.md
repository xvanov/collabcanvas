# FieldPay-Pro Payment System - Deep Dive Documentation

**Generated:** 2025-11-19
**Target:** FieldPay-Pro Complete Payment System
**Purpose:** Integration reference for Projective Money View
**Files Analyzed:** 35+ backend services, routes, utilities, and frontend components

---

## Executive Summary

FieldPay-Pro is a **Pay-for-Performance (P4P) payroll automation system** for Clean Scapes, a $7M landscaping company. The system automates daily payroll processing, calculates performance-based pay with penalties, and provides real-time feedback to field crews.

### Key Capabilities for Integration

- **Automated Payroll Calculation**: Base pay + penalties (late clock-in, long lunch)
- **Data Import**: CSV parsing for timesheet and job data
- **Payroll Processing**: Analyze (preview) and Process (commit) modes
- **Approval Workflow**: Admin review and approval of calculated payroll
- **CSV Export**: Paychex-compatible payroll exports
- **Multi-Role Access**: Admin, Manager, Foreman, Crew Member permissions
- **Notifications**: Role-specific notifications for payroll events

---

## System Architecture

### Technology Stack

**Backend:**
- Node.js + Express.js
- Supabase (PostgreSQL database)
- Firebase Authentication
- CSV processing (csv-parser, multer)

**Frontend:**
- React + Tailwind CSS
- Axios for API calls
- Role-based dashboards

### Core Data Flow

```
1. CSV Upload (Timesheets/Jobs) → Parse → Store in DB
2. Analyze Payroll → Fetch Data → Calculate → Preview Results
3. Process Payroll → Calculate → Save to DB → Send Notifications → Export CSV
```

---

## Core Business Logic

### Payment Calculation Formula

```javascript
// Simplified P4P Formula (NO bonuses, efficiency removed)
basePay = hoursWorked × baseRate
latePenalty = clockIn > 7:00 AM ? basePay × 0.05 : 0  // 5%
longLunchPenalty = lunchDuration > 30min ? basePay × 0.02 : 0  // 2%
totalPenalties = latePenalty + longLunchPenalty
totalPay = MAX(0, basePay - totalPenalties)  // Never negative
```

### Calculation Rules (`backend/config/calculationRules.js`)

**Penalties:**
- **Late Clock-In**: 5% of base pay if clocked in after 7:00 AM
- **Long Lunch**: 2% of base pay if lunch break exceeds 30 minutes

**Settings:**
- `minTotalPay`: 0.0 (pay cannot be negative)
- `efficiencyDecimalPlaces`: 4
- `moneyDecimalPlaces`: 2
- `defaultBaseRate`: $15.00/hour

**Anomaly Detection:**
- Missing or zero base pay
- Missing or zero hours worked
- Negative total pay
- Missing clock in/out data

---

## File Inventory & Architecture

### 1. Calculation Engine

#### `backend/services/calculationService.js` (335 lines)
**Purpose:** Core P4P calculation logic for employee payroll

**Key Exports:**
- `calculateEfficiency(budgetedHours, actualHours)` → Calculate job efficiency (budgeted/actual)
- `calculateAggregateEfficiency(jobs, totalActualHours)` → Multi-job efficiency with breakdown
- `calculateBasePay(hoursWorked, baseRate)` → Simple hours × rate calculation
- `detectAnomalies(calculation)` → Flag missing data, negative pay, zero values
- `calculateEmployeePayroll(employee, jobs)` → **Main function**: Calculate single employee's pay
- `calculateBatchPayroll(employees, jobs, assignments)` → Batch processing for all employees

**Dependencies:**
- `../config/calculationRules` (penalty/bonus rules)

**Key Implementation Details:**
- Validates all inputs (throws errors for zero/null hours)
- Applies penalties using functions from `calculationRules`
- Calculates efficiency but NO longer adds bonuses (simplified formula)
- Returns anomaly flags for review workflow
- Batch processing returns summary statistics (total base pay, penalties, payout)

**Data Flow:**
```
Employee + Timesheet → calculateEmployeePayroll()
  → calculateBasePay()
  → calculateLatePenalty() / calculateLongLunchPenalty()
  → totalPay = basePay - penalties (min 0)
  → detectAnomalies()
  → Return calculation object
```

---

### 2. Payroll Processing Orchestration

#### `backend/services/payrollService.js` (626 lines)
**Purpose:** Orchestrates end-to-end payroll processing workflow

**Key Exports:**
- `analyzePayroll(date)` → **Preview mode**: Calculate without saving to DB
- `processPayroll(date, triggeredBy, options)` → **Commit mode**: Calculate + save + notify
- `checkExistingPayroll(date)` → Check if payroll already processed for date
- `deleteExistingPayroll(date)` → Delete records (for reprocessing)
- `getPayrollRecords(filters)` → Query payroll records with role-based filtering
- `getPayrollRecord(id)` → Get single record details
- `approvePayrollRecord(id, adminId, notes)` → Admin approval workflow
- `bulkApprovePayrollRecords(ids, adminId)` → Bulk approve multiple records

**Dependencies:**
- `./dataService` (fetch external data)
- `./calculationService` (calculate payroll)
- `./executionLogService` (logging)
- `./notificationService` (notifications)
- `../config/database` (Supabase)

**Key Workflows:**

**1. Analyze Payroll (Preview):**
```javascript
const result = await analyzePayroll('2025-01-15');
// Returns: { success, mode: 'preview', date, summary, results, errors }
// NO database writes, safe to test
```

**2. Process Payroll (Commit):**
```javascript
const result = await processPayroll('2025-01-15', adminUserId, { reprocess: false });
// 1. Check for existing records
// 2. Create execution log
// 3. Fetch data from external APIs (or mock)
// 4. Calculate payroll for all employees
// 5. Map employee IDs to database UUIDs
// 6. Save to payroll_records table
// 7. Create notifications for all roles
// 8. Update execution log
// Returns: { success, mode: 'committed', summary, results, execution_log_id }
```

**3. Reprocess Payroll:**
```javascript
await processPayroll('2025-01-15', adminUserId, { reprocess: true });
// Deletes existing records, recalculates, saves new records
```

**Critical Implementation Notes:**
- **User ID Mapping**: Converts mock employee IDs (crew1, crew2) to database UUIDs before saving
- **Execution Logging**: Tracks every processing run with start/end time, status, errors
- **Notification System**: Sends role-specific notifications to Admin, Manager, Foreman, Crew
- **Anomaly Handling**: Records with anomalies get status `pending_review`, others `calculated`
- **Approval Workflow**: Records must be approved before final export

**Role-Based Filtering:**
- **Crew Member**: Can only see own records (filters by user.id)
- **Foreman**: Can see own crew's records (filters by crew_id)
- **Manager/Admin**: Can see all records

---

### 3. Data Service Layer

#### `backend/services/dataService.js` (228 lines)
**Purpose:** Abstraction layer for fetching data from external APIs (Service Autopilot, Paychex)

**Key Exports:**
- `getJobData(date, crewId)` → Fetch job data from Service Autopilot
- `getTimesheetData(date, employeeId)` → Fetch timesheet data from Paychex
- `getJobAssignments(date)` → Fetch employee-job assignments
- `getPayrollData(date)` → **Main function**: Fetch all data in parallel (jobs, timesheets, assignments)
- `getEmployees()` → Fetch employee list
- `getCrews()` → Fetch crew/team list

**Dependencies:**
- `axios` (HTTP client)
- `../config/api` (API configuration)
- `../utils/mockDataGenerator` (mock data for development)

**Mock vs Real API:**
```javascript
if (isMockEnabled()) {
  // Generate mock data locally (works in any environment)
  return generateMockJobs(date, 12);
} else {
  // Call real external API
  return axios.get(apiUrl, { params, headers });
}
```

**Data Structures:**

**Job Object:**
```javascript
{
  job_id: string,
  location: string,
  service_type: string,  // 'Full Service', 'Mowing', etc.
  budgeted_hours: number,
  actual_hours: number,
  crew_id: string,
  date: 'YYYY-MM-DD'
}
```

**Timesheet Object:**
```javascript
{
  employee_id: string,  // Mock: 'crew1', 'crew2', etc.
  employee_name: string,
  date: 'YYYY-MM-DD',
  clock_in: 'HH:MM:SS' or ISO string,
  clock_out: 'HH:MM:SS' or ISO string,
  lunch_start: 'HH:MM:SS' or ISO string,
  lunch_end: 'HH:MM:SS' or ISO string,
  hours_worked: number,
  base_rate: number,
  crew_id: string
}
```

**Assignment Object:**
```javascript
{
  employee_id: string,
  job_id: string,
  date: 'YYYY-MM-DD'
}
```

---

### 4. CSV Import/Export

#### `backend/utils/csvParser.js` (208 lines)
**Purpose:** Parse uploaded CSV files from Service Autopilot and Paychex

**Key Exports:**
- `parseServiceAutopilotCSV(fileBuffer)` → Parse job data CSV
- `parsePaychexCSV(fileBuffer)` → Parse timesheet data CSV
- `validateCSVFile(filename, expectedType)` → Validate file format

**Expected CSV Formats:**

**Service Autopilot CSV:**
```csv
job_id,date,location,service_type,budgeted_hours,crew_id,status,notes
JOB001,2025-01-15,123 Main St,Full Service,4.0,CREW1,completed,
```

**Paychex CSV:**
```csv
employee_id,employee_name,date,clock_in,clock_out,lunch_start,lunch_end,hours_worked,base_rate,crew_id,status
crew1,Juan Garcia,2025-01-15,07:00:00,16:00:00,12:00:00,12:30:00,8.5,18.00,foreman1,active
```

**Validation:**
- Required fields checked (job_id/employee_id, date)
- Numeric fields validated (hours, rates must be ≥ 0)
- Date format validated (YYYY-MM-DD)
- Returns errors array for invalid rows (continues parsing valid rows)

#### `backend/utils/csvExporter.js` (212 lines)
**Purpose:** Export payroll records to Paychex-compatible CSV

**Key Exports:**
- `generatePayrollCSV(records)` → Standard format (12 columns)
- `generateDetailedPayrollCSV(records)` → Detailed format (20 columns)
- `generateSummaryCSV(records)` → Aggregated by employee
- `generateFilename(type, date)` → Generate export filename

**Standard CSV Output:**
```csv
Employee ID,Employee Name,Date,Hours Worked,Base Rate,Base Pay,Late Penalty,Long Lunch Penalty,Total Pay,Status,Approved,Has Anomalies
crew1,"Juan Garcia",2025-01-15,8.50,18.00,153.00,7.65,0.00,145.35,calculated,No,No
```

---

### 5. API Routes

#### `backend/routes/payroll.js` (580 lines)
**Purpose:** RESTful API endpoints for payroll operations

**Authentication:** All routes require `authenticateToken` middleware (Firebase JWT)

**Key Endpoints:**

##### **POST /api/payroll/analyze**
- **Role**: Admin only
- **Body**: `{ date: 'YYYY-MM-DD' }` (optional, defaults to yesterday)
- **Response**: Preview results (no DB writes)
```json
{
  "success": true,
  "mode": "preview",
  "date": "2025-01-15",
  "summary": {
    "total_employees": 10,
    "successful_calculations": 10,
    "failed_calculations": 0,
    "anomalies_detected": 2,
    "total_base_pay": 1530.00,
    "total_penalties": 76.50,
    "total_payout": 1453.50
  },
  "results": [ /* array of payroll calculations */ ],
  "errors": []
}
```

##### **POST /api/payroll/process**
- **Role**: Admin only
- **Body**: `{ date: 'YYYY-MM-DD', reprocess: false }`
- **Response**: Committed results (saved to DB, notifications sent)
```json
{
  "success": true,
  "mode": "committed",
  "date": "2025-01-15",
  "reprocessed": false,
  "execution_log_id": "uuid",
  "notifications_sent": 42,
  "summary": { /* same as analyze */ }
}
```

##### **GET /api/payroll/records**
- **Role**: All (with role-based filtering)
- **Query Params**: `date`, `start_date`, `end_date`, `employee_id`, `crew_id`, `status`, `anomalies_only`
- **Response**: List of payroll records
```json
{
  "success": true,
  "count": 10,
  "records": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "employee_name": "Juan Garcia",
      "date": "2025-01-15",
      "hours_worked": 8.5,
      "base_rate": 18.00,
      "base_pay": 153.00,
      "late_penalty": 7.65,
      "long_lunch_penalty": 0.00,
      "total_penalties": 7.65,
      "total_pay": 145.35,
      "status": "calculated",
      "approved": false,
      "has_anomalies": false,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

##### **GET /api/payroll/records/:id**
- **Role**: All (with permission checks)
- **Response**: Single record details

##### **PATCH /api/payroll/records/:id/approve**
- **Role**: Admin only
- **Body**: `{ notes: 'Approved - looks good' }`
- **Response**: Updated record with approval

##### **POST /api/payroll/approve-bulk**
- **Role**: Admin only
- **Body**: `{ record_ids: ['uuid1', 'uuid2'] }`
- **Response**: Bulk approval result

##### **GET /api/payroll/export**
- **Role**: Admin, Manager
- **Query Params**: `date`, `format` (standard|detailed|summary)
- **Response**: CSV file download

##### **GET /api/payroll/summary**
- **Role**: Admin, Manager
- **Query Params**: `date`, `start_date`, `end_date`
- **Response**: Aggregate statistics
```json
{
  "success": true,
  "summary": {
    "total_records": 10,
    "approved_records": 8,
    "pending_records": 2,
    "anomaly_records": 2,
    "total_base_pay": 1530.00,
    "total_penalties": 76.50,
    "total_payout": 1453.50,
    "average_efficiency": 0.9523,
    "average_efficiency_percentage": 95.23
  }
}
```

##### **GET /api/payroll/executions**
- **Role**: Admin only
- **Query Params**: `execution_date`, `status`, `is_reprocess`, `start_date`, `end_date`, `limit`, `offset`
- **Response**: Execution logs (processing history)

##### **GET /api/payroll/executions/:id**
- **Role**: Admin only
- **Response**: Single execution log details

#### `backend/routes/upload.js` (270 lines)
**Purpose:** CSV file upload endpoints

##### **POST /api/upload/service-autopilot**
- **Role**: Admin only
- **Body**: `multipart/form-data` with `file` field
- **File Validation**: CSV only, 10MB max
- **Response**: Parse + store job data
```json
{
  "success": true,
  "message": "Service Autopilot data uploaded successfully",
  "data": {
    "recordsProcessed": 12,
    "recordsStored": 12,
    "errors": [],
    "preview": [ /* first 10 rows */ ]
  }
}
```

##### **POST /api/upload/paychex**
- **Role**: Admin only
- **Body**: `multipart/form-data` with `file` field
- **Response**: Parse + store timesheet data + update base rates

---

### 6. Frontend API Client

#### `frontend-web/src/services/api.js` (165 lines)
**Purpose:** Axios-based API client with auth and error handling

**Key Features:**
- Automatic JWT token injection from localStorage
- Comprehensive error handling (network, auth, validation, server errors)
- Automatic logout on 401 (expired token)

**API Methods:**

```javascript
// Authentication
authAPI.login(email, password)
authAPI.logout()
authAPI.getProfile()

// Payroll Operations
payrollAPI.analyze(date)                          // POST /api/payroll/analyze
payrollAPI.process(date, reprocess)               // POST /api/payroll/process
payrollAPI.getRecords(params)                      // GET /api/payroll/records
payrollAPI.getRecord(id)                           // GET /api/payroll/records/:id
payrollAPI.approveRecord(id, notes)                // PUT /api/payroll/records/:id/approve
payrollAPI.deleteRecord(id)                        // DELETE /api/payroll/records/:id
payrollAPI.exportCSV(params)                       // GET /api/payroll/export (blob response)
payrollAPI.getSummary(params)                      // GET /api/payroll/summary
payrollAPI.getExecutions(params)                   // GET /api/payroll/executions
payrollAPI.getExecution(id)                        // GET /api/payroll/executions/:id
payrollAPI.getExecutionStats()                     // GET /api/payroll/executions/stats

// Upload
uploadAPI.uploadServiceAutopilot(file)             // POST /api/upload/service-autopilot
uploadAPI.uploadPaychex(file)                      // POST /api/upload/paychex

// Users
userAPI.getUsers(params)
userAPI.getUser(id)
userAPI.createUser(userData)
userAPI.updateUser(id, userData)
userAPI.deleteUser(id)
userAPI.getStats()

// Notifications
notificationAPI.getNotifications(params)
notificationAPI.getUnreadCount()
notificationAPI.markAsRead(id)
notificationAPI.markAllAsRead()
```

**Error Handling:**
```javascript
try {
  const response = await payrollAPI.process('2025-01-15', false);
} catch (error) {
  if (error.type === 'network') {
    // No internet connection
  } else if (error.type === 'authentication') {
    // Redirected to login
  } else if (error.type === 'validation') {
    // Show error.details
  } else if (error.type === 'server') {
    // Server error
  }
}
```

---

## Dependency Graph

### Service Layer Dependencies

```
payrollService.js
  ├─→ dataService.js
  │     ├─→ axios
  │     ├─→ config/api.js
  │     └─→ utils/mockDataGenerator.js
  ├─→ calculationService.js
  │     └─→ config/calculationRules.js
  ├─→ executionLogService.js
  │     └─→ config/database.js (Supabase)
  └─→ notificationService.js
        └─→ config/database.js (Supabase)
```

### Route Layer Dependencies

```
routes/payroll.js
  ├─→ middleware/auth.js (authenticateToken)
  ├─→ middleware/roleCheck.js (requireAdmin, requireRole)
  ├─→ services/payrollService.js
  ├─→ services/executionLogService.js
  └─→ utils/csvExporter.js

routes/upload.js
  ├─→ multer (file upload)
  ├─→ middleware/auth.js
  ├─→ middleware/roleCheck.js
  ├─→ utils/csvParser.js
  └─→ config/database.js (Supabase)
```

### Frontend Dependencies

```
frontend-web/src/pages/admin/Upload.jsx
  └─→ services/api.js (uploadAPI)

frontend-web/src/pages/admin/Review.jsx
  └─→ services/api.js (payrollAPI)

frontend-web/src/pages/admin/Approve.jsx
  └─→ services/api.js (payrollAPI)

frontend-web/src/pages/admin/Reports.jsx
  └─→ services/api.js (payrollAPI)
```

---

## Data Flow Analysis

### Complete Payroll Processing Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. DATA UPLOAD (Admin)                                      │
├─────────────────────────────────────────────────────────────┤
│ Upload CSV → POST /api/upload/paychex                       │
│           → csvParser.parsePaychexCSV()                     │
│           → Store in timesheets table                       │
│                                                             │
│ Upload CSV → POST /api/upload/service-autopilot             │
│           → csvParser.parseServiceAutopilotCSV()            │
│           → Store in jobs table                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. ANALYZE PAYROLL (Admin - Preview)                        │
├─────────────────────────────────────────────────────────────┤
│ Click "Analyze" → POST /api/payroll/analyze                 │
│                → payrollService.analyzePayroll()            │
│                → dataService.getPayrollData()               │
│                  ├─ getJobData()          (Service Autopilot)│
│                  ├─ getTimesheetData()    (Paychex)        │
│                  └─ getJobAssignments()   (Service Autopilot)│
│                → calculationService.calculateBatchPayroll() │
│                  └─ calculateEmployeePayroll() (per employee)│
│                    ├─ calculateBasePay()                    │
│                    ├─ calculateLatePenalty()                │
│                    ├─ calculateLongLunchPenalty()           │
│                    └─ detectAnomalies()                     │
│                → Return results (NO DB write)               │
│                                                             │
│ Admin reviews preview in UI                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 3. PROCESS PAYROLL (Admin - Commit)                         │
├─────────────────────────────────────────────────────────────┤
│ Click "Process" → POST /api/payroll/process                 │
│                → payrollService.processPayroll()            │
│                → checkExistingPayroll() (prevent duplicates)│
│                → createExecutionLog() (track processing)    │
│                → getPayrollData() + calculateBatchPayroll() │
│                → savePayrollRecords()                       │
│                  ├─ Map mock IDs to database UUIDs         │
│                  ├─ Insert into payroll_records table      │
│                  └─ Set status: 'pending_review' or         │
│                                 'calculated'                │
│                → createPayrollNotifications()               │
│                  ├─ Admins: "Payroll ready for review"     │
│                  ├─ Managers: Daily summary                │
│                  ├─ Foremen: Team results                  │
│                  └─ Crew: Personal performance             │
│                → updateExecutionLog() (mark complete)       │
│                → Return results                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 4. REVIEW & APPROVE (Admin)                                 │
├─────────────────────────────────────────────────────────────┤
│ View Records → GET /api/payroll/records?date=2025-01-15     │
│             → Filter by status, anomalies                   │
│                                                             │
│ View Detail → GET /api/payroll/records/:id                  │
│            → Show full calculation breakdown                │
│                                                             │
│ Approve → PATCH /api/payroll/records/:id/approve            │
│        → Update: approved=true, status='approved'           │
│                                                             │
│ Bulk Approve → POST /api/payroll/approve-bulk               │
│             → approvePayrollRecord() for each ID            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 5. EXPORT (Admin/Manager)                                   │
├─────────────────────────────────────────────────────────────┤
│ Export CSV → GET /api/payroll/export?date=2025-01-15        │
│           → &format=standard|detailed|summary              │
│           → csvExporter.generatePayrollCSV()               │
│           → Download Paychex-compatible CSV                │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Points for Projective Money View

### Recommended Integration Approach

**Option 1: Direct Database Integration (Recommended)**
- Reuse FieldPay's Supabase schema for payroll tracking
- Integrate calculation engine directly into Projective
- Avoid duplicating backend services

**Option 2: Microservice Integration**
- Keep FieldPay backend as standalone service
- Call FieldPay APIs from Projective
- Requires API authentication setup

**Option 3: Code Extraction**
- Extract calculation logic to shared library
- Reimplement data layer for Projective's DB
- Most flexible but requires more work

---

### Key Components to Integrate

#### 1. **Calculation Engine** (HIGH PRIORITY)
**Files:**
- `backend/services/calculationService.js`
- `backend/config/calculationRules.js`

**Use Case:** Calculate pay for workers based on time tracking

**Integration Steps:**
1. Copy calculation service + rules to Projective backend
2. Adapt to use Projective's employee/timesheet data model
3. Integrate into Money View payment calculations

**Benefits:**
- Proven calculation logic (handles edge cases)
- Configurable penalty/bonus rules
- Anomaly detection built-in

#### 2. **CSV Export** (MEDIUM PRIORITY)
**Files:**
- `backend/utils/csvExporter.js`

**Use Case:** Export payment data for payroll processing

**Integration Steps:**
1. Copy CSV exporter utility
2. Adapt to Projective's payroll record structure
3. Add export button to Money View

#### 3. **Payment Workflow** (MEDIUM PRIORITY)
**Files:**
- `backend/services/payrollService.js` (analyze, process, approve functions)

**Use Case:** Preview → Process → Approve workflow for payments

**Integration Steps:**
1. Create similar preview/commit modes in Projective
2. Implement approval workflow for payment batches
3. Add execution logging for audit trail

#### 4. **Notification System** (LOW PRIORITY)
**Files:**
- `backend/services/notificationService.js`

**Use Case:** Notify users about payment events

**Integration Steps:**
1. Reuse notification patterns
2. Adapt messages for Projective's context
3. Send notifications on payment processing

---

### Database Schema Mapping

**FieldPay → Projective Mapping:**

```sql
-- FieldPay payroll_records table
CREATE TABLE payroll_records (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES users(id),
  date DATE NOT NULL,
  hours_worked DECIMAL(5,2),
  base_rate DECIMAL(10,2),
  base_pay DECIMAL(10,2),
  late_penalty DECIMAL(10,2),
  long_lunch_penalty DECIMAL(10,2),
  penalties DECIMAL(10,2),        -- Total penalties
  total_pay DECIMAL(10,2),
  has_anomalies BOOLEAN,
  anomaly_flags TEXT[],
  status TEXT,                     -- 'calculated', 'pending_review', 'approved'
  approved BOOLEAN,
  approved_by UUID,
  approved_at TIMESTAMP,
  crew_id TEXT,
  created_at TIMESTAMP
);

-- Suggested Projective payment_records table
CREATE TABLE payment_records (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),      -- Link to project
  worker_id UUID REFERENCES users(id),           -- Worker being paid
  date DATE NOT NULL,
  hours_worked DECIMAL(5,2),
  hourly_rate DECIMAL(10,2),
  base_amount DECIMAL(10,2),
  deductions DECIMAL(10,2),                      -- Penalties
  bonus DECIMAL(10,2),                           -- Optional bonuses
  total_amount DECIMAL(10,2),
  status TEXT,                                    -- 'pending', 'approved', 'paid'
  approved_by UUID,
  approved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP
);
```

---

### API Integration Example

If using FieldPay as a microservice:

```javascript
// In Projective Money View
import axios from 'axios';

const fieldPayAPI = axios.create({
  baseURL: 'https://fieldpay-pro-api.com/api',
  headers: { 'Authorization': `Bearer ${authToken}` }
});

// Analyze payment preview
async function analyzePayment(projectId, date) {
  const response = await fieldPayAPI.post('/payroll/analyze', {
    date,
    custom_data: { project_id: projectId }
  });
  return response.data;
}

// Process payment
async function processPayment(projectId, date) {
  const response = await fieldPayAPI.post('/payroll/process', {
    date,
    custom_data: { project_id: projectId }
  });
  return response.data;
}

// Export CSV
async function exportPaymentCSV(projectId, date) {
  const response = await fieldPayAPI.get('/payroll/export', {
    params: { date, format: 'detailed' },
    responseType: 'blob'
  });

  // Download file
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `payment_${date}.csv`);
  document.body.appendChild(link);
  link.click();
}
```

---

## Testing & Validation

### Calculation Test Cases

**Test Scenarios:**
1. Standard pay (no penalties): 8 hours × $18/hr = $144.00
2. Late clock-in penalty: 8 hours × $18/hr = $144.00, late penalty = $7.20 (5%), total = $136.80
3. Long lunch penalty: 8 hours × $18/hr = $144.00, lunch penalty = $2.88 (2%), total = $141.12
4. Both penalties: total = $144.00 - $7.20 - $2.88 = $133.92
5. Anomaly detection: Missing clock-in → flagged for review
6. Edge case: Penalties > base pay → total = $0.00 (never negative)

### API Test Endpoints

Use these to test integration:

```bash
# 1. Analyze payroll (preview)
curl -X POST http://localhost:3000/api/payroll/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-01-15"}'

# 2. Process payroll (commit)
curl -X POST http://localhost:3000/api/payroll/process \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-01-15", "reprocess": false}'

# 3. Get payroll records
curl -X GET "http://localhost:3000/api/payroll/records?date=2025-01-15" \
  -H "Authorization: Bearer $TOKEN"

# 4. Export CSV
curl -X GET "http://localhost:3000/api/payroll/export?date=2025-01-15&format=detailed" \
  -H "Authorization: Bearer $TOKEN" \
  --output payroll.csv
```

---

## Security Considerations

### Authentication & Authorization
- All API routes require Firebase JWT authentication
- Role-based access control (RBAC) enforced
- Crew members can only see own records
- Foremen restricted to own crew
- Admins have full access

### Data Validation
- CSV parsing validates all inputs
- Calculation service validates hours, rates (no negative values)
- Date format validation (YYYY-MM-DD)
- File size limits (10MB for CSV uploads)

### Audit Trail
- Execution logs track every processing run
- Approval tracking (who approved, when)
- Reprocess history maintained

---

## Performance Metrics

**FieldPay-Pro Performance:**
- Payroll processing time: **<15 minutes** (down from 4 hours manual)
- CSV export: **<5 seconds** for 100 records
- API response time: **<500ms** for standard queries

**Scalability:**
- Handles **100+ employees** efficiently
- Batch processing optimized for parallel calculation
- Database indexed on date, employee_id, status

---

## Deployment Architecture

**Current FieldPay Deployment:**
- **Backend**: Firebase Cloud Functions (Node.js 20)
- **Frontend**: Firebase Hosting
- **Database**: Supabase PostgreSQL
- **File Storage**: Firebase Storage (for CSV uploads)
- **Authentication**: Firebase Auth

**For Projective Integration:**
- Option A: Deploy as shared service (same Firebase project)
- Option B: Extract calculation logic, deploy in Projective's backend
- Option C: Run as separate microservice with API gateway

---

## Next Steps for Integration

### Phase 1: Evaluation & Planning (1-2 days)
1. Review Projective's current payment/money tracking architecture
2. Identify data model differences (projects vs crews, workers vs employees)
3. Choose integration approach (Direct DB vs Microservice vs Code Extract)
4. Create integration architecture diagram

### Phase 2: Core Integration (3-5 days)
1. **Calculation Engine**: Integrate `calculationService.js` into Projective
2. **Data Mapping**: Map Projective's time tracking to FieldPay's timesheet model
3. **Payment Workflow**: Implement preview → process → approve workflow
4. **CSV Export**: Add export functionality to Money View

### Phase 3: UI Integration (2-3 days)
1. Create Payment Processing UI in Money View
2. Add payment calculation preview
3. Implement approval workflow UI
4. Add export button for CSV download

### Phase 4: Testing & Refinement (2-3 days)
1. Test calculation accuracy
2. Test role-based permissions
3. Validate CSV exports
4. Performance testing

---

## Code Reuse Opportunities

### High-Value Extracts

**1. Payment Calculation Logic**
```javascript
// Copy from calculationService.js
const { calculateEmployeePayroll } = require('./calculationService');
const { penalties, settings } = require('./calculationRules');

// Adapt to Projective's data
function calculateWorkerPayment(worker, timesheetData) {
  const employee = {
    employee_id: worker.id,
    timesheet: {
      hours_worked: timesheetData.totalHours,
      base_rate: worker.hourlyRate,
      clock_in: timesheetData.clockIn,
      clock_out: timesheetData.clockOut,
      lunch_start: timesheetData.lunchStart,
      lunch_end: timesheetData.lunchEnd,
      date: timesheetData.date
    }
  };

  return calculateEmployeePayroll(employee, []);
}
```

**2. CSV Export**
```javascript
// Copy from csvExporter.js
const { generatePayrollCSV } = require('./csvExporter');

// Use in Projective
function exportProjectPayments(projectId, date) {
  const payments = getProjectPayments(projectId, date);
  const csv = generatePayrollCSV(payments);
  return csv;
}
```

**3. Approval Workflow**
```javascript
// Pattern from payrollService.js
async function approvePayment(paymentId, adminId, notes) {
  const payment = await getPaymentRecord(paymentId);

  if (payment.approved) {
    throw new Error('Payment already approved');
  }

  await updatePayment(paymentId, {
    approved: true,
    approved_by: adminId,
    approved_at: new Date(),
    notes: notes
  });

  // Send notification
  await notifyPaymentApproved(payment);
}
```

---

## Troubleshooting Guide

### Common Issues

**Issue 1: "Payroll already processed for this date"**
- **Cause**: Trying to process date that already has records
- **Solution**: Use `reprocess: true` option to override

**Issue 2: "No timesheet data found"**
- **Cause**: Missing CSV upload or wrong date
- **Solution**: Check upload status, verify date format

**Issue 3: "User ID mapping failed"**
- **Cause**: Mock employee IDs don't match database users
- **Solution**: Ensure users table has correct employee_id values (crew1, crew2, etc.)

**Issue 4: Negative total pay**
- **Cause**: Penalties exceed base pay
- **Solution**: This should never happen (calculation uses MAX(0, basePay - penalties))

---

## Documentation & Resources

**FieldPay-Pro Documentation:**
- README: `/FieldPay-Pro/README.md`
- API Docs: `/FieldPay-Pro/docs/API.md`
- Architecture: `/FieldPay-Pro/docs/ARCHITECTURE.md`
- Database Schema: `/FieldPay-Pro/docs/DATABASE.md`
- PRD: `/FieldPay-Pro/PRD_Clean_Scapes_Rebuild_PayforPerformance.md`

**Key Configuration Files:**
- Backend config: `/FieldPay-Pro/backend/.env.sample`
- Calculation rules: `/FieldPay-Pro/backend/config/calculationRules.js`
- API config: `/FieldPay-Pro/backend/config/api.js`

---

## Contact & Support

**System Ownership:**
- Built for Clean Scapes (private project)
- Production deployment: Firebase Cloud Functions + Hosting

**Developer Notes:**
- Comprehensive test suite: 65 tests (calculation, CSV export, user service)
- Mock data available for development/testing
- Deployed and operational

---

**END OF DEEP-DIVE DOCUMENTATION**

*Generated by BMad Method document-project workflow*
*For integration assistance, refer to calculation flow diagrams and API examples above*
