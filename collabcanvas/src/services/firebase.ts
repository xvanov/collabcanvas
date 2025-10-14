import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, Database, connectDatabaseEmulator } from 'firebase/database';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase app
export const app: FirebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth: Auth = getAuth(app);
export const firestore: Firestore = getFirestore(app);
export const rtdb: Database = getDatabase(app);

// Connect to emulators if in development mode
const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

if (useEmulators) {
  console.log('🔧 Using Firebase Emulators');
  
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    connectDatabaseEmulator(rtdb, '127.0.0.1', 9000);
    console.log('✅ Connected to Firebase Emulators');
  } catch (error) {
    console.warn('⚠️ Emulator connection may already be initialized:', error);
  }
}

export default app;

