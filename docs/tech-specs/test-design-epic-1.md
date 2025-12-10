# Test Design: Epic 1 - MVP - Minimum Viable Product

**Date:** 2025-01-27
**Author:** xvanov
**Status:** Draft

---

## Executive Summary

**Scope:** Full test design for Epic 1 (MVP)

**Risk Summary:**

- Total risks identified: 12
- High-priority risks (≥6): 5
- Critical categories: SEC, PERF, DATA, BUS

**Coverage Summary:**

- P0 scenarios: 18 (36 hours)
- P1 scenarios: 32 (32 hours)
- P2/P3 scenarios: 45 (22.5 hours)
- **Total effort**: 90.5 hours (~11 days)

---

## Risk Assessment

### High-Priority Risks (Score ≥6)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- | -------- |
| R-001   | SEC      | Authentication bypass allowing unauthorized project access | 2 | 3 | 6 | Implement strict Firestore security rules, validate user ownership on all project operations | Dev | Before MVP launch |
| R-002   | PERF     | Canvas performance degradation with 100+ objects causing <60 FPS | 3 | 2 | 6 | Implement object culling, viewport optimization, batch updates | Dev | Before MVP launch |
| R-003   | DATA     | Plan/scale deletion not persisting after reload (data corruption) | 3 | 2 | 6 | Fix Firestore deletion logic, add transaction support, implement retry mechanism | Dev | Before MVP launch |
| R-004   | BUS      | BOM generation with incomplete prices leading to inaccurate estimates | 2 | 3 | 6 | Block BOM generation until all prices complete, implement pre-flight validation, require manual entry for failed prices | QA | Before MVP launch |
| R-005   | DATA     | Real-time collaboration conflicts causing data loss | 2 | 3 | 6 | Implement conflict resolution, use Firestore transactions for concurrent updates, add optimistic locking | Dev | Before MVP launch |

### Medium-Priority Risks (Score 3-4)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ---------- | ----- |
| R-006   | TECH     | Home Depot API rate limiting causing price fetch failures | 2 | 2 | 4 | Implement price caching, add retry logic with exponential backoff, fallback to manual entry | Dev |
| R-007   | PERF     | Firefox-specific performance issues not resolved | 2 | 2 | 4 | Cross-browser performance testing, Firefox-specific optimizations, monitor performance metrics | Dev |
| R-008   | BUS      | AI chat context-awareness failures causing incorrect actions | 2 | 2 | 4 | Implement view context tracking, validate context before actions, add user confirmation for cross-view operations | Dev |
| R-009   | OPS      | Project status calculation errors (profit/loss) | 1 | 3 | 3 | Validate cost tracking data, add unit tests for calculation logic, implement audit trail | QA |

### Low-Priority Risks (Score 1-2)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
| ------- | -------- | ----------- | ----------- | ------ | ----- | ------ |
| R-010   | BUS      | CSV upload format errors causing scope import failures | 1 | 2 | 2 | Monitor |
| R-011   | OPS      | PDF export formatting issues | 1 | 1 | 1 | Monitor |
| R-012   | TECH     | Deep linking URL parsing errors | 1 | 1 | 1 | Monitor |

### Risk Category Legend

- **TECH**: Technical/Architecture (flaws, integration, scalability)
- **SEC**: Security (access controls, auth, data exposure)
- **PERF**: Performance (SLA violations, degradation, resource limits)
- **DATA**: Data Integrity (loss, corruption, inconsistency)
- **BUS**: Business Impact (UX harm, logic errors, revenue)
- **OPS**: Operations (deployment, config, monitoring)

---

## Test Coverage Plan

### P0 (Critical) - Run on every commit

**Criteria**: Blocks core journey + High risk (≥6) + No workaround

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| User authentication and authorization | E2E | R-001 | 3 | QA | Login, logout, unauthorized access attempts |
| Project CRUD operations | API | R-001 | 4 | QA | Create, read, update, delete with auth validation |
| Plan deletion persistence | E2E | R-003 | 2 | QA | Delete plan, reload page, verify deletion persists |
| Scale deletion persistence | E2E | R-003 | 2 | QA | Delete scale, reload page, verify deletion persists |
| Canvas performance with 100+ objects | E2E | R-002 | 2 | QA | Measure FPS, verify 60 FPS maintained |
| BOM generation blocking (incomplete prices) | E2E | R-004 | 2 | QA | Attempt BOM generation without prices, verify blocking |
| Real-time collaboration conflict resolution | E2E | R-005 | 3 | QA | Concurrent edits, verify no data loss |

