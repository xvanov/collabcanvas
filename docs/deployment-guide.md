# Deployment Guide

## Overview

CollabCanvas is deployed to Firebase Hosting, a static web hosting service. The deployment process includes building the production bundle, deploying to Firebase Hosting, and deploying security rules.

## Prerequisites

1. **Firebase CLI installed**: `npm install -g firebase-tools`
2. **Firebase project created** (or use existing project)
3. **Firebase services enabled**:
   - Authentication (Google provider)
   - Firestore Database
   - Realtime Database
   - Cloud Functions
   - Storage
   - Hosting

## Deployment Steps

### Step 1: Set Up Production Environment

Create a `.env.production` file in the project root:

```bash
# Production Firebase Configuration
VITE_FIREBASE_API_KEY=your-production-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-production-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-production-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-production-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-production-messaging-sender-id
VITE_FIREBASE_APP_ID=your-production-app-id
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com

# Use real Firebase (not emulators) in production
VITE_USE_FIREBASE_EMULATORS=false
```

**To get Firebase config values:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings (gear icon)
4. Scroll to "Your apps" section
5. Click on your web app or create one
6. Copy the config values

### Step 2: Configure Firebase Project

Update `.firebaserc`:

```json
{
  "projects": {
    "default": "your-production-project-id"
  }
}
```

### Step 3: Build Production Bundle

```bash
# Install dependencies (if not already done)
npm install

# Build optimized production bundle
npm run build:production
```

This creates a `dist/` folder with:
- Optimized JavaScript bundles
- Minified CSS
- Static assets
- `index.html` entry point

### Step 4: Deploy Security Rules

```bash
# Deploy Firestore and Realtime Database security rules
npm run deploy:rules
```

Or manually:
```bash
firebase deploy --only firestore:rules,database:rules
```

### Step 5: Deploy to Firebase Hosting

```bash
# Login to Firebase (if not already logged in)
firebase login

# Deploy to Firebase Hosting
npm run deploy
```

Or manually:
```bash
firebase deploy --only hosting
```

### Step 6: Verify Deployment

After deployment, Firebase provides a URL:
- **Default**: `https://your-project-id.web.app`
- **Custom domain**: If configured

**Verification Checklist:**
- [ ] Authentication flow works
- [ ] Shape creation and movement sync in real-time
- [ ] Cursors and presence update correctly
- [ ] Shape locking works across users
- [ ] Performance targets met: 60 FPS, < 100ms shape sync, < 50ms cursor updates
- [ ] Background image upload works
- [ ] Scale tool works
- [ ] Material estimation works

## Firebase Hosting Configuration

The `firebase.json` configuration includes:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "!/assets/**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/assets/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  }
}
```

**Key Features:**
- **SPA Routing**: All routes redirect to `index.html` (except assets)
- **Asset Caching**: Static assets cached for 1 year
- **Build Output**: Serves from `dist/` directory

## Cloud Functions Deployment

Deploy Cloud Functions separately:

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

**Functions Deployed:**
- `aiCommand` - AI command processing
- `materialEstimateCommand` - Material estimation
- `getHomeDepotPrice` - Pricing lookup

## Custom Domain Setup

1. In Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter your domain name
4. Follow verification steps:
   - Add DNS records (A record or CNAME)
   - Verify domain ownership
   - SSL certificate automatically provisioned
5. Update DNS records as instructed

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build:production
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: your-project-id
          channelId: live
```

### Environment Variables in CI/CD

Set these secrets in your CI/CD platform:
- `FIREBASE_SERVICE_ACCOUNT` - Firebase service account JSON
- Firebase config values (if needed)

## Deployment Checklist

### Pre-Deployment

- [ ] Firebase project created
- [ ] All Firebase services enabled
- [ ] Environment variables configured
- [ ] Security rules tested locally
- [ ] Production build successful
- [ ] Tests passing (`npm run test:ci`)

### Deployment

- [ ] Security rules deployed
- [ ] Cloud Functions deployed (if updated)
- [ ] Hosting deployed
- [ ] Deployment successful

### Post-Deployment

- [ ] Application accessible at production URL
- [ ] Authentication works
- [ ] Real-time features work
- [ ] Performance targets met
- [ ] No console errors
- [ ] Security rules enforced

## Troubleshooting

### Build Fails

- **Check dependencies**: `npm install`
- **TypeScript errors**: `npx tsc --noEmit`
- **Environment variables**: Verify `.env.production` exists

### Deployment Fails

- **Not logged in**: `firebase login`
- **Wrong project**: Check `.firebaserc`
- **Hosting not enabled**: Enable in Firebase Console

### App Doesn't Work After Deployment

- **Check browser console**: Look for errors
- **Verify environment variables**: Check Firebase config
- **Check Firebase services**: Ensure all services enabled
- **Security rules**: Verify rules are deployed

### Authentication Issues

- **Authorized domains**: Add production domain in Firebase Console
  - Go to Authentication → Settings → Authorized domains
  - Add: `your-project.web.app` and custom domain (if used)

### Performance Issues

- **Check FPS**: Should maintain 60 FPS
- **Network latency**: Check Firebase region
- **Bundle size**: Review code splitting

## Monitoring

### Firebase Console

- **Usage**: Monitor Firebase service usage
- **Errors**: Check Functions logs
- **Performance**: Review Hosting analytics

### Application Monitoring

- **FPS Counter**: Visible in toolbar
- **Diagnostics HUD**: Press `Shift+D` or `?diagnostics=1`
- **Console Logs**: Check browser console

## Rollback

### Rollback Hosting

```bash
# List recent deployments
firebase hosting:channel:list

# Rollback to previous version
firebase hosting:rollback
```

### Rollback Functions

```bash
# List function versions
firebase functions:list

# Rollback function (if versioning enabled)
# Note: Functions don't support automatic rollback
# Redeploy previous version manually
```

## Security Considerations

- **Never commit** `.env.production` to version control
- **Security rules**: Always deploy and test rules
- **API keys**: Rotate if exposed
- **Firebase quotas**: Monitor usage to prevent unexpected costs
- **Error monitoring**: Set up error tracking (e.g., Sentry)

## Cost Optimization

- **Firestore reads**: Optimize queries, use indexes
- **Realtime Database**: Minimize presence updates
- **Storage**: Compress images before upload
- **Functions**: Optimize cold starts, use caching
- **Hosting**: Already optimized with CDN

## Next Steps

After successful deployment:

1. Share production URL with users
2. Monitor performance and usage
3. Set up error monitoring
4. Configure analytics (if needed)
5. Plan for scaling (if needed)











