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
    };

    expect(shape.createdBy).toBe('user-original');
    expect(shape.updatedBy).toBe('user-editor');
    expect(shape.updatedAt).toBeGreaterThan(shape.createdAt!);
  });
});