**Total P0**: 18 tests, 36 hours

### P1 (High) - Run on PR to main

**Criteria**: Important features + Medium risk (3-4) + Common workflows

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Project dashboard display | E2E | - | 2 | QA | Project list, status indicators, search/filter |
| Project creation workflow | E2E | - | 2 | QA | Create project, verify status defaults to "Estimating" |
| Project status transitions | E2E | R-009 | 3 | QA | Manual status changes, auto-calculation for completed |
| Four-view navigation | E2E | - | 4 | QA | Tab switching, deep linking, view indicators |
| Scope view CSV upload | E2E | R-010 | 3 | QA | Upload valid CSV, invalid CSV, verify display |
| Scope view content display | Component | - | 2 | DEV | Display formatted scope content |
| Time view CPM generation | E2E | - | 2 | QA | Generate CPM, verify graph visualization |
| Time view empty state | Component | - | 1 | DEV | Display placeholder before CPM generation |
| Money view BOM display | E2E | R-004 | 3 | QA | Display BOM with prices, categories, totals |
| Money view price fetching | API | R-006 | 3 | QA | Fetch prices, handle failures, manual entry |
| Money view margin calculation | Unit | - | 3 | DEV | Calculate margin for customer/contractor views |
| Money view PDF export | E2E | R-011 | 2 | QA | Export customer view, contractor view |
| Pre-flight completeness validation | E2E | R-004 | 2 | QA | AI blocks generation, validates required items |
| AI chat context awareness | E2E | R-008 | 2 | QA | AI knows current view, suggests navigation |

**Total P1**: 32 tests, 32 hours

### P2 (Medium) - Run nightly/weekly

**Criteria**: Secondary features + Low risk (1-2) + Edge cases

| Requirement | Test Level | Risk Link | Test Count | Owner | Notes |
| ----------- | ---------- | --------- | ---------- | ----- | ----- |
| Project sharing (invite links) | E2E | R-001 | 3 | QA | Generate link, share, verify access control |
| Project search functionality | Component | - | 2 | DEV | Search by name, filter by status |
| Scope view CSV template download | Component | - | 1 | DEV | Download template, verify format |
| Time view CPM calculations | Unit | - | 4 | DEV | Task duration, dependencies, critical path |
| Money view price caching | API | R-006 | 2 | QA | Cache prices, verify cache hits |
| Money view cost tracking (optional) | E2E | R-009 | 3 | QA | Input actual costs, compare estimate vs actual |
| Money view material selection prompts | E2E | R-008 | 2 | QA | AI prompts for unclear materials |
| Canvas toolbar interactions | Component | - | 3 | DEV | Tool selection, tool state management |
| Layer panel operations | Component | - | 3 | DEV | Create layer, delete layer, toggle visibility |
| Measurement display | Component | - | 2 | DEV | Real-time measurement updates |
| Design system components | Component | - | 8 | DEV | shadcn/ui components rendering, accessibility |
| Responsive navigation | E2E | - | 3 | QA | Desktop tabs, tablet tabs, mobile bottom nav |
| Cross-browser performance | E2E | R-007 | 3 | QA | Chrome, Firefox, Safari, Edge performance |

**Total P2**: 38 tests, 19 hours

### P3 (Low) - Run on-demand

**Criteria**: Nice-to-have + Exploratory + Performance benchmarks

| Requirement | Test Level | Test Count | Owner | Notes |
| ----------- | ---------- | ---------- | ----- | ----- |
| Deep linking edge cases | E2E | 2 | QA | Invalid project IDs, invalid view names |
| PDF export formatting edge cases | E2E | 2 | QA | Large BOMs, special characters |
| AI chat error handling | E2E | 2 | QA | Network failures, API errors |
| Performance benchmarks | E2E | 1 | QA | Load testing with 200+ objects |

**Total P3**: 7 tests, 3.5 hours

---

## Acceptance Criteria to Test Case Traceability Matrix

**Test Case Naming Convention:** `TC-{Story}.{AC}` (e.g., TC-1.1.1 for Story 1.1, Acceptance Criterion 1)

This matrix provides complete traceability from Epic 1 acceptance criteria to specific test cases, ensuring every requirement is validated.

### Story 1.1: Critical Bug Fixes & Performance Optimization

