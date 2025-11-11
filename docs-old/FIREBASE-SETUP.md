# Firebase Setup Guide

## Quick Setup (5 minutes)

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter a project name (e.g., "CollabCanvas-Dev")
4. (Optional) Disable Google Analytics if you don't need it
5. Click **"Create project"**

### 2. Register Web App

1. In your Firebase project, click the **"</>** (Web)" icon to add a web app
2. Enter an app nickname (e.g., "CollabCanvas Web")
3. **Don't** check "Set up Firebase Hosting" (we'll do this later)
4. Click **"Register app"**
5. **Copy the Firebase configuration values** - you'll need these!

The config will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

### 3. Enable Google Authentication

1. In Firebase Console, go to **"Build" → "Authentication"**
2. Click **"Get started"** if this is your first time
3. Click the **"Sign-in method"** tab
4. Click **"Google"** from the providers list
5. Toggle the **"Enable"** switch
6. Enter a project support email (your email)
7. Click **"Save"**

### 4. Enable Firestore Database

1. In Firebase Console, go to **"Build" → "Firestore Database"**
2. Click **"Create database"**
3. Select **"Start in test mode"** (we'll add security rules later)
4. Choose a location close to you
5. Click **"Enable"**

### 5. Enable Realtime Database

1. In Firebase Console, go to **"Build" → "Realtime Database"**
2. Click **"Create Database"**
3. Select a location close to you
4. Select **"Start in test mode"**
5. Click **"Enable"**

### 6. Update .env File

Open `collabcanvas/.env` and replace the placeholder values with your Firebase config:

```bash
VITE_FIREBASE_API_KEY=AIza...  # Your actual API key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123...

# Keep this as false to use real Firebase
VITE_USE_FIREBASE_EMULATORS=false
```

### 7. Restart Dev Server

After updating `.env`, restart the development server:

```bash
# Stop the current server (Ctrl+C in the terminal)
npm run dev
```

### 8. Test Authentication

1. Open http://localhost:5173
2. Click "Sign in with Google"
3. You should see a Google Sign-In popup
4. Complete the sign-in
5. You should be redirected to the board with your user info displayed

## Troubleshooting

### Error: "Unable to connect to 127.0.0.1:9099"
- **Cause**: `VITE_USE_FIREBASE_EMULATORS` is set to `true` but emulators aren't running
- **Fix**: Set `VITE_USE_FIREBASE_EMULATORS=false` in `.env`

### Error: "Firebase: Error (auth/invalid-api-key)"
- **Cause**: Incorrect API key in `.env`
- **Fix**: Copy the correct API key from Firebase Console

### Error: "Firebase: Error (auth/unauthorized-domain)"
- **Cause**: `localhost` is not authorized in Firebase
- **Fix**: In Firebase Console → Authentication → Settings → Authorized domains, add `localhost`

### Google Sign-In popup doesn't appear
- **Cause**: Pop-ups might be blocked by browser
- **Fix**: Allow pop-ups for localhost in your browser settings

## Firebase Emulators (Optional - For Advanced Development)

If you want to use Firebase Emulators for local development:

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase** (if not already done):
   ```bash
   firebase init
   ```
   Select: Authentication, Firestore, Realtime Database, Emulators

4. **Start Emulators**:
   ```bash
   firebase emulators:start
   ```

5. **Update .env**:
   ```bash
   VITE_USE_FIREBASE_EMULATORS=true
   ```

6. **Restart dev server**

## Security Note

⚠️ **Never commit your `.env` file to git!** 

The `.env` file is already in `.gitignore`, so it won't be accidentally committed.

## Next Steps

Once authentication is working:
- Continue to PR #3: Canvas Renderer
- Set up proper Firestore/RTDB security rules (PR #8)
- Deploy to Firebase Hosting (PR #10)

## Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)

