# Projective - Technical Specification: FieldPay-Pro P4P Payroll Integration

**Author:** xvanov
**Date:** 2025-11-19
**Project Level:** 3 (Method - Brownfield)
**Change Type:** Major Feature Integration
**Development Context:** Brownfield - Integrating FieldPay-Pro complete P4P payroll system into existing Projective platform

---

## Context

### Available Documents

**Loaded for this specification:**

1. **Projective Product Brief** (`product-brief-collabcanvas-2025-01-27.md`)
   - Vision: Construction takeoff & estimation platform
   - Problem: Manual estimation process, no validation loop for estimate accuracy
   - Goal: Enable contractors to generate accurate BOMs and pricing from plans

2. **Projective Brownfield Documentation** (`docs/index.md` + comprehensive docs)
   - Complete codebase analysis with architecture, components, services
   - React 19 + TypeScript + Firebase stack
   - Canvas-based plan annotation with Konva
   - Zustand state management

3. **FieldPay-Pro PRD** (`PRD_Clean_Scapes_Rebuild_PayforPerformance_P4P_as_an_Automated_Web_.md`)
   - Requirements: Automated P4P payroll for landscaping crews
   - Goals: Reduce processing time from 4 hours to <15 minutes
   - Features: Daily automation, performance-based pay, bilingual crew app

4. **FieldPay-Pro Deep-Dive** (`deep-dive-fieldpay-payment-system.md`)
   - Complete technical analysis of 35+ files
   - Payment calculation engine, API routes, CSV import/export
   - Mock Service Autopilot + Paychex integration
   - Detailed integration guide and code examples

### Project Stack

**Projective (Current Stack):**

**Frontend:**
- React 19.2.0 (latest stable)
- TypeScript 5.9.3
- Vite 7.1.7 (build tool)
- Firebase 12.4.0 (Authentication, Firestore, Hosting)
- Konva 10.0.2 (canvas rendering for plans)
- Zustand 5.0.8 (state management)
- Tailwind CSS 3.4.18 (styling)
- React Router 7.9.5 (routing)
- Vitest 3.2.4 (unit testing)
- Playwright 1.50.0 (E2E testing)

**Backend:**
- Firebase Functions (serverless)
- Firestore (NoSQL database)
- Firebase Storage (file uploads)

**FieldPay-Pro (Integration Source):**

**Backend:**
- Node.js 20
- Express 4.18.2
- Supabase 2.38.4 (PostgreSQL database)
- Firebase Admin 11.11.0 (authentication)
- node-cron 3.0.2 (scheduled jobs)
- Jest 29.7.0 (testing)
- Mock data generators (Service Autopilot + Paychex APIs)

**Key Services:**
- calculationService.js - P4P payment calculation engine
- payrollService.js - Payroll orchestration (analyze, process, approve)
- dataService.js - External API integration layer (mocked)
- notificationService.js - Role-based notifications
- executionLogService.js - Audit logging
- csvParser.js / csvExporter.js - CSV import/export utilities

### Existing Codebase Structure

**Projective Source Structure:**
```
collabcanvas/src/
├── components/          # 58 UI components
│   ├── Canvas/         # Plan canvas components (Konva-based)
│   ├── BOM/            # Bill of Materials display
│   ├── Auth/           # Authentication components
│   └── ...
├── services/           # 52 business logic services
│   ├── firebase/       # Firebase service clients
│   ├── aiService.ts    # AI integration for BOM generation
│   ├── bomService.ts   # BOM calculation logic
│   └── ...
├── store/              # 13 Zustand stores
│   ├── canvasStore.ts  # Canvas state
│   ├── authStore.ts    # Authentication state
│   ├── bomStore.ts     # BOM state
│   └── ...
├── hooks/              # 15 React hooks
├── pages/              # 7 route pages
│   ├── Dashboard.tsx
│   ├── Canvas.tsx
│   ├── BOM.tsx
│   └── ...
├── types/              # TypeScript definitions
│   └── types.ts        # 500+ lines of type definitions
└── integration/        # Integration tests
```

**FieldPay-Pro Backend Structure:**
```
FieldPay-Pro/backend/
├── services/
│   ├── calculationService.js    # P4P calculation engine
│   ├── payrollService.js         # Payroll orchestration
│   ├── dataService.js            # External API layer (mock-enabled)
│   ├── notificationService.js    # Notifications
│   ├── executionLogService.js    # Audit logging
│   ├── userService.js            # User management
│   └── cronService.js            # Scheduled tasks
├── routes/
│   ├── payroll.js                # 13 payroll endpoints
│   ├── upload.js                 # CSV upload endpoints
│   ├── auth.js                   # Authentication
│   ├── users.js                  # User management
│   └── notifications.js          # Notification endpoints
├── config/
│   ├── calculationRules.js       # P4P rules (penalties, bonuses)
│   ├── database.js               # Supabase client
│   ├── firebase.js               # Firebase Admin SDK
│   └── api.js                    # External API config (mock toggle)
├── utils/
│   ├── csvParser.js              # Parse Service Autopilot/Paychex CSV
│   ├── csvExporter.js            # Generate Paychex-compatible CSV
│   └── mockDataGenerator.js     # Generate realistic test data
└── middleware/
    ├── auth.js                   # JWT authentication
    └── roleCheck.js              # RBAC middleware
```

**Existing Patterns:**
- Component organization: Feature-based folders
- State management: Zustand stores with TypeScript
- API calls: Service layer pattern
- Testing: Vitest for unit, Playwright for E2E
- Code style: ESLint + TypeScript strict mode
- File naming: camelCase for files, PascalCase for components

---

## The Change

### Problem Statement

**Current State:**

Projective is a construction estimation platform that generates material BOMs from plans and scope documents. However, it has critical gaps:

1. **No Labor Estimation**: Only generates material costs, missing 30-50% of total project cost (labor)
2. **No Actual Cost Tracking**: No way to track real crew labor costs after project starts
3. **No Profitability Validation**: Cannot compare estimated costs vs actual costs to measure accuracy
4. **No Crew Management**: No system for managing field crews, timekeeping, or payroll
5. **No Estimate Validation Loop**: Contractors cannot improve estimation accuracy over time

**Business Impact:**

- **Incomplete Estimates**: Missing labor costs leads to inaccurate bids and lost profits
- **No Cost Control**: Can't track if projects are over/under budget during execution
- **Estimation Drift**: No feedback mechanism to validate and improve estimate accuracy
- **Manual Payroll**: Contractors still doing crew payroll manually (4+ hours/day)
- **No Performance Tracking**: Cannot measure crew efficiency or project profitability

**User Pain Points:**

- Project managers: "I estimated $10k but spent $15k - where did costs balloon?"
- Contractors: "My material estimates are accurate, but labor is always wrong"
- Crew foremen: "I don't know if we're on budget or over budget"
- Admins: "Payroll processing takes hours and is error-prone"

### Proposed Solution

**Integrate FieldPay-Pro's complete P4P payroll system into Projective to enable end-to-end project cost tracking and profitability management.**

**Solution Components:**

1. **Labor Estimation with CPM Scheduling**
   - AI generates detailed labor estimates from scope of work
   - Task breakdown with hours and costs
   - Critical Path Method (CPM) scheduling with dependencies
   - Timeline visualization (Gantt chart + dependency graph)
   - Uses crew-specific hourly rates

2. **Project-Crew Management**
   - Admin assigns crews to projects
   - Crews clock in/out selecting assigned project
   - Multi-project time tracking
   - Real-time labor cost accumulation per project

3. **P4P Payroll Automation**
   - Daily automated payroll processing (10:30 AM)
   - Performance-based pay calculation (base + penalties)
   - Admin approval workflow
   - CSV export for external payroll systems
   - Mock Service Autopilot + Paychex integration (real APIs later)

4. **Profitability Tracking**
   - Compare estimated labor vs actual payroll costs
   - Project profitability dashboard (budget vs actual)
   - Variance reporting (materials + labor)
   - Historical accuracy tracking for estimate improvement

5. **AI-Generated Demo Crews**
   - Generate realistic demo crews with names, roles, rates
   - Enable testing and demos without real data
   - Seed database with 3 crews (9 workers total)

**Value Proposition:**

- **Complete Estimates**: Materials + Labor = Full project cost
- **Cost Control**: Real-time tracking of actual vs estimated costs
- **Profitability Visibility**: Know if projects are profitable before completion
- **Payroll Automation**: Reduce processing from 4 hours to <15 minutes
- **Accuracy Improvement**: Validate estimates against actuals, improve over time
- **Unified Platform**: One system for estimation, scheduling, payroll, profitability

### Scope

**In Scope:**

1. **Backend Integration**
   - Copy complete FieldPay-Pro backend to Projective infrastructure
   - Integrate Express backend with Firebase Functions
   - Set up Supabase PostgreSQL database for payroll data
   - Configure mock Service Autopilot + Paychex APIs
   - Implement daily cron job (10:30 AM payroll processing)

2. **Database Schema**
   - Create payroll_records, timesheets, execution_logs, notifications tables
   - Extend users table with crew fields (employee_id, crew_id, base_rate)
   - Create project_assignments table (link crews to projects)
   - Create labor_estimates table (store CPM task breakdown)

3. **AI Labor Estimation**
   - Generate task breakdown from scope of work
   - Calculate hours and costs per task
   - CPM scheduling (dependencies, critical path, float times)
   - Use crew-specific hourly rates
   - Store estimates in database

4. **CPM Timeline Visualization**
   - Integrate Mermaid.js for Gantt charts and dependency graphs
   - Render timeline on separate view (not construction canvas)
   - Display critical path, task durations, dependencies
   - Show cost breakdown per task

5. **Project-Crew Assignment**
   - Admin UI for assigning crews to projects
   - Store assignments with start/end dates
   - Support multiple projects per crew (time-boxed)

6. **Multi-Project Clock-In**
   - Crew selects project when clocking in
   - Dropdown shows assigned projects only
   - Hours automatically linked to selected project
   - Track time per project for profitability

7. **Payroll Processing**
   - Analyze mode (preview without saving)
   - Process mode (calculate + save + notify)
   - Admin approval workflow
   - Anomaly detection and flagging
   - CSV export (Paychex-compatible format)

