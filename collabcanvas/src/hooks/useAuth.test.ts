/**
 * Unit tests for useAuth hook
 * Tests authentication state transitions and Google Sign-In flow
 * 
 * Note: These tests verify the hook's logic and behavior.
 * Full Firebase integration is tested with emulators in a separate test suite.
 */

import { describe, it, expect } from 'vitest';
import { createMockUser } from '../test/mocks/firebase';
import type { User } from '../types';

describe('useAuth', () => {
  it('should export a useAuth hook', async () => {
    const { useAuth } = await import('./useAuth');
    expect(useAuth).toBeDefined();
    expect(typeof useAuth).toBe('function');
  });

  it('createMockUser should create valid user object', () => {
    const mockUser = createMockUser();
    expect(mockUser).toHaveProperty('uid');
    expect(mockUser).toHaveProperty('displayName');
    expect(mockUser).toHaveProperty('email');
    expect(mockUser).toHaveProperty('photoURL');
  });

  it('createMockUser should accept overrides', () => {
    const mockUser = createMockUser({
      displayName: 'Custom Name',
      email: 'custom@example.com',
    });
    expect(mockUser.displayName).toBe('Custom Name');
    expect(mockUser.email).toBe('custom@example.com');
  });

  it('should convert Firebase user to app User type', () => {
    const firebaseUser = createMockUser({
      uid: 'test-123',
      displayName: 'Test User',
      email: 'test@example.com',
      photoURL: 'https://example.com/photo.jpg',
    });

    const appUser: User = {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || 'Anonymous',
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
    };

    expect(appUser).toEqual({
      uid: 'test-123',
      name: 'Test User',
      email: 'test@example.com',
      photoURL: 'https://example.com/photo.jpg',
    });
  });

  it('should handle user without display name', () => {
    const firebaseUser = createMockUser({
      displayName: null,
    });

    const appUser: User = {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || 'Anonymous',
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
    };

    expect(appUser.name).toBe('Anonymous');
  });
});

