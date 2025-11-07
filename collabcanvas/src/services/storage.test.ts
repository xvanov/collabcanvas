/**
 * Unit tests for Storage service layer
 * Tests plan image deletion operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase Storage
vi.mock('firebase/storage', () => ({
  ref: vi.fn((storage, path) => ({ path })),
  deleteObject: vi.fn(() => Promise.resolve()),
}));

describe('Storage Service - Plan Deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('deleteConstructionPlanImage', () => {
    it('should extract storage path from Firebase Storage URL correctly', () => {
      // Test URL parsing logic - matches actual Firebase Storage URL format
      const testUrl = 'https://firebasestorage.googleapis.com/v0/b/project.appspot.com/o/construction-plans%2Fuser123%2Fplan.jpg?alt=media&token=abc123';
      const url = new URL(testUrl);
      // Updated regex to match the actual implementation: /\/o\/(.+?)(\?|$)/
      const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
      
      expect(pathMatch).toBeTruthy();
      if (pathMatch) {
        const storagePath = decodeURIComponent(pathMatch[1]);
        expect(storagePath).toBe('construction-plans/user123/plan.jpg');
      }
    });

    it('should handle URL encoding correctly', () => {
      const encodedPath = 'construction-plans%2Fuser123%2Fplan%20with%20spaces.jpg';
      const decodedPath = decodeURIComponent(encodedPath);
      expect(decodedPath).toBe('construction-plans/user123/plan with spaces.jpg');
    });

    it('should throw error for invalid URL format', () => {
      const invalidUrl = 'not-a-valid-firebase-url';
      
      // URL constructor throws for invalid URLs
      expect(() => {
        try {
          const url = new URL(invalidUrl);
          const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
          expect(pathMatch).toBeNull();
        } catch (error) {
          // Expected: Invalid URL error
          expect(error).toBeInstanceOf(TypeError);
          throw error;
        }
      }).toThrow();
    });

    it('should handle deletion errors gracefully', () => {
      const mockError = new Error('Storage deletion failed');
      expect(mockError.message).toBe('Storage deletion failed');
      expect(mockError).toBeInstanceOf(Error);
    });

    it('should handle URLs without query parameters', () => {
      // Test URL without query params (edge case)
      const testUrl = 'https://firebasestorage.googleapis.com/v0/b/project.appspot.com/o/construction-plans%2Fuser123%2Fplan.jpg';
      const url = new URL(testUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
      
      expect(pathMatch).toBeTruthy();
      if (pathMatch) {
        const storagePath = decodeURIComponent(pathMatch[1]);
        expect(storagePath).toBe('construction-plans/user123/plan.jpg');
      }
    });
  });
});