8. **Profitability Dashboard**
   - Show estimated vs actual costs per project
   - Materials: estimated vs actual (future - out of scope for now)
   - Labor: estimated vs actual payroll
   - Total variance and margin %
   - Historical tracking for accuracy improvement

9. **Admin Payroll UI**
   - Upload CSV (Service Autopilot, Paychex)
   - Review/approve payroll records
   - Bulk approval
   - Export CSV for external systems
   - Execution log history

10. **AI Crew Generation**
    - Generate 3 realistic demo crews
    - Names, roles (foreman, skilled, general labor)
    - Hourly rates ($22-$45/hr based on role)
    - Seed database for testing/demos

11. **Role-Based Access Control**
    - Admin: Full access to payroll, approvals, crew management
    - Manager: View reports, profitability, team performance
    - Foreman: View assigned crew payroll, project status
    - Crew Member: View personal payroll, clock in/out

**Out of Scope:**

1. **Mobile Crew App** - Phase 2 (future)
   - Bilingual (EN/ES) support
   - Push notifications
   - Mobile-optimized clock-in

2. **Real External API Integration** - Phase 2 (future)
   - Actual Service Autopilot API connection
   - Actual Paychex API connection
   - Replace mocks with real integrations

3. **Advanced Analytics** - Phase 2 (future)
   - Predictive profitability forecasting
   - Crew performance trends over time
   - Estimation accuracy ML models

4. **Material Cost Tracking** - Phase 2 (future)
   - Track actual material purchases vs estimates
   - Receipt scanning and matching
   - Supplier integration

5. **Multi-Currency Support** - Not needed (US market only)

6. **Offline Mode** - Not needed (web-only for now)

7. **Custom Hardware** - Not needed (web-based system)

---

## Implementation Details

### Source Tree Changes

**Backend (New Directory Structure):**

```
collabcanvas/backend/           # CREATE - New Express backend
├── server.js                    # CREATE - Express server entry point
├── package.json                 # CREATE - Backend dependencies
├── .env.example                 # CREATE - Environment variables template
├── services/                    # CREATE - Copy from FieldPay-Pro
│   ├── calculationService.js    # CREATE - P4P calculation engine
│   ├── payrollService.js        # CREATE - Payroll orchestration
│   ├── dataService.js           # CREATE - External API layer (mocked)
│   ├── notificationService.js   # CREATE - Notifications
│   ├── executionLogService.js   # CREATE - Audit logging
│   ├── userService.js           # CREATE - User management
│   ├── cronService.js           # CREATE - Scheduled tasks
│   ├── laborEstimationService.js # CREATE - AI labor estimation
│   ├── cpmSchedulingService.js  # CREATE - CPM calculation
│   └── crewGenerationService.js # CREATE - AI crew generation
├── routes/                      # CREATE - API routes
│   ├── payroll.js               # CREATE - 13 payroll endpoints
│   ├── upload.js                # CREATE - CSV upload
│   ├── projects.js              # CREATE - Project-crew assignment
│   ├── profitability.js         # CREATE - Profitability reporting
│   └── crews.js                 # CREATE - Crew management
├── config/                      # CREATE - Configuration
│   ├── calculationRules.js      # CREATE - P4P rules
│   ├── supabase.js              # CREATE - Supabase client
│   ├── firebase.js              # CREATE - Firebase Admin SDK
│   └── api.js                   # CREATE - External API config
├── utils/                       # CREATE - Utilities
│   ├── csvParser.js             # CREATE - Parse CSV
│   ├── csvExporter.js           # CREATE - Generate CSV
│   └── mockDataGenerator.js    # CREATE - Mock data
├── middleware/                  # CREATE - Middleware
│   ├── auth.js                  # CREATE - JWT authentication
│   └── roleCheck.js             # CREATE - RBAC
└── scripts/                     # CREATE - Setup scripts
    ├── setupDatabase.js         # CREATE - Initialize Supabase tables
    └── seedDemoCrew.js          # CREATE - Generate demo crews
```

**Frontend (Modifications & Additions):**

```
collabcanvas/src/
├── services/                    # MODIFY
│   ├── payrollService.ts        # CREATE - Payroll API client
│   ├── laborEstimationService.ts # CREATE - Labor estimation API
│   ├── cpmService.ts            # CREATE - CPM calculation
│   ├── profitabilityService.ts  # CREATE - Profitability API
│   └── crewService.ts           # CREATE - Crew management API
├── store/                       # MODIFY
│   ├── payrollStore.ts          # CREATE - Payroll state
│   ├── crewStore.ts             # CREATE - Crew state
│   ├── projectAssignmentStore.ts # CREATE - Project-crew assignments
│   └── profitabilityStore.ts    # CREATE - Profitability state
├── components/                  # MODIFY
│   ├── Payroll/                 # CREATE - Payroll components folder
│   │   ├── UploadCSV.tsx        # CREATE - CSV upload component
│   │   ├── ReviewPayroll.tsx    # CREATE - Review pending payroll
│   │   ├── ApprovePayroll.tsx   # CREATE - Approve payroll records
│   │   ├── PayrollTable.tsx     # CREATE - Payroll records table
│   │   └── ExecutionLog.tsx     # CREATE - Execution history
│   ├── Crew/                    # CREATE - Crew management folder
│   │   ├── CrewList.tsx         # CREATE - List all crews
│   │   ├── CrewAssignment.tsx   # CREATE - Assign crews to projects
│   │   └── ClockIn.tsx          # CREATE - Multi-project clock-in
│   ├── Labor/                   # CREATE - Labor estimation folder
│   │   ├── LaborEstimate.tsx    # CREATE - Display labor estimate
│   │   ├── CPMTimeline.tsx      # CREATE - Gantt chart (Mermaid.js)
│   │   ├── DependencyGraph.tsx  # CREATE - Task dependencies (Mermaid.js)
│   │   └── TaskBreakdown.tsx    # CREATE - Task list with costs
│   └── Profitability/           # CREATE - Profitability folder
│       ├── ProfitabilityDashboard.tsx # CREATE - Main dashboard
│       ├── VarianceReport.tsx   # CREATE - Estimate vs actual
│       └── ProjectMetrics.tsx   # CREATE - Project cost metrics
├── pages/                       # MODIFY
│   ├── PayrollAdmin.tsx         # CREATE - Admin payroll management
│   ├── CrewManagement.tsx       # CREATE - Crew & assignment management
│   ├── LaborSchedule.tsx        # CREATE - CPM timeline view
│   ├── Profitability.tsx        # CREATE - Profitability dashboard
│   └── BOM.tsx                  # MODIFY - Add labor estimates section
├── types/                       # MODIFY
│   └── types.ts                 # MODIFY - Add types for:
│                                #   - PayrollRecord, Timesheet
│                                #   - Crew, CrewMember
│                                #   - ProjectAssignment
│                                #   - LaborEstimate, CPMTask
│                                #   - ProfitabilityMetrics
└── hooks/                       # MODIFY
    ├── usePayroll.ts            # CREATE - Payroll operations hook
    ├── useCrew.ts               # CREATE - Crew management hook
    ├── useLaborEstimation.ts    # CREATE - Labor estimation hook
    └── useProfitability.ts      # CREATE - Profitability tracking hook
```

**Database (Supabase PostgreSQL Schema):**

```sql
-- CREATE - Extend users table
ALTER TABLE users ADD COLUMN employee_id TEXT;
ALTER TABLE users ADD COLUMN crew_id TEXT;
ALTER TABLE users ADD COLUMN base_rate DECIMAL(10,2);
ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'en';

-- CREATE - Payroll records table
CREATE TABLE payroll_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  date DATE NOT NULL,
  hours_worked DECIMAL(5,2),
  base_rate DECIMAL(10,2),
  base_pay DECIMAL(10,2),
  late_penalty DECIMAL(10,2) DEFAULT 0,
  long_lunch_penalty DECIMAL(10,2) DEFAULT 0,
  total_pay DECIMAL(10,2),
  status TEXT DEFAULT 'calculated',
  approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  has_anomalies BOOLEAN DEFAULT FALSE,
  anomaly_flags TEXT[],
  crew_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- CREATE - Project assignments table
CREATE TABLE project_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  crew_id TEXT NOT NULL,
  foreman_id UUID REFERENCES users(id),
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- CREATE - Labor estimates table
CREATE TABLE labor_estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id),
  task_name TEXT NOT NULL,
  task_description TEXT,
  estimated_hours DECIMAL(5,2),
  hourly_rate DECIMAL(10,2),
  estimated_cost DECIMAL(10,2),
  dependencies TEXT[],
  critical_path BOOLEAN DEFAULT FALSE,
  start_offset_days INT DEFAULT 0,
  duration_days INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- CREATE - Execution logs table
CREATE TABLE execution_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_date DATE NOT NULL,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  records_processed INT DEFAULT 0,
  status TEXT DEFAULT 'processing',
  triggered_by UUID REFERENCES users(id),
  is_reprocess BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- CREATE - Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- CREATE - Timesheets table
CREATE TABLE timesheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  date DATE NOT NULL,
  clock_in TIMESTAMP,
  clock_out TIMESTAMP,
  lunch_start TIMESTAMP,
  lunch_end TIMESTAMP,
  total_hours DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, project_id, date)
);
```

**Configuration Files:**

```
collabcanvas/
├── .env.example                 # MODIFY - Add backend vars
│                                #   - SUPABASE_URL
│                                #   - SUPABASE_SERVICE_KEY
│                                #   - USE_MOCK_APIS=true
│                                #   - CRON_SCHEDULE="30 10 * * *"
├── package.json                 # MODIFY - Add dependencies
│                                #   - mermaid@10.6.1
│                                #   - @supabase/supabase-js@2.38.4
└── vite.config.ts               # MODIFY - Add proxy for backend
                                 #   - proxy: { '/api': 'http://localhost:3000' }
```

### Technical Approach

**1. Backend Architecture**

**Express Backend Integration:**
- Deploy Express server alongside Firebase Functions
- Use Firebase Admin SDK for authentication (verify JWT tokens)
- Supabase PostgreSQL for payroll/crew data
- Firebase Firestore for existing project/BOM data
- Dual-database strategy: Firestore (real-time) + Supabase (relational payroll)

