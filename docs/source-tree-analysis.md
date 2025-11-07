# Source Tree Analysis

## Overview

CollabCanvas follows a clean, modular architecture with clear separation of concerns. The codebase is organized into logical directories: components, services, hooks, store, pages, types, utils, and test utilities.

## Directory Structure

```
collabcanvas/
├── src/                          # Main source directory
│   ├── main.tsx                 # Entry point - React app initialization
│   ├── App.tsx                   # Root component - Auth guard and routing
│   ├── App.css                   # Global app styles
│   ├── index.css                 # Base CSS styles
│   │
│   ├── pages/                    # Page-level components
│   │   ├── Login.tsx            # Login page (Google OAuth)
│   │   └── Board.tsx            # Main canvas board page
│   │
│   ├── components/               # Reusable UI components (47 files)
│   │   ├── Canvas.tsx           # Main Konva canvas component
│   │   ├── Shape.tsx            # Shape rendering component
│   │   ├── Toolbar.tsx          # Top navigation toolbar
│   │   ├── LayersPanel.tsx      # Layer management panel
│   │   ├── ShapePropertiesPanel.tsx # Properties editor
│   │   ├── MaterialEstimationPanel.tsx # Material estimation UI
│   │   ├── AlignmentToolbar.tsx # Alignment tools
│   │   ├── CursorOverlay.tsx    # User cursor overlay
│   │   ├── LockOverlay.tsx      # Shape lock overlay
│   │   ├── SelectionBox.tsx     # Drag selection box
│   │   ├── TransformControls.tsx # Transform handles
│   │   ├── SnapIndicators.tsx   # Snap-to-grid indicators
│   │   ├── FPSCounter.tsx       # FPS display
│   │   ├── ZoomIndicator.tsx    # Zoom level display
│   │   ├── MeasurementDisplay.tsx # Measurement display
│   │   ├── MeasurementInput.tsx # Measurement input dialog
│   │   ├── ExportDialog.tsx     # Export dialog
│   │   ├── AIClarificationDialog.tsx # AI clarification dialog
│   │   ├── MaterialDialogueBox.tsx # Material dialogue
│   │   ├── FileUpload.tsx       # File upload component
│   │   ├── ColorPicker.tsx      # Color picker
│   │   ├── TextEditor.tsx       # Text editor
│   │   ├── SizeEditor.tsx       # Size editor
│   │   ├── AICommandInput.tsx   # AI command input
│   │   ├── UnifiedAIChat.tsx    # Unified AI chat interface
│   │   ├── AuthButton.tsx       # Authentication button
│   │   ├── ShortcutsHelp.tsx    # Keyboard shortcuts help
│   │   ├── DiagnosticsHud.tsx  # Performance diagnostics HUD
│   │   ├── ScaleLine.tsx        # Scale line visualization
│   │   ├── ScaleTool.tsx        # Scale tool component
│   │   ├── PolylineTool.tsx     # Polyline drawing tool
│   │   ├── PolygonTool.tsx      # Polygon drawing tool
│   │   └── [test files]         # Component test files
│   │
│   ├── services/                 # Business logic and Firebase integration (37 files)
│   │   ├── firebase.ts          # Firebase initialization and config
│   │   ├── firestore.ts         # Firestore operations (shapes, layers, board)
│   │   ├── rtdb.ts              # Realtime Database operations (presence, locks)
│   │   ├── storage.ts           # Firebase Storage operations
│   │   ├── aiService.ts         # AI command processing service
│   │   ├── aiCommandExecutor.ts # AI command execution
│   │   ├── aiDialogueService.ts # AI dialogue management
│   │   ├── materialService.ts   # Material estimation service
│   │   ├── materialAIService.ts # AI-powered material estimation
│   │   ├── pricingService.ts   # Home Depot pricing integration
│   │   ├── shapeService.ts      # Shape creation utilities
│   │   ├── layerService.ts      # Layer management service
│   │   ├── historyService.ts    # Undo/redo history service
│   │   ├── exportService.ts     # Canvas export service
│   │   ├── alignmentService.ts  # Alignment and distribution
│   │   ├── gridService.ts       # Grid and snap service
│   │   ├── measurementService.ts # Measurement calculations
│   │   ├── unitConversion.ts    # Unit conversion utilities
│   │   ├── trimEstimateService.ts # Trim estimation
│   │   ├── offline.ts           # Offline queue management
│   │   ├── calculators/         # Material calculation engines
│   │   │   ├── wallCalculator.ts # Wall framing calculations
│   │   │   └── floorCalculator.ts # Floor coating calculations
│   │   └── [test files]         # Service test files
│   │
│   ├── hooks/                    # Custom React hooks (11 files)
│   │   ├── useAuth.ts           # Authentication hook
│   │   ├── useShapes.ts         # Shape management hook
│   │   ├── useLayers.ts         # Layer management hook
│   │   ├── useLocks.ts          # Lock management hook
│   │   ├── usePresence.ts       # Presence management hook
│   │   ├── useOffline.ts        # Offline state hook
│   │   ├── useKeyboardShortcuts.ts # Keyboard shortcuts hook
│   │   └── [test files]         # Hook test files
│   │
│   ├── store/                    # Zustand state management (6 files)
│   │   ├── canvasStore.ts       # Main application store
│   │   └── [test files]         # Store test files
│   │
│   ├── types/                    # TypeScript type definitions (3 files)
│   │   ├── types.ts             # Core types (shapes, actions, AI, etc.)
│   │   ├── material.ts          # Material estimation types
│   │   ├── dialogue.ts          # AI dialogue types
│   │   └── perfHarness.d.ts     # Performance harness types
│   │
│   ├── utils/                    # Utility functions (8 files)
│   │   ├── viewport.ts          # Viewport math utilities
│   │   ├── fps.ts               # FPS calculation utilities
│   │   ├── throttle.ts           # Throttle/debounce utilities
│   │   ├── colors.ts            # Color manipulation utilities
│   │   ├── harness.ts           # Performance harness utilities
│   │   └── [test files]         # Utility test files
│   │
│   ├── data/                     # Static data files (3 files)
│   │   ├── materials.ts          # Material definitions
│   │   ├── insulationMaterials.ts # Insulation material data
│   │   └── defaultAssumptions.ts # Default construction assumptions
│   │
│   ├── test/                     # Test utilities and integration tests (8 files)
│   │   ├── setup.ts             # Test setup configuration
│   │   ├── mocks/               # Mock implementations
│   │   │   └── firebase.ts      # Firebase mocks
│   │   ├── performance/         # Performance tests
│   │   │   ├── ai-performance.spec.ts # AI performance tests
│   │   │   └── playwright.perf.config.ts # Playwright config
│   │   ├── layer.integration.test.ts # Layer integration tests
│   │   ├── material.integration.test.ts # Material integration tests
│   │   ├── offline-handling.test.ts # Offline handling tests
│   │   └── security-rules-logic.test.ts # Security rules tests
│   │
│   └── assets/                   # Static assets
│       └── react.svg             # React logo
│
├── functions/                    # Firebase Cloud Functions
│   ├── src/                      # TypeScript source
│   │   ├── index.ts              # Functions entry point
│   │   ├── aiCommand.ts         # AI command function
│   │   ├── materialEstimateCommand.ts # Material estimation function
│   │   └── pricing.ts            # Pricing function
│   ├── lib/                      # Compiled JavaScript
│   ├── package.json              # Functions dependencies
│   └── tsconfig.json             # TypeScript config
│
├── public/                       # Public static files
│   ├── index.html                # HTML template
│   └── vite.svg                  # Vite logo
│
├── test/                         # Performance test harness
│   └── perf/                     # Performance test configuration
│       └── playwright.perf.config.ts
│
├── dist/                         # Production build output (generated)
├── node_modules/                  # Dependencies (generated)
│
├── package.json                  # Main project dependencies
├── tsconfig.json                 # TypeScript configuration
├── tsconfig.app.json             # App-specific TypeScript config
├── tsconfig.node.json            # Node-specific TypeScript config
├── vite.config.ts                # Vite build configuration
├── vitest.config.ts              # Vitest test configuration
├── vitest.setup.ts               # Vitest setup file
├── tailwind.config.js            # Tailwind CSS configuration
├── postcss.config.js             # PostCSS configuration
├── eslint.config.js              # ESLint configuration
├── firebase.json                 # Firebase configuration
├── firestore.rules              # Firestore security rules
├── firestore.indexes.json        # Firestore indexes
├── database.rules.json          # Realtime Database security rules
├── storage.rules                 # Storage security rules
└── README.md                     # Project documentation
```

