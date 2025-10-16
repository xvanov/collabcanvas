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

    it('should updateShapePosition only updates x,y coordinates, not size or color', () => {
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
});