**Mock API Strategy:**
- Environment variable `USE_MOCK_APIS=true` enables mock mode
- `dataService.js` checks `isMockEnabled()` and routes to mock generators
- Mock data generators create realistic Service Autopilot + Paychex data
- No external API calls required until production deployment

**Daily Automation:**
- node-cron 3.0.2 schedules daily run at 10:30 AM
- Cron job calls `payrollService.processPayroll()` for yesterday's date
- Process includes: fetch data → calculate → save → notify
- Execution logged to `execution_logs` table for audit trail

**2. AI Labor Estimation**

**Task Extraction from Scope of Work:**
```typescript
// Use existing aiService.ts pattern
async function generateLaborEstimate(
  scopeOfWork: string,
  projectType: string
): Promise<LaborEstimate> {
  const prompt = `Analyze this construction scope and generate detailed labor estimate:

  Scope: ${scopeOfWork}
  Project Type: ${projectType}

  Generate JSON with:
  - tasks: Array of { name, description, hours, dependencies: [] }
  - Calculate CPM critical path
  - Include task dependencies (e.g., "Drywall" depends on "Framing")

  Output format:
  {
    "tasks": [
      { "name": "Demo", "hours": 16, "dependencies": [] },
      { "name": "Framing", "hours": 24, "dependencies": ["Demo"] }
    ]
  }`;

  const result = await callAI(prompt);
  return parseLaborEstimate(result);
}
```

**CPM Calculation:**
- Implement Critical Path Method algorithm in `cpmSchedulingService.js`
- Calculate: earliest start, latest start, float time, critical path
- Identify bottleneck tasks (zero float = critical)
- Generate Gantt chart data structure for Mermaid.js

**Crew-Specific Rates:**
- Query crew members assigned to project from database
- Calculate average hourly rate per crew
- Apply crew rate to task estimates: `cost = hours × crew_avg_rate`

**3. Timeline Visualization (Mermaid.js)**

**Gantt Chart Generation:**
```typescript
// Generate Mermaid.js Gantt syntax
function generateGanttChart(tasks: CPMTask[]): string {
  const lines = ['gantt', '  title Project Schedule', '  dateFormat YYYY-MM-DD'];

  tasks.forEach((task, i) => {
    const taskId = `a${i + 1}`;
    const deps = task.dependencies.map(d => `after ${d}`).join(' ');
    const critical = task.criticalPath ? ':crit, ' : '';
    lines.push(`  ${task.name} :${critical}${taskId}, ${deps || startDate}, ${task.durationDays}d`);
  });

  return lines.join('\n');
}
```

**Dependency Graph:**
```typescript
// Generate Mermaid.js flowchart
function generateDependencyGraph(tasks: CPMTask[]): string {
  const lines = ['graph TD'];

  tasks.forEach((task, i) => {
    const nodeId = String.fromCharCode(65 + i); // A, B, C...
    lines.push(`  ${nodeId}[${task.name}]`);

    task.dependencies.forEach(dep => {
      const depId = findTaskNodeId(dep, tasks);
      lines.push(`  ${depId} --> ${nodeId}`);
    });

    if (task.criticalPath) {
      lines.push(`  style ${nodeId} fill:#f96,stroke:#333,stroke-width:2px`);
    }
  });

  return lines.join('\n');
}
```

**4. Project-Crew Assignment**

**Admin Assignment Flow:**
```typescript
// Admin assigns crew to project
async function assignCrewToProject(
  projectId: string,
  crewId: string,
  foremanId: string,
  startDate: string,
  endDate?: string
): Promise<void> {
  await supabase.from('project_assignments').insert({
    project_id: projectId,
    crew_id: crewId,
    foreman_id: foremanId,
    start_date: startDate,
    end_date: endDate,
    status: 'active'
  });
}
```

**Multi-Project Clock-In:**
```typescript
// Crew selects project at clock-in
async function clockIn(
  employeeId: string,
  selectedProjectId: string
): Promise<void> {
  // Validate employee is assigned to selected project
  const assignment = await supabase
    .from('project_assignments')
    .select('*')
    .eq('project_id', selectedProjectId)
    .eq('crew_id', employee.crew_id)
    .eq('status', 'active')
    .single();

  if (!assignment) {
    throw new Error('Employee not assigned to selected project');
  }

  // Create timesheet entry linked to project
  await supabase.from('timesheets').insert({
    employee_id: employeeId,
    project_id: selectedProjectId,
    date: new Date().toISOString().split('T')[0],
    clock_in: new Date().toISOString()
  });
}
```

**5. Profitability Tracking**

**Variance Calculation:**
```typescript
interface ProfitabilityMetrics {
  project_id: string;
  estimated_materials: number;
  actual_materials: number; // Future
  estimated_labor: number;
  actual_labor: number;
  total_variance: number;
  margin_percent: number;
}

async function calculateProfitability(
  projectId: string
): Promise<ProfitabilityMetrics> {
  // Get labor estimate
  const estimatedLabor = await supabase
    .from('labor_estimates')
    .select('estimated_cost')
    .eq('project_id', projectId)
    .then(r => r.data?.reduce((sum, t) => sum + t.estimated_cost, 0) || 0);

  // Get actual payroll costs
  const actualLabor = await supabase
    .from('payroll_records')
    .select('total_pay')
    .eq('project_id', projectId)
    .then(r => r.data?.reduce((sum, p) => sum + p.total_pay, 0) || 0);

  // Get material estimate (from existing BOM)
  const estimatedMaterials = await getProjectBOMTotal(projectId);

  const variance = (estimatedLabor + estimatedMaterials) - (actualLabor + estimatedMaterials);
  const margin = variance / (estimatedLabor + estimatedMaterials) * 100;

  return {
    project_id: projectId,
    estimated_materials: estimatedMaterials,
    actual_materials: estimatedMaterials, // Same for now (future: track actual)
    estimated_labor: estimatedLabor,
    actual_labor: actualLabor,
    total_variance: variance,
    margin_percent: margin
  };
}
```

**6. AI Crew Generation**

**Generate Realistic Demo Crews:**
```typescript
// Generate 3 crews with 9 total workers
async function generateDemoCrew(): Promise<void> {
  const crews = [
    {
      crew_id: 'CREW1',
      name: 'General Construction Crew',
      foreman: { name: 'Carlos Rodriguez', rate: 40 },
      workers: [
        { name: 'Juan Garcia', role: 'skilled', rate: 28 },
        { name: 'Maria Lopez', role: 'general', rate: 25 }
      ]
    },
    {
      crew_id: 'CREW2',
      name: 'Electrical & Plumbing Crew',
      foreman: { name: 'David Chen', rate: 45 },
      workers: [
        { name: 'Mike Johnson', role: 'electrician', rate: 38 },
        { name: 'Sarah Williams', role: 'plumber', rate: 36 }
      ]
    },
    {
      crew_id: 'CREW3',
      name: 'Finish Work Crew',
      foreman: { name: 'James Brown', rate: 42 },
      workers: [
        { name: 'Lisa Anderson', role: 'painter', rate: 30 },
        { name: 'Tom Wilson', role: 'carpenter', rate: 32 }
      ]
    }
  ];

  for (const crew of crews) {
    // Create foreman user
    await createUser({
      email: `${crew.foreman.name.toLowerCase().replace(' ', '.')}@demo.com`,
      name: crew.foreman.name,
      role: 'foreman',
      crew_id: crew.crew_id,
      base_rate: crew.foreman.rate,
      employee_id: `${crew.crew_id}_FOREMAN`
    });

    // Create worker users
    for (const worker of crew.workers) {
      await createUser({
        email: `${worker.name.toLowerCase().replace(' ', '.')}@demo.com`,
        name: worker.name,
        role: 'crew_member',
        crew_id: crew.crew_id,
        base_rate: worker.rate,
        employee_id: `${crew.crew_id}_${worker.role.toUpperCase()}`
      });
    }
  }
}
```

### Existing Patterns to Follow

**Projective Existing Patterns (Must Conform):**

1. **Component Structure:**
   - Follow feature-based folder organization (Payroll/, Crew/, Labor/)
   - Use PascalCase for component files (PayrollTable.tsx)
   - Export default component, use named exports for sub-components

2. **State Management:**
   - Create Zustand stores for each domain (payrollStore.ts, crewStore.ts)
   - Follow existing store pattern from canvasStore.ts
   - Use TypeScript interfaces for state shape
   - Implement actions as store methods

3. **API Service Layer:**
   - Create services in `src/services/` for each backend domain
   - Use axios or fetch for API calls
   - Follow pattern from existing aiService.ts, bomService.ts
   - Handle errors with try/catch, throw descriptive errors

4. **TypeScript Types:**
   - Add all new types to `src/types/types.ts`
   - Use interfaces for data structures
   - Use type for unions and primitives
   - Export all types for reuse

5. **Testing:**
   - Unit tests: Vitest (*.test.ts files in same directory as source)
   - E2E tests: Playwright (in test/ directory)
   - Follow existing test patterns from src/services/*.test.ts
   - Mock Firebase/Supabase calls in tests

6. **Styling:**
   - Use Tailwind CSS utility classes
   - Follow existing component styling patterns
   - Responsive design: mobile-first approach
   - Dark mode support (if existing components support it)

**FieldPay-Pro Patterns (Backend):**

1. **Service Layer:**
   - Each service exports functions (not classes)
   - Use async/await for all async operations
   - Return objects with `{ success, data, error }` pattern
   - Log errors with console.error before throwing

2. **Route Structure:**
   - One route file per domain (payroll.js, crews.js)
   - Use Express router
   - Apply middleware: authenticateToken → roleCheck → handler
   - Consistent response format: `res.json({ success: true, ...data })`

3. **Error Handling:**
   - Try/catch in all async functions
   - Use next(error) to pass to Express error handler
   - Custom error messages with context
   - HTTP status codes: 400 (validation), 401 (auth), 403 (permission), 500 (server)

4. **Database Access:**
   - Use Supabase client for all queries
   - Select only needed columns
   - Use transactions for multi-table operations
   - Handle unique violations and foreign key errors

5. **Mock Data:**
   - Check `isMockEnabled()` at service entry points
   - Generate consistent mock data (same seed = same output)
   - Mock data matches real API structure exactly
   - Use mockDataGenerator.js for all mock generation

### Integration Points

**1. Frontend ↔ Backend**

**API Endpoints:**
```
POST   /api/payroll/analyze          - Preview payroll calculation
POST   /api/payroll/process          - Process and save payroll
GET    /api/payroll/records          - Query payroll records (role-filtered)
GET    /api/payroll/records/:id      - Get single record details
PATCH  /api/payroll/records/:id/approve - Approve payroll record
POST   /api/payroll/approve-bulk     - Bulk approve records
GET    /api/payroll/export           - Export CSV (blob response)
GET    /api/payroll/summary          - Aggregate statistics
GET    /api/payroll/executions       - Execution log history

