# Deployment Environment Variables Guide

## Overview

You need to configure environment variables in **two places**:
1. **Frontend** (Vite) - Set in `.env.production` file (baked into build)
2. **Backend** (Cloud Functions) - Set in Firebase Console

---

## 1. Frontend Environment Variables

### Location: `.env.production` file in `collabcanvas/` directory

Create or update `.env.production` with your Firebase config:

```bash
# Production Firebase Configuration
VITE_FIREBASE_API_KEY=your-production-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-production-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-production-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-production-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-production-messaging-sender-id
VITE_FIREBASE_APP_ID=your-production-app-id
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

# IMPORTANT: Set to false for production
VITE_USE_FIREBASE_EMULATORS=false
```

### How to Get Firebase Config Values:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon ⚙️ → **Project Settings**
4. Scroll down to **"Your apps"** section
5. Click on your web app (or create one if needed)
6. Copy the config values from the `firebaseConfig` object

---

## 2. Backend Environment Variables (Cloud Functions)

### Location: Firebase Console → Functions → Configuration

You need to set these **secret environment variables** for Cloud Functions:

#### Required Variables:

1. **SERP_API_KEY**
   - Used by: `getHomeDepotPrice` function (pricing service)
   - Get it from: [SerpAPI Dashboard](https://serpapi.com/dashboard)
   - Purpose: Fetches Home Depot prices

2. **OPENAI_API_KEY**
   - Used by: `aiCommand` and `materialEstimateCommand` functions
   - Get it from: [OpenAI Platform](https://platform.openai.com/api-keys)
   - Purpose: AI command processing and material estimation

### How to Set Cloud Functions Environment Variables:

#### Option A: Using Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Functions** → **Configuration** (or **Secrets** tab)
4. Click **"Add secret"** or **"Add environment variable"**
5. Add each variable:
   - Name: `SERP_API_KEY`, Value: `your-serpapi-key`
   - Name: `OPENAI_API_KEY`, Value: `your-openai-key`
6. Click **Save**

#### Option B: Using Firebase CLI

```bash
# Set secrets (recommended for sensitive keys)
firebase functions:secrets:set SERP_API_KEY
firebase functions:secrets:set OPENAI_API_KEY

# Or set regular environment variables
firebase functions:config:set serpapi.key="your-serpapi-key"
firebase functions:config:set openai.key="your-openai-key"
```

**Note:** For Firebase Functions v2 (which you're using), secrets are preferred over config.

---

## 3. Deployment Steps

### Step 1: Set Frontend Variables

```bash
cd collabcanvas
# Create .env.production file with Firebase config (see above)
```

### Step 2: Set Backend Variables

Set in Firebase Console → Functions → Configuration (see above)

### Step 3: Build and Deploy

```bash
# Build frontend with production env vars
npm run build:production

# Deploy security rules
firebase deploy --only firestore:rules,database:rules

# Deploy Cloud Functions (with environment variables)
cd functions
npm run build
cd ..
firebase deploy --only functions

# Deploy frontend
firebase deploy --only hosting
```

---

## Quick Checklist

### Frontend (`.env.production`):
- [ ] `VITE_FIREBASE_API_KEY`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] `VITE_FIREBASE_DATABASE_URL`
- [ ] `VITE_FIREBASE_PROJECT_ID`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `VITE_FIREBASE_APP_ID`
- [ ] `VITE_USE_FIREBASE_EMULATORS=false`

### Backend (Firebase Console):
- [ ] `SERP_API_KEY` (for pricing)
- [ ] `OPENAI_API_KEY` (for AI features)

---

## Verification

After deployment, verify:

1. **Frontend**: Check browser console - should see Firebase initialized (no emulator warnings)
2. **Functions**: Check Functions logs in Firebase Console for:
   - `[PRICING] SERP_API_KEY configured: YES`
   - No OpenAI API key warnings

---

## Troubleshooting

### Functions can't access environment variables:

- **For Firebase Functions v2**: Use **Secrets** instead of config
- Go to Functions → Configuration → Secrets tab
- Set secrets there, then redeploy functions

### Frontend shows wrong Firebase project:

- Check `.env.production` file exists
- Verify `VITE_USE_FIREBASE_EMULATORS=false`
- Rebuild: `npm run build:production`

### Pricing doesn't work:

- Check Functions logs for SERP_API_KEY errors
- Verify SERP_API_KEY is set in Firebase Console → Functions → Configuration
- Redeploy functions after setting: `firebase deploy --only functions`

### AI features don't work:

- Check Functions logs for OPENAI_API_KEY errors
- Verify OPENAI_API_KEY is set in Firebase Console → Functions → Configuration
- Redeploy functions after setting: `firebase deploy --only functions`

---

## Security Notes

- **Never commit** `.env.production` to git (should be in `.gitignore`)
- **Never commit** API keys to version control
- Use Firebase Secrets for sensitive keys (SERP_API_KEY, OPENAI_API_KEY)
- Rotate keys if accidentally exposed