## Critical Directories

### Entry Points

- **`src/main.tsx`**: Application entry point - initializes React app
- **`src/App.tsx`**: Root component - handles authentication guard
- **`src/pages/Board.tsx`**: Main canvas page - protected route

### Core Functionality

- **`src/components/Canvas.tsx`**: Main canvas rendering component
- **`src/store/canvasStore.ts`**: Centralized state management
- **`src/services/firestore.ts`**: Firestore data operations
- **`src/services/rtdb.ts`**: Realtime Database operations

### Integration Points

- **Firebase Services**: `src/services/firebase.ts` - Firebase initialization
- **Cloud Functions**: `functions/src/index.ts` - Serverless functions entry
- **Authentication**: `src/hooks/useAuth.ts` - Auth state management

## File Organization Patterns

### Component Organization
- One component per file
- Test files co-located with components (`*.test.tsx`)
- Related components grouped logically

### Service Organization
- One service per file
- Related services grouped in subdirectories (`calculators/`)
- Test files co-located (`*.test.ts`)

### Type Organization
- Core types in `types.ts`
- Domain-specific types in separate files (`material.ts`, `dialogue.ts`)
- Type definitions exported for reuse

### Test Organization
- Unit tests co-located with source files
- Integration tests in `test/` directory
- Performance tests in `test/performance/`
- Mock implementations in `test/mocks/`