POST   /api/crews/generate           - Generate demo crews
GET    /api/crews                    - List all crews
GET    /api/crews/:id                - Get crew details

POST   /api/projects/:id/assign-crew - Assign crew to project
GET    /api/projects/:id/assignments - Get project crew assignments
DELETE /api/projects/:id/assignments/:assignmentId - Remove assignment

POST   /api/labor/estimate           - Generate AI labor estimate
GET    /api/labor/estimate/:projectId - Get labor estimate
GET    /api/labor/cpm/:projectId     - Get CPM schedule

GET    /api/profitability/:projectId - Get profitability metrics
GET    /api/profitability/variance/:projectId - Get variance report

POST   /api/timesheets/clock-in      - Clock in (select project)
POST   /api/timesheets/clock-out     - Clock out
GET    /api/timesheets                - Query timesheets (role-filtered)
```

**Authentication:**
- Frontend sends Firebase ID token in Authorization header
- Backend verifies token with Firebase Admin SDK
- Extracts user info (id, email, role) from verified token
- Attaches user to request: `req.user = { id, email, role }`

**2. Firestore ↔ Supabase**

**Data Flow:**
- Projects, BOMs: Stored in Firestore (existing)
- Payroll, Crews, Timesheets: Stored in Supabase (new)
- Labor Estimates: Stored in Supabase (new)
- Project Assignments: Stored in Supabase (links projects to crews)

**Cross-Database Queries:**
```typescript
// Get project from Firestore
const project = await firestore.collection('projects').doc(projectId).get();

// Get project payroll from Supabase
const payroll = await supabase
  .from('payroll_records')
  .select('*')
  .eq('project_id', projectId);

// Combine for profitability
const profitability = calculateProfitability(project.data(), payroll.data);
```

**3. AI Services Integration**

**Existing AI Service:**
- `aiService.ts` generates material BOM from plans/scope
- Pattern: prompt engineering → AI call → parse response

**New AI Services:**
- `laborEstimationService.ts` - Generate labor estimate
- `crewGenerationService.ts` - Generate demo crews
- Follow same pattern as existing aiService.ts
- Use same AI provider (OpenAI, Anthropic, etc.)

**4. External APIs (Mocked)**

**Service Autopilot Mock:**
- Returns job/scheduling data
- Mock generates: job_id, location, service_type, budgeted_hours, crew_id
- Used by payrollService for job assignment data

**Paychex Mock:**
- Returns timesheet data
- Mock generates: employee_id, clock_in, clock_out, lunch times, hours_worked
- Used by payrollService for timesheet data

**Real API Integration (Future):**
- Change `USE_MOCK_APIS=false` in environment
- Configure API keys in .env
- No code changes required (dataService.js handles routing)

**5. Cron Job Integration**

**Scheduler:**
- node-cron runs in Express server (not Firebase Functions)
- Schedule: `30 10 * * *` (10:30 AM daily)
- Calls: `payrollService.processPayroll(yesterday)`

**Execution:**
```javascript
// In server.js
const cron = require('node-cron');

cron.schedule('30 10 * * *', async () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = yesterday.toISOString().split('T')[0];

  try {
    const result = await payrollService.processPayroll(date, 'system', {});
    console.log('Automated payroll completed:', result);
  } catch (error) {
    console.error('Automated payroll failed:', error);
    // Send error notification to admins
  }
});
```

---

## Development Context

### Relevant Existing Code

**Key Files to Reference:**

1. **Frontend Patterns:**
   - `src/services/aiService.ts` (lines 1-200) - AI integration pattern
   - `src/store/canvasStore.ts` (lines 1-150) - Zustand store pattern
   - `src/components/BOM/BOMTable.tsx` (lines 1-100) - Table component pattern
   - `src/types/types.ts` (lines 1-500) - TypeScript type definitions

2. **Backend Reference (FieldPay-Pro):**
   - `FieldPay-Pro/backend/services/calculationService.js` - Complete P4P logic
   - `FieldPay-Pro/backend/services/payrollService.js` - Orchestration pattern
   - `FieldPay-Pro/backend/routes/payroll.js` - API route structure
   - `FieldPay-Pro/backend/utils/mockDataGenerator.js` - Mock data patterns

3. **Database Patterns:**
   - Existing Firestore collections in `src/services/firebase/`
   - FieldPay-Pro Supabase schema in deep-dive documentation

### Dependencies

**Framework/Libraries:**

**Frontend (Add to package.json):**
```json
{
  "dependencies": {
    "mermaid": "^10.6.1",
    "@supabase/supabase-js": "^2.38.4"
  }
}
```

**Backend (New package.json):**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.4",
    "axios": "^1.6.2",
    "cors": "^2.8.5",
    "csv-parser": "^3.0.0",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "firebase-admin": "^11.11.0",
    "jsonwebtoken": "^9.0.2",
    "multer": "^2.0.2",
    "node-cron": "^3.0.2"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.0.2",
    "supertest": "^7.1.4"
  }
}
```

**Internal Modules:**

