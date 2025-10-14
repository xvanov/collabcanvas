/**
 * Mock Firebase Auth for testing
 */

import { vi } from 'vitest';
import type { User as FirebaseUser } from 'firebase/auth';

// Mock Firebase user factory
export const createMockUser = (overrides?: Partial<FirebaseUser>): FirebaseUser => ({
  uid: 'test-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: 'mock-refresh-token',
  tenantId: null,
  delete: vi.fn(),
  getIdToken: vi.fn(),
  getIdTokenResult: vi.fn(),
  reload: vi.fn(),
  toJSON: vi.fn(),
  phoneNumber: null,
  providerId: 'google.com',
  ...overrides,
} as unknown as FirebaseUser);