| AC ID | Acceptance Criterion | Test Case ID | Test Case Name | Test Level | Priority | Risk Link |
|-------|---------------------|-------------|----------------|------------|----------|-----------|
| AC 1.1.1 | Plan/scale deletion persists after page reload | TC-1.1.1 | Plan deletion persists after reload | E2E | P0 | R-003 |
| AC 1.1.2 | Home Depot prices fetched successfully for 90%+ of materials | TC-1.1.2 | Home Depot price fetch success rate ≥90% | API | P1 | R-006 |
| AC 1.1.3 | AI shape creation works without errors | TC-1.1.3 | AI shape creation commands execute successfully | E2E | P1 | R-008 |
| AC 1.1.4 | Firefox performance maintains 60 FPS with 100+ objects | TC-1.1.4 | Firefox canvas performance 60 FPS | E2E | P0 | R-002 |
| AC 1.1.5 | Any browser maintains consistent 60 FPS with 100+ objects | TC-1.1.5 | Cross-browser canvas performance 60 FPS | E2E | P0 | R-002 |
| AC 1.1.6 | Object culling implemented (only visible objects rendered) | TC-1.1.6 | Object culling renders only visible objects | E2E | P2 | R-002 |
| AC 1.1.7 | Viewport optimization implemented | TC-1.1.7 | Viewport optimization updates only visible area | E2E | P2 | R-002 |
| AC 1.1.8 | Batching optimization implemented | TC-1.1.8 | Batch updates reduce render calls | E2E | P2 | R-002 |
| AC 1.1.9 | Performance maintains 60 FPS during pan, zoom, and drawing | TC-1.1.9 | Canvas maintains 60 FPS during all operations | E2E | P0 | R-002 |

### Story 1.2: Home Page & Project Management System

| AC ID | Acceptance Criterion | Test Case ID | Test Case Name | Test Level | Priority | Risk Link |
|-------|---------------------|-------------|----------------|------------|----------|-----------|
| AC 1.2.1 | See project list with status indicators | TC-1.2.1 | Project list displays with status indicators | E2E | P1 | - |
| AC 1.2.2 | Create project with name/description, status defaults to "Estimating" | TC-1.2.2 | Project creation with default status | E2E | P1 | - |
| AC 1.2.3 | Click project enters four-view navigation | TC-1.2.3 | Project selection navigates to four-view | E2E | P1 | - |
| AC 1.2.4 | Change status updates immediately and persists | TC-1.2.4 | Project status change persists | E2E | P1 | R-009 |
| AC 1.2.5 | Mark complete calculates profit/loss automatically | TC-1.2.5 | Completed project profit/loss calculation | E2E | P1 | R-009 |
| AC 1.2.6 | Mark complete without cost tracking becomes "Completed - Unknown" | TC-1.2.6 | Completed project without cost tracking | E2E | P1 | R-009 |
| AC 1.2.7 | Search/filter updates project list | TC-1.2.7 | Project search and filter functionality | Component | P2 | - |
| AC 1.2.8 | Delete project with confirmation | TC-1.2.8 | Project deletion with confirmation | E2E | P1 | - |
| AC 1.2.9 | Not logged in cannot access projects | TC-1.2.9 | Unauthenticated access blocked | E2E | P0 | R-001 |
| AC 1.2.10 | Cannot access unauthorized project | TC-1.2.10 | Unauthorized project access denied | E2E | P0 | R-001 |
| AC 1.2.11 | Share as Viewer - can view but not modify | TC-1.2.11 | Viewer role read-only access | E2E | P2 | R-001 |
| AC 1.2.12 | Share as Editor - can view and modify | TC-1.2.12 | Editor role full access | E2E | P2 | R-001 |
| AC 1.2.13 | Network error shows message with retry | TC-1.2.13 | Network error handling with retry | E2E | P1 | - |
| AC 1.2.14 | Project creation failure shows error | TC-1.2.14 | Project creation error handling | E2E | P1 | - |
| AC 1.2.15 | Project deletion failure shows error | TC-1.2.15 | Project deletion error handling | E2E | P1 | - |

### Story 1.3: Four-View Navigation & Scope View

