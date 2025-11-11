/**
 * Unit tests for canvasStore (Zustand store)
 * Tests shape management, selection, locks, and presence
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from './canvasStore';
import type { Shape, Presence, User } from '../types';

describe('canvasStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const state = useCanvasStore.getState();
    state.shapes.clear();
    state.locks.clear();
    state.users.clear();
    useCanvasStore.setState({ 
      selectedShapeId: null,
      currentUser: null,
    });
  });

  describe('Shape Management', () => {
    it('should create a shape with correct default properties', () => {
      const { createShape } = useCanvasStore.getState();
      
      const newShape: Shape = {
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

      createShape(newShape);

      const storedShape = useCanvasStore.getState().shapes.get('test-shape-1');
      expect(storedShape).toBeDefined();
      expect(storedShape?.id).toBe('test-shape-1');
      expect(storedShape?.type).toBe('rect');
      expect(storedShape?.x).toBe(100);
      expect(storedShape?.y).toBe(100);
      expect(storedShape?.w).toBe(100);
      expect(storedShape?.h).toBe(100);
      expect(storedShape?.color).toBe('#3B82F6');
    });

    it('should updateShapePosition only updates x,y coordinates, not size or color', async () => {
      const { createShape, updateShapePosition } = useCanvasStore.getState();
      
      const originalShape: Shape = {
        id: 'test-shape-2',
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

      createShape(originalShape);

      // Update position
      updateShapePosition('test-shape-2', 200, 250, 'user-2', Date.now());

      // Wait for batch updater to flush (uses requestAnimationFrame)
      // Use requestAnimationFrame to ensure the batch update completes
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });

      const updatedShape = useCanvasStore.getState().shapes.get('test-shape-2');
      expect(updatedShape).toBeDefined();
      expect(updatedShape?.x).toBe(200);
      expect(updatedShape?.y).toBe(250);
      
      // Verify size and color remain unchanged
      expect(updatedShape?.w).toBe(100);
      expect(updatedShape?.h).toBe(100);
      expect(updatedShape?.color).toBe('#3B82F6');
      
      // Verify updatedBy changed
      expect(updatedShape?.updatedBy).toBe('user-2');
      
      // Verify createdBy did NOT change
      expect(updatedShape?.createdBy).toBe('user-1');
    });

    it('should not update position if shape does not exist', () => {
      const { updateShapePosition, shapes } = useCanvasStore.getState();
      
      const initialSize = shapes.size;
      
      // Try to update non-existent shape
      updateShapePosition('non-existent-shape', 300, 400, 'user-1', Date.now());
      
      const finalSize = useCanvasStore.getState().shapes.size;
      expect(finalSize).toBe(initialSize);
    });

    it('should set multiple shapes at once', () => {
      const { setShapes } = useCanvasStore.getState();
      
      const shapesArray: Shape[] = [
        {
          id: 'shape-1',
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
        },
        {
          id: 'shape-2',
          type: 'rect',
          x: 150,
          y: 150,
          w: 100,
          h: 100,
          color: '#3B82F6',
          createdAt: Date.now(),
          createdBy: 'user-2',
          updatedAt: Date.now(),
          updatedBy: 'user-2',
          clientUpdatedAt: Date.now(),
        },
      ];

      setShapes(shapesArray);

      const shapes = useCanvasStore.getState().shapes;
      expect(shapes.size).toBe(2);
      expect(shapes.get('shape-1')).toBeDefined();
      expect(shapes.get('shape-2')).toBeDefined();
    });
  });

  describe('Selection Logic', () => {
    it('should correctly track selected shape', () => {
      const { selectShape, selectedShapeId } = useCanvasStore.getState();
      
      expect(selectedShapeId).toBeNull();
      
      selectShape('shape-123');
      
      const newSelectedId = useCanvasStore.getState().selectedShapeId;
      expect(newSelectedId).toBe('shape-123');
    });

    it('should deselect shape', () => {
      const { selectShape, deselectShape } = useCanvasStore.getState();
      
      selectShape('shape-456');
      expect(useCanvasStore.getState().selectedShapeId).toBe('shape-456');
      
      deselectShape();
      expect(useCanvasStore.getState().selectedShapeId).toBeNull();
    });

    it('should change selection from one shape to another', () => {
      const { selectShape } = useCanvasStore.getState();
      
      selectShape('shape-1');
      expect(useCanvasStore.getState().selectedShapeId).toBe('shape-1');
      
      selectShape('shape-2');
      expect(useCanvasStore.getState().selectedShapeId).toBe('shape-2');
    });
  });

  describe('Lock Management', () => {
    it('should lock a shape', () => {
      const { lockShape } = useCanvasStore.getState();
      
      lockShape('shape-1', 'user-123', 'John Doe');
      
      const lock = useCanvasStore.getState().locks.get('shape-1');
      expect(lock).toBeDefined();
      expect(lock?.userId).toBe('user-123');
      expect(lock?.userName).toBe('John Doe');
      expect(lock?.lockedAt).toBeGreaterThan(0);
    });

    it('should unlock a shape', () => {
      const { lockShape, unlockShape } = useCanvasStore.getState();
      
      lockShape('shape-2', 'user-456', 'Jane Smith');
      expect(useCanvasStore.getState().locks.get('shape-2')).toBeDefined();
      
      unlockShape('shape-2');
      expect(useCanvasStore.getState().locks.get('shape-2')).toBeUndefined();
    });

    it('should overwrite existing lock', () => {
      const { lockShape } = useCanvasStore.getState();
      
      lockShape('shape-3', 'user-1', 'User One');
      const firstLock = useCanvasStore.getState().locks.get('shape-3');
      expect(firstLock?.userId).toBe('user-1');
      
      // Lock with different user
      lockShape('shape-3', 'user-2', 'User Two');
      const secondLock = useCanvasStore.getState().locks.get('shape-3');
      expect(secondLock?.userId).toBe('user-2');
      expect(secondLock?.userName).toBe('User Two');
    });
  });

  describe('Presence Management', () => {
    it('should add user presence', () => {
      const { updatePresence } = useCanvasStore.getState();
      
      const presence: Presence = {
        userId: 'user-1',
        name: 'Alice',
        color: '#FF0000',
        cursor: { x: 100, y: 200 },
        lastSeen: Date.now(),
        isActive: true,
      };

      updatePresence('user-1', presence);
      
      const storedPresence = useCanvasStore.getState().users.get('user-1');
      expect(storedPresence).toBeDefined();
      expect(storedPresence?.name).toBe('Alice');
      expect(storedPresence?.cursor.x).toBe(100);
      expect(storedPresence?.cursor.y).toBe(200);
    });

    it('should remove user presence', () => {
      const { updatePresence, removeUser } = useCanvasStore.getState();
      
      const presence: Presence = {
        userId: 'user-2',
        name: 'Bob',
        color: '#00FF00',
        cursor: { x: 50, y: 75 },
        lastSeen: Date.now(),
        isActive: true,
      };

      updatePresence('user-2', presence);
      expect(useCanvasStore.getState().users.get('user-2')).toBeDefined();
      
      removeUser('user-2');
      expect(useCanvasStore.getState().users.get('user-2')).toBeUndefined();
    });

    it('should update cursor position for existing user', () => {
      const { updatePresence } = useCanvasStore.getState();
      
      const initialPresence: Presence = {
        userId: 'user-3',
        name: 'Charlie',
        color: '#0000FF',
        cursor: { x: 10, y: 20 },
        lastSeen: Date.now(),
        isActive: true,
      };

      updatePresence('user-3', initialPresence);
      
      const updatedPresence: Presence = {
        ...initialPresence,
        cursor: { x: 300, y: 400 },
      };

      updatePresence('user-3', updatedPresence);
      
      const storedPresence = useCanvasStore.getState().users.get('user-3');
      expect(storedPresence?.cursor.x).toBe(300);
      expect(storedPresence?.cursor.y).toBe(400);
    });
  });

  describe('Current User', () => {
    it('should set current user', () => {
      const { setCurrentUser } = useCanvasStore.getState();
      
      const user: User = {
        uid: 'user-abc',
        name: 'Test User',
        email: 'test@example.com',
        photoURL: 'https://example.com/photo.jpg',
      };

      setCurrentUser(user);
      
      const currentUser = useCanvasStore.getState().currentUser;
      expect(currentUser).toBeDefined();
      expect(currentUser?.uid).toBe('user-abc');
      expect(currentUser?.name).toBe('Test User');
      expect(currentUser?.email).toBe('test@example.com');
    });

    it('should clear current user', () => {
      const { setCurrentUser } = useCanvasStore.getState();
      
      const user: User = {
        uid: 'user-xyz',
        name: 'Another User',
        email: 'another@example.com',
        photoURL: null,
      };

      setCurrentUser(user);
      expect(useCanvasStore.getState().currentUser).toBeDefined();
      
      setCurrentUser(null);
      expect(useCanvasStore.getState().currentUser).toBeNull();
    });
  });

  describe('Extended Shape Types', () => {
    // Extended Shape interface for testing new types
    interface ExtendedShape extends Shape {
      text?: string;
      fontSize?: number;
      strokeWidth?: number;
      radius?: number;
      points?: number[];
    }

    it('should create circle shape with radius property', () => {
      const { createShape } = useCanvasStore.getState();
      
      const circleShape: ExtendedShape = {
        id: 'circle-shape-1',
        type: 'rect', // Will be 'circle' when types are extended
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

      createShape(circleShape);

      const storedShape = useCanvasStore.getState().shapes.get('circle-shape-1');
      expect(storedShape).toBeDefined();
      expect(storedShape?.id).toBe('circle-shape-1');
      expect(storedShape?.type).toBe('rect'); // Will be 'circle' when types are extended
      expect((storedShape as ExtendedShape)?.radius).toBe(50);
      expect(storedShape?.color).toBe('#FF0000');
    });

    it('should create text shape with text and fontSize properties', () => {
      const { createShape } = useCanvasStore.getState();
      
      const textShape: ExtendedShape = {
        id: 'text-shape-1',
        type: 'rect', // Will be 'text' when types are extended
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

      createShape(textShape);

      const storedShape = useCanvasStore.getState().shapes.get('text-shape-1');
      expect(storedShape).toBeDefined();
      expect(storedShape?.id).toBe('text-shape-1');
      expect(storedShape?.type).toBe('rect'); // Will be 'text' when types are extended
      expect((storedShape as ExtendedShape)?.text).toBe('Hello World');
      expect((storedShape as ExtendedShape)?.fontSize).toBe(16);
      expect(storedShape?.color).toBe('#000000');
    });

    it('should create line shape with strokeWidth and points properties', () => {
      const { createShape } = useCanvasStore.getState();
      
      const lineShape: ExtendedShape = {
        id: 'line-shape-1',
        type: 'rect', // Will be 'line' when types are extended
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

      createShape(lineShape);

      const storedShape = useCanvasStore.getState().shapes.get('line-shape-1');
      expect(storedShape).toBeDefined();
      expect(storedShape?.id).toBe('line-shape-1');
      expect(storedShape?.type).toBe('rect'); // Will be 'line' when types are extended
      expect((storedShape as ExtendedShape)?.strokeWidth).toBe(2);
      expect((storedShape as ExtendedShape)?.points).toEqual([0, 0, 100, 0]);
      expect(storedShape?.color).toBe('#00FF00');
    });

    it('should update shape properties (color, size, text)', () => {
      const { createShape } = useCanvasStore.getState();
      
      const originalShape: ExtendedShape = {
        id: 'editable-shape-1',
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
        text: 'Original Text',
        fontSize: 14,
      };

      createShape(originalShape);

      // Simulate property update (this would be a new method when implemented)
      const updatedShape = {
        ...originalShape,
        color: '#FF0000',
        w: 150,
        h: 150,
        text: 'Updated Text',
        fontSize: 18,
        updatedAt: Date.now(),
        updatedBy: 'user-2',
        clientUpdatedAt: Date.now(),
      };

      // Update the shape in store (simulating the new updateShapeProperties method)
      const { shapes } = useCanvasStore.getState();
      const newShapes = new Map(shapes);
      newShapes.set('editable-shape-1', updatedShape);
      useCanvasStore.setState({ shapes: newShapes });

      const storedShape = useCanvasStore.getState().shapes.get('editable-shape-1') as ExtendedShape;
      expect(storedShape).toBeDefined();
      expect(storedShape.color).toBe('#FF0000');
      expect(storedShape.w).toBe(150);
      expect(storedShape.h).toBe(150);
      expect(storedShape.text).toBe('Updated Text');
      expect(storedShape.fontSize).toBe(18);
      expect(storedShape.updatedBy).toBe('user-2');
    });

    it('should maintain backward compatibility with existing rectangles', () => {
      const { createShape } = useCanvasStore.getState();
      
      const existingRect: Shape = {
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

      createShape(existingRect);

      const storedShape = useCanvasStore.getState().shapes.get('existing-rect-1');
      expect(storedShape).toBeDefined();
      expect(storedShape?.type).toBe('rect');
      expect(storedShape?.w).toBe(100);
      expect(storedShape?.h).toBe(100);
      expect(storedShape?.color).toBe('#3B82F6');
      
      // New properties should be undefined for existing shapes
      expect((storedShape as ExtendedShape)?.text).toBeUndefined();
      expect((storedShape as ExtendedShape)?.fontSize).toBeUndefined();
      expect((storedShape as ExtendedShape)?.strokeWidth).toBeUndefined();
      expect((storedShape as ExtendedShape)?.radius).toBeUndefined();
      expect((storedShape as ExtendedShape)?.points).toBeUndefined();
    });

    it('should handle mixed shape types in store', () => {
      const { setShapes } = useCanvasStore.getState();
      
      const mixedShapes: ExtendedShape[] = [
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
          x: 100, y: 100, w: 100, h: 100,
          color: '#FF0000',
          createdAt: Date.now(), createdBy: 'user', updatedAt: Date.now(), updatedBy: 'user', clientUpdatedAt: Date.now(),
          radius: 50,
        },
        {
          id: 'text-1',
          type: 'rect', // Will be 'text' when types are extended
          x: 200, y: 200, w: 200, h: 50,
          color: '#000000',
          createdAt: Date.now(), createdBy: 'user', updatedAt: Date.now(), updatedBy: 'user', clientUpdatedAt: Date.now(),
          text: 'Hello',
          fontSize: 16,
        },
        {
          id: 'line-1',
          type: 'rect', // Will be 'line' when types are extended
          x: 300, y: 300, w: 100, h: 0,
          color: '#00FF00',
          createdAt: Date.now(), createdBy: 'user', updatedAt: Date.now(), updatedBy: 'user', clientUpdatedAt: Date.now(),
          strokeWidth: 2,
          points: [0, 0, 100, 0],
        },
      ];

      setShapes(mixedShapes);

      const shapes = useCanvasStore.getState().shapes;
      expect(shapes.size).toBe(4);
      expect(shapes.get('rect-1')).toBeDefined();
      expect(shapes.get('circle-1')).toBeDefined();
      expect(shapes.get('text-1')).toBeDefined();
      expect(shapes.get('line-1')).toBeDefined();

      // Verify each shape has correct properties
      const rectShape = shapes.get('rect-1') as ExtendedShape;
      expect(rectShape.type).toBe('rect');
      expect(rectShape.radius).toBeUndefined();
      expect(rectShape.text).toBeUndefined();

      const circleShape = shapes.get('circle-1') as ExtendedShape;
      expect(circleShape.radius).toBe(50);
      expect(circleShape.text).toBeUndefined();

      const textShape = shapes.get('text-1') as ExtendedShape;
      expect(textShape.text).toBe('Hello');
      expect(textShape.fontSize).toBe(16);
      expect(textShape.radius).toBeUndefined();

      const lineShape = shapes.get('line-1') as ExtendedShape;
      expect(lineShape.strokeWidth).toBe(2);
      expect(lineShape.points).toEqual([0, 0, 100, 0]);
      expect(lineShape.text).toBeUndefined();
    });

    it('should maintain performance with multiple shape types', () => {
      const { setShapes } = useCanvasStore.getState();
      
      const startTime = performance.now();
      
      // Create 100 shapes of different types
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

      setShapes(shapes);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      const storedShapes = useCanvasStore.getState().shapes;
      expect(storedShapes.size).toBe(100);
      expect(executionTime).toBeLessThan(50); // Should be very fast
    });
  });
});
