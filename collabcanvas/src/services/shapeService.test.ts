/**
 * Unit tests for Shape Service - Bounding Box Creation
 * Tests AC: #3, #5, #6, #7
 */

import { describe, it, expect } from 'vitest';
import { createBoundingBoxShape } from './shapeService';

describe('shapeService - Bounding Box', () => {
  const mockUserId = 'test-user';
  const mockLayerId = 'test-layer';

  describe('createBoundingBoxShape', () => {
    it('should create a manual bounding box shape with item type', () => {
      const shape = createBoundingBoxShape(
        100,
        150,
        300,
        350,
        'window',
        '#3B82F6',
        mockUserId,
        mockLayerId,
        'manual'
      );

      expect(shape.type).toBe('boundingbox');
      expect(shape.x).toBe(100);
      expect(shape.y).toBe(150);
      expect(shape.w).toBe(300);
      expect(shape.h).toBe(350);
      expect(shape.itemType).toBe('window');
      expect(shape.source).toBe('manual');
      expect(shape.isAIGenerated).toBe(false);
      expect(shape.confidence).toBeUndefined();
      expect(shape.layerId).toBe(mockLayerId);
    });

    it('should create an AI-generated bounding box shape with confidence', () => {
      const shape = createBoundingBoxShape(
        50,
        75,
        200,
        250,
        'door',
        '#10B981',
        mockUserId,
        mockLayerId,
        'ai',
        0.92,
        true
      );

      expect(shape.type).toBe('boundingbox');
      expect(shape.itemType).toBe('door');
      expect(shape.source).toBe('ai');
      expect(shape.isAIGenerated).toBe(true);
      expect(shape.confidence).toBe(0.92);
      expect(shape.layerId).toBe(mockLayerId);
    });

    it('should set isAIGenerated based on source when not explicitly provided', () => {
      const aiShape = createBoundingBoxShape(
        0,
        0,
        100,
        100,
        'window',
        '#10B981',
        mockUserId,
        mockLayerId,
        'ai',
        0.85
      );

      expect(aiShape.isAIGenerated).toBe(true);

      const manualShape = createBoundingBoxShape(
        0,
        0,
        100,
        100,
        'door',
        '#3B82F6',
        mockUserId,
        mockLayerId,
        'manual'
      );

      expect(manualShape.isAIGenerated).toBe(false);
    });

    it('should include all required shape properties', () => {
      const shape = createBoundingBoxShape(
        10,
        20,
        100,
        200,
        'stove',
        '#EF4444',
        mockUserId,
        mockLayerId
      );

      expect(shape.id).toBeDefined();
      expect(shape.createdAt).toBeDefined();
      expect(shape.createdBy).toBe(mockUserId);
      expect(shape.updatedAt).toBeDefined();
      expect(shape.updatedBy).toBe(mockUserId);
      expect(shape.clientUpdatedAt).toBeDefined();
      expect(shape.strokeWidth).toBe(2);
    });
  });
});
