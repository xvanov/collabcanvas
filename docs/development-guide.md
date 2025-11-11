# Development Guide

## Prerequisites

### Required Software

- **Node.js**: Version 18 or higher
- **npm**: Latest version (comes with Node.js)
- **Firebase CLI**: For deployment and emulator management
  ```bash
  npm install -g firebase-tools
  ```

### Firebase Project Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable the following services:
   - **Authentication**: Google sign-in provider
   - **Firestore Database**: NoSQL document database
   - **Realtime Database**: Low-latency real-time data
   - **Cloud Functions**: Serverless functions
   - **Storage**: File storage for images
   - **Hosting**: Static web hosting

## Installation

### 1. Clone and Navigate

```bash
cd collabcanvas
```

### 2. Install Dependencies

```bash
npm install
```

This installs all frontend dependencies including:
- React 19
- TypeScript
- Vite
- Konva
- Zustand
- Firebase SDK
- Testing libraries

### 3. Install Cloud Functions Dependencies

```bash
cd functions
npm install
cd ..
```

### 4. Set Up Environment Variables

Create a `.env` file in the project root:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com

# Optional: Use Firebase emulators for local development
VITE_USE_FIREBASE_EMULATORS=false
```

**To get Firebase config values:**
1. Go to Firebase Console → Project Settings
2. Scroll to "Your apps" section
3. Click on your web app or create one
4. Copy the config values

### 5. Configure Firebase Project

Update `.firebaserc` (create if it doesn't exist):

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

## Environment Setup

### Development Environment

1. **Firebase Emulators** (recommended for local development):
   ```bash
   firebase emulators:start
   ```
   This starts:
   - Auth emulator (port 9099)
   - Firestore emulator (port 8080)
   - Realtime Database emulator (port 9000)
   - Functions emulator (port 5001)
   - Storage emulator (port 9199)
   - Emulator UI (port 4000)

2. **Set environment variable**:
   ```bash
   export VITE_USE_FIREBASE_EMULATORS=true
   ```
   Or add to `.env`:
   ```
   VITE_USE_FIREBASE_EMULATORS=true
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```
   Opens at `http://localhost:5173`

### Production Environment

1. **Build for production**:
   ```bash
   npm run build:production
   ```
   Creates optimized bundle in `dist/` directory

2. **Preview production build**:
   ```bash
   npm run preview
   ```
   Opens at `http://localhost:4173`

## Available Scripts

### Development

- **`npm run dev`**: Start Vite development server
  - Hot module replacement (HMR)
  - Fast refresh
  - Source maps enabled

### Building

- **`npm run build`**: Build for production (development mode)
  - TypeScript compilation
  - Vite bundling
  - Output: `dist/`

- **`npm run build:production`**: Build for production (production mode)
  - Optimized minification
  - Code splitting
  - Output: `dist/`

- **`npm run preview`**: Preview production build locally

### Testing

- **`npm test`**: Run all tests (including AI service tests)
  - Uses Vitest
  - Runs all `*.test.ts` and `*.test.tsx` files

- **`npm run test:watch`**: Run tests in watch mode
  - Watches for file changes
  - Re-runs affected tests

- **`npm run test:ui`**: Run tests with UI interface
  - Interactive test runner
  - Visual test results

- **`npm run test:ci`**: Run tests for CI/CD (excludes AI tests)
  - Sets `SKIP_AI_TESTS=true`
  - Use for automated pipelines

- **`npm run test:ai`**: Run only AI service tests
  - Tests AI command processing

- **`npm run test:perf`**: Run performance harness tests
  - Uses Playwright
  - Tests FPS and latency targets
  - Requires Firebase emulators running

### Linting

- **`npm run lint`**: Run ESLint
  - TypeScript-aware linting
  - React-specific rules
  - Auto-fix available: `npm run lint -- --fix`

### Deployment

- **`npm run deploy`**: Deploy to Firebase Hosting
  - Builds production bundle
  - Deploys to Firebase Hosting
  - Equivalent to: `npm run build:production && firebase deploy --only hosting`

- **`npm run deploy:rules`**: Deploy security rules only
  - Deploys Firestore and Realtime Database rules
  - Equivalent to: `firebase deploy --only firestore:rules,database:rules`

## Local Development Workflow

### 1. Start Firebase Emulators

```bash
# Terminal 1: Start emulators
firebase emulators:start
```

### 2. Start Development Server

```bash
# Terminal 2: Start dev server
VITE_USE_FIREBASE_EMULATORS=true npm run dev
```

### 3. Run Tests (Optional)

```bash
# Terminal 3: Run tests in watch mode
npm run test:watch
```

### 4. Access Application