## Key Files by Functionality

### Canvas Rendering
- `src/components/Canvas.tsx` - Main canvas
- `src/components/Shape.tsx` - Shape rendering
- `src/utils/viewport.ts` - Viewport calculations

### State Management
- `src/store/canvasStore.ts` - Zustand store
- `src/services/historyService.ts` - Undo/redo

### Real-time Collaboration
- `src/services/firestore.ts` - Persistent data sync
- `src/services/rtdb.ts` - Ephemeral data sync
- `src/hooks/usePresence.ts` - Presence management
- `src/hooks/useLocks.ts` - Lock management

### Construction Tools
- `src/components/PolylineTool.tsx` - Wall measurement tool
- `src/components/PolygonTool.tsx` - Room area tool
- `src/components/ScaleTool.tsx` - Scale reference tool
- `src/services/measurementService.ts` - Measurement calculations

### Material Estimation
- `src/services/materialService.ts` - Material calculations
- `src/services/materialAIService.ts` - AI-powered estimation
- `src/services/calculators/wallCalculator.ts` - Wall framing
- `src/services/calculators/floorCalculator.ts` - Floor coatings

### AI Features
- `src/services/aiService.ts` - AI command processing
- `src/services/aiCommandExecutor.ts` - Command execution
- `src/components/UnifiedAIChat.tsx` - AI chat interface
- `functions/src/aiCommand.ts` - Cloud Function handler

## Integration Architecture

### Frontend → Backend Flow

1. **User Action** → Component Event Handler
2. **Component** → Store Action (`canvasStore`)
3. **Store** → Service Method (`firestore.ts`, `rtdb.ts`)
4. **Service** → Firebase SDK Call
5. **Firebase** → Cloud Function (if needed)
6. **Firebase** → Real-time Subscription Callback
7. **Callback** → Store Update
8. **Store** → Component Re-render

### Data Flow

- **Persistent Data**: Component → Store → Firestore → Subscription → Store → Component
- **Ephemeral Data**: Component → Store → RTDB → Subscription → Store → Component
- **Offline Queue**: Component → Store → Local Queue → Firestore (when online)

## Build Output

- **`dist/`**: Production build output
  - `index.html` - Entry HTML
  - `assets/` - Bundled JavaScript and CSS
  - Optimized chunks (vendor, firebase, konva, zustand)

## Configuration Files

- **`vite.config.ts`**: Build configuration, code splitting
- **`tsconfig.json`**: TypeScript compiler options
- **`tailwind.config.js`**: Tailwind CSS configuration
- **`firebase.json`**: Firebase project configuration
- **`firestore.rules`**: Firestore security rules
- **`database.rules.json`**: Realtime Database security rules

## Test Structure

- **Unit Tests**: Co-located with source files (`*.test.ts`, `*.test.tsx`)
- **Integration Tests**: `src/test/*.integration.test.ts`
- **Performance Tests**: `test/perf/*.spec.ts`
- **Test Utilities**: `src/test/setup.ts`, `src/test/mocks/`

## Asset Organization

- **Static Assets**: `public/` - Served as-is
- **Component Assets**: `src/assets/` - Imported in components
- **Build Assets**: `dist/assets/` - Generated during build