| AC ID | Acceptance Criterion | Test Case ID | Test Case Name | Test Level | Priority | Risk Link |
|-------|---------------------|-------------|----------------|------------|----------|-----------|
| AC 1.3.1 | See top navigation bar with four tabs | TC-1.3.1 | Four-view navigation tabs displayed | E2E | P1 | - |
| AC 1.3.2 | Click Scope tab shows CSV upload capability | TC-1.3.2 | Scope view CSV upload interface | E2E | P1 | - |
| AC 1.3.3 | Upload CSV with 2 columns parses and displays | TC-1.3.3 | CSV upload parsing and display | E2E | P1 | R-010 |
| AC 1.3.4 | Switch tabs changes view smoothly | TC-1.3.4 | Tab switching smooth transitions | E2E | P1 | - |
| AC 1.3.5 | Content generated shows indicator badge on tab | TC-1.3.5 | View indicator badges display | E2E | P1 | - |
| AC 1.3.6 | Click tab with indicator removes indicator | TC-1.3.6 | View indicator disappears on click | E2E | P1 | - |
| AC 1.3.7 | See presence indicators for other users | TC-1.3.7 | Presence indicators show user locations | E2E | P2 | - |
| AC 1.3.8 | Changes sync in real-time across views | TC-1.3.8 | Real-time synchronization across views | E2E | P0 | R-005 |

### Story 1.4: Money View with BOM, Pricing, Margin Calculation & AI Chat Integration

| AC ID | Acceptance Criterion | Test Case ID | Test Case Name | Test Level | Priority | Risk Link |
|-------|---------------------|-------------|----------------|------------|----------|-----------|
| AC 1.4.1 | AI guides through pre-flight checks | TC-1.4.1 | AI pre-flight check guidance | E2E | P1 | R-004 |
| AC 1.4.2 | AI refuses generation if missing required info | TC-1.4.2 | AI blocks generation with missing info | E2E | P0 | R-004 |
| AC 1.4.3 | AI generates BOM and Critical Path simultaneously | TC-1.4.3 | Parallel BOM and CPM generation | E2E | P1 | - |
| AC 1.4.4 | System fetches Home Depot prices automatically (90%+ success) | TC-1.4.4 | Automatic price fetching 90%+ success | API | P1 | R-006 |
| AC 1.4.5 | Price fetch failure shows manual entry option | TC-1.4.5 | Price fetch failure manual entry | E2E | P1 | R-006 |
| AC 1.4.6 | BOM completion blocked until all prices entered | TC-1.4.6 | BOM generation blocked without prices | E2E | P0 | R-004 |
| AC 1.4.7 | View estimate in Customer View format | TC-1.4.7 | Customer View estimate display | E2E | P1 | - |
| AC 1.4.8 | View estimate in Contractor View format | TC-1.4.8 | Contractor View estimate display | E2E | P1 | - |
| AC 1.4.9 | Modify BOM reflects immediately in both views | TC-1.4.9 | BOM modifications reflect in views | E2E | P1 | - |
| AC 1.4.10 | Export Customer View or Contractor View as PDF | TC-1.4.10 | PDF export for both views | E2E | P1 | R-011 |
| AC 1.4.11 | Input actual cost per material line item | TC-1.4.11 | Actual cost input per line item | E2E | P2 | R-009 |
| AC 1.4.12 | Enter costs incrementally | TC-1.4.12 | Incremental actual cost entry | E2E | P2 | R-009 |
| AC 1.4.13 | Actual costs persist across sessions | TC-1.4.13 | Actual cost persistence | E2E | P2 | R-009 |
| AC 1.4.14 | Edit actual cost updates variance automatically | TC-1.4.14 | Actual cost edit updates variance | E2E | P2 | R-009 |
| AC 1.4.15 | View side-by-side estimate vs actual comparison | TC-1.4.15 | Estimate vs actual comparison view | E2E | P2 | R-009 |
| AC 1.4.16 | Variance percentage calculated per line item | TC-1.4.16 | Per-item variance calculation | Unit | P2 | R-009 |
| AC 1.4.17 | Total variance calculated and displayed | TC-1.4.17 | Total variance calculation | Unit | P2 | R-009 |
| AC 1.4.18 | Variance visually highlighted (over/under estimates) | TC-1.4.18 | Variance visual highlighting | Component | P2 | R-009 |
| AC 1.4.19 | AI BOM generation failure shows error with retry | TC-1.4.19 | AI generation error handling | E2E | P1 | - |
| AC 1.4.20 | Multiple price fetch failures show manual entry for all | TC-1.4.20 | Multiple price failure handling | E2E | P1 | R-006 |
| AC 1.4.21 | Price fetch API unavailable shows error | TC-1.4.21 | API unavailable error handling | E2E | P1 | R-006 |
| AC 1.4.22 | Actual cost input failure shows error with retry | TC-1.4.22 | Actual cost save error handling | E2E | P1 | - |
| AC 1.4.23 | Variance calculation failure shows error | TC-1.4.23 | Variance calculation error handling | E2E | P1 | - |

