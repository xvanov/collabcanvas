# CollabCanvas Documentation

**Type**: Monolith Web Application
**Stack**: React 19 + TypeScript + Vite + Firebase + Konva + Zustand
**Last Updated**: 2025-12-09 (Deep Scan)
**Lines of Code**: ~44,000 LOC

CollabCanvas is a real-time collaborative canvas application for construction professionals. It enables multiple users to annotate construction plans, measure walls and rooms, and get instant material estimates with AI assistance.

## Project Metrics

| Metric | Value |
|--------|-------|
| Components | 55+ |
| Services | 25+ |
| Custom Hooks | 8 |
| Zustand Stores | 5 |
| Cloud Functions | 6 |
| Test Files | 40+ |

---

## Quick Links

| Getting Started | Reference | Planning |
|----------------|-----------|----------|
| [Development Guide](./setup/development-guide.md) | [Architecture Overview](./architecture/overview.md) | [PRD](./product/PRD.md) |
| [Firebase Setup](./setup/firebase.md) | [API Contracts](./architecture/api-contracts.md) | [Epics](./product/epics.md) |
| [AI Services Setup](./setup/ai-services.md) | [Data Models](./architecture/data-models.md) | [Product Brief](./product/product-brief.md) |
| [Deployment Guide](./setup/deployment-guide.md) | [State Management](./architecture/state-management.md) | [Project Overview](./product/project-overview.md) |

---

## Documentation Structure

```
docs/
├── architecture/          # System design and technical reference
├── setup/                 # Development and deployment guides
├── product/               # PRD, epics, and product planning
├── tech-specs/            # Technical specifications by epic
├── ux/                    # UX design specifications
├── stories/               # User stories with context
├── sprint_artifacts/      # Current sprint work items
└── archive/               # Historical documentation
```

---

## Architecture

System design, patterns, and technical reference documentation.

- [Architecture Overview](./architecture/overview.md) - System architecture, patterns, data flow
- [API Contracts](./architecture/api-contracts.md) - Firebase service interfaces
- [Data Models](./architecture/data-models.md) - Database schemas and relationships
- [State Management](./architecture/state-management.md) - Zustand store structure
- [Component Inventory](./architecture/component-inventory.md) - UI components catalog
- [Source Tree Analysis](./architecture/source-tree-analysis.md) - Complete directory structure

---

## Setup Guides

Everything you need to get the project running.

- [Development Guide](./setup/development-guide.md) - Local setup and development workflow
- [Firebase Setup](./setup/firebase.md) - Firebase project configuration
- [AI Services Setup](./setup/ai-services.md) - OpenAI and pricing API integration
- [Deployment Guide](./setup/deployment-guide.md) - Production deployment
- [Technology Stack](./setup/technology-stack.md) - Detailed technology information
- [Environment Variables](./setup/DEPLOYMENT-ENV-VARS.md) - Required environment configuration

---

## Product Documentation

Product requirements and planning documents.

- [PRD](./product/PRD.md) - Full Product Requirements Document
- [Product Brief](./product/product-brief.md) - Product vision and summary
- [Project Overview](./product/project-overview.md) - High-level project summary
- [Epics](./product/epics.md) - Epic breakdown and roadmap
- [Deep Agent Estimator Plan](./product/Deep_Agent_Construction_Estimator_Project_Plan.md) - Construction estimator project plan
- [Clean Scapes P4P PRD](./product/prd-clean-scapes-p4p.md) - Pay-for-Performance rebuild PRD

---

## Technical Specifications

Detailed technical specs organized by epic.

- [Tech Spec (Main)](./tech-specs/tech-spec.md) - Overall technical specification
- [Epic 1 Tech Spec](./tech-specs/epic-1.md) - Four-view navigation, project management
- [Epic 2 Tech Spec](./tech-specs/epic-2.md) - AI annotation, canvas improvements
- [FieldPay Integration](./tech-specs/fieldpay-integration.md) - Payment system integration deep-dive
- [SageMaker API](./tech-specs/sagemaker-endpoint-api.md) - ML endpoint documentation
- [Test Design (Epic 1)](./tech-specs/test-design-epic-1.md) - Test strategy and cases

---

## UX Documentation

User experience design specifications.

- [UX Design Specification](./ux/ux-design-specification.md) - Complete UX spec
- [User Journey Flows](./ux/ux-user-journey-flows.md) - User flow documentation
- [Component Library Strategy](./ux/ux-component-library-strategy.md) - Component design system
- [Pattern Consistency Rules](./ux/ux-pattern-consistency-rules.md) - UI patterns guide
- [Responsive & Accessibility](./ux/ux-responsive-accessibility-strategy.md) - Responsive design strategy
- [Color Themes](./ux/ux-color-themes.html) - Theme color palette (HTML)
- [Design Directions](./ux/ux-design-directions.html) - Visual design exploration (HTML)

---

## Active Development

### Current Stories

Located in `stories/`:

| Story | Description |
|-------|-------------|
| [1-1](./stories/1-1-critical-bug-fixes-performance-optimization.md) | Critical Bug Fixes & Performance Optimization |
| [1-2](./stories/1-2-home-page-project-management-system.md) | Home Page & Project Management System |
| [1-3](./stories/1-3-four-view-navigation-scope-view.md) | Four-View Navigation & Scope View |
| [1-4](./stories/1-4-money-view-bom-pricing-margin-calculation-ai-chat-integration.md) | Money View, BOM, Pricing, AI Chat |
| [2-1](./stories/2-1-project-isolation-canvas-bom-per-project.md) | Project Isolation & Canvas BOM |
| [2-2](./stories/2-2-ai-powered-automatic-annotation-with-bounding-box-tool.md) | AI-Powered Automatic Annotation |

### Sprint Artifacts

Located in `sprint_artifacts/`:

- FieldPay Integration Stories (1-6)
- [Sprint Status](./sprint_artifacts/sprint-status.yaml)

---

## Key Technologies

| Category | Technology | Version |
|----------|------------|---------|
| UI Framework | React | 19.x |
| Language | TypeScript | 5.x |
| Build Tool | Vite | 5.x |
| Canvas | Konva | Latest |
| State | Zustand | 5.x |
| Auth | Firebase Auth | 12.x |
| Database | Firestore + RTDB | 12.x |
| Functions | Firebase Functions | 4.x |

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Canvas FPS | 60 FPS during interactions |
| Shape Sync Latency | < 100ms between users |
| Cursor Update Latency | < 50ms |
| Concurrent Users | 10+ per board |

---

## For AI-Assisted Development

When working on new features:

1. **Start**: [Project Overview](./product/project-overview.md)
2. **Architecture**: [Architecture Overview](./architecture/overview.md)
3. **APIs**: [API Contracts](./architecture/api-contracts.md)
4. **Data**: [Data Models](./architecture/data-models.md)
5. **Components**: [Component Inventory](./architecture/component-inventory.md)
6. **State**: [State Management](./architecture/state-management.md)

---

## Archive

Historical documentation preserved for reference:

- `archive/validation-reports/` - Workflow validation reports
- `archive/legacy-stories/` - Completed stories
- `archive/TESTING-GUIDE-*.md` - Old testing guides
- `archive/*.md` - Debug notes and one-time fixes

---

**Note**: This documentation was reorganized on 2025-12-09. The previous `docs-old/` directory has been archived to `docs-archive/docs-old-20251209/`.
