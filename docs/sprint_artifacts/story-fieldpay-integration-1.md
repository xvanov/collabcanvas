# Story 1.1: Backend Integration + Database Schema + AI Crew Generation

**Status:** Ready for Dev

---

## User Story

As a **system administrator**,
I want to set up the Express backend with Firebase Admin SDK, Supabase, and generate demo crews,
So that the foundation is ready for payroll, crew management, and time tracking features.

---

## Acceptance Criteria

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

---

## Implementation Details

### Tasks / Subtasks

- [ ] Create backend/ directory structure (AC: #1)
  - [ ] Initialize npm project with TypeScript
  - [ ] Create src/, database/, tests/ folders
  - [ ] Configure tsconfig.json for Node.js backend
- [ ] Set up Express server (AC: #1)
  - [ ] Install express, @types/express, cors, dotenv
  - [ ] Create src/server.ts with basic Express app
  - [ ] Configure CORS for frontend origin
  - [ ] Add error handling middleware
  - [ ] Add request logging
- [ ] Configure Firebase Admin SDK (AC: #4)
  - [ ] Install firebase-admin
  - [ ] Create src/config/firebase.ts
  - [ ] Load credentials from environment (service account JSON)
  - [ ] Initialize Firebase Admin app
  - [ ] Export admin auth instance
- [ ] Configure Supabase client (AC: #2, #3)
  - [ ] Install @supabase/supabase-js
  - [ ] Create src/config/supabase.ts
  - [ ] Load SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment
  - [ ] Export supabase client instance
- [ ] Create database migrations (AC: #3)
  - [ ] Create database/migrations/001_create_payroll_schema.sql
  - [ ] Define crews table (id, name, foreman_id, created_at)
  - [ ] Define project_crew_assignments table (id, project_id, crew_id, start_date, end_date)
  - [ ] Define labor_estimates table (id, project_id, estimated_cost, estimated_duration)
  - [ ] Define cpm_tasks table (id, estimate_id, task_name, hours, dependencies, critical_path)
  - [ ] Define timesheets table (id, employee_id, project_id, clock_in, clock_out, lunch_duration)
  - [ ] Define payroll_records table (id, employee_id, date, hours_worked, base_pay, total_pay, status, anomaly_flags)
  - [ ] Define profitability_metrics table (id, project_id, estimated_labor, actual_labor, variance, margin_percent)
  - [ ] Create database/migrations/002_create_indexes.sql
  - [ ] Add indexes on foreign keys (project_id, crew_id, employee_id, estimate_id)
  - [ ] Add indexes on date columns (date, start_date, end_date, clock_in)
  - [ ] Create npm script "db:migrate" to run migrations
- [ ] Implement auth middleware (AC: #4)
  - [ ] Create src/middleware/auth.ts
  - [ ] Extract Bearer token from Authorization header
  - [ ] Verify token using admin.auth().verifyIdToken()
  - [ ] Attach decoded user to req.user
  - [ ] Return 401 if token invalid or missing
- [ ] Implement RBAC middleware (AC: #5)
  - [ ] Create src/middleware/rbac.ts
  - [ ] Export requireRole(role: string) middleware factory
  - [ ] Check req.user.role from Firebase custom claims
  - [ ] Return 403 if user role doesn't match required role
  - [ ] Support multiple roles: admin, manager, foreman, crew_member
- [ ] Create AI crew generation script (AC: #6)
  - [ ] Create src/scripts/generateDemoCrews.ts
  - [ ] Define AI prompt to generate 3 crews with foreman + 2 workers each
  - [ ] Call OpenAI API with structured output (JSON)
  - [ ] Parse response into Crew and Worker objects
  - [ ] Insert crews and workers into Supabase crews table
  - [ ] Assign realistic base rates ($15-$30/hr)
  - [ ] Create npm script "generate:demo-crews" to run script
- [ ] Create health check endpoints (AC: #2)
  - [ ] Create src/routes/health.ts
  - [ ] GET /api/health - returns {status: "ok", timestamp}
  - [ ] GET /api/health/db - checks Firebase and Supabase connections
  - [ ] Test Firebase connection with admin.auth().listUsers(1)
  - [ ] Test Supabase connection with supabase.from('crews').select('count')
  - [ ] Return connection status for each database
- [ ] Write backend tests (AC: all)
  - [ ] Create tests/server.test.ts - basic server tests
  - [ ] Create tests/middleware/auth.test.ts - auth middleware tests
  - [ ] Create tests/middleware/rbac.test.ts - RBAC tests
  - [ ] Create tests/routes/health.test.ts - health endpoint tests
  - [ ] Mock Firebase Admin SDK
  - [ ] Mock Supabase client
  - [ ] Achieve ≥80% code coverage
- [ ] Environment configuration (AC: all)
  - [ ] Create .env.example with all required variables
  - [ ] Document Firebase credentials setup
  - [ ] Document Supabase credentials setup
  - [ ] Add .env to .gitignore
- [ ] Documentation (AC: all)
  - [ ] Create backend/README.md with setup instructions
  - [ ] Document npm scripts (dev, build, test, db:migrate, generate:demo-crews)
  - [ ] Add troubleshooting section

### Technical Summary

This story establishes the foundational backend infrastructure for the FieldPay-Pro P4P integration. It creates a new Express server alongside the existing React frontend, using Firebase Admin SDK for authentication (validating tokens from Firebase Auth on frontend) and Supabase PostgreSQL for payroll data storage. The dual-database architecture separates concerns: Firebase Firestore remains for project/BOM data, while Supabase handles payroll-specific tables.

**Key Technical Decisions:**
- **Express + TypeScript:** Standard Node.js REST API framework with type safety
- **Firebase Admin SDK:** Server-side Firebase client for token verification (no direct Firebase Auth usage)
- **Supabase PostgreSQL:** Relational database for payroll with ACID compliance and complex queries
- **JWT Middleware:** Validates Firebase tokens on every protected route
- **RBAC Middleware:** Enforces role-based permissions (admin, manager, foreman, crew_member)
- **AI Crew Generation:** Uses OpenAI to generate realistic demo data for testing

**Files/Modules Involved:**
- New backend/ directory with 17 service files, 5 routes, 4 config files
- Database schema with 7 tables and indexes
- Auth and RBAC middleware for all protected endpoints
- Health check endpoints for monitoring

### Project Structure Notes

- **Files to modify:**
  - None (all new files)
- **Files to create:**
  - `backend/src/server.ts` - Express server entry point
  - `backend/src/config/firebase.ts` - Firebase Admin SDK configuration
  - `backend/src/config/supabase.ts` - Supabase client configuration
  - `backend/src/config/env.ts` - Environment variable validation
  - `backend/src/middleware/auth.ts` - JWT authentication middleware
  - `backend/src/middleware/rbac.ts` - Role-based access control
  - `backend/src/routes/health.ts` - Health check endpoints
  - `backend/src/scripts/generateDemoCrews.ts` - AI crew generation script
  - `backend/database/migrations/001_create_payroll_schema.sql` - Database schema
  - `backend/database/migrations/002_create_indexes.sql` - Database indexes
  - `backend/tests/server.test.ts` - Server tests
  - `backend/tests/middleware/auth.test.ts` - Auth middleware tests
  - `backend/tests/middleware/rbac.test.ts` - RBAC middleware tests
  - `backend/tests/routes/health.test.ts` - Health endpoint tests
  - `backend/package.json` - Backend dependencies
  - `backend/tsconfig.json` - TypeScript configuration
  - `backend/.env.example` - Environment variables template
  - `backend/README.md` - Backend documentation
- **Expected test locations:**
  - `backend/tests/server.test.ts` - Express server tests
  - `backend/tests/middleware/auth.test.ts` - Auth middleware tests
  - `backend/tests/middleware/rbac.test.ts` - RBAC middleware tests
  - `backend/tests/routes/health.test.ts` - Health check tests
- **Estimated effort:** 3 story points (~1.5 days)
- **Prerequisites:** None (foundation story)

### Key Code References

**New Code (No Existing References):**
This story creates all new backend infrastructure from scratch. Reference the following for patterns:

- **Express Server Pattern:** Standard Node.js + Express + TypeScript setup
- **Firebase Admin SDK:** See tech-spec.md:1685 for configuration example
- **Supabase Client:** See tech-spec.md:1695 for configuration example
- **JWT Middleware:** Standard Express middleware pattern with token verification
- **Database Migrations:** SQL migrations for Supabase (see tech-spec.md:500-540 for schema)

**Tech-Spec References:**
- Database schema: tech-spec.md:500-540
- Backend architecture: tech-spec.md:547-560
- Environment configuration: tech-spec.md:1521-1548
- AI crew generation: tech-spec.md:700-750

---

## Context References

**Tech-Spec:** [tech-spec.md](../tech-spec.md) - Primary context document containing:

- Brownfield codebase analysis (Projective existing structure)
- Framework and library details with versions (Express 4.18.2, Supabase 2.38.4, Firebase Admin 11.11.0)
- Existing patterns to follow (service layer, route structure, error handling)
- Integration points and dependencies (Firebase Auth, Supabase, OpenAI)
- Complete implementation guidance (sections: Development Setup, Implementation Guide, Testing Approach)

**Architecture:** Dual-database architecture (Firestore + Supabase), Express REST API, JWT authentication, RBAC

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
