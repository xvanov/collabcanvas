/**
 * Integration tests for SageMaker Service
 * Tests AC: #1, #17, #18, #19 - Endpoint invocation and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invokeAnnotationEndpoint } from './sagemakerService';
import type { Detection } from './sagemakerService';

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

describe('sagemakerService Integration', () => {
  const mockImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const mockProjectId = 'test-project';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('invokeAnnotationEndpoint - Integration', () => {
    it('should successfully invoke endpoint and process detections', async () => {
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
      expect(result.length).toBe(2);
      expect(result[0].name_hint).toBe('door');
      expect(result[1].name_hint).toBe('window');
    });

    it('should handle empty detections response', async () => {
      mockCallable.mockResolvedValue({
        data: {
          success: true,
          detections: [],
          message: 'No items detected in the image',
        },
      });

      const result = await invokeAnnotationEndpoint(mockImageData, mockProjectId);

      expect(result).toEqual([]);
    });

    it('should handle endpoint timeout error', async () => {
      mockCallable.mockRejectedValue(new Error('Request timeout'));

      await expect(invokeAnnotationEndpoint(mockImageData, mockProjectId)).rejects.toThrow(
        'Request timed out'
      );
    });

    it('should handle endpoint unavailable error', async () => {
      mockCallable.mockRejectedValue(new Error('Endpoint service unavailable'));

      await expect(invokeAnnotationEndpoint(mockImageData, mockProjectId)).rejects.toThrow(
        'SageMaker endpoint service is unavailable'
      );
    });
  });
});


