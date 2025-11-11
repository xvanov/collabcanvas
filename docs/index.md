# CollabCanvas - Project Documentation Index

## Project Overview

**Type**: Monolith Web Application  
**Primary Language**: TypeScript  
**Architecture**: Component-based SPA with Firebase BaaS  

CollabCanvas is a real-time collaborative canvas application for construction professionals. Built with React 19, TypeScript, and Firebase, it enables multiple users to annotate construction plans, measure walls and rooms, and get instant material estimates with AI assistance.

## Quick Reference

- **Tech Stack**: React 19 + TypeScript + Vite + Firebase + Konva + Zustand
- **Entry Point**: `src/main.tsx`
- **Architecture Pattern**: Component-Based SPA with Firebase BaaS
- **Performance Targets**: 60 FPS, < 100ms shape sync, < 50ms cursor updates

## Generated Documentation

### Core Documentation

- [Project Overview](./project-overview.md) - Project summary, features, quick reference
- [Architecture Documentation](./architecture.md) - System architecture, patterns, data flow
- [Technology Stack](./technology-stack.md) - Detailed technology information and versions
- [Source Tree Analysis](./source-tree-analysis.md) - Complete directory structure and organization

### Technical Documentation

- [API Contracts](./api-contracts.md) - Firebase service interfaces and data contracts
- [Data Models](./data-models.md) - Database schemas and data relationships
- [State Management](./state-management.md) - Zustand store structure and state synchronization
- [Component Inventory](./component-inventory.md) - UI components catalog and organization

### Operational Documentation

- [Development Guide](./development-guide.md) - Setup, development workflow, testing
- [Deployment Guide](./deployment-guide.md) - Production deployment, CI/CD, monitoring

## Existing Documentation

The following documentation files exist in the project root (`collabcanvas/`):

### Setup and Configuration
- `README.md` - Main project readme with overview and getting started
- `FIREBASE-SETUP.md` - Firebase configuration guide
- `FIREBASE-STORAGE-SETUP.md` - Firebase Storage setup
- `AI-SETUP.md` - AI service setup documentation

### Deployment and Operations
- `DEPLOYMENT.md` - Production deployment guide
- `TESTING.md` - Testing guide with commands and AI test notes

### Feature Documentation (PR Summaries)
- `PR2-AUTHENTICATION.md` - PR #2: Authentication implementation
- `PR2-SUMMARY.md` - PR #2 summary
- `PR3-CANVAS-RENDERER.md` - PR #3: Canvas renderer implementation
- `PR3-SUMMARY.md` - PR #3 summary
- `PR4-SHAPE-CREATION.md` - PR #4: Shape creation implementation
- `PR4-SUMMARY.md` - PR #4 summary
- `PR5-FIRESTORE-SYNC.md` - PR #5: Firestore synchronization
- `PR6-PRESENCE-CURSORS.md` - PR #6: Presence and cursors
- `PR7-SHAPE-LOCKING.md` - PR #7: Shape locking
- `PR8-SECURITY-RULES.md` - PR #8: Security rules
- `PR9-OFFLINE-HANDLING.md` - PR #9: Offline handling
- `PR10-DEPLOYMENT.md` - PR #10: Deployment
- `PR11.md` - PR #11 documentation
- `PR11-SUMMARY.md` - PR #11 summary
- `PR12.md` - PR #12 documentation

### Reports
- `FINAL-VERIFICATION-REPORT.md` - Final verification report
- `BUG-FIXES-SUMMARY.md` - Bug fixes documentation

## Getting Started

### For Developers

1. **Read**: [Development Guide](./development-guide.md) for setup instructions
2. **Understand**: [Architecture Documentation](./architecture.md) for system design
3. **Explore**: [Component Inventory](./component-inventory.md) for UI components
4. **Review**: [State Management](./state-management.md) for state structure

### For AI-Assisted Development

When working on new features or modifications:

1. **Start Here**: [Project Overview](./project-overview.md) for project context
2. **Architecture**: [Architecture Documentation](./architecture.md) for system patterns
3. **APIs**: [API Contracts](./api-contracts.md) for service interfaces
4. **Data**: [Data Models](./data-models.md) for database schemas
5. **Components**: [Component Inventory](./component-inventory.md) for UI components
6. **State**: [State Management](./state-management.md) for state management

### For Brownfield PRD Creation

When creating a PRD for new features:

1. **Reference**: [Architecture Documentation](./architecture.md) for system constraints
2. **Review**: [API Contracts](./api-contracts.md) for existing service interfaces
3. **Check**: [Data Models](./data-models.md) for database schemas
4. **Identify**: [Component Inventory](./component-inventory.md) for reusable components
5. **Understand**: [State Management](./state-management.md) for state patterns

## Project Structure Summary

```
collabcanvas/
├── src/                    # Main source code
│   ├── components/        # React components (47 files)
│   ├── services/          # Firebase services (37 files)
│   ├── hooks/             # Custom hooks (11 files)
│   ├── store/             # Zustand store (6 files)
│   ├── pages/             # Page components (2 files)
│   ├── types/             # TypeScript types (3 files)
│   ├── utils/             # Utilities (8 files)
│   └── test/              # Test utilities (8 files)
├── functions/             # Cloud Functions
└── docs/                  # Generated documentation (this directory)
```

See [Source Tree Analysis](./source-tree-analysis.md) for complete structure.

## Key Technologies

- **React 19**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Konva**: Canvas rendering
- **Zustand**: State management
- **Firebase**: Backend services
  - Auth (Google OAuth)
  - Firestore (persistent data)
  - Realtime Database (ephemeral data)
  - Functions (serverless)
  - Storage (file storage)

## Architecture Highlights

- **Component-Based**: React component hierarchy
- **Centralized State**: Zustand store for all state
- **Real-time Sync**: Dual-database approach (Firestore + RTDB)
- **Offline Support**: Queue operations when offline
- **Performance**: 60 FPS target, optimized rendering

## Performance Targets

- **Canvas FPS**: 60 FPS during interactions
- **Shape Sync Latency**: < 100ms between users
- **Cursor Update Latency**: < 50ms
- **Concurrent Users**: Supports 10+ users per board

## Development Workflow

1. **Setup**: Follow [Development Guide](./development-guide.md)
2. **Develop**: Make changes, run tests (`npm test`)
3. **Test**: Run integration tests, performance tests
4. **Deploy**: Follow [Deployment Guide](./deployment-guide.md)

## Next Steps

- **New Features**: Reference architecture docs, API contracts, data models
- **Bug Fixes**: Check existing PR documentation for similar issues
- **Performance**: Review performance targets and optimization strategies
- **Deployment**: Follow deployment guide for production releases

## Documentation Status

**Last Updated**: 2025-11-06  
**Workflow Version**: 1.2.0  
**Scan Level**: Deep  
**Mode**: Initial Scan

All documentation generated from deep scan of codebase. For updates, re-run the document-project workflow.

---

**Note**: This index is the primary entry point for AI-assisted development. When working on this project, start here and reference the linked documentation as needed.





