/**
 * Unit tests for SageMaker Service
 * Tests AC: #1, #17, #18, #19 - Endpoint invocation and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invokeAnnotationEndpoint, type Detection } from './sagemakerService';

// Mock Firebase Functions
const mockCallable = vi.fn();
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => mockCallable),
}));

// Mock firebase module
vi.mock('./firebase', () => ({
  functions: {},
  firestore: {},
  auth: {},
  storage: {},
  database: {},
  rtdb: {},
}));

describe('sagemakerService', () => {
  const mockImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='; // 1x1 PNG
  const mockProjectId = 'test-project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('invokeAnnotationEndpoint', () => {
    it('should successfully invoke endpoint and return detections', async () => {
      const mockDetections: Detection[] = [
        {
          bbox: [100, 150, 400, 500],
          confidence: 0.92,
          name_hint: 'door',
        },
        {
          bbox: [450, 150, 800, 500],
          confidence: 0.88,
          name_hint: 'window',
        },
      ];

      mockCallable.mockResolvedValue({
        data: {
          success: true,
          detections: mockDetections,
        },
      });

      const result = await invokeAnnotationEndpoint(mockImageData, mockProjectId);

      expect(mockCallable).toHaveBeenCalledWith({
        imageData: mockImageData,
        projectId: mockProjectId,
      });
      expect(result).toEqual(mockDetections);
    });

    it('should return empty array when no detections found', async () => {
      mockCallable.mockResolvedValue({
        data: {
          success: true,
          detections: [],
        },
      });

      const result = await invokeAnnotationEndpoint(mockImageData, mockProjectId);

      expect(result).toEqual([]);
    });

    it('should throw user-friendly error when endpoint is not found', async () => {
      mockCallable.mockRejectedValue(new Error('Endpoint not found'));

      await expect(invokeAnnotationEndpoint(mockImageData, mockProjectId)).rejects.toThrow(
        'SageMaker endpoint is not available. Please check endpoint configuration.'
      );
    });

    it('should throw user-friendly error on timeout', async () => {
      mockCallable.mockRejectedValue(new Error('Request timeout'));

      await expect(invokeAnnotationEndpoint(mockImageData, mockProjectId)).rejects.toThrow(
        'Request timed out. The endpoint may be taking longer than expected. Please try again.'
      );
    });

    it('should throw user-friendly error when AWS credentials are not configured', async () => {
      mockCallable.mockRejectedValue(new Error('AWS credentials are not configured'));

      await expect(invokeAnnotationEndpoint(mockImageData, mockProjectId)).rejects.toThrow(
        'AWS credentials are not configured. Please contact support.'
      );
    });

    it('should throw user-friendly error on invalid image format', async () => {
      mockCallable.mockRejectedValue(new Error('Invalid image format'));

      await expect(invokeAnnotationEndpoint(mockImageData, mockProjectId)).rejects.toThrow(
        'Invalid image format. Please ensure the image is a valid PNG.'
      );
    });

    it('should throw generic error for unknown errors', async () => {
      const unknownError = new Error('Unknown error occurred');
      mockCallable.mockRejectedValue(unknownError);

      await expect(invokeAnnotationEndpoint(mockImageData, mockProjectId)).rejects.toThrow(
        'Failed to invoke annotation endpoint: Unknown error occurred'
      );
    });

    it('should handle service failure response', async () => {
      mockCallable.mockResolvedValue({
        data: {
          success: false,
          detections: [],
          error: 'Endpoint service unavailable',
        },
      });

      await expect(invokeAnnotationEndpoint(mockImageData, mockProjectId)).rejects.toThrow(
        'SageMaker endpoint service is unavailable. Please try again later.'
      );
    });

    it('should handle missing detections in response', async () => {
      mockCallable.mockResolvedValue({
        data: {
          success: true,
          detections: undefined,
        },
      });

      const result = await invokeAnnotationEndpoint(mockImageData, mockProjectId);
      expect(result).toEqual([]);
    });
  });
});

