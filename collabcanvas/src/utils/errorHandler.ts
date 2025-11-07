/**
 * Centralized error handler utility
 * Provides consistent error handling and user-friendly error messages
 */

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}

export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Map Firebase error codes to application error codes
 */
function mapFirebaseError(error: unknown): AppError {
  if (error && typeof error === 'object' && 'code' in error) {
    const firebaseError = error as { code: string; message?: string };
    
    switch (firebaseError.code) {
      case 'permission-denied':
        return {
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission to perform this action.',
          retryable: false,
        };
      case 'unavailable':
      case 'deadline-exceeded':
        return {
          code: 'NETWORK_ERROR',
          message: 'Network error. Please check your connection and try again.',
          retryable: true,
        };
      case 'not-found':
        return {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found.',
          retryable: false,
        };
      case 'unauthenticated':
        return {
          code: 'AUTH_ERROR',
          message: 'You must be logged in to perform this action.',
          retryable: false,
        };
      default:
        return {
          code: 'UNKNOWN_ERROR',
          message: firebaseError.message || 'An unexpected error occurred.',
          retryable: false,
          details: error,
        };
    }
  }
  
  if (error instanceof Error) {
    // Check for permission denied errors in message
    if (error.message.includes('PERMISSION_DENIED') || error.message.includes('permission')) {
      return {
        code: 'PERMISSION_DENIED',
        message: error.message.replace('PERMISSION_DENIED: ', ''),
        retryable: false,
        details: error,
      };
    }
    
    // Check for network errors (case-insensitive)
    const lowerMessage = error.message.toLowerCase();
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection and try again.',
        retryable: true,
        details: error,
      };
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred.',
      retryable: false,
      details: error,
    };
  }
  
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred.',
    retryable: false,
    details: error,
  };
}

/**
 * Handle an error and return a user-friendly AppError
 */
export function handleError(error: unknown): AppError {
  return mapFirebaseError(error);
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: AppError): boolean {
  return error.retryable === true;
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  const appError = handleError(error);
  return appError.message;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const appError = handleError(error);
      
      if (!isRetryableError(appError) || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff: delay = initialDelay * 2^attempt
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Format error for display in UI
 */
export function formatErrorForDisplay(error: unknown): {
  title: string;
  message: string;
  canRetry: boolean;
} {
  const appError = handleError(error);
  
  let title = 'Error';
  switch (appError.code) {
    case 'NETWORK_ERROR':
      title = 'Connection Error';
      break;
    case 'AUTH_ERROR':
      title = 'Authentication Required';
      break;
    case 'PERMISSION_DENIED':
      title = 'Access Denied';
      break;
    case 'NOT_FOUND':
      title = 'Not Found';
      break;
    case 'VALIDATION_ERROR':
      title = 'Validation Error';
      break;
    default:
      title = 'Error';
  }
  
  return {
    title,
    message: appError.message,
    canRetry: isRetryableError(appError),
  };
}