**Total Acceptance Criteria:** 42  
**Total Test Cases:** 42  
**Coverage:** 100% (all ACs mapped to test cases)

---

## Test Execution Plan

This section provides a detailed execution plan for running the test suite, including sequencing, dependencies, and execution strategies.

### Execution Strategy

**Test Execution Approach:**
- **Sequential for P0**: Critical tests run sequentially to ensure stability
- **Parallel for P1/P2/P3**: Non-critical tests run in parallel for efficiency
- **Isolated Environments**: Each test suite runs in isolated Firebase emulator environment
- **Test Data Management**: Fresh test data per test run, cleanup after execution

### Execution Phases

#### Phase 1: Smoke Tests (5 minutes)
**Purpose:** Fast feedback, catch build-breaking issues  
**Execution:** Sequential, blocking  
**Failure Action:** Stop execution, report critical failure

| Test Case ID | Test Name | Execution Time | Dependencies |
|-------------|-----------|----------------|--------------|
| TC-SMOKE-1 | User login | 30s | Firebase Auth emulator |
| TC-SMOKE-2 | Project creation | 45s | Firebase Auth + Firestore emulator |
| TC-SMOKE-3 | Navigate to Space view | 30s | Project created |
| TC-SMOKE-4 | Switch between views | 45s | Project created, four-view navigation |
| TC-SMOKE-5 | Canvas loads and displays shapes | 1min | Project created, Space view |

**Success Criteria:** All 5 smoke tests pass  
**Failure Threshold:** Any failure blocks deployment

---

#### Phase 2: P0 Critical Tests (10 minutes)
**Purpose:** Critical path validation, high-risk mitigation  
**Execution:** Sequential, blocking  
**Failure Action:** Block deployment, escalate to team

| Test Case ID | Test Name | Execution Time | Dependencies | Risk Link |
|-------------|-----------|----------------|--------------|-----------|
| TC-1.2.9 | Unauthenticated access blocked | 1min | Firebase Auth emulator | R-001 |
| TC-1.2.10 | Unauthorized project access denied | 1min | Firebase Auth + Firestore | R-001 |
| TC-1.1.1 | Plan deletion persists after reload | 2min | Firestore emulator | R-003 |
| TC-1.1.4 | Firefox canvas performance 60 FPS | 2min | Canvas with 100+ objects | R-002 |
| TC-1.1.5 | Cross-browser canvas performance 60 FPS | 3min | Canvas with 100+ objects | R-002 |
| TC-1.1.9 | Canvas maintains 60 FPS during operations | 1min | Canvas with 100+ objects | R-002 |
| TC-1.4.2 | AI blocks generation with missing info | 1min | AI chat, incomplete project | R-004 |
| TC-1.4.6 | BOM generation blocked without prices | 1min | BOM without prices | R-004 |
| TC-1.3.8 | Real-time synchronization across views | 2min | Multiple users, Firestore RTDB | R-005 |

**Total P0 Tests:** 9  
**Execution Time:** ~14 minutes  
**Success Criteria:** 100% pass rate (no exceptions)  
**Failure Threshold:** Any failure blocks deployment

---

#### Phase 3: P1 High Priority Tests (30 minutes)
**Purpose:** Important feature coverage, medium-risk validation  
**Execution:** Parallel (batches of 5), non-blocking  
**Failure Action:** Report failures, require waivers for deployment

**Batch 1: Authentication & Project Management (5 tests, ~8 min)**
- TC-1.2.1: Project list displays with status indicators
- TC-1.2.2: Project creation with default status
- TC-1.2.3: Project selection navigates to four-view
- TC-1.2.4: Project status change persists
- TC-1.2.5: Completed project profit/loss calculation

**Batch 2: Navigation & Scope View (5 tests, ~7 min)**
- TC-1.3.1: Four-view navigation tabs displayed
- TC-1.3.2: Scope view CSV upload interface
- TC-1.3.3: CSV upload parsing and display
- TC-1.3.4: Tab switching smooth transitions
- TC-1.3.5: View indicator badges display

**Batch 3: BOM & Pricing (5 tests, ~10 min)**
- TC-1.4.1: AI pre-flight check guidance
- TC-1.4.3: Parallel BOM and CPM generation
- TC-1.4.4: Automatic price fetching 90%+ success
- TC-1.4.5: Price fetch failure manual entry
- TC-1.4.7: Customer View estimate display

