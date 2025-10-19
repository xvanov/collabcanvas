/**
 * Vitest setup file for mocking Firebase
 * This file runs before all tests to set up global mocks
 */

import { vi } from 'vitest';

// Mock Firebase Auth module - must be done before any imports
vi.mock('firebase/auth', () => {
  const mockAuth = {};
  const mockOnAuthStateChanged = vi.fn(() => {
    // Return unsubscribe function
    return vi.fn();
  });
  const mockSignInWithPopup = vi.fn();
  const mockSignOut = vi.fn();
  const mockGoogleAuthProvider = vi.fn();

  return {
    getAuth: vi.fn(() => mockAuth),
    onAuthStateChanged: mockOnAuthStateChanged,
    signInWithPopup: mockSignInWithPopup,
    signOut: mockSignOut,
    GoogleAuthProvider: mockGoogleAuthProvider,
    connectAuthEmulator: vi.fn(),
  };
});

// Mock Firebase App module
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

// Mock Firebase Firestore module
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  connectFirestoreEmulator: vi.fn(),
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  onSnapshot: vi.fn(() => vi.fn()),
  query: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => Date.now()),
}));

// Mock Firebase RTDB module
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  connectDatabaseEmulator: vi.fn(),
}));

// Mock Firebase Functions module
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  connectFunctionsEmulator: vi.fn(),
  httpsCallable: vi.fn(() => vi.fn()),
}));