**Frontend:**
- @/services/firebase - Existing Firebase clients
- @/services/aiService - AI integration
- @/store/* - All Zustand stores
- @/types/types - Type definitions

**Backend:**
- ./services/* - All business logic services
- ./routes/* - API route handlers
- ./config/* - Configuration modules
- ./utils/* - Utility functions
- ./middleware/* - Express middleware

### Configuration Changes

**Environment Variables (.env):**

```bash
# Existing Projective vars
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
# ... other Firebase config

# NEW - Backend vars
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
USE_MOCK_APIS=true
CRON_SCHEDULE="30 10 * * *"
PORT=3000

# NEW - External API keys (unused while USE_MOCK_APIS=true)
SERVICE_AUTOPILOT_API_KEY=
PAYCHEX_API_KEY=
```

**Vite Config (vite.config.ts):**

```typescript
export default defineConfig({
  // ... existing config
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
```

**Package.json Scripts:**

```json
{
  "scripts": {
    // ... existing scripts
    "backend:dev": "cd backend && nodemon server.js",
    "backend:setup": "cd backend && node scripts/setupDatabase.js",
    "backend:seed": "cd backend && node scripts/seedDemoCrew.js",
    "dev:all": "concurrently \"npm run dev\" \"npm run backend:dev\""
  }
}
```

### Existing Conventions (Brownfield)

**Code Style:**
- TypeScript strict mode enabled
- ESLint rules enforced (no warnings allowed)
- Prettier formatting (auto-format on save)
- Semicolons: YES (required by ESLint)
- Quotes: Single quotes for strings
- Indentation: 2 spaces
- Line length: 100 characters max

**File Organization:**
- Feature-based folders (components/Payroll/, services/payrollService.ts)
- Co-located tests (payrollService.test.ts next to payrollService.ts)
- Barrel exports (index.ts for each folder)
- One component per file

**Naming Conventions:**
- Components: PascalCase (PayrollTable.tsx)
- Functions: camelCase (calculatePayroll)
- Constants: UPPER_SNAKE_CASE (MAX_HOURS)
- Types/Interfaces: PascalCase (PayrollRecord)
- Files: camelCase for utilities, PascalCase for components

**Import Organization:**
- External libraries first
- Internal modules second
- Relative imports last
- Alphabetical within groups

**Error Handling:**
- Try/catch for all async operations
- Throw descriptive Error objects
- Display user-friendly messages in UI
- Log errors to console.error

**Documentation:**
- JSDoc comments for all public functions
- Inline comments for complex logic
- README.md for setup instructions
- Type definitions serve as documentation

### Test Framework & Standards

**Frontend Testing:**

**Framework:** Vitest 3.2.4
**Test Organization:** `*.test.ts` files co-located with source
**Assertion Style:** expect (Vitest default)
**Mocking:** vi.fn(), vi.mock()
**Coverage Target:** >80% for services

**Example Test Pattern:**
```typescript
// payrollService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { analyzePayroll } from './payrollService';

describe('PayrollService', () => {
  it('should analyze payroll successfully', async () => {
    const result = await analyzePayroll('2025-11-19');
    expect(result.success).toBe(true);
    expect(result.summary).toBeDefined();
  });
});
```

**Backend Testing:**

**Framework:** Jest 29.7.0
**Test Organization:** `tests/*.test.js` in backend/tests/
**Assertion Style:** expect (Jest default)
**Mocking:** jest.fn(), jest.mock()
**Coverage Target:** >80% for services

**E2E Testing:**

**Framework:** Playwright 1.50.0
**Test Organization:** `test/e2e/*.spec.ts`
**Pattern:** Page Object Model
**Browsers:** Chromium, Firefox, WebKit

---

## Implementation Stack

**Runtime:**
- Node.js 20.x (LTS)
- Browser: Modern browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)

**Frontend:**
- React 19.2.0 (UI framework)
- TypeScript 5.9.3 (language)
- Vite 7.1.7 (build tool)
- Tailwind CSS 3.4.18 (styling)
- Zustand 5.0.8 (state management)
- React Router 7.9.5 (routing)
- Mermaid.js 10.6.1 (timeline visualization)
- Vitest 3.2.4 (unit testing)
- Playwright 1.50.0 (E2E testing)

**Backend:**
- Express 4.18.2 (web framework)
- Supabase 2.38.4 (PostgreSQL database)
- Firebase Admin 11.11.0 (authentication)
- node-cron 3.0.2 (scheduled jobs)
- Axios 1.6.2 (HTTP client)
- Multer 2.0.2 (file uploads)
- csv-parser 3.0.0 (CSV parsing)
- Jest 29.7.0 (testing)

**Infrastructure:**
- Firebase Hosting (frontend)
- Firebase Functions or VM (backend Express server)
- Supabase Cloud (PostgreSQL database)
- Firebase Authentication (user auth)

**Development Tools:**
- ESLint 9.36.0 (linting)
- Prettier (code formatting)
- Nodemon 3.0.2 (dev server auto-restart)
- Concurrently (run frontend + backend together)

---

## Technical Details

### P4P Calculation Algorithm

**Formula:**
```
basePay = hoursWorked × baseRate
latePenalty = clockIn > 7:00 AM ? basePay × 0.05 : 0
longLunchPenalty = lunchDuration > 30min ? basePay × 0.02 : 0
totalPay = MAX(0, basePay - latePenalty - longLunchPenalty)
```

**Rules:**
- Late clock-in cutoff: 7:00 AM
- Late penalty: 5% of base pay
- Long lunch threshold: 30 minutes
- Long lunch penalty: 2% of base pay
- Minimum total pay: $0 (never negative)
- Decimal precision: 2 places for money, 4 for efficiency

**Anomaly Detection:**
- Missing clock in/out times
- Zero or negative hours worked
- Zero or missing base pay
- Total pay negative (should never happen)
- Hours worked > 16 (suspicious)

### CPM Scheduling Algorithm

**Critical Path Method:**
```
For each task:
  1. Calculate Earliest Start (ES) = max(ES of all predecessors) + predecessor duration
  2. Calculate Earliest Finish (EF) = ES + task duration
  3. Calculate Latest Finish (LF) = min(LF of all successors)
  4. Calculate Latest Start (LS) = LF - task duration
  5. Calculate Float = LS - ES

Critical Path = tasks where Float = 0
```

**Dependency Resolution:**
- Tasks stored with dependencies array: `["Framing", "Electrical"]`
- Build dependency graph (adjacency list)
- Topological sort to get execution order
- Forward pass: calculate ES, EF
- Backward pass: calculate LS, LF
- Identify critical path (zero float)

### Data Structures

**Labor Estimate:**
```typescript
interface LaborEstimate {
  project_id: string;
  tasks: CPMTask[];
  total_hours: number;
  total_cost: number;
  critical_path_duration: number;
}

interface CPMTask {
  id: string;
  name: string;
  description: string;
  estimated_hours: number;
  hourly_rate: number;
  estimated_cost: number;
  dependencies: string[]; // Task names this depends on
  earliest_start: number; // Day offset from project start
  latest_start: number;
  float: number; // LS - ES
  critical_path: boolean; // float === 0
  duration_days: number;
}
```

**Payroll Record:**
```typescript
interface PayrollRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  project_id: string;
  date: string; // YYYY-MM-DD
  hours_worked: number;
  base_rate: number;
  base_pay: number;
  late_penalty: number;
  long_lunch_penalty: number;
  total_pay: number;
  status: 'calculated' | 'pending_review' | 'approved';
  approved: boolean;
  approved_by?: string;
  approved_at?: string;
  has_anomalies: boolean;
  anomaly_flags: string[];
  crew_id: string;
  created_at: string;
}
```

**Profitability Metrics:**
```typescript
interface ProfitabilityMetrics {
  project_id: string;
  project_name: string;

  // Labor
  estimated_labor: number;
  actual_labor: number;
  labor_variance: number; // estimated - actual

  // Materials
  estimated_materials: number;
  actual_materials: number; // Future: track actual

  // Totals
  total_estimated: number;
  total_actual: number;
  total_variance: number;
  margin_percent: number; // (variance / estimated) * 100

  // Status
  on_budget: boolean; // variance >= 0
  profit_risk: 'low' | 'medium' | 'high'; // Based on variance %
}
```

### Performance Considerations

**Database Queries:**
- Index on: `project_id`, `employee_id`, `date`, `status`
- Use pagination for large result sets (limit 50 per page)
- Cache crew assignments (updated rarely)
- Batch insert payroll records (50 at a time)

**Frontend Rendering:**
- Virtualize large tables (react-window if >1000 rows)
- Memoize expensive calculations (useMemo)
- Debounce search inputs (300ms)
- Lazy load routes (React.lazy + Suspense)

**Mermaid.js Charts:**
- Generate SVG (not canvas) for scalability
- Cache generated chart data
- Limit to 50 tasks per chart (warn if more)
- Render in web worker if >100 tasks

**Cron Job:**
- Process payroll asynchronously
- Timeout: 10 minutes max
- Batch process: 50 employees at a time
- Retry failed calculations once

### Security Considerations

**Authentication:**
- Firebase Authentication (existing)
- JWT tokens verified on backend
- Tokens expire after 1 hour
- Refresh tokens handled by Firebase SDK

**Authorization (RBAC):**
- Admin: Full access to all endpoints
- Manager: Read-only for reports, profitability
- Foreman: Read own crew's payroll only
- Crew Member: Read own payroll, clock in/out only

**Data Protection:**
- HTTPS only (enforced by Firebase Hosting)
- Sensitive data in environment variables (.env)
- Supabase service key server-side only (never client)
- Row-level security in Supabase (future)

**Input Validation:**
- Validate all API inputs (express-validator)
- Sanitize CSV uploads (reject malicious content)
- Rate limiting: 100 requests/minute per user
- File upload limits: 10MB max

**SQL Injection Prevention:**
- Use Supabase parameterized queries (automatic)
- Never concatenate user input in SQL
- Validate UUIDs before querying

### Edge Cases

**Payroll Edge Cases:**
1. Employee works 0 hours: Skip calculation, no record created
2. Clock-in but no clock-out: Flag as anomaly, estimate hours
3. Multiple clock-ins same day: Use first clock-in, last clock-out
4. Negative hours (data error): Flag anomaly, set hours to 0
5. Base rate = 0: Use default rate ($15/hr), flag anomaly

**Crew Assignment Edge Cases:**
1. Crew assigned to multiple projects same day: Allow (select at clock-in)
2. Assignment end date in past: Mark inactive, prevent clock-in
3. Foreman changes mid-project: Update assignment, preserve history
4. Crew deleted: Soft delete (mark inactive), preserve payroll records

**Labor Estimation Edge Cases:**
1. No scope of work provided: Return error, require input
2. AI returns invalid JSON: Retry once, then show manual entry form
3. Circular dependencies: Detect and reject (validate DAG)
4. Task with no dependencies: Assume can start day 1
5. >100 tasks: Warn user, suggest grouping tasks

**CPM Edge Cases:**
1. Multiple critical paths: Highlight all paths
2. All tasks have float: No critical path (rare)
3. Negative float: Data error, flag and recalculate
4. Task duration = 0: Treat as 0.5 days minimum

---

## Development Setup

### Prerequisites

**Required Software:**
- Node.js 20.x or higher
- npm 9.x or higher
- Git
- Firebase CLI (`npm install -g firebase-tools`)
- Supabase CLI (`npm install -g supabase`)
- Code editor (VSCode recommended)

**Required Accounts:**
- Firebase account with project created
- Supabase account with project created
- Service Autopilot account (or mock credentials)
- Paychex account (or mock credentials)

### Installation Steps

**1. Clone Repository:**
```bash
git clone <repo-url>
cd collabcanvas-root/gauntletai
```

**2. Install Dependencies:**
```bash
# Install frontend dependencies
cd collabcanvas
npm install

# Install backend dependencies
cd ../backend
npm install
```

**3. Environment Configuration:**

Create `.env` file in `backend/` directory:
```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Mock API Configuration
USE_MOCK_APIS=true

# External API Configuration (when USE_MOCK_APIS=false)
SERVICE_AUTOPILOT_API_KEY=your-sa-key
SERVICE_AUTOPILOT_BASE_URL=https://api.serviceautopilot.com
PAYCHEX_API_KEY=your-paychex-key
PAYCHEX_BASE_URL=https://api.paychex.com

# Server Configuration
PORT=3000
NODE_ENV=development

# Cron Configuration
ENABLE_CRON=true
PAYROLL_CRON_SCHEDULE=30 10 * * *
```

Create `.env.local` file in `collabcanvas/` directory:
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_BACKEND_URL=http://localhost:3000
```

**4. Database Setup:**

**Supabase Schema:**
```bash
cd backend
npm run db:migrate
```

This runs migrations from `backend/database/migrations/`:
- `001_create_payroll_schema.sql` - Creates all payroll tables
- `002_create_indexes.sql` - Creates performance indexes
- `003_seed_demo_data.sql` - Seeds AI-generated demo crews

**Firebase Firestore:**
- Existing collections remain unchanged (projects, shapes, etc.)
- No migrations needed for Firestore

**5. Generate Demo Data:**
```bash
cd backend
npm run generate:demo-crews
```

This creates 3 crews with 9 workers total using AI generation script.

**6. Run Development Servers:**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd collabcanvas
npm run dev
# App runs on http://localhost:5173
```

### Verification

**1. Check Backend Health:**
```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

**2. Check Database Connections:**
```bash
curl http://localhost:3000/api/health/db
# Expected: {"firebase":"connected","supabase":"connected"}
```

**3. Test Mock APIs:**
```bash
curl http://localhost:3000/api/integrations/service-autopilot/test
# Expected: {"status":"ok","mock":true}
```

**4. Verify Frontend:**
- Open http://localhost:5173
- Log in with Google OAuth
- Navigate to "Money" view
- Should see new P4P section (empty data)

---

## Implementation Guide

### Setup Steps

**Pre-Implementation Checklist:**

- [ ] All prerequisites installed (Node 20, Firebase CLI, Supabase CLI)
- [ ] Firebase project created and configured
- [ ] Supabase project created and configured
- [ ] Environment files configured (`.env`, `.env.local`)
- [ ] Dependencies installed (`npm install` in both directories)
- [ ] Database migrations run successfully
- [ ] Demo crews generated
- [ ] Both dev servers running without errors
- [ ] Health checks passing

**Repository Structure:**
```
collabcanvas-root/gauntletai/
├── backend/                    # New backend directory
│   ├── src/
│   │   ├── services/          # Business logic
│   │   ├── routes/            # API endpoints
│   │   ├── config/            # Configuration
│   │   ├── utils/             # Utilities
│   │   └── middleware/        # Express middleware
│   ├── database/              # Database files
│   │   ├── migrations/        # SQL migrations
│   │   └── seeds/             # Seed data
│   ├── tests/                 # Backend tests
│   └── package.json
└── collabcanvas/              # Existing frontend
    ├── src/
    │   ├── services/          # Add new services
    │   ├── store/             # Add new stores
    │   ├── components/        # Add new components
    │   ├── pages/             # Add new pages
    │   └── types/             # Add new types
    └── package.json
```

### Implementation Steps

**Story 1: Backend Integration + Database Schema + AI Crew Generation**

**Tasks:**
1. Create `backend/` directory structure
2. Set up Express server (`backend/src/server.ts`)
3. Configure Firebase Admin SDK (`backend/src/config/firebase.ts`)
4. Configure Supabase client (`backend/src/config/supabase.ts`)
5. Create database migrations (`backend/database/migrations/`)
6. Implement auth middleware (`backend/src/middleware/auth.ts`)
7. Implement RBAC middleware (`backend/src/middleware/rbac.ts`)
8. Create AI crew generation script (`backend/src/scripts/generateDemoCrews.ts`)
9. Create health check endpoint (`backend/src/routes/health.ts`)
10. Write backend tests (`backend/tests/`)

**Acceptance:**
- Backend server starts without errors
- Database migrations run successfully
- Auth middleware validates Firebase tokens
- RBAC middleware enforces role permissions
- Demo crews script generates 3 crews with 9 workers
- Health checks return 200 OK

**Story 2: Project-Crew Assignment**

**Tasks:**
1. Create crew assignment service (`backend/src/services/crewAssignmentService.ts`)
2. Create assignment API routes (`backend/src/routes/assignments.ts`)
3. Create crew management frontend service (`collabcanvas/src/services/crewService.ts`)
4. Create crew assignment store (`collabcanvas/src/store/useCrewStore.ts`)
5. Build crew management page (`collabcanvas/src/pages/CrewManagementPage.tsx`)
6. Build project-crew assignment component (`collabcanvas/src/components/crew/ProjectCrewAssignment.tsx`)
7. Add assignment validation logic
8. Write integration tests

**Acceptance:**
- Admin can view all crews
- Admin can assign crew to project with date range
- Validation prevents overlapping assignments to same project
- Crew assignment persists in Supabase
- UI shows active/inactive assignments

**Story 3: AI Labor Estimation + CPM Calculation**

**Tasks:**
1. Create labor estimation service (`backend/src/services/laborEstimationService.ts`)
2. Implement AI integration for task extraction (`backend/src/services/aiService.ts`)
3. Implement CPM calculation algorithm (`backend/src/services/cpmService.ts`)
4. Create labor estimation API routes (`backend/src/routes/laborEstimates.ts`)
5. Create frontend labor estimation service (`collabcanvas/src/services/laborEstimationService.ts`)
6. Create labor estimation store (`collabcanvas/src/store/useLaborEstimateStore.ts`)
7. Build labor estimation component (`collabcanvas/src/components/labor/LaborEstimationPanel.tsx`)
8. Build task breakdown component (`collabcanvas/src/components/labor/TaskBreakdown.tsx`)
9. Add CPM calculation tests
10. Add AI prompt validation

**Acceptance:**
- AI generates detailed task breakdown from scope of work
- CPM algorithm calculates critical path correctly
- Tasks have dependencies validated (no circular deps)
- Labor estimates stored in Supabase
- UI shows estimated labor cost and duration

**Story 4: Timeline Visualization (Mermaid.js)**

**Tasks:**
1. Install Mermaid.js dependency (`npm install mermaid`)
2. Create Mermaid chart service (`collabcanvas/src/services/mermaidService.ts`)
3. Build Gantt chart component (`collabcanvas/src/components/timeline/GanttChart.tsx`)
4. Build dependency graph component (`collabcanvas/src/components/timeline/DependencyGraph.tsx`)
5. Build timeline view page (`collabcanvas/src/pages/TimelineViewPage.tsx`)
6. Add chart export functionality (PNG/SVG)
7. Add chart zoom/pan controls
8. Style Mermaid charts to match app theme

**Acceptance:**
- Gantt chart displays tasks with dependencies
- Critical path highlighted in red
- Dependency graph shows task relationships
- Charts are responsive and performant
- Export works for PNG and SVG formats

**Story 5: Multi-Project Time Tracking + Profitability Dashboard**

**Tasks:**
1. Create timesheet service (`backend/src/services/timesheetService.ts`)
2. Implement multi-project clock-in validation
3. Create payroll calculation service (`backend/src/services/payrollCalculationService.ts`)
4. Implement P4P formula (base pay - penalties)
5. Create profitability tracking service (`backend/src/services/profitabilityService.ts`)
6. Create timesheet API routes (`backend/src/routes/timesheets.ts`)
7. Create payroll API routes (`backend/src/routes/payroll.ts`)
8. Create profitability API routes (`backend/src/routes/profitability.ts`)
9. Create timesheet store (`collabcanvas/src/store/useTimesheetStore.ts`)
10. Build crew clock-in component (`collabcanvas/src/components/timesheet/ClockInForm.tsx`)
11. Build profitability dashboard (`collabcanvas/src/components/profitability/ProfitabilityDashboard.tsx`)
12. Add anomaly detection logic
13. Write payroll calculation tests

**Acceptance:**
- Crew member can select assigned project at clock-in
- Validation prevents clock-in to unassigned projects
- P4P calculation applies penalties correctly
- Profitability dashboard shows variance (estimated vs actual)
- Anomalies flagged (negative hours, missing rates, etc.)

**Story 6: Admin Payroll UI + Daily Automation + Testing**

**Tasks:**
1. Create scheduled payroll service (`backend/src/services/scheduledPayrollService.ts`)
2. Implement cron job (10:30 AM daily)
3. Create mock Service Autopilot API (`backend/src/services/mockServiceAutopilotApi.ts`)
4. Create mock Paychex API (`backend/src/services/mockPaychexApi.ts`)
5. Create admin payroll store (`collabcanvas/src/store/usePayrollStore.ts`)
6. Build admin payroll dashboard (`collabcanvas/src/pages/AdminPayrollPage.tsx`)
7. Build payroll approval component (`collabcanvas/src/components/payroll/PayrollApprovalPanel.tsx`)
8. Build payroll export component (`collabcanvas/src/components/payroll/PayrollExport.tsx`)
9. Add CSV export functionality (Paychex format)
10. Add email notifications
11. Write E2E tests for complete payroll flow
12. Write performance tests for 50+ employees

**Acceptance:**
- Cron job runs daily at 10:30 AM
- Payroll calculated for all employees with timesheets
- Admin can review payroll with anomalies highlighted
- Admin can approve/reject payroll records
- CSV export matches Paychex format
- Notifications sent to managers and crews
- System processes 50 employees in < 10 minutes

### Testing Strategy

**Unit Tests (Vitest + Jest):**
- All service layer functions
- P4P calculation algorithm (edge cases)
- CPM calculation algorithm (dependency resolution)
- Anomaly detection logic
- Mock API responses

**Integration Tests:**
- API endpoint tests (all routes)
- Database operations (CRUD)
- Cross-database queries (Firestore ↔ Supabase)
- Auth middleware flow
- RBAC permission checks

**E2E Tests (Playwright):**
- Complete user flows:
  - Admin assigns crew to project
  - Crew member clocks in/out
  - Admin reviews and approves payroll
  - Manager views profitability dashboard
- Multi-project clock-in flow
- CSV export and download

**Performance Tests:**
- Payroll processing for 50+ employees (< 10 min target)
- CPM calculation for 100+ tasks
- Mermaid chart rendering for large projects
- Concurrent user load (10+ users)

**Test Coverage Target:** 80%+ for all services

### Acceptance Criteria

**Functional Criteria:**
- [ ] Backend server runs and responds to health checks
- [ ] Database migrations create all required tables
- [ ] AI generates 3 demo crews with 9 workers
- [ ] Admin can assign crews to projects
- [ ] AI generates labor estimates from scope of work
- [ ] CPM algorithm calculates critical path correctly
- [ ] Mermaid.js displays Gantt charts and dependency graphs
- [ ] Crew members can clock in selecting assigned project
- [ ] Payroll calculates P4P with penalties correctly
- [ ] Profitability dashboard shows estimated vs actual variance
- [ ] Admin can review and approve payroll
- [ ] CSV export works in Paychex-compatible format
- [ ] Daily cron job runs at 10:30 AM
- [ ] Anomalies flagged and displayed to admin
- [ ] Notifications sent to managers and crews

**Non-Functional Criteria:**
- [ ] Payroll processing completes in < 10 minutes for 50 employees
- [ ] API response times < 500ms (95th percentile)
- [ ] Frontend renders without layout shifts
- [ ] No console errors in browser
- [ ] All tests pass (unit, integration, E2E)
- [ ] Test coverage ≥ 80%
- [ ] Security: Auth required for all protected endpoints
- [ ] Security: RBAC enforces role permissions
- [ ] Accessibility: WCAG 2.1 AA compliance

**Data Integrity Criteria:**
- [ ] No data loss during cross-database operations
- [ ] Payroll calculations match manual verification
- [ ] CPM critical path matches project management tools
- [ ] Time tracking prevents duplicate clock-ins
- [ ] Audit trail preserved for all payroll changes

---

## Developer Resources

### File Paths Reference

**Backend Files (New):**
```
backend/
├── src/
│   ├── server.ts                                      # Express server entry
│   ├── config/
│   │   ├── firebase.ts                               # Firebase Admin config
│   │   ├── supabase.ts                               # Supabase client config
│   │   └── env.ts                                    # Environment validation
│   ├── middleware/
│   │   ├── auth.ts                                   # JWT authentication
│   │   └── rbac.ts                                   # Role-based access control
│   ├── services/
│   │   ├── crewAssignmentService.ts                  # Crew-project assignments
│   │   ├── laborEstimationService.ts                 # AI labor estimation
│   │   ├── cpmService.ts                             # CPM calculation
│   │   ├── timesheetService.ts                       # Time tracking
│   │   ├── payrollCalculationService.ts              # P4P calculation
│   │   ├── profitabilityService.ts                   # Variance tracking
│   │   ├── scheduledPayrollService.ts                # Cron job handler
│   │   ├── mockServiceAutopilotApi.ts                # Mock SA API
│   │   ├── mockPaychexApi.ts                         # Mock Paychex API
│   │   ├── aiService.ts                              # AI integration
│   │   ├── notificationService.ts                    # Email/push notifications
│   │   └── csvExportService.ts                       # CSV generation
│   ├── routes/
│   │   ├── health.ts                                 # Health check endpoints
│   │   ├── assignments.ts                            # Crew assignment API
│   │   ├── laborEstimates.ts                         # Labor estimation API
│   │   ├── timesheets.ts                             # Timesheet API
│   │   ├── payroll.ts                                # Payroll API
│   │   └── profitability.ts                          # Profitability API
│   ├── utils/
│   │   ├── logger.ts                                 # Winston logger
│   │   ├── errorHandler.ts                           # Error handling
│   │   └── validators.ts                             # Input validation
│   └── scripts/
│       └── generateDemoCrews.ts                      # AI crew generation
├── database/
│   ├── migrations/
│   │   ├── 001_create_payroll_schema.sql            # Schema creation
│   │   ├── 002_create_indexes.sql                   # Performance indexes
│   │   └── 003_seed_demo_data.sql                   # Demo data
│   └── seeds/
│       └── demo-crews.json                           # Generated crew data
├── tests/
│   ├── services/
│   │   ├── payrollCalculation.test.ts               # P4P tests
│   │   ├── cpm.test.ts                              # CPM tests
│   │   └── profitability.test.ts                   # Profitability tests
│   ├── routes/
│   │   └── payroll.test.ts                          # API tests
│   └── integration/
│       └── payrollFlow.test.ts                      # Integration tests
├── package.json
├── tsconfig.json
└── .env                                              # Environment config
```

**Frontend Files (Modified/New):**
```
collabcanvas/src/
├── services/
│   ├── crewService.ts                                # NEW: Crew management
│   ├── laborEstimationService.ts                     # NEW: Labor estimation
│   ├── timesheetService.ts                           # NEW: Time tracking
│   ├── payrollService.ts                             # NEW: Payroll operations
│   └── profitabilityService.ts                       # NEW: Profitability data
├── store/
│   ├── useCrewStore.ts                               # NEW: Crew state
│   ├── useLaborEstimateStore.ts                      # NEW: Labor estimate state
│   ├── useTimesheetStore.ts                          # NEW: Timesheet state
│   └── usePayrollStore.ts                            # NEW: Payroll state
├── components/
│   ├── crew/
│   │   ├── ProjectCrewAssignment.tsx                 # NEW: Assign crews
│   │   ├── CrewList.tsx                              # NEW: Crew listing
│   │   └── CrewCard.tsx                              # NEW: Crew display
│   ├── labor/
│   │   ├── LaborEstimationPanel.tsx                  # NEW: Generate estimates
│   │   ├── TaskBreakdown.tsx                         # NEW: Task list
│   │   └── CostSummary.tsx                           # NEW: Cost display
│   ├── timeline/
│   │   ├── GanttChart.tsx                            # NEW: Gantt chart
│   │   └── DependencyGraph.tsx                       # NEW: Dependency viz
│   ├── timesheet/
│   │   ├── ClockInForm.tsx                           # NEW: Clock in/out
│   │   └── TimesheetHistory.tsx                      # NEW: History view
│   ├── payroll/
│   │   ├── PayrollApprovalPanel.tsx                  # NEW: Admin approval
│   │   ├── PayrollExport.tsx                         # NEW: CSV export
│   │   └── AnomalyList.tsx                           # NEW: Anomaly display
│   └── profitability/
│       ├── ProfitabilityDashboard.tsx                # NEW: Variance dashboard
│       └── VarianceChart.tsx                         # NEW: Chart component
├── pages/
│   ├── CrewManagementPage.tsx                        # NEW: Crew admin
│   ├── TimelineViewPage.tsx                          # NEW: Timeline view
│   ├── AdminPayrollPage.tsx                          # NEW: Payroll admin
│   └── MoneyViewPage.tsx                             # MODIFIED: Add P4P section
├── types/
│   ├── crew.ts                                       # NEW: Crew types
│   ├── laborEstimate.ts                              # NEW: Labor types
│   ├── timesheet.ts                                  # NEW: Timesheet types
│   └── payroll.ts                                    # NEW: Payroll types
└── hooks/
    ├── useCrewAssignment.ts                          # NEW: Crew hook
    ├── useLaborEstimation.ts                         # NEW: Labor hook
    ├── useTimeTracking.ts                            # NEW: Time tracking hook
    └── usePayrollApproval.ts                         # NEW: Payroll hook
```

### Key Code Locations

**P4P Calculation Logic:**
- File: `backend/src/services/payrollCalculationService.ts`
- Function: `calculateP4PPay(timesheet: TimesheetRecord, baseRate: number)`
- Lines: ~50-120

**CPM Algorithm:**
- File: `backend/src/services/cpmService.ts`
- Function: `calculateCriticalPath(tasks: CPMTask[])`
- Lines: ~30-150

**AI Labor Estimation:**
- File: `backend/src/services/laborEstimationService.ts`
- Function: `generateLaborEstimate(scopeOfWork: string, projectType: string)`
- Lines: ~40-100

**Profitability Calculation:**
- File: `backend/src/services/profitabilityService.ts`
- Function: `calculateProfitability(projectId: string)`
- Lines: ~20-80

**Mermaid Chart Generation:**
- File: `collabcanvas/src/services/mermaidService.ts`
- Functions: `generateGanttChart(tasks: CPMTask[])`, `generateDependencyGraph(tasks: CPMTask[])`
- Lines: ~10-100

**Multi-Project Clock-In:**
- File: `collabcanvas/src/components/timesheet/ClockInForm.tsx`
- Function: `handleClockIn(projectId: string)`
- Lines: ~80-150

**AI Crew Generation:**
- File: `backend/src/scripts/generateDemoCrews.ts`
- Function: `generateDemoCrews()`
- Lines: ~20-120

### Testing Locations

**Unit Tests:**
- `backend/tests/services/payrollCalculation.test.ts` - P4P calculation tests
- `backend/tests/services/cpm.test.ts` - CPM algorithm tests
- `backend/tests/services/profitability.test.ts` - Profitability tests
- `backend/tests/utils/validators.test.ts` - Input validation tests

**Integration Tests:**
- `backend/tests/routes/payroll.test.ts` - Payroll API tests
- `backend/tests/routes/assignments.test.ts` - Crew assignment API tests
- `backend/tests/integration/payrollFlow.test.ts` - Complete payroll workflow

**E2E Tests:**
- `collabcanvas/tests/e2e/crewAssignment.spec.ts` - Crew assignment flow
- `collabcanvas/tests/e2e/clockIn.spec.ts` - Multi-project clock-in flow
- `collabcanvas/tests/e2e/payrollApproval.spec.ts` - Admin approval flow
- `collabcanvas/tests/e2e/profitability.spec.ts` - Profitability dashboard

**Test Configuration:**
- `backend/jest.config.js` - Jest configuration for backend
- `collabcanvas/vitest.config.ts` - Vitest configuration for frontend
- `collabcanvas/playwright.config.ts` - Playwright configuration for E2E

### Documentation to Update

**After Implementation:**

1. **README.md** (project root):
   - Add backend setup instructions
   - Add Supabase configuration steps
   - Update architecture diagram to include backend
   - Add P4P feature overview

2. **docs/index.md**:
   - Add new sections for P4P, labor estimation, profitability tracking
   - Update component inventory with new components
   - Update API contracts with new endpoints

3. **docs/architecture.md**:
   - Add dual-database architecture diagram
   - Document cross-database query patterns
   - Add P4P calculation flow diagram
   - Add CPM calculation flow diagram

4. **docs/api-contracts.md**:
   - Document all new backend API endpoints
   - Add request/response examples
   - Document authentication requirements
   - Add error response formats

5. **docs/data-models.md**:
   - Add Supabase schema documentation
   - Document relationships between Firebase and Supabase data
   - Add ER diagram for payroll tables

6. **docs/development-guide.md**:
   - Add backend development workflow
   - Add instructions for running both servers
   - Add debugging tips for dual-database setup

7. **Create new documentation:**
   - `docs/p4p-calculation-guide.md` - Detailed P4P formula explanation
   - `docs/cpm-algorithm-guide.md` - CPM calculation documentation
   - `docs/labor-estimation-guide.md` - AI labor estimation process
   - `docs/profitability-tracking-guide.md` - Variance tracking explanation

---

## UX/UI Considerations

### UI Components Affected

**New Components:**
- Crew Management page (admin only)
- Labor Estimation panel (on project creation)
- Timeline View page (separate from canvas)
- Clock-In form (crew members)
- Profitability Dashboard (managers/admins)
- Admin Payroll page (admin only)

**Modified Components:**
- MoneyViewPage: Add P4P Payroll section
- Project creation flow: Add labor estimation step
- Navigation: Add links to new pages

### UX Flows

**Labor Estimation Flow:**
1. User creates new project
2. User enters scope of work (text area)
3. User clicks "Generate Labor Estimate"
4. AI processes (loading spinner)
5. Task breakdown displayed with dependencies
6. CPM critical path highlighted
7. Estimated labor cost and duration shown
8. User can manually adjust tasks if needed
9. User saves estimate

**Multi-Project Clock-In Flow:**
1. Crew member navigates to Clock-In page
2. System fetches assigned projects (API call)
3. Dropdown shows projects (with date ranges)
4. Crew member selects project
5. Crew member clicks "Clock In"
6. System validates assignment
7. Success message: "Clocked in to [Project Name]"
8. Timer displays elapsed time
9. Crew member clicks "Clock Out" when done
10. System calculates hours, saves timesheet

**Admin Payroll Approval Flow:**
1. Admin navigates to Payroll page
2. System displays pending payroll records
3. Anomalies highlighted in red
4. Admin reviews each record
5. Admin can expand to see timesheet details
6. Admin approves or rejects each record
7. Admin clicks "Export CSV" for approved records
8. CSV downloads in Paychex format

### Accessibility

- All forms have proper labels
- Error messages are clear and actionable
- Keyboard navigation supported for all interactions
- Color-blind friendly (don't rely solely on color)
- Screen reader compatible (ARIA labels)
- Focus indicators visible

### Responsive Design

- Timeline view scales for mobile (horizontal scroll)
- Profitability dashboard stacks vertically on mobile
- Clock-in form optimized for mobile (large buttons)
- Admin payroll table scrolls horizontally on mobile

### Loading States

- Skeleton loaders for data fetching
- Spinners for AI processing (labor estimation)
- Progress bars for CSV export
- "Processing payroll..." message during cron job

### Error Handling

- Validation errors displayed inline
- API errors shown as toast notifications
- Retry buttons for failed operations
- Fallback UI for missing data

---

## Testing Approach

### Unit Testing Standards

**Backend (Jest):**
- Test all service layer functions in isolation
- Mock external dependencies (Firebase, Supabase, AI)
- Use `jest.mock()` for module mocking
- Test edge cases (null values, empty arrays, negative numbers)
- Verify error handling (throw expected errors)

**Frontend (Vitest):**
- Test React components with `@testing-library/react`
- Test custom hooks with `@testing-library/react-hooks`
- Mock API calls with `vi.mock()`
- Test user interactions (click, type, submit)
- Verify state updates correctly

**Example Unit Test (P4P Calculation):**
```typescript
// backend/tests/services/payrollCalculation.test.ts
import { calculateP4PPay } from '../../src/services/payrollCalculationService';

describe('P4P Calculation', () => {
  it('calculates base pay correctly', () => {
    const timesheet = {
      hours_worked: 8,
      clock_in: '2025-01-15T07:00:00Z',
      clock_out: '2025-01-15T15:30:00Z',
      lunch_duration: 30
    };
    const baseRate = 20;
    const result = calculateP4PPay(timesheet, baseRate);
    expect(result.base_pay).toBe(160); // 8 * 20
    expect(result.late_penalty).toBe(0);
    expect(result.long_lunch_penalty).toBe(0);
    expect(result.total_pay).toBe(160);
  });

  it('applies late penalty correctly', () => {
    const timesheet = {
      hours_worked: 8,
      clock_in: '2025-01-15T07:15:00Z', // 15 min late
      clock_out: '2025-01-15T15:30:00Z',
      lunch_duration: 30
    };
    const baseRate = 20;
    const result = calculateP4PPay(timesheet, baseRate);
    expect(result.base_pay).toBe(160);
    expect(result.late_penalty).toBe(8); // 160 * 0.05
    expect(result.total_pay).toBe(152);
  });
});
```

### Integration Testing Standards

**API Endpoint Tests:**
- Use supertest for HTTP testing
- Test authentication (valid/invalid tokens)
- Test authorization (role permissions)
- Test input validation (invalid data)
- Test database persistence (verify data saved)

**Example Integration Test:**
```typescript
// backend/tests/routes/payroll.test.ts
import request from 'supertest';
import app from '../../src/server';

describe('POST /api/payroll/calculate', () => {
  it('requires authentication', async () => {
    const response = await request(app)
      .post('/api/payroll/calculate')
      .send({ date: '2025-01-15' });
    expect(response.status).toBe(401);
  });

  it('calculates payroll for date', async () => {
    const token = await getTestToken('admin');
    const response = await request(app)
      .post('/api/payroll/calculate')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2025-01-15' });
    expect(response.status).toBe(200);
    expect(response.body.records).toBeDefined();
    expect(response.body.records.length).toBeGreaterThan(0);
  });
});
```

### E2E Testing Standards

**Playwright Tests:**
- Test complete user flows (login → action → verify)
- Use Page Object Model for maintainability
- Test across browsers (Chromium, Firefox, WebKit)
- Take screenshots on failure
- Use data-testid attributes for selectors

**Example E2E Test:**
```typescript
// collabcanvas/tests/e2e/payrollApproval.spec.ts
import { test, expect } from '@playwright/test';

test('admin approves payroll', async ({ page }) => {
  // Login as admin
  await page.goto('http://localhost:5173');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard');

  // Navigate to payroll
  await page.click('[data-testid="nav-payroll"]');
  await expect(page).toHaveURL('**/payroll');

  // Verify pending records
  const records = page.locator('[data-testid^="payroll-record-"]');
  await expect(records).toHaveCount(5);

  // Approve first record
  await page.click('[data-testid="payroll-record-1-approve"]');
  await expect(page.locator('[data-testid="payroll-record-1-status"]'))
    .toHaveText('Approved');

  // Export CSV
  await page.click('[data-testid="export-csv-button"]');
  const download = await page.waitForEvent('download');
  expect(download.suggestedFilename()).toMatch(/payroll-.*\.csv/);
});
```

### Performance Testing

**Load Testing:**
- Use k6 or Artillery for load testing
- Test payroll processing with 50+ employees
- Test concurrent API requests (10+ users)
- Measure response times (95th percentile < 500ms)

**Frontend Performance:**
- Lighthouse audit score > 90
- No layout shifts (CLS < 0.1)
- First Contentful Paint < 2s
- Time to Interactive < 4s

### Test Coverage

**Minimum Coverage Targets:**
- Services: 90%
- Routes: 85%
- Components: 80%
- Hooks: 85%
- Utils: 90%

**Tools:**
- Jest coverage: `npm run test:coverage`
- Vitest coverage: `npm run test:coverage`
- View reports: `open coverage/index.html`

---

## Deployment Strategy

### Deployment Steps

**Pre-Deployment Checklist:**
- [ ] All tests passing (unit, integration, E2E)
- [ ] Code reviewed and approved
- [ ] Environment variables configured in production
- [ ] Database migrations tested in staging
- [ ] Performance tests completed
- [ ] Security audit completed
- [ ] Documentation updated

**1. Database Migration (Staging):**
```bash
# Connect to staging Supabase
export SUPABASE_URL=https://staging-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=staging-key

