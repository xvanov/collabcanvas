# Project Overview

## Project Name

CollabCanvas - Construction Plan Annotation Tool

## Purpose

Real-time collaborative canvas application for construction professionals. Upload construction plans, measure walls and rooms, and get instant material estimates with AI assistance.

## Project Type

**Web Application** - Single-page application (SPA)

**Repository Type**: Monolith (single cohesive codebase)

**Architecture**: Component-based SPA with Firebase BaaS

## Technology Stack Summary

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 19, TypeScript, Vite |
| **Canvas** | Konva, react-konva |
| **State** | Zustand |
| **Backend** | Firebase (Auth, Firestore, RTDB, Functions, Storage) |
| **Styling** | Tailwind CSS |
| **Testing** | Vitest, React Testing Library, Playwright |

See [Technology Stack](./technology-stack.md) for detailed information.

## Key Features

### Core Collaboration
- 🔐 **Google Authentication** - Secure sign-in with Firebase Auth
- 🎨 **Real-time Collaboration** - Multiple users can annotate together simultaneously
- 👁️ **Live Presence** - See who's online with live cursors
- 🔒 **Shape Locking** - Prevent conflicts with automatic shape locking
- ⚡ **60 FPS Performance** - Smooth pan, zoom, and drawing operations

### Construction Annotation Tools
- 📐 **Plan Upload** - Upload PNG/JPG construction plans as canvas background
- 📏 **Scale Tool** - Set reference measurements for accurate calculations
- 📊 **Polyline Tool** - Measure wall lengths with click-to-click drawing
- 🏠 **Polygon Tool** - Calculate room areas with polygon drawing
- 📋 **Measurement Display** - Real-time length and area calculations
- 📈 **Layer Totals** - Automatic summation of all measurements per layer
- 🎯 **Material Estimation** - AI-powered material calculations

## Architecture Type

**Component-Based SPA with Firebase BaaS**

- Single-page application with React component hierarchy
- Centralized state management with Zustand
- Firebase Backend-as-a-Service (no custom server)
- Dual-database approach:
  - Firestore for persistent data (shapes, layers, board state)
  - Realtime Database for ephemeral data (presence, cursors, locks)

See [Architecture Documentation](./architecture.md) for detailed information.

## Repository Structure

**Single-Part Monolith**

- `src/` - Main source code
  - `components/` - React components (47 files)
  - `services/` - Firebase services and business logic (37 files)
  - `hooks/` - Custom React hooks (11 files)
  - `store/` - Zustand state management (6 files)
  - `pages/` - Page components (2 files)
  - `types/` - TypeScript type definitions (3 files)
  - `utils/` - Utility functions (8 files)
  - `data/` - Static data files (3 files)
  - `test/` - Test utilities (8 files)
- `functions/` - Firebase Cloud Functions
- `public/` - Static assets
- `dist/` - Production build output

See [Source Tree Analysis](./source-tree-analysis.md) for detailed structure.

## Entry Points

- **Application Entry**: `src/main.tsx`
- **Root Component**: `src/App.tsx`
- **Main Page**: `src/pages/Board.tsx`
- **Cloud Functions**: `functions/src/index.ts`

## Quick Reference

### Tech Stack
- **Language**: TypeScript (~5.9.3)
- **Framework**: React (^19.2.0)
- **Build Tool**: Vite (^7.1.7)
- **Canvas**: Konva (^10.0.2)
- **State**: Zustand (^5.0.8)
- **Backend**: Firebase (^12.4.0)

### Architecture Pattern
- Component-based SPA
- Firebase BaaS
- Real-time collaboration
- Offline support

### Performance Targets
- **Canvas FPS**: 60 FPS during interactions
- **Shape Sync Latency**: < 100ms between users
- **Cursor Update Latency**: < 50ms
- **Concurrent Users**: Supports 10+ users per board

## Links to Detailed Documentation

- [Technology Stack](./technology-stack.md) - Detailed technology information
- [Architecture Documentation](./architecture.md) - System architecture
- [API Contracts](./api-contracts.md) - Firebase service interfaces
- [Data Models](./data-models.md) - Database schemas
- [State Management](./state-management.md) - Zustand store structure
- [Component Inventory](./component-inventory.md) - UI components
- [Source Tree Analysis](./source-tree-analysis.md) - Directory structure
- [Development Guide](./development-guide.md) - Setup and development
- [Deployment Guide](./deployment-guide.md) - Production deployment

## Getting Started

1. **Install Dependencies**: `npm install`
2. **Set Up Firebase**: Configure `.env` file with Firebase credentials
3. **Start Development**: `npm run dev`
4. **Run Tests**: `npm test`

See [Development Guide](./development-guide.md) for detailed setup instructions.

## Project Status

**Active Development** - MVP completed, additional features in progress

### Completed Features
- ✅ Google Authentication
- ✅ Real-time collaboration
- ✅ Live presence & cursors
- ✅ Shape locking
- ✅ Layer system
- ✅ Undo/redo
- ✅ Offline handling
- ✅ 60 FPS performance
- ✅ Security rules
- ✅ Export (PNG/SVG)
- ✅ Construction annotation tools
- ✅ Material estimation

### In Progress
- 🚧 Enhanced layer system
- 🚧 Additional AI features

## Browser Support

- Chrome/Chromium 120+
- Firefox 121+
- Safari 17+
- Edge 120+

## License

MIT

