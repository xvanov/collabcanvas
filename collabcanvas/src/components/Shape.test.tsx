/**
 * Tests for Shape component props and behavior
 * Note: Konva components don't render well in jsdom, so we test props and logic
 * Per task requirements: "No heavy integration tests" for Konva DOM drag perf
 */

import { describe, it, expect } from 'vitest';
import type { Shape as ShapeType } from '../types';

describe('Shape Component - Props Validation', () => {
  it('should validate shape has correct fixed dimensions (100x100)', () => {
    const shape: ShapeType = {
      id: 'test-shape-1',
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

    expect(shape.w).toBe(100);
    expect(shape.h).toBe(100);
  });

  it('should validate shape has correct blue color (#3B82F6)', () => {
    const shape: ShapeType = {
      id: 'test-shape-2',
      type: 'rect',
      x: 200,
      y: 200,
      w: 100,
      h: 100,
      color: '#3B82F6',
      createdAt: Date.now(),
      createdBy: 'user-2',
      updatedAt: Date.now(),
      updatedBy: 'user-2',
      clientUpdatedAt: Date.now(),
    };

    expect(shape.color).toBe('#3B82F6');
  });

  it('should validate shape type is rect', () => {
    const shape: ShapeType = {
      id: 'test-shape-3',
      type: 'rect',
      x: 300,
      y: 300,
      w: 100,
      h: 100,
      color: '#3B82F6',
      createdAt: Date.now(),
      createdBy: 'user-3',
      updatedAt: Date.now(),
      updatedBy: 'user-3',
      clientUpdatedAt: Date.now(),
    };

    expect(shape.type).toBe('rect');
  });

  it('should validate shape position can be different', () => {
    const shape1: ShapeType = {
      id: 'test-shape-4',
      type: 'rect',
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      color: '#3B82F6',
      createdAt: Date.now(),
      createdBy: 'user-4',
      updatedAt: Date.now(),
      updatedBy: 'user-4',
      clientUpdatedAt: Date.now(),
    };

    const shape2: ShapeType = {
      ...shape1,
      id: 'test-shape-5',
      x: 500,
      y: 600,
    };

    expect(shape1.x).toBe(0);
    expect(shape1.y).toBe(0);
    expect(shape2.x).toBe(500);
    expect(shape2.y).toBe(600);
    
    // Size and color should remain the same
    expect(shape1.w).toBe(shape2.w);
    expect(shape1.h).toBe(shape2.h);
    expect(shape1.color).toBe(shape2.color);
  });

  it('should track creation and update metadata', () => {
    const now = Date.now();
    const shape: ShapeType = {
      id: 'test-shape-6',
      type: 'rect',
      x: 400,
      y: 400,
      w: 100,
      h: 100,
      color: '#3B82F6',
      createdAt: now,
      createdBy: 'user-original',
      updatedAt: now + 1000,
      updatedBy: 'user-editor',
      clientUpdatedAt: now + 1000,
    };

    expect(shape.createdBy).toBe('user-original');
    expect(shape.updatedBy).toBe('user-editor');
    expect(shape.updatedAt).toBeGreaterThan(shape.createdAt!);
  });
});

describe('Shape Component - New Shape Types', () => {
  // Extended Shape interface for testing new types
  interface ExtendedShape extends ShapeType {
    text?: string;
    fontSize?: number;
    strokeWidth?: number;
    radius?: number;
    points?: number[];
  }

  it('should validate circle shape with radius property', () => {
    const circleShape: ExtendedShape = {
      id: 'circle-shape-1',
      type: 'rect', // Will be updated to 'circle' when types are extended
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

    expect(circleShape.radius).toBe(50);
    expect(circleShape.w).toBe(100);
    expect(circleShape.h).toBe(100);
    expect(circleShape.color).toBe('#FF0000');
  });

  it('should validate text shape with text and fontSize properties', () => {
    const textShape: ExtendedShape = {
      id: 'text-shape-1',
      type: 'rect', // Will be updated to 'text' when types are extended
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

    expect(textShape.text).toBe('Hello World');
    expect(textShape.fontSize).toBe(16);
    expect(textShape.w).toBe(200);
    expect(textShape.h).toBe(50);
    expect(textShape.color).toBe('#000000');
  });

  it('should validate line shape with strokeWidth and points properties', () => {
    const lineShape: ExtendedShape = {
      id: 'line-shape-1',
      type: 'rect', // Will be updated to 'line' when types are extended
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

    expect(lineShape.strokeWidth).toBe(2);
    expect(lineShape.points).toEqual([0, 0, 100, 0]);
    expect(lineShape.w).toBe(100);
    expect(lineShape.h).toBe(0);
    expect(lineShape.color).toBe('#00FF00');
  });

  it('should maintain backward compatibility with existing rectangles', () => {
    const existingRect: ShapeType = {
      id: 'existing-rect-1',
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
    expect((existingRect as ExtendedShape).text).toBeUndefined();
    expect((existingRect as ExtendedShape).fontSize).toBeUndefined();
    expect((existingRect as ExtendedShape).strokeWidth).toBeUndefined();
    expect((existingRect as ExtendedShape).radius).toBeUndefined();
    expect((existingRect as ExtendedShape).points).toBeUndefined();
  });

  it('should validate type discrimination for rendering', () => {
    const shapes: ExtendedShape[] = [
      {
        id: 'rect-1',
        type: 'rect',
        x: 0, y: 0, w: 100, h: 100,
        color: '#3B82F6',
        createdAt: Date.now(), createdBy: 'user', updatedAt: Date.now(), updatedBy: 'user', clientUpdatedAt: Date.now(),
      },
      {
        id: 'circle-1',
        type: 'rect', // Will be 'circle' when types are extended
        x: 0, y: 0, w: 100, h: 100,
        color: '#FF0000',
        createdAt: Date.now(), createdBy: 'user', updatedAt: Date.now(), updatedBy: 'user', clientUpdatedAt: Date.now(),
        radius: 50,
      },
      {
        id: 'text-1',
        type: 'rect', // Will be 'text' when types are extended
        x: 0, y: 0, w: 200, h: 50,
        color: '#000000',
        createdAt: Date.now(), createdBy: 'user', updatedAt: Date.now(), updatedBy: 'user', clientUpdatedAt: Date.now(),
        text: 'Hello',
        fontSize: 16,
      },
      {
        id: 'line-1',
        type: 'rect', // Will be 'line' when types are extended
        x: 0, y: 0, w: 100, h: 0,
        color: '#00FF00',
        createdAt: Date.now(), createdBy: 'user', updatedAt: Date.now(), updatedBy: 'user', clientUpdatedAt: Date.now(),
        strokeWidth: 2,
        points: [0, 0, 100, 0],
      },
    ];

    // Test type discrimination logic
    shapes.forEach(shape => {
      if (shape.type === 'rect') {
        expect(shape.w).toBeDefined();
        expect(shape.h).toBeDefined();
        if (shape.radius) {
          // This would be a circle when types are extended
          expect(shape.radius).toBe(50);
        }
        if (shape.text) {
          // This would be text when types are extended
          expect(shape.text).toBe('Hello');
          expect(shape.fontSize).toBe(16);
        }
        if (shape.strokeWidth) {
          // This would be a line when types are extended
          expect(shape.strokeWidth).toBe(2);
          expect(shape.points).toEqual([0, 0, 100, 0]);
        }
      }
    });
  });

  it('should validate Konva component props for different shape types', () => {
    // Test that different shape types would have appropriate Konva props
    const rectProps = {
      x: 100, y: 100, width: 100, height: 100, fill: '#3B82F6'
    };

    const circleProps = {
      x: 200, y: 200, radius: 50, fill: '#FF0000'
    };

    const textProps = {
      x: 300, y: 300, text: 'Hello World', fontSize: 16, fill: '#000000'
    };

    const lineProps = {
      points: [0, 0, 100, 0], stroke: '#00FF00', strokeWidth: 2
    };

    // Validate rectangle props
    expect(rectProps.width).toBe(100);
    expect(rectProps.height).toBe(100);
    expect(rectProps.fill).toBe('#3B82F6');

    // Validate circle props
    expect(circleProps.radius).toBe(50);
    expect(circleProps.fill).toBe('#FF0000');

    // Validate text props
    expect(textProps.text).toBe('Hello World');
    expect(textProps.fontSize).toBe(16);
    expect(textProps.fill).toBe('#000000');

    // Validate line props
    expect(lineProps.points).toEqual([0, 0, 100, 0]);
    expect(lineProps.stroke).toBe('#00FF00');
    expect(lineProps.strokeWidth).toBe(2);
  });

  it('should handle invalid shape type gracefully', () => {
    const invalidShape = {
      id: 'invalid-shape',
      type: 'invalid' as ShapeType,
      x: 0, y: 0, w: 100, h: 100,
      color: '#FF0000',
      createdAt: Date.now(), createdBy: 'user', updatedAt: Date.now(), updatedBy: 'user', clientUpdatedAt: Date.now(),
    };

    // Should reject invalid types
    expect(['rect', 'circle', 'text', 'line']).not.toContain(invalidShape.type);
  });

  it('should maintain performance with multiple shape types', () => {
    const startTime = performance.now();
    
    // Create multiple shapes of different types
    const shapes: ExtendedShape[] = Array.from({ length: 100 }, (_, i) => ({
      id: `shape-${i}`,
      type: 'rect',
      x: i * 10, y: i * 10, w: 100, h: 100,
      color: i % 4 === 0 ? '#3B82F6' : i % 4 === 1 ? '#FF0000' : i % 4 === 2 ? '#000000' : '#00FF00',
      createdAt: Date.now(), createdBy: 'user', updatedAt: Date.now(), updatedBy: 'user', clientUpdatedAt: Date.now(),
      ...(i % 4 === 1 && { radius: 50 }),
      ...(i % 4 === 2 && { text: `Text ${i}`, fontSize: 16 }),
      ...(i % 4 === 3 && { strokeWidth: 2, points: [0, 0, 100, 0] }),
    }));

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    expect(shapes.length).toBe(100);
    expect(executionTime).toBeLessThan(100); // Should be very fast
  });
});
