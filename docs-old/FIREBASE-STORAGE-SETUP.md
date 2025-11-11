# Firebase Storage Setup Guide

## Issue: CORS and 404 Errors with Image Upload

The image upload functionality is failing due to Firebase Storage not being properly configured. Here's how to fix it:

## 1. Enable Firebase Storage in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`collabcanvas-dev`)
3. Navigate to **Storage** in the left sidebar
4. Click **Get Started** if Storage is not enabled
5. Choose **Start in test mode** for development
6. Select a location for your storage bucket

## 2. Configure Storage Security Rules

The `storage.rules` file has been created with appropriate rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload construction plan images
    match /construction-plans/{userId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to upload construction plan images to canvas-specific folders
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

## 3. Deploy Storage Rules

Run this command to deploy the storage rules:

```bash
firebase deploy --only storage
```

## 4. Environment Variables

Make sure your environment variables include the Storage bucket:

```env
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
```

## 5. Test the Fix

After completing the above steps:

1. Restart your development server
2. Try uploading an image again
3. Check the browser console for any remaining errors

## Common Issues

- **CORS Errors**: Usually means Storage is not enabled or rules are not deployed
- **404 Errors**: Usually means the Storage bucket URL is incorrect
- **Permission Denied**: Usually means the security rules are too restrictive

## Development vs Production

- **Development**: Uses Firebase emulators (configured in `firebase.json`)
- **Production**: Uses actual Firebase Storage service

Make sure to test both environments if deploying to production.