**Batch 4: Money View & Error Handling (5 tests, ~8 min)**
- TC-1.4.8: Contractor View estimate display
- TC-1.4.9: BOM modifications reflect in views
- TC-1.4.10: PDF export for both views
- TC-1.4.19: AI generation error handling
- TC-1.2.13: Network error handling with retry

**Batch 5: Remaining P1 Tests (7 tests, ~12 min)**
- TC-1.1.2: Home Depot price fetch success rate ≥90%
- TC-1.1.3: AI shape creation commands execute successfully
- TC-1.2.6: Completed project without cost tracking
- TC-1.2.8: Project deletion with confirmation
- TC-1.2.14: Project creation error handling
- TC-1.2.15: Project deletion error handling
- TC-1.3.6: View indicator disappears on click

**Total P1 Tests:** 27  
**Execution Time:** ~45 minutes (parallel batches)  
**Success Criteria:** ≥95% pass rate (waivers required for failures)  
**Failure Threshold:** >5% failure rate requires review

---

#### Phase 4: P2 Medium Priority Tests (60 minutes)
**Purpose:** Secondary feature coverage, edge cases  
**Execution:** Parallel (batches of 10), non-blocking  
**Failure Action:** Report failures, informational

**Batch 1: Performance & Optimization (5 tests, ~10 min)**
- TC-1.1.6: Object culling renders only visible objects
- TC-1.1.7: Viewport optimization updates only visible area
- TC-1.1.8: Batch updates reduce render calls
- TC-1.2.7: Project search and filter functionality
- TC-1.2.11: Viewer role read-only access

**Batch 2: Cost Tracking & Variance (5 tests, ~12 min)**
- TC-1.4.11: Actual cost input per line item
- TC-1.4.12: Incremental actual cost entry
- TC-1.4.13: Actual cost persistence
- TC-1.4.14: Actual cost edit updates variance
- TC-1.4.15: Estimate vs actual comparison view

**Batch 3: Variance Calculations & UI (5 tests, ~8 min)**
- TC-1.4.16: Per-item variance calculation
- TC-1.4.17: Total variance calculation
- TC-1.4.18: Variance visual highlighting
- TC-1.3.7: Presence indicators show user locations
- TC-1.2.12: Editor role full access

**Batch 4: Error Handling & Edge Cases (5 tests, ~10 min)**
- TC-1.4.20: Multiple price failure handling
- TC-1.4.21: API unavailable error handling
- TC-1.4.22: Actual cost save error handling
- TC-1.4.23: Variance calculation error handling
- Additional component tests (from P2 coverage plan)

**Total P2 Tests:** 20+ (includes component tests)  
**Execution Time:** ~40 minutes (parallel batches)  
**Success Criteria:** ≥90% pass rate (informational)  
**Failure Threshold:** Report failures, no deployment block

---

#### Phase 5: P3 Low Priority Tests (20 minutes)
**Purpose:** Exploratory, performance benchmarks, edge cases  
**Execution:** Parallel, non-blocking  
**Failure Action:** Report failures, informational only

| Test Case ID | Test Name | Execution Time | Notes |
|-------------|-----------|----------------|-------|
| TC-P3-1 | Deep linking edge cases | 5min | Invalid project IDs, invalid view names |
| TC-P3-2 | PDF export formatting edge cases | 5min | Large BOMs, special characters |
| TC-P3-3 | AI chat error handling | 5min | Network failures, API errors |
| TC-P3-4 | Performance benchmarks | 5min | Load testing with 200+ objects |

**Total P3 Tests:** 4  
**Execution Time:** ~20 minutes  
**Success Criteria:** ≥90% pass rate (informational)  
**Failure Threshold:** Report failures, no deployment block

---

### Test Execution Schedule

**Daily Execution (CI/CD Pipeline):**
- **Smoke Tests**: Run on every commit (5 min)
- **P0 Tests**: Run on every commit (14 min)
- **Total Daily Execution Time**: ~19 minutes

**Pull Request Execution:**
- **Smoke Tests**: Run on PR creation (5 min)
- **P0 Tests**: Run on PR creation (14 min)
- **P1 Tests**: Run on PR creation (45 min parallel)
- **Total PR Execution Time**: ~64 minutes

**Nightly Execution:**
- **All Tests**: Full regression suite
- **Total Nightly Execution Time**: ~2 hours (parallel execution)

**Pre-Deployment Execution:**
- **All Tests**: Full regression suite
- **Manual Review**: P0/P1 failures require approval
- **Total Pre-Deployment Time**: ~2 hours