# Run migrations
cd backend
npm run db:migrate

# Verify schema
npm run db:verify

# Seed demo data
npm run db:seed
```

**2. Backend Deployment (Staging):**
```bash
# Build backend
cd backend
npm run build

# Deploy to staging (e.g., Railway, Render, GCP)
# Example for Railway:
railway up --environment staging

# Verify deployment
curl https://api-staging.projective.com/api/health
```

**3. Frontend Deployment (Staging):**
```bash
# Build frontend
cd collabcanvas
npm run build

# Deploy to Firebase Hosting (staging)
firebase use staging
firebase deploy --only hosting

# Verify deployment
open https://staging.projective.com
```

**4. Smoke Testing (Staging):**
- [ ] Health checks pass
- [ ] User can log in
- [ ] Crew assignment works
- [ ] Labor estimation generates tasks
- [ ] Timeline view renders
- [ ] Clock-in/out works
- [ ] Payroll calculation works
- [ ] CSV export downloads

**5. Production Migration:**
```bash
# Database migration (production)
export SUPABASE_URL=https://prod-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=prod-key
cd backend
npm run db:migrate

# Backend deployment (production)
railway up --environment production

# Frontend deployment (production)
cd collabcanvas
firebase use production
firebase deploy --only hosting
```

**6. Post-Deployment Verification:**
- [ ] Monitor error logs for 1 hour
- [ ] Verify cron job runs successfully
- [ ] Test critical user flows
- [ ] Check database connections
- [ ] Verify external API integrations (mock mode)

### Rollback Plan

**If Critical Issue Detected:**

**1. Immediate Rollback (Frontend):**
```bash
# Rollback to previous Firebase Hosting version
firebase hosting:clone SOURCE_SITE_ID:CHANNEL_ID TARGET_SITE_ID:live
```

**2. Backend Rollback:**
```bash
# Railway rollback to previous deployment
railway rollback

