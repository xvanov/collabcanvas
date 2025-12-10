# PR #2 — Authentication (Google Sign-In)

## Overview

This PR implements Firebase Authentication with Google Sign-In for the CollabCanvas application. Users must authenticate before accessing the canvas board.

## Implemented Features

### Core Components

1. **useAuth Hook** (`src/hooks/useAuth.ts`)
   - Manages Firebase authentication state
   - Provides Google Sign-In functionality
   - Handles sign-out
   - Persists user data: `uid`, `name`, `email`, `photoURL`
   - Handles users without display names (defaults to "Anonymous")

2. **AuthButton Component** (`src/components/AuthButton.tsx`)
   - Shows Google Sign-In button when not authenticated
   - Displays user avatar, name, and email when authenticated
   - Provides sign-out button
   - Shows loading state during authentication

3. **Toolbar Component** (`src/components/Toolbar.tsx`)
   - Top navigation bar with app title
   - Integrates AuthButton for user info display
   - Extensible for future controls (FPS counter, create button, etc.)

4. **Login Page** (`src/pages/Login.tsx`)
   - Dedicated login page for unauthenticated users
   - Beautiful UI with app features list
   - Full-width Google Sign-In button
   - Error handling display

5. **Board Page** (`src/pages/Board.tsx`)
   - Protected route for authenticated users only
   - Placeholder for canvas (coming in PR #3)
   - Includes Toolbar with user info

6. **App Component** (`src/App.tsx`)
   - Authentication guard implementation
   - Routes users based on auth state:
     - Loading state → spinner
     - Not authenticated → Login page
     - Authenticated → Board page

## Authentication Flow

```
User opens app
     ↓
App checks auth state (loading)
     ↓
Auth state resolved
     ↓
     ├── Not authenticated → Login page
     │        ↓
     │   User clicks "Sign in with Google"
     │        ↓
     │   Google Sign-In popup
     │        ↓
     │   Auth success → Board page
     │
     └── Authenticated → Board page directly
              ↓
         User can sign out → Login page
```

## Testing

### Unit Tests

Tests are located in:
- `src/hooks/useAuth.test.ts` - Tests for authentication hook
- `src/App.test.tsx` - Tests for authentication guard

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with UI:
```bash
npm run test:ui
```

### Manual Testing

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Test unauthenticated state:**
   - Open `http://localhost:5173`
   - Should see Login page
   - Should see "Sign in with Google" button
   - Should NOT be able to access board

3. **Test authentication:**
   - Click "Sign in with Google"
   - Complete Google Sign-In flow
   - Should redirect to Board page
   - Should see your name, email, and avatar in toolbar
   - Should see "Canvas Coming Soon" placeholder

4. **Test authenticated state:**
   - Refresh page
   - Should remain on Board page (authentication persisted)
   - User info should still be visible

5. **Test sign out:**
   - Click "Sign Out" button
   - Should redirect to Login page
   - Should no longer see user info

### Firebase Emulator Testing

For testing with Firebase emulators (recommended for CI/CD):

1. **Set up environment variables:**
   ```bash
   export VITE_USE_FIREBASE_EMULATORS=true
   ```

2. **Start emulators:**
   ```bash
   firebase emulators:start
   ```

3. **Run integration tests:**
   ```bash
   firebase emulators:exec "npm test"
   ```

## File Structure

```
src/
├── hooks/
│   ├── useAuth.ts              # Authentication hook
│   └── useAuth.test.ts         # Unit tests for useAuth
├── components/
│   ├── AuthButton.tsx          # Sign-in/sign-out button
│   └── Toolbar.tsx             # Top navigation bar
├── pages/
│   ├── Login.tsx               # Login page for unauthenticated users
│   └── Board.tsx               # Main board page (protected)
├── test/
│   ├── setup.ts                # Test setup and configuration
│   └── mocks/
│       └── firebase.ts         # Firebase mocks for testing
├── App.tsx                     # Main app with auth guard
└── App.test.tsx                # Integration tests for auth guard
```

## Security

- Firebase Auth handles all authentication securely
- No passwords or credentials stored locally
- Google OAuth 2.0 for authentication
- User session managed by Firebase
- Protected routes ensure only authenticated users access the board

## Environment Variables

Required environment variables (`.env` file):

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Optional: Enable emulators for development
VITE_USE_FIREBASE_EMULATORS=true
```

## Dependencies

No new dependencies added. Uses existing:
- `firebase` - Already included in PR#1
- `react` - Already included
- React hooks for state management

## Next Steps (PR #3)

- Canvas renderer with Konva integration
- Pan and zoom functionality
- FPS counter in toolbar
- Viewport bounds

## Known Limitations

- Only Google Sign-In supported (additional providers can be added later)
- No "remember me" functionality (relies on Firebase session management)
- No password reset (not applicable for OAuth)

## Rationale

This implementation ensures:
1. ✅ Users must authenticate to access the board
2. ✅ User data is persisted across sessions
3. ✅ Clean separation between authentication and canvas logic
4. ✅ Extensible design for future features
5. ✅ Comprehensive test coverage
6. ✅ Beautiful, modern UI following UX best practices

## Test Results

All tests passing:
- ✅ 5 unit tests for useAuth hook
- ✅ 7 integration tests for authentication guard
- **12 total tests passed**

---

**Status:** ✅ Ready for review and merge