---

### Test Environment Setup

**Required Environments:**
1. **Local Development**: Firebase emulators (Auth, Firestore, RTDB, Functions)
2. **CI/CD Pipeline**: Isolated test environment with Firebase emulators
3. **Integration Testing**: Test Firebase project (staging environment)

**Environment Configuration:**
- Firebase emulator suite running on localhost
- Test data factories initialized
- Mock services for external APIs (Home Depot API)
- Performance monitoring tools configured

**Test Data Management:**
- Fresh test data per test run
- Automatic cleanup after execution
- Test data factories for consistent data generation
- Isolated test projects per test suite

---

### Execution Dependencies

**Critical Dependencies:**
1. Firebase emulator suite must be running
2. Test data factories must be initialized
3. Mock services for external APIs configured
4. Performance monitoring tools available

**Test Execution Order Dependencies:**
- P0 tests can run independently
- P1 tests require P0 to pass (or can run in parallel with P0)
- P2/P3 tests can run independently or in parallel

**Failure Handling:**
- P0 failures: Stop execution, block deployment
- P1 failures: Continue execution, require waivers
- P2/P3 failures: Continue execution, report only

---

## Execution Order

### Smoke Tests (<5 min)

**Purpose**: Fast feedback, catch build-breaking issues

- [ ] User can login successfully (30s)
- [ ] User can create a project (45s)
- [ ] User can navigate to Space view (30s)
- [ ] User can switch between views (45s)
- [ ] Canvas loads and displays shapes (1min)

**Total**: 5 scenarios

### P0 Tests (<10 min)

**Purpose**: Critical path validation

- [ ] Authentication and authorization (E2E)
- [ ] Project CRUD with auth (API)
- [ ] Plan deletion persistence (E2E)
- [ ] Scale deletion persistence (E2E)
- [ ] Canvas performance validation (E2E)
- [ ] BOM generation blocking (E2E)
- [ ] Real-time collaboration conflicts (E2E)

**Total**: 18 scenarios

### P1 Tests (<30 min)

**Purpose**: Important feature coverage

- [ ] Project dashboard and status management (E2E)
- [ ] Four-view navigation (E2E)
- [ ] Scope view CSV upload (E2E)
- [ ] Time view CPM generation (E2E)
- [ ] Money view BOM and pricing (E2E/API)
- [ ] Pre-flight validation (E2E)
- [ ] AI chat context awareness (E2E)

**Total**: 32 scenarios

### P2/P3 Tests (<60 min)

**Purpose**: Full regression coverage

- [ ] Project sharing and access control (E2E)
- [ ] Component-level tests (Component)
- [ ] Design system components (Component)
- [ ] Cross-browser performance (E2E)
- [ ] Edge cases and error handling (E2E)

**Total**: 45 scenarios

---

## Resource Estimates

### Test Development Effort

| Priority | Count | Hours/Test | Total Hours | Notes |
| -------- | ----- | ---------- | ----------- | ----- |
| P0       | 18    | 2.0        | 36          | Complex setup, security, performance |
| P1       | 32    | 1.0        | 32          | Standard coverage, E2E and API |
| P2       | 38    | 0.5        | 19          | Component tests, simpler scenarios |
| P3       | 7     | 0.5        | 3.5         | Edge cases, exploratory |
| **Total** | **95** | **-** | **90.5** | **~11 days** |

### Prerequisites

**Test Data:**

- User factory (create test users with Firebase Auth)
- Project factory (create projects with various statuses)
- BOM factory (generate test BOMs with prices)
- CPM factory (generate test CPM tasks with dependencies)
- Scope factory (generate CSV test data)

**Tooling:**

- Playwright for E2E tests
- Vitest for unit/component tests
- Firebase emulators for local testing
- Performance monitoring tools (Lighthouse, Chrome DevTools)

**Environment:**

- Firebase emulator suite (Auth, Firestore, RTDB, Functions)
- Test Firebase project for integration tests
- Local development server for E2E tests

---

## Quality Gate Criteria

### Pass/Fail Thresholds

- **P0 pass rate**: 100% (no exceptions)
- **P1 pass rate**: ≥95% (waivers required for failures)
- **P2/P3 pass rate**: ≥90% (informational)
- **High-risk mitigations**: 100% complete or approved waivers

### Coverage Targets

- **Critical paths**: ≥80%
- **Security scenarios**: 100%
- **Business logic**: ≥70%
- **Edge cases**: ≥50%

### Non-Negotiable Requirements

