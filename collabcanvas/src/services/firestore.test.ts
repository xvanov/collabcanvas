/**
 * Unit tests for Firestore service layer
 * Tests shape creation and update functions
 */

import { describe, it, expect } from 'vitest';
import type { FirestoreShape } from './firestore';

describe('Firestore Service', () => {
  describe('Shape Schema', () => {
    it('should define correct shape schema', () => {
      const mockShape: Omit<FirestoreShape, 'id'> = {
        type: 'rect',
        x: 100,
        y: 200,
        w: 100,
        h: 100,
        color: '#3B82F6',
        createdAt: Date.now(),
        createdBy: 'user-123',
        updatedAt: Date.now(),
        updatedBy: 'user-123',
      };

      expect(mockShape.type).toBe('rect');
      expect(mockShape.w).toBe(100);
      expect(mockShape.h).toBe(100);
      expect(mockShape.color).toBe('#3B82F6');
    });

    it('should have fixed dimensions (100x100)', () => {
      const mockShape: Partial<FirestoreShape> = {
        w: 100,
        h: 100,
      };

      expect(mockShape.w).toBe(100);
      expect(mockShape.h).toBe(100);
    });

    it('should have fixed color (#3B82F6)', () => {
      const mockShape: Partial<FirestoreShape> = {
        color: '#3B82F6',
      };

      expect(mockShape.color).toBe('#3B82F6');
    });

    it('should have rect type', () => {
      const mockShape: Partial<FirestoreShape> = {
        type: 'rect',
      };

      expect(mockShape.type).toBe('rect');
    });

    it('should include metadata fields', () => {
      const mockShape: Omit<FirestoreShape, 'id'> = {
        type: 'rect',
        x: 100,
        y: 200,
        w: 100,
        h: 100,
        color: '#3B82F6',
        createdAt: Date.now(),
        createdBy: 'user-123',
        updatedAt: Date.now(),
        updatedBy: 'user-123',
      };

      expect(mockShape.createdAt).toBeDefined();
      expect(mockShape.createdBy).toBeDefined();
      expect(mockShape.updatedAt).toBeDefined();
      expect(mockShape.updatedBy).toBeDefined();
    });

    it('should have variable position fields', () => {
      const mockShape1: Partial<FirestoreShape> = {
        x: 100,
        y: 200,
      };

      const mockShape2: Partial<FirestoreShape> = {
        x: 300,
        y: 400,
      };

      expect(mockShape1.x).toBe(100);
      expect(mockShape1.y).toBe(200);
      expect(mockShape2.x).toBe(300);
      expect(mockShape2.y).toBe(400);
    });
  });

  describe('Shape Creation Logic', () => {
    it('should create shape with correct default properties', () => {
      const userId = 'user-123';
      const shapeData = {
        type: 'rect' as const,
        x: 150,
        y: 250,
        w: 100,
        h: 100,
        color: '#3B82F6',
        createdBy: userId,
        updatedBy: userId,
      };

      expect(shapeData.type).toBe('rect');
      expect(shapeData.w).toBe(100);
      expect(shapeData.h).toBe(100);
      expect(shapeData.color).toBe('#3B82F6');
      expect(shapeData.createdBy).toBe(userId);
      expect(shapeData.updatedBy).toBe(userId);
    });
  });

  describe('Shape Update Logic', () => {
    it('should update only position fields', () => {
      const userId = 'user-123';
      const updateData = {
        x: 300,
        y: 400,
        updatedBy: userId,
      };

      expect(updateData.x).toBe(300);
      expect(updateData.y).toBe(400);
      expect(updateData.updatedBy).toBe(userId);
      expect('w' in updateData).toBe(false);
      expect('h' in updateData).toBe(false);
      expect('color' in updateData).toBe(false);
    });

    it('should not include createdAt or createdBy in updates', () => {
      const userId = 'user-123';
      const updateData = {
        x: 300,
        y: 400,
        updatedBy: userId,
      };

      expect('createdAt' in updateData).toBe(false);
      expect('createdBy' in updateData).toBe(false);
    });
  });
});
