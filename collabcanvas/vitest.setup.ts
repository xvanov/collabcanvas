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
}));

// Mock Firebase RTDB module
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  connectDatabaseEmulator: vi.fn(),
}));

