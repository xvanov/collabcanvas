/**
 * Unit tests for error handler utility
 */

import { describe, it, expect } from 'vitest';
import {
  handleError,
  isRetryableError,
  getErrorMessage,
  formatErrorForDisplay,
  type AppError,
} from '../utils/errorHandler';

describe('Error Handler', () => {
  describe('handleError', () => {
    it('should handle Firebase permission-denied error', () => {
      const error = { code: 'permission-denied', message: 'Permission denied' };
      const result = handleError(error);
      
      expect(result.code).toBe('PERMISSION_DENIED');
      expect(result.message).toContain('permission');
      expect(result.retryable).toBe(false);
    });

    it('should handle Firebase unavailable error', () => {
      const error = { code: 'unavailable', message: 'Service unavailable' };
      const result = handleError(error);
      
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.retryable).toBe(true);
    });

    it('should handle network error from Error object', () => {
      const error = new Error('Network request failed');
      const result = handleError(error);
      
      // The error handler checks for "network" or "fetch" in the message
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.retryable).toBe(true);
    });

    it('should handle unknown error', () => {
      const error = new Error('Something went wrong');
      const result = handleError(error);
      
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('Something went wrong');
    });
  });

  describe('isRetryableError', () => {
    it('should return true for retryable errors', () => {
      const error: AppError = {
        code: 'NETWORK_ERROR',
        message: 'Network error',
        retryable: true,
      };
      
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error: AppError = {
        code: 'PERMISSION_DENIED',
        message: 'Permission denied',
        retryable: false,
      };
      
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should return user-friendly error message', () => {
      const error = { code: 'permission-denied', message: 'Permission denied' };
      const message = getErrorMessage(error);
      
      expect(message).toContain('permission');
    });
  });

  describe('formatErrorForDisplay', () => {
    it('should format network error for display', () => {
      const error = { code: 'unavailable', message: 'Service unavailable' };
      const result = formatErrorForDisplay(error);
      
      expect(result.title).toBe('Connection Error');
      expect(result.message).toContain('Network');
      expect(result.canRetry).toBe(true);
    });

    it('should format permission error for display', () => {
      const error = { code: 'permission-denied', message: 'Permission denied' };
      const result = formatErrorForDisplay(error);
      
      expect(result.title).toBe('Access Denied');
      expect(result.canRetry).toBe(false);
    });
  });
});

