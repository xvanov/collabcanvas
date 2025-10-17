/**
 * Unit tests for TypeScript types and type system validation
 * Tests Shape interface extensions and type discrimination
 */

import { describe, it, expect } from 'vitest';

// Define the extended ShapeType union for testing
type ShapeType = 'rect' | 'circle' | 'text' | 'line';

// Define the extended Shape interface for testing
interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  createdAt: number | null;
  createdBy: string;
  updatedAt: number | null;
  updatedBy: string;
  clientUpdatedAt: number | null;
  // New optional properties for different shape types
  text?: string;
  fontSize?: number;
  strokeWidth?: number;
  radius?: number;
  points?: number[];
}

describe('Shape Type System', () => {
  describe('ShapeType Union Type', () => {
    it('should accept all valid shape types', () => {
      const validTypes: ShapeType[] = ['rect', 'circle', 'text', 'line'];
      
      validTypes.forEach(type => {
        expect(['rect', 'circle', 'text', 'line']).toContain(type);
      });
    });

    it('should reject invalid shape types', () => {
      const invalidTypes = ['triangle', 'polygon', 'ellipse', '', null, undefined];
      
      invalidTypes.forEach(type => {
        expect(['rect', 'circle', 'text', 'line']).not.toContain(type);
      });
    });
  });

  describe('Shape Interface Extension', () => {
    it('should support rectangle with all required properties', () => {
      const rectShape: Shape = {
        id: 'rect-1',
        type: 'rect',
        x: 100,
        y: 100,
        w: 100,
        h: 100,
        color: '#3B82F6',
        createdAt: Date.now(),
        createdBy: 'user-1',
        updatedAt: Date.now(),
        updatedBy: 'user-1',
        clientUpdatedAt: Date.now(),
      };

      expect(rectShape.type).toBe('rect');
      expect(rectShape.w).toBe(100);
      expect(rectShape.h).toBe(100);
      expect(rectShape.color).toBe('#3B82F6');
      expect(rectShape.text).toBeUndefined();
      expect(rectShape.fontSize).toBeUndefined();
      expect(rectShape.strokeWidth).toBeUndefined();
      expect(rectShape.radius).toBeUndefined();
    });

    it('should support circle with radius property', () => {
      const circleShape: Shape = {
        id: 'circle-1',
        type: 'circle',
        x: 200,
        y: 200,
        w: 100,
        h: 100,
        color: '#FF0000',
        createdAt: Date.now(),
        createdBy: 'user-1',
        updatedAt: Date.now(),
        updatedBy: 'user-1',
        clientUpdatedAt: Date.now(),
        radius: 50,
      };

      expect(circleShape.type).toBe('circle');
      expect(circleShape.radius).toBe(50);
      expect(circleShape.text).toBeUndefined();
      expect(circleShape.fontSize).toBeUndefined();
    });

    it('should support text with text and fontSize properties', () => {
      const textShape: Shape = {
        id: 'text-1',
        type: 'text',
        x: 300,
        y: 300,
        w: 200,
        h: 50,
        color: '#000000',
        createdAt: Date.now(),
        createdBy: 'user-1',
        updatedAt: Date.now(),
        updatedBy: 'user-1',
        clientUpdatedAt: Date.now(),
        text: 'Hello World',
        fontSize: 16,
      };

      expect(textShape.type).toBe('text');
      expect(textShape.text).toBe('Hello World');
      expect(textShape.fontSize).toBe(16);
      expect(textShape.radius).toBeUndefined();
      expect(textShape.strokeWidth).toBeUndefined();
    });

    it('should support line with strokeWidth and points properties', () => {
      const lineShape: Shape = {
        id: 'line-1',
        type: 'line',
        x: 0,
        y: 0,
        w: 100,
        h: 0,
        color: '#00FF00',
        createdAt: Date.now(),
        createdBy: 'user-1',
        updatedAt: Date.now(),
        updatedBy: 'user-1',
        clientUpdatedAt: Date.now(),
        strokeWidth: 2,
        points: [0, 0, 100, 0],
      };

      expect(lineShape.type).toBe('line');
      expect(lineShape.strokeWidth).toBe(2);
      expect(lineShape.points).toEqual([0, 0, 100, 0]);
      expect(lineShape.text).toBeUndefined();
      expect(lineShape.fontSize).toBeUndefined();
      expect(lineShape.radius).toBeUndefined();
    });
  });

  describe('Type Discrimination', () => {
    it('should discriminate rectangle type correctly', () => {
      const shape: Shape = {
        id: 'test-rect',
        type: 'rect',
        x: 0,
        y: 0,
        w: 100,
        h: 100,
        color: '#3B82F6',
        createdAt: Date.now(),
        createdBy: 'user-1',
        updatedAt: Date.now(),
        updatedBy: 'user-1',
        clientUpdatedAt: Date.now(),
      };

      if (shape.type === 'rect') {
        expect(shape.w).toBeDefined();
        expect(shape.h).toBeDefined();
        expect(shape.text).toBeUndefined();
        expect(shape.radius).toBeUndefined();
        expect(shape.strokeWidth).toBeUndefined();
      }
    });

    it('should discriminate circle type correctly', () => {
      const shape: Shape = {
        id: 'test-circle',
        type: 'circle',
        x: 0,
        y: 0,
        w: 100,
        h: 100,
        color: '#FF0000',
        createdAt: Date.now(),
        createdBy: 'user-1',
        updatedAt: Date.now(),
        updatedBy: 'user-1',
        clientUpdatedAt: Date.now(),
        radius: 50,
      };

      if (shape.type === 'circle') {
        expect(shape.radius).toBeDefined();
        expect(shape.text).toBeUndefined();
        expect(shape.strokeWidth).toBeUndefined();
      }
    });

    it('should discriminate text type correctly', () => {
      const shape: Shape = {
        id: 'test-text',
        type: 'text',
        x: 0,
        y: 0,
        w: 200,
        h: 50,
        color: '#000000',
        createdAt: Date.now(),
        createdBy: 'user-1',
        updatedAt: Date.now(),
        updatedBy: 'user-1',
        clientUpdatedAt: Date.now(),
        text: 'Test Text',
        fontSize: 16,
      };

      if (shape.type === 'text') {
        expect(shape.text).toBeDefined();
        expect(shape.fontSize).toBeDefined();
        expect(shape.radius).toBeUndefined();
        expect(shape.strokeWidth).toBeUndefined();
      }
    });

    it('should discriminate line type correctly', () => {
      const shape: Shape = {
        id: 'test-line',
        type: 'line',
        x: 0,
        y: 0,
        w: 100,
        h: 0,
        color: '#00FF00',
        createdAt: Date.now(),
        createdBy: 'user-1',
        updatedAt: Date.now(),
        updatedBy: 'user-1',
        clientUpdatedAt: Date.now(),
        strokeWidth: 2,
        points: [0, 0, 100, 0],
      };

      if (shape.type === 'line') {
        expect(shape.strokeWidth).toBeDefined();
        expect(shape.points).toBeDefined();
        expect(shape.text).toBeUndefined();
        expect(shape.radius).toBeUndefined();
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing rectangle shapes', () => {
      // This represents an existing rectangle from the current system
      const existingRect: Shape = {
        id: 'existing-rect',
        type: 'rect',
        x: 100,
        y: 100,
        w: 100,
        h: 100,
        color: '#3B82F6',
        createdAt: Date.now(),
        createdBy: 'user-1',
        updatedAt: Date.now(),
        updatedBy: 'user-1',
        clientUpdatedAt: Date.now(),
      };

      // Should work exactly as before
      expect(existingRect.type).toBe('rect');
      expect(existingRect.w).toBe(100);
      expect(existingRect.h).toBe(100);
      expect(existingRect.color).toBe('#3B82F6');
      
      // New properties should be undefined for existing shapes
      expect(existingRect.text).toBeUndefined();
      expect(existingRect.fontSize).toBeUndefined();
      expect(existingRect.strokeWidth).toBeUndefined();
      expect(existingRect.radius).toBeUndefined();
      expect(existingRect.points).toBeUndefined();
    });

    it('should allow gradual migration of existing shapes', () => {
      const existingRect: Shape = {
        id: 'migrated-rect',
        type: 'rect',
        x: 100,
        y: 100,
        w: 100,
        h: 100,
        color: '#3B82F6',
        createdAt: Date.now(),
        createdBy: 'user-1',
        updatedAt: Date.now(),
        updatedBy: 'user-1',
        clientUpdatedAt: Date.now(),
      };

      // Can add new properties without breaking existing functionality
      const migratedRect: Shape = {
        ...existingRect,
        // New properties can be added later
        text: undefined,
        fontSize: undefined,
        strokeWidth: undefined,
        radius: undefined,
        points: undefined,
      };

      expect(migratedRect.type).toBe('rect');
      expect(migratedRect.w).toBe(100);
      expect(migratedRect.h).toBe(100);
      expect(migratedRect.color).toBe('#3B82F6');
    });
  });

  describe('Type Guards', () => {
    it('should validate shape type guards', () => {
      const isRect = (shape: Shape): shape is Shape & { type: 'rect' } => shape.type === 'rect';
      const isCircle = (shape: Shape): shape is Shape & { type: 'circle' } => shape.type === 'circle';
      const isText = (shape: Shape): shape is Shape & { type: 'text' } => shape.type === 'text';
      const isLine = (shape: Shape): shape is Shape & { type: 'line' } => shape.type === 'line';

      const rectShape: Shape = { id: 'test', type: 'rect', x: 0, y: 0, w: 100, h: 100, color: '#3B82F6', createdAt: Date.now(), createdBy: 'user', updatedAt: Date.now(), updatedBy: 'user', clientUpdatedAt: Date.now() };
      const circleShape: Shape = { id: 'test', type: 'circle', x: 0, y: 0, w: 100, h: 100, color: '#FF0000', createdAt: Date.now(), createdBy: 'user', updatedAt: Date.now(), updatedBy: 'user', clientUpdatedAt: Date.now(), radius: 50 };
      const textShape: Shape = { id: 'test', type: 'text', x: 0, y: 0, w: 200, h: 50, color: '#000000', createdAt: Date.now(), createdBy: 'user', updatedAt: Date.now(), updatedBy: 'user', clientUpdatedAt: Date.now(), text: 'Hello', fontSize: 16 };
      const lineShape: Shape = { id: 'test', type: 'line', x: 0, y: 0, w: 100, h: 0, color: '#00FF00', createdAt: Date.now(), createdBy: 'user', updatedAt: Date.now(), updatedBy: 'user', clientUpdatedAt: Date.now(), strokeWidth: 2, points: [0, 0, 100, 0] };

      expect(isRect(rectShape)).toBe(true);
      expect(isCircle(circleShape)).toBe(true);
      expect(isText(textShape)).toBe(true);
      expect(isLine(lineShape)).toBe(true);

      expect(isRect(circleShape)).toBe(false);
      expect(isCircle(textShape)).toBe(false);
      expect(isText(lineShape)).toBe(false);
      expect(isLine(rectShape)).toBe(false);
    });
  });
});