- **App**: `http://localhost:5173`
- **Emulator UI**: `http://localhost:4000`

## Testing Approach

### Unit Tests

- **Framework**: Vitest
- **Location**: Co-located with source files (`*.test.ts`, `*.test.tsx`)
- **Coverage**: Components, services, hooks, utilities

### Integration Tests

- **Location**: `src/test/*.integration.test.ts`
- **Tests**: Layer management, material estimation, offline handling
- **Requires**: Firebase emulators running

### Performance Tests

- **Framework**: Playwright
- **Location**: `test/perf/`
- **Tests**: FPS targets, latency targets, load testing
- **Requires**: 
  1. Firebase emulators running
  2. Production build preview running
  3. Execute: `PERF_BASE_URL=http://127.0.0.1:4173 npm run test:perf`

### Test Structure

```
src/
├── components/
│   ├── Component.tsx
│   └── Component.test.tsx      # Component tests
├── services/
│   ├── service.ts
│   └── service.test.ts         # Service tests
└── test/
    ├── integration.test.ts     # Integration tests
    └── performance/            # Performance tests
```

## Common Development Tasks

### Adding a New Component

1. Create component file: `src/components/NewComponent.tsx`
2. Create test file: `src/components/NewComponent.test.tsx`
3. Export from component directory if needed
4. Import and use in parent component

### Adding a New Service

1. Create service file: `src/services/newService.ts`
2. Create test file: `src/services/newService.test.ts`
3. Export service functions
4. Import and use in components or store

### Adding a New Hook

1. Create hook file: `src/hooks/useNewHook.ts`
2. Create test file: `src/hooks/useNewHook.test.ts`
3. Export hook
4. Use in components

### Updating Store State

1. Add state to `CanvasState` interface in `canvasStore.ts`
2. Add actions to store
3. Update components to use new state/actions

## Debugging

### Browser DevTools

- **React DevTools**: Inspect component tree and props
- **Redux DevTools**: Zustand store inspection (via browser extension)
- **Console**: Check for errors and warnings
- **Network Tab**: Monitor Firebase requests

### Performance Debugging

- **FPS Counter**: Visible in toolbar (should maintain 60 FPS)
- **Diagnostics HUD**: Press `Shift+D` or add `?diagnostics=1` to URL
- **Performance Harness**: Run `npm run test:perf` for automated testing

### Firebase Debugging

- **Emulator UI**: `http://localhost:4000` - View emulator data
- **Firestore Data**: Check emulator UI → Firestore
- **Realtime Database**: Check emulator UI → Realtime Database
- **Functions Logs**: Check emulator UI → Functions or `firebase functions:log`

## Code Quality

### TypeScript

- **Strict Mode**: Enabled
- **Type Checking**: `npx tsc --noEmit` (runs during build)
- **Type Coverage**: Aim for 100% type coverage

### ESLint

- **Configuration**: `eslint.config.js`
- **Rules**: TypeScript-aware, React-specific
- **Auto-fix**: `npm run lint -- --fix`

### Code Style

- **Formatting**: Prettier (if configured)
- **Naming**: camelCase for variables/functions, PascalCase for components
- **File Organization**: One component/service per file

## Troubleshooting

### Build Errors

- **TypeScript Errors**: Check `tsconfig.json` configuration
- **Dependency Issues**: Delete `node_modules` and `package-lock.json`, then `npm install`
- **Firebase Config**: Verify `.env` file has all required variables

### Runtime Errors

- **Firebase Connection**: Check emulator is running or production config is correct
- **Authentication**: Verify Firebase Auth is enabled and Google provider is configured
- **CORS Issues**: Check Firebase hosting configuration

### Test Failures

- **AI Tests**: Set `SKIP_AI_TESTS=true` for CI/CD
- **Integration Tests**: Ensure Firebase emulators are running
- **Performance Tests**: Ensure production build is running on preview port

## Contributing

### Development Workflow

1. Create feature branch from `main`
2. Make changes
3. Add tests for new features
4. Ensure all tests pass: `npm test`
5. Ensure linting passes: `npm run lint`
6. Build successfully: `npm run build`
7. Submit pull request

### Code Review Checklist

- [ ] All tests pass
- [ ] Linting passes
- [ ] TypeScript compiles without errors
- [ ] New features have tests
- [ ] Documentation updated if needed
- [ ] Performance targets met (60 FPS, < 100ms latency)

## Next Steps

After setting up the development environment:

1. Review the [Architecture Documentation](./architecture.md)
2. Explore the [Component Inventory](./component-inventory.md)
3. Understand the [State Management](./state-management.md)
4. Check the [API Contracts](./api-contracts.md)
5. Review [Data Models](./data-models.md)






