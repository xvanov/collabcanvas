# CollabCanvas

Real-time collaborative canvas application built with React, TypeScript, and Firebase.

## Features

- 🔐 **Google Authentication** - Secure sign-in with Firebase Auth
- 🎨 **Real-time Collaboration** - Multiple users can work together simultaneously
- 👁️ **Live Presence** - See who's online with live cursors
- 🔒 **Shape Locking** - Prevent conflicts with automatic shape locking
- ⚡ **60 FPS Performance** - Smooth interactions with Konva canvas
- 🎯 **Simple & Focused** - MVP focused on core collaboration features

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

## Development Progress

### ✅ Completed

- **PR #1**: Project Bootstrap & Firebase Setup
- **PR #2**: Authentication (Google Sign-In)
- **PR #3**: Canvas Renderer (Konva Integration)

### 🚧 In Progress

- **PR #4**: Shape Creation & Movement - Coming soon

### 📋 Planned

- PR #5: Firestore Realtime Sync
- PR #6: Presence & Cursors (RTDB)
- PR #7: Shape Locking (RTDB)
- PR #8: Security Rules
- PR #9: Offline Handling
- PR #10: Deployment

See [tasks.md](../tasks.md) for detailed implementation plan.

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
