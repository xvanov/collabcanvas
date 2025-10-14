# CollabCanvas

> **Real-time collaborative canvas** - A Figma-style collaborative drawing tool built with React, Firebase, and Konva.js

[![Deploy Status](https://img.shields.io/badge/deployed-Firebase%20Hosting-blue)](https://collabcanvas.web.app)
[![Tech Stack](https://img.shields.io/badge/stack-React%20%7C%20Firebase%20%7C%20Konva-green)](https://github.com/gauntletai/collabcanvas)
[![Performance](https://img.shields.io/badge/performance-60%20FPS%20%7C%20%3C100ms%20sync-orange)](https://github.com/gauntletai/collabcanvas)

## 🎯 Overview

CollabCanvas is a **minimal, high-performance collaborative canvas** that enables multiple users to create and move shapes together in real-time. Built as an MVP to demonstrate real-time collaboration capabilities with sub-100ms sync latency and 60 FPS performance.

### Key Features

- 🎨 **Real-time Collaboration** - Multiple users can create and move shapes simultaneously
- 🔒 **Conflict Prevention** - Shape locking prevents simultaneous edit conflicts  
- 👥 **Live Presence** - See other users' cursors and active user count
- ⚡ **High Performance** - 60 FPS interactions, <100ms shape sync, <50ms cursor updates
- 🔐 **Google Authentication** - Simple Google Sign-In integration
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🌐 **Firebase Backend** - Scalable real-time infrastructure

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- **React 18+** with TypeScript
- **Konva.js + react-konva** for high-performance canvas rendering
- **Zustand** for centralized state management
- **Tailwind CSS** for styling
- **Vite** for fast development and optimized builds

**Backend:**
- **Firebase Authentication** (Google Sign-In)
- **Cloud Firestore** for persistent shape data
- **Realtime Database (RTDB)** for ephemeral data (presence, cursors, locks)
- **Firebase Hosting** for deployment

### Data Flow

```mermaid
flowchart TB
    subgraph Browser["User's Browser"]
        UI[React UI Components]
        Store[Zustand Store]
        Hooks[Custom Hooks]
        Services[Firebase Services]
    end
    
    subgraph Firebase["Firebase Backend"]
        Auth[Firebase Auth<br/>Google Sign-In]
        Firestore[Firestore<br/>Persistent Shapes]
        RTDB[Realtime Database<br/>Presence, Cursors, Locks]
        Hosting[Firebase Hosting<br/>Deployment]
    end
    
    UI <--> Store
    Store <--> Hooks
    Hooks <--> Services
    Services <--> Auth
    Services <--> Firestore
    Services <--> RTDB
    Browser -.deployed to.-> Hosting
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Google Cloud Project** with Firebase enabled

### 1. Clone and Install

```bash
git clone https://github.com/gauntletai/collabcanvas.git
cd collabcanvas/collabcanvas
npm install
```

### 2. Firebase Setup

1. **Create Firebase Project:**
   ```bash
   firebase login
   firebase projects:create your-project-id
   firebase use your-project-id
   ```

2. **Enable Services:**
   ```bash
   # Enable Authentication (Google provider)
   firebase auth:enable
   
   # Enable Firestore Database
   firebase firestore:enable
   
   # Enable Realtime Database
   firebase database:enable
   
   # Enable Hosting
   firebase hosting:enable
   ```

3. **Configure Environment:**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Add your Firebase config to .env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
   ```

### 3. Deploy Security Rules

```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy RTDB security rules  
firebase deploy --only database
```

### 4. Development

```bash
# Start Firebase emulators (recommended for development)
firebase emulators:start

# In another terminal, start the React dev server
npm run dev
```

Visit `http://localhost:5173` to see the application running locally.

### 5. Production Deployment

```bash
# Build for production
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

Your app will be available at `https://your-project-id.web.app`

## 📁 Project Structure

```
collabcanvas/
├── src/
│   ├── components/          # React components
│   │   ├── Canvas.tsx       # Main Konva canvas
│   │   ├── Shape.tsx        # Rectangle component
│   │   ├── Toolbar.tsx      # Top toolbar
│   │   ├── CursorOverlay.tsx # Live cursors
│   │   ├── LockOverlay.tsx  # Username overlays
│   │   └── AuthButton.tsx   # Google Sign-In
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts       # Firebase auth
│   │   ├── useShapes.ts     # Firestore sync
│   │   ├── usePresence.ts   # RTDB presence
│   │   └── useLocks.ts      # Shape locking
│   ├── services/            # Firebase services
│   │   ├── firebase.ts      # Firebase config
│   │   ├── firestore.ts     # Shape operations
│   │   └── rtdb.ts          # Presence & locks
│   ├── store/               # Zustand state
│   │   └── canvasStore.ts   # Centralized state
│   └── utils/               # Utilities
│       ├── throttle.ts      # Performance throttling
│       └── colors.ts        # User color assignment
├── firestore.rules          # Firestore security rules
├── database.rules.json      # RTDB security rules
├── firebase.json            # Firebase config
└── package.json
```

## 🎮 Usage

### For Users

1. **Sign In** - Click "Sign in with Google" to authenticate
2. **Create Shapes** - Click "Create Rectangle" to add 100x100px blue rectangles
3. **Move Shapes** - Click and drag shapes to new positions
4. **Collaborate** - See other users' cursors and active user count
5. **Lock Management** - First user to click a shape locks it; others see username overlay

### For Developers

- **Performance Monitoring** - FPS counter shows real-time performance
- **Real-time Sync** - Shapes sync across users in <100ms
- **Cursor Updates** - Cursor positions update in <50ms
- **Shape Locking** - Prevents simultaneous edit conflicts

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests with Firebase emulators
firebase emulators:exec --only firestore,database,auth "npm test"

# Run integration tests
npm run test:integration
```

## 📊 Performance Targets

- ✅ **60 FPS** during all interactions (pan, zoom, drag)
- ✅ **< 100ms** shape sync latency between users  
- ✅ **< 50ms** cursor position sync latency
- ✅ **500+ shapes** without FPS drops
- ✅ **5+ concurrent users** without degradation

## 🔒 Security

- **Authentication Required** - All users must sign in with Google
- **Schema Validation** - Firestore rules enforce shape properties
- **User Isolation** - Users can only modify their own presence/locks
- **Rate Limiting** - Throttled updates prevent spam

## 🚧 Current Limitations (MVP)

- **Single Board** - One global board (no board management)
- **Rectangles Only** - Fixed 100x100px blue rectangles
- **Movement Only** - No shape editing, resizing, or deletion
- **No Undo/Redo** - Create and move operations only

## 🔮 Future Roadmap

### Phase 2
- Additional shape types (circles, text, lines)
- Shape properties (colors, sizes, opacity)
- Shape deletion and undo/redo
- Multiple boards with board management

### Phase 3 (AI Integration)
- Natural language commands: "create a blue rectangle"
- AI-powered shape generation from descriptions
- Collaborative AI suggestions for layout and design
- Voice command support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Konva.js** for high-performance canvas rendering
- **Firebase** for real-time backend infrastructure
- **React** and **Zustand** for modern frontend architecture
- **Tailwind CSS** for rapid UI development

---

**Built with ❤️ for real-time collaboration**

[Live Demo](https://collabcanvas.web.app) • [Documentation](./architecture.md) • [Issues](https://github.com/gauntletai/collabcanvas/issues)