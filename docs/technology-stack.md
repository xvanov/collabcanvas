# Technology Stack

## Overview

CollabCanvas is a modern web application built with React 19, TypeScript, and Firebase as the backend-as-a-service platform. The application uses Konva for canvas rendering and Zustand for state management.

## Technology Stack Table

| Category | Technology | Version | Justification |
|----------|-----------|---------|----------------|
| **Language** | TypeScript | ~5.9.3 | Type safety, better developer experience, modern ES2022 features |
| **Frontend Framework** | React | ^19.2.0 | Component-based UI, excellent ecosystem, latest React features |
| **Build Tool** | Vite | ^7.1.7 | Fast development server, optimized production builds, ES modules |
| **Canvas Library** | Konva | ^10.0.2 | High-performance 2D canvas rendering, React integration via react-konva |
| **React Canvas Binding** | react-konva | ^19.0.10 | Declarative React components for Konva canvas |
| **State Management** | Zustand | ^5.0.8 | Lightweight, simple API, no boilerplate, excellent TypeScript support |
| **Styling** | Tailwind CSS | ^3.4.18 | Utility-first CSS, rapid UI development, consistent design system |
| **CSS Processing** | PostCSS | ^8.5.6 | CSS transformation pipeline for Tailwind |
| **Autoprefixer** | autoprefixer | ^10.4.21 | Automatic vendor prefixing for CSS |
| **Backend Platform** | Firebase | ^12.4.0 | Complete BaaS solution (Auth, Firestore, Realtime DB, Functions, Storage) |
| **Authentication** | Firebase Auth | ^12.4.0 | Google OAuth, secure user management |
| **Database (Persistent)** | Cloud Firestore | ^12.4.0 | NoSQL document database for shapes, layers, board state |
| **Database (Real-time)** | Realtime Database | ^12.4.0 | Low-latency presence, cursors, shape locks |
| **Cloud Functions** | Firebase Functions | ^4.8.0 | Serverless functions for AI commands, material estimation |
| **Storage** | Firebase Storage | ^12.4.0 | File storage for background images |
| **AI Service** | OpenAI API | ^4.20.0 | GPT-3.5-turbo for natural language canvas commands |
| **Schema Validation** | Zod | ^3.22.0 | Runtime type validation for Cloud Functions |
| **Testing Framework** | Vitest | ^3.2.4 | Fast unit testing, Vite-native, Jest-compatible API |
| **Testing Utilities** | React Testing Library | ^16.3.0 | Component testing utilities, accessibility-focused |
| **Test Environment** | jsdom | ^27.0.0 | DOM simulation for testing React components |
| **E2E Testing** | Playwright | ^1.50.0 | Cross-browser end-to-end testing, performance harness |
| **Linting** | ESLint | ^9.36.0 | Code quality, React-specific rules, TypeScript support |
| **Type Checking** | TypeScript ESLint | ^8.45.0 | TypeScript-aware linting rules |

## Architecture Pattern

**Component-Based SPA with Firebase BaaS**

- **Frontend**: Single-page application (SPA) with React component hierarchy
- **State Management**: Centralized Zustand store with reactive updates
- **Backend**: Firebase Backend-as-a-Service (BaaS) - no custom server required
- **Real-time Sync**: Dual-database approach:
  - Firestore for persistent data (shapes, layers, board state)
  - Realtime Database for ephemeral data (presence, cursors, locks)
- **Canvas Rendering**: Konva for high-performance 2D graphics
- **Deployment**: Firebase Hosting with static asset optimization

## Development Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| npm | Latest | Package manager |
| Firebase CLI | ^14.19.1 | Firebase deployment and emulator management |
| Firebase Emulators | Latest | Local development environment |

## Build Configuration

- **Target**: ES2022
- **Module System**: ESNext (ES modules)
- **JSX**: React JSX transform
- **Strict Mode**: Enabled (TypeScript strict checks)
- **Code Splitting**: Vendor chunks (React, Firebase, Konva, Zustand)
- **Source Maps**: Disabled in production

## Browser Support

- Chrome/Chromium 120+
- Firefox 121+
- Safari 17+
- Edge 120+

## Performance Targets

- **Canvas FPS**: 60 FPS during interactions
- **Shape Sync Latency**: < 100ms between users
- **Cursor Update Latency**: < 50ms
- **Concurrent Users**: Supports 10+ users per board