- [ ] All P0 tests pass
- [ ] No high-risk (≥6) items unmitigated
- [ ] Security tests (SEC category) pass 100%
- [ ] Performance targets met (PERF category) - 60 FPS with 100+ objects

---

## Mitigation Plans

### R-001: Authentication Bypass (Score: 6)

**Mitigation Strategy:** 
- Implement comprehensive Firestore security rules validating user ownership
- Add server-side validation in Cloud Functions
- Test all project operations with unauthorized users
- Implement role-based access control (Editor/Viewer)

**Owner:** Dev Team
**Timeline:** Before MVP launch
**Status:** Planned
**Verification:** E2E tests verify unauthorized access is blocked, API tests validate security rules

### R-002: Canvas Performance Degradation (Score: 6)

**Mitigation Strategy:**
- Implement object culling (only render visible shapes)
- Add viewport optimization (update only visible area)
- Implement batch updates (group multiple updates)
- Cross-browser performance testing and optimization

**Owner:** Dev Team
**Timeline:** Before MVP launch
**Status:** Planned
**Verification:** Performance tests measure FPS, verify 60 FPS maintained with 100+ objects across browsers

### R-003: Plan/Scale Deletion Not Persisting (Score: 6)

**Mitigation Strategy:**
- Fix Firestore deletion logic (ensure proper document removal)
- Add transaction support for atomic operations
- Implement retry mechanism for failed deletions
- Add deletion confirmation and error handling

**Owner:** Dev Team
**Timeline:** Before MVP launch
**Status:** Planned
**Verification:** E2E tests verify deletion persists after reload, no ghost objects reappear

### R-004: BOM Generation with Incomplete Prices (Score: 6)

**Mitigation Strategy:**
- Block BOM generation until all prices complete (fetched or manually entered)
- Implement pre-flight validation checking price completeness
- Require manual entry for failed price fetches
- Add visual indicators for incomplete prices

**Owner:** QA Team
**Timeline:** Before MVP launch
**Status:** Planned
**Verification:** E2E tests verify BOM generation is blocked when prices incomplete, AI refuses to generate

### R-005: Real-Time Collaboration Conflicts (Score: 6)

**Mitigation Strategy:**
- Implement conflict resolution using Firestore transactions
- Add optimistic locking for concurrent updates
- Use Firestore server timestamps for conflict detection
- Test concurrent edits from multiple users

**Owner:** Dev Team
**Timeline:** Before MVP launch
**Status:** Planned
**Verification:** E2E tests simulate concurrent edits, verify no data loss, conflicts resolved correctly

---

## Assumptions and Dependencies

### Assumptions

1. Firebase emulator suite available for local testing
2. Test Firebase project available for integration tests
3. Home Depot API available for price fetching tests (or mocked)
4. Test users can be created via Firebase Auth
5. Performance testing tools available (Chrome DevTools, Lighthouse)

### Dependencies

1. Firebase emulator suite setup - Required before test development
2. Test data factories implementation - Required for test data generation
3. Playwright configuration - Required for E2E tests
4. Vitest configuration - Required for unit/component tests

### Risks to Plan

- **Risk**: Home Depot API unavailable during testing
  - **Impact**: Price fetching tests cannot run
  - **Contingency**: Mock API responses, use recorded HAR files

- **Risk**: Performance testing environment differs from production
  - **Impact**: Performance test results may not reflect production
  - **Contingency**: Use production-like environment, monitor production metrics

---

## Approval

**Test Design Approved By:**

- [ ] Product Manager: **\*\***\_\_\_**\*\*** Date: **\*\***\_\_\_**\*\***
- [ ] Tech Lead: **\*\***\_\_\_**\*\*** Date: **\*\***\_\_\_**\*\***
- [ ] QA Lead: **\*\***\_\_\_**\*\*** Date: **\*\***\_\_\_**\*\***

**Comments:**

---

## Appendix

### Knowledge Base References

- `risk-governance.md` - Risk classification framework
- `probability-impact.md` - Risk scoring methodology
- `test-levels-framework.md` - Test level selection
- `test-priorities-matrix.md` - P0-P3 prioritization

### Related Documents

- PRD: `/docs/PRD.md`
- Epic: `/docs/epics.md`
- Architecture: `/docs/architecture.md`
- Tech Spec: `/docs/architecture.md`

---

**Generated by**: BMad TEA Agent - Test Architect Module
**Workflow**: `bmad/bmm/testarch/test-design`
**Version**: 4.0 (BMad v6)