# Or redeploy previous version
git checkout <previous-commit>
railway up --environment production
```

**3. Database Rollback:**
```bash
# If migration caused issues, run rollback migration
cd backend
npm run db:rollback

# Verify schema restored
npm run db:verify
```

**4. Communication:**
- Post incident status page update
- Notify users via email/in-app message
- Document issue in postmortem

### Monitoring

**Application Monitoring:**
- **Error Tracking**: Sentry for error monitoring
- **Performance**: New Relic or Datadog APM
- **Uptime**: UptimeRobot or Pingdom
- **Logs**: CloudWatch or Papertrail

**Key Metrics to Monitor:**
1. **Backend:**
   - API response times (p50, p95, p99)
   - Error rate (< 1% target)
   - Database query times
   - Cron job success rate
   - External API call success rate

2. **Frontend:**
   - Page load times
   - JavaScript errors
   - User session duration
   - Feature usage (track which features used most)

3. **Database:**
   - Query performance
   - Connection pool utilization
   - Storage usage
   - Index efficiency

**Alerting:**
- Error rate > 5%: Page on-call engineer
- API latency p95 > 1s: Slack alert
- Cron job failure: Email alert to admins
- Database connection pool > 80%: Slack alert

**Dashboard:**
- Create Grafana dashboard with:
  - API request volume (requests/min)
  - Error rate (%)
  - Response time distribution
  - Active users
  - Payroll processing duration
  - Database query times

**Health Checks:**
```bash
# Backend health
GET /api/health
Response: {"status":"ok","timestamp":"..."}

# Database health
GET /api/health/db
Response: {"firebase":"connected","supabase":"connected"}

# External API health
GET /api/health/integrations
Response: {
  "serviceAutopilot":"ok",
  "paychex":"ok",
  "mock":true
}
```

**Backup Strategy:**
- **Database**: Daily automated backups (Supabase auto-backup enabled)
- **Firestore**: Export to Cloud Storage weekly
- **Code**: Git repository with tagged releases
- **Configuration**: Environment variables stored in secure vault

---
