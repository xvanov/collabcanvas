# Documentation Index

## Root Documents

### [Architecture](../architecture.md)

High-level system and client architecture, data flows, decisions, and testing strategy.

### [Product Requirements (MVP)](../prd.md)

MVP goals, core functional requirements, performance targets, and acceptance criteria.

### [Performance Optimization PRD](./prd-performance.md)

Focused plan to achieve 60 FPS and meet sync latency targets using rendering, state, and network optimizations validated by the perf harness.

## Stories

### [1.1 Performance Hardening](./stories/1.1.performance-hardening.md)

Automated performance harness, diagnostics HUD, and initial optimization validation.

### [1.2 Rendering Pipeline Optimization](./stories/1.2.rendering-optimization.md)

Memoization, Konva layer caching, and rAF-aligned updates to sustain 60 FPS.

### [1.3 State Update Optimization](./stories/1.3.state-update-optimization.md)

Zustand selector-based subscriptions, shallow comparisons, and batched updates.

### [1.4 Network Write Optimization](./stories/1.4.network-write-optimization.md)

Adaptive throttling/coalescing for drag writes, single listener enforcement, LWW semantics.
