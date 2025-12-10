# CollabCanvas – Performance Optimization PRD (Core Competencies Focus)

> Goal: Achieve and sustain 60 FPS under core collaboration workloads while preserving < 100ms shape sync and < 50ms cursor latency across 500+ objects and 5+ concurrent users.

## 1) Problem & Objectives

The MVP is functional but does not consistently meet performance targets (FPS) under load. This PRD defines a focused optimization initiative to hit core performance competencies required by the rubric while keeping collaboration reliable and consistent.

**Objectives**
- Maintain 60 FPS during pan, zoom, selection, and object manipulation
- Sync object changes in < 100ms and cursor positions in < 50ms
- Sustain performance with 500+ objects and 5+ concurrent users
- Validate via automated perf harness in CI on Chromium and Firefox, with production builds

## 2) Scope

This PRD targets optimizations in three areas:
- Rendering pipeline (React + Konva): reduce re-renders, leverage layer caching, memoize components
- State updates (Zustand): minimize store churn with selectors, shallow compare, and batched updates
- Network write path (Firestore/RTDB): coalesce/throttle drag updates at 16ms (≈60Hz), avoid redundant writes

“Multi-shape readiness” is considered: optimizations should scale to multiple simple shape types (rect, circle, text) even if only rectangles are currently present.

## 3) Non-Goals

- New end-user features (e.g., transform tools beyond movement, advanced text formatting)
- AI agent expansion
- Architectural rewrites or backend migrations

## 4) Success Metrics & Measurement

Measured with the existing automated performance harness.

**Targets**
- Median FPS ≥ 60 during pan/zoom/drag scenarios
- Median shape sync latency < 100ms
- Median cursor latency < 50ms
- Scales to 500+ simple objects and 5+ concurrent users

**Measurement**
- Use Playwright-based harness in `collabcanvas/test/perf/` against a production build
- Generate JSON report (e.g., `perf-report.json`) per run
- Run cross-browser matrix (Chromium + Firefox) in CI

## 5) Approach (High-Level)

1. Rendering pipeline
   - Memoize `Shape` components and expensive props; use `React.memo`
   - Cache Konva layers; avoid invalidation on unrelated updates
   - Decouple diagnostics HUD/FPS counter from heavy render loops
   - Prefer `requestAnimationFrame`-aligned updates for drag visuals

2. State updates
   - Introduce narrow Zustand selectors with shallow equality
   - Coalesce multiple state changes into single batched updates
   - Reduce derived computations in render paths

3. Network write path
   - Adaptive 16ms throttling for drag writes; coalesce intermediate positions
   - Ensure single Firestore collection listener (no per-shape listeners)
   - Maintain LWW semantics; measure writes/second to avoid flooding

## 6) Acceptance Criteria

1. Automated harness runs against production build complete successfully on Chromium and Firefox.
2. Harness gates fail when: median FPS < 60 OR shape sync ≥ 100ms OR cursor ≥ 50ms.
3. With 500+ objects and 5 simulated users, median FPS ≥ 60 during pan/zoom/drag.
4. No regression of collaboration features (locking, presence, sync correctness).
5. Diagnostics HUD remains lightweight and does not materially impact FPS.

## 7) Deliverables

- Optimized rendering, state, and sync code paths
- Updated tests and perf harness thresholds (no functional test regressions)
- Perf reports stored under `collabcanvas/test/perf/test-results/`
- Short engineering notes summarizing hotspots and applied optimizations

## 8) Risks & Mitigations

- Konva redraw bottlenecks → Layer caching and render isolation
- Excess store churn → Selector-based subscriptions, shallow compare
- Firestore write rate spikes → Throttle/coalesce writes; measure and cap
- Browser variance → Cross-browser harness runs in CI

## 9) Milestones

1. Rendering optimizations landed; FPS uplift verified (Story 1.2)
2. Store churn minimization and batching complete (Story 1.3)
3. Adaptive throttling and write coalescing (Story 1.4)
4. Stabilization pass and CI gates green across browsers


