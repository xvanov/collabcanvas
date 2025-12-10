# Firebase Setup Guide

## Quick Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter a project name (e.g., "CollabCanvas-Dev")
4. (Optional) Disable Google Analytics if you don't need it
5. Click **"Create project"**

### 2. Register Web App

1. In your Firebase project, click the **"</>" (Web)** icon to add a web app
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

Open `.env` and replace the placeholder values with your Firebase config:

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

### 7. Test Authentication

1. Restart your development server: `npm run dev`
2. Open http://localhost:5173
3. Click "Sign in with Google"
4. Complete the sign-in
5. You should be redirected to the board with your user info displayed

---

## Firebase Storage Setup

### Enable Firebase Storage

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **Get Started** if Storage is not enabled
5. Choose **Start in test mode** for development
6. Select a location for your storage bucket

### Configure Storage Security Rules

The `storage.rules` file should contain:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload construction plan images
    match /construction-plans/{userId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Allow authenticated users to upload to canvas-specific folders
    match /construction-plans/{canvasId}/{fileName} {
      allow read, write: if request.auth != null;
    }

    // Allow authenticated users to read any construction plan image
    match /construction-plans/{allPaths=**} {
      allow read: if request.auth != null;
    }

    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### Deploy Storage Rules

```bash
firebase deploy --only storage
```

---

## Firebase Emulators (Optional)

For local development without hitting production Firebase:

1. **Install Firebase CLI**:
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

---

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

### CORS Errors with Storage
- **Cause**: Storage not enabled or rules not deployed
- **Fix**: Enable Storage and deploy rules

### 404 Errors with Storage
- **Cause**: Storage bucket URL is incorrect
- **Fix**: Verify `VITE_FIREBASE_STORAGE_BUCKET` in `.env`

---

## Security Notes

- Never commit your `.env` file to git (it's in `.gitignore`)
- Rotate API keys periodically
- Use proper security rules in production

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
