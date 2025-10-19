# CollabCanvas - Construction Plan Annotation Tool

Real-time collaborative canvas application for construction professionals. Upload plans, measure walls and rooms, and get instant material estimates with AI assistance.

## Features

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
- 🎯 **Material Estimation** - AI-powered material calculations (coming in PR-4)

## Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Canvas**: Konva + react-konva
- **State Management**: Zustand
- **Backend**: Firebase (Auth, Firestore, Realtime Database)
- **Styling**: Tailwind CSS
- **Testing**: Vitest + React Testing Library

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project (see [Firebase Console](https://console.firebase.google.com/))

### Installation

1. **Clone the repository:**
   ```bash
   cd collabcanvas
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   
   Create a `.env` file in the root directory:
   ```bash
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   
   # Optional: Use Firebase emulators for local development
   VITE_USE_FIREBASE_EMULATORS=false
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:5173`

### Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Google Authentication in Firebase Console → Authentication → Sign-in method
3. Enable Firestore Database in Firebase Console → Firestore Database
4. Enable Realtime Database in Firebase Console → Realtime Database
5. Copy your Firebase config to the `.env` file

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with UI
- `npm run lint` - Lint code

## Project Structure

```
src/
├── components/      # Reusable UI components
│   ├── AuthButton.tsx
│   ├── Canvas.tsx
│   ├── FPSCounter.tsx
│   └── Toolbar.tsx
├── hooks/          # Custom React hooks
│   └── useAuth.ts
├── pages/          # Page components
│   ├── Login.tsx
│   └── Board.tsx
├── services/       # Firebase services
│   ├── firebase.ts
│   ├── firestore.ts
│   └── rtdb.ts
├── test/           # Test utilities and mocks
│   ├── setup.ts
│   └── mocks/
├── utils/          # Utility functions
│   ├── fps.ts
│   └── viewport.ts
├── types.ts        # TypeScript type definitions
├── App.tsx         # Main app component
└── main.tsx        # Entry point
```

## How to Use

### Quick Start
1. **Sign in** with your Google account
2. **Upload** a construction plan (PNG/JPG)
3. **Set scale** using Tools > Scale Tool (click two points of known distance)
4. **Measure walls** with Shapes > Polyline (Wall Measurement)
5. **Measure rooms** with Shapes > Polygon (Room Area)
6. **View totals** in Advanced > Layers Panel

### Workflow Example
```
1. Upload floor plan image
2. Set scale: Click two ends of a 10-foot wall, enter "10 feet"
3. Create "Walls" layer
4. Use Polyline tool to trace all walls → See total linear feet
5. Create "Floors" layer  
6. Use Polygon tool to outline rooms → See total square footage
7. Export measurements or share with team
```

## Development Progress

### ✅ Completed PRs

**Construction Annotation Tool MVP:**
- **PR-1**: Document Upload & Scale Foundation ✅
  - Image upload (PNG/JPG)
  - Scale reference tool
  - Unit selection (feet, meters, inches)
  - Background image persistence

- **PR-2**: Core Annotation Tools ✅
  - Polyline tool for wall measurements
  - Polygon tool for room areas
  - Real-time measurement calculations
  - Layer panel with totals
  - 104 comprehensive tests

**Foundation Features:**
- ✅ Google Authentication
- ✅ Real-time collaboration (Firestore + RTDB)
- ✅ Live presence & cursors
- ✅ Shape locking
- ✅ Layer system with visibility/lock
- ✅ Undo/redo
- ✅ Offline handling with queue
- ✅ 60 FPS performance
- ✅ Security rules
- ✅ Export (PNG/SVG)

### 🚧 Next Up

- **PR-3**: Enhanced Layer System (color-coded layers)
- **PR-4**: AI Material Estimation (wall framing, flooring systems)

See [docs/task-list-construction-annotation.md](../docs/task-list-construction-annotation.md) for detailed implementation plan.

## Testing

### Unit Tests

Run unit tests with:
```bash
npm test
```

### Integration Tests with Firebase Emulators

1. Install Firebase tools:
   ```bash
   npm install -g firebase-tools
   ```

2. Start emulators:
   ```bash
   firebase emulators:start
   ```

3. Run tests against emulators:
   ```bash
   VITE_USE_FIREBASE_EMULATORS=true npm test
   ```

### Performance Harness (Playwright)

1. Install Playwright browsers (one-time):
   ```bash
   npx playwright install
   ```
2. Start Firebase emulators in one terminal:
   ```bash
   VITE_USE_FIREBASE_EMULATORS=true npx firebase emulators:start --only auth,firestore,database
   ```
3. In a second terminal, build and preview the app (same origin as the harness):
   ```bash
   npm run build
   VITE_USE_FIREBASE_EMULATORS=true npm run preview -- --host 127.0.0.1 --port 4173
   ```
4. In a third terminal, execute the load harness against Chromium & Firefox:
   ```bash
   PERF_BASE_URL=http://127.0.0.1:4173 npm run test:perf
   ```
   JSON summaries are written to `test-results/perf/` and will fail if FPS drops below 60 or latency exceeds PRD limits.
5. Safari validation remains manual: open the preview URL with `?diagnostics=1` (or press `Shift+D`) to display the diagnostics HUD and verify FPS/latency while exercising the canvas.

## Performance Targets

- 60 FPS during canvas operations
- < 100ms shape sync latency between users
- < 50ms cursor update latency
- Supports 10+ concurrent users per board

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Add tests for new features
4. Ensure all tests pass: `npm test`
5. Ensure linting passes: `npm run lint`
6. Submit a pull request

## License

MIT

## Acknowledgments

Built with:
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Firebase](https://firebase.google.com/)
- [Konva](https://konvajs.org/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Tailwind CSS](https://tailwindcss.com/)
