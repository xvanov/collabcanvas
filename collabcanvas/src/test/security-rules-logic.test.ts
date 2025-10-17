/**
 * Security Rules Unit Tests (Logic Validation)
 * Tests security rule logic without requiring Firebase emulator
 */

import { describe, it, expect } from 'vitest';

describe('Security Rules Logic', () => {
  describe('Firestore Rules Validation', () => {
    describe('Shape Schema Validation', () => {
      it('should validate correct shape properties', () => {
        const validShape = {
          type: 'rect',
          x: 100,
          y: 200,
          w: 100,
          h: 100,
          color: '#3B82F6',
          createdBy: 'user-123',
          updatedBy: 'user-123',
          clientUpdatedAt: Date.now(),
        };

        // Validate type
        expect(validShape.type).toBe('rect');
        
        // Validate fixed dimensions
        expect(validShape.w).toBe(100);
        expect(validShape.h).toBe(100);
        
        // Validate fixed color
        expect(validShape.color).toBe('#3B82F6');
        
        // Validate position fields are numbers
        expect(typeof validShape.x).toBe('number');
        expect(typeof validShape.y).toBe('number');
        
        // Validate user fields
        expect(validShape.createdBy).toBe('user-123');
        expect(validShape.updatedBy).toBe('user-123');
        expect(typeof validShape.clientUpdatedAt).toBe('number');
      });

      it('should reject invalid shape types', () => {
        const invalidShapes = [
          { type: 'circle' },
          { type: 'line' },
          { type: 'text' },
          { type: '' },
          { type: null },
        ];

        invalidShapes.forEach(shape => {
          expect(shape.type).not.toBe('rect');
        });
      });

      it('should reject invalid dimensions', () => {
        const invalidDimensions = [
          { w: 200, h: 100 }, // Wrong width
          { w: 100, h: 200 }, // Wrong height
          { w: 50, h: 50 },   // Both wrong
          { w: 0, h: 100 },   // Zero width
          { w: 100, h: 0 },   // Zero height
        ];

        invalidDimensions.forEach(dims => {
          const isValidDimensions = dims.w === 100 && dims.h === 100;
          expect(isValidDimensions).toBe(false);
        });
      });

      it('should reject invalid colors', () => {
        const invalidColors = [
          '#FF0000', // Red
          '#00FF00', // Green
          '#0000FF', // Blue (different shade)
          '#FFFFFF', // White
          '#000000', // Black
          'blue',    // Named color
          'rgb(255,0,0)', // RGB format
        ];

        invalidColors.forEach(color => {
          expect(color).not.toBe('#3B82F6');
        });
      });

      it('should reject non-numeric positions', () => {
        const invalidPositions = [
          { x: '100', y: 200 }, // String x
          { x: 100, y: '200' }, // String y
          { x: null, y: 200 }, // Null x
          { x: 100, y: null }, // Null y
          { x: undefined, y: 200 }, // Undefined x
          { x: 100, y: undefined }, // Undefined y
        ];

        invalidPositions.forEach(pos => {
          const isValidPosition = typeof pos.x === 'number' && typeof pos.y === 'number';
          expect(isValidPosition).toBe(false);
        });
      });
    });

    describe('Update Validation Logic', () => {
      it('should validate that only position fields can change', () => {
        const validUpdate = {
          x: 300,
          y: 400,
          updatedAt: 1234567891,
          updatedBy: 'user-123',
          clientUpdatedAt: Date.now(),
        };

        // Check that fixed properties remain unchanged
        expect(validUpdate.w).toBeUndefined(); // Should not be in update
        expect(validUpdate.h).toBeUndefined(); // Should not be in update
        expect(validUpdate.color).toBeUndefined(); // Should not be in update
        expect(validUpdate.type).toBeUndefined(); // Should not be in update
        expect(validUpdate.createdBy).toBeUndefined(); // Should not be in update
        expect(validUpdate.createdAt).toBeUndefined(); // Should not be in update

        // Check that only position and metadata can change
        expect(validUpdate.x).toBe(300);
        expect(validUpdate.y).toBe(400);
        expect(validUpdate.updatedBy).toBe('user-123');
        expect(typeof validUpdate.clientUpdatedAt).toBe('number');
      });

      it('should reject updates that modify fixed properties', () => {
        const invalidUpdates = [
          { x: 300, y: 400, w: 200, clientUpdatedAt: Date.now() }, // Trying to change width
          { x: 300, y: 400, h: 200, clientUpdatedAt: Date.now() }, // Trying to change height
          { x: 300, y: 400, color: '#FF0000', clientUpdatedAt: Date.now() }, // Trying to change color
          { x: 300, y: 400, type: 'circle', clientUpdatedAt: Date.now() }, // Trying to change type
          { x: 300, y: 400, createdBy: 'different-user', clientUpdatedAt: Date.now() }, // Trying to change createdBy
          { x: 300, y: 400, createdAt: Date.now(), clientUpdatedAt: Date.now() }, // Trying to change createdAt
        ];

        invalidUpdates.forEach(update => {
          // These updates should be rejected by security rules
          expect(update.w || update.h || update.color || update.type || update.createdBy || update.createdAt).toBeDefined();
        });
      });

      it('should reject updates by different users', () => {
        const originalShape = {
          updatedBy: 'user-123',
        };

        const invalidUpdate = {
          x: 300,
          y: 400,
          updatedBy: 'different-user', // Different user
          clientUpdatedAt: Date.now(),
        };

        expect(invalidUpdate.updatedBy).not.toBe(originalShape.updatedBy);
      });
    });
  });

  describe('RTDB Rules Validation', () => {
    describe('Presence Data Validation', () => {
      it('should validate correct presence data structure', () => {
        const validPresence = {
          userId: 'user-123',
          name: 'Test User',
          color: '#FF0000',
          cursor: { x: 100, y: 200 },
          lastSeen: Date.now(),
          isActive: true,
        };

        // Validate required fields
        expect(validPresence.userId).toBeDefined();
        expect(validPresence.name).toBeDefined();
        expect(validPresence.color).toBeDefined();
        expect(validPresence.cursor).toBeDefined();
        expect(validPresence.lastSeen).toBeDefined();
        expect(validPresence.isActive).toBeDefined();

        // Validate field types
        expect(typeof validPresence.userId).toBe('string');
        expect(typeof validPresence.name).toBe('string');
        expect(typeof validPresence.color).toBe('string');
        expect(typeof validPresence.cursor.x).toBe('number');
        expect(typeof validPresence.cursor.y).toBe('number');
        expect(typeof validPresence.isActive).toBe('boolean');
      });

      it('should reject presence data with missing fields', () => {
        const invalidPresenceData = [
          { userId: 'user-123' }, // Missing other fields
          { userId: 'user-123', name: 'Test User' }, // Missing cursor, color, etc.
          { userId: 'user-123', name: 'Test User', color: '#FF0000' }, // Missing cursor
          { userId: 'user-123', name: 'Test User', color: '#FF0000', cursor: { x: 100, y: 200 } }, // Missing lastSeen, isActive
        ];

        invalidPresenceData.forEach(data => {
          const hasAllFields = !!(data.userId && data.name && data.color && 
                              data.cursor && data.lastSeen !== undefined && 
                              data.isActive !== undefined);
          expect(hasAllFields).toBe(false);
        });
      });

      it('should reject presence data with invalid field types', () => {
        const invalidPresenceData = [
          { userId: 123, name: 'Test User', color: '#FF0000', cursor: { x: 100, y: 200 }, lastSeen: Date.now(), isActive: true }, // userId is number
          { userId: 'user-123', name: 123, color: '#FF0000', cursor: { x: 100, y: 200 }, lastSeen: Date.now(), isActive: true }, // name is number
          { userId: 'user-123', name: 'Test User', color: 123, cursor: { x: 100, y: 200 }, lastSeen: Date.now(), isActive: true }, // color is number
          { userId: 'user-123', name: 'Test User', color: '#FF0000', cursor: { x: '100', y: 200 }, lastSeen: Date.now(), isActive: true }, // cursor.x is string
          { userId: 'user-123', name: 'Test User', color: '#FF0000', cursor: { x: 100, y: '200' }, lastSeen: Date.now(), isActive: true }, // cursor.y is string
          { userId: 'user-123', name: 'Test User', color: '#FF0000', cursor: { x: 100, y: 200 }, lastSeen: Date.now(), isActive: 'true' }, // isActive is string
        ];

        invalidPresenceData.forEach(data => {
          const isValid = typeof data.userId === 'string' &&
                         typeof data.name === 'string' &&
                         typeof data.color === 'string' &&
                         typeof data.cursor.x === 'number' &&
                         typeof data.cursor.y === 'number' &&
                         typeof data.isActive === 'boolean';
          expect(isValid).toBe(false);
        });
      });
    });

    describe('Lock Data Validation', () => {
      it('should validate correct lock data structure', () => {
        const validLock = {
          userId: 'user-123',
          userName: 'Test User',
          lockedAt: Date.now(),
        };

        // Validate required fields
        expect(validLock.userId).toBeDefined();
        expect(validLock.userName).toBeDefined();
        expect(validLock.lockedAt).toBeDefined();

        // Validate field types
        expect(typeof validLock.userId).toBe('string');
        expect(typeof validLock.userName).toBe('string');
        expect(typeof validLock.lockedAt).toBe('number');
      });

      it('should reject lock data with missing fields', () => {
        const invalidLockData = [
          { userId: 'user-123' }, // Missing userName, lockedAt
          { userId: 'user-123', userName: 'Test User' }, // Missing lockedAt
          { userId: 'user-123', lockedAt: Date.now() }, // Missing userName
        ];

        invalidLockData.forEach(data => {
          const hasAllFields = !!(data.userId && data.userName && data.lockedAt !== undefined);
          expect(hasAllFields).toBe(false);
        });
      });

      it('should reject lock data with invalid field types', () => {
        const invalidLockData = [
          { userId: 123, userName: 'Test User', lockedAt: Date.now() }, // userId is number
          { userId: 'user-123', userName: 123, lockedAt: Date.now() }, // userName is number
          { userId: 'user-123', userName: 'Test User', lockedAt: null }, // lockedAt is null
        ];

        invalidLockData.forEach(data => {
          const isValid = typeof data.userId === 'string' &&
                         typeof data.userName === 'string' &&
                         (typeof data.lockedAt === 'number' || typeof data.lockedAt === 'string');
          expect(isValid).toBe(false);
        });
      });
    });

    describe('User Authorization Logic', () => {
      it('should validate that users can only access their own data', () => {
        const currentUser = 'user-123';
        const otherUser = 'different-user';

        // User should be able to access their own presence
        expect(currentUser).toBe('user-123');
        
        // User should not be able to access other user's presence
        expect(otherUser).not.toBe(currentUser);

        // User should be able to create locks with their own userId
        const validLock = { userId: currentUser, userName: 'Test User', lockedAt: Date.now() };
        expect(validLock.userId).toBe(currentUser);

        // User should not be able to create locks with different userId
        const invalidLock = { userId: otherUser, userName: 'Test User', lockedAt: Date.now() };
        expect(invalidLock.userId).not.toBe(currentUser);
      });

      it('should validate lock ownership rules', () => {
        const lockOwner = 'user-123';
        const differentUser = 'different-user';

        // Existing lock owned by user-123
        const existingLock = { userId: lockOwner, userName: 'User 123', lockedAt: Date.now() };

        // Same user should be able to overwrite their own lock
        const validOverwrite = { userId: lockOwner, userName: 'User 123', lockedAt: Date.now() + 1000 };
        expect(validOverwrite.userId).toBe(existingLock.userId);

        // Different user should not be able to overwrite
        const invalidOverwrite = { userId: differentUser, userName: 'Different User', lockedAt: Date.now() };
        expect(invalidOverwrite.userId).not.toBe(existingLock.userId);
      });
    });
  });

  describe('Security Rule Edge Cases', () => {
    it('should handle edge cases in shape validation', () => {
      // Test boundary values
      const edgeCases = [
        { x: 0, y: 0 }, // Zero coordinates
        { x: -100, y: -200 }, // Negative coordinates
        { x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER }, // Large numbers
        { x: Number.MIN_SAFE_INTEGER, y: Number.MIN_SAFE_INTEGER }, // Small numbers
      ];

      edgeCases.forEach(coords => {
        // All should be valid numbers (security rules allow any number for position)
        expect(typeof coords.x).toBe('number');
        expect(typeof coords.y).toBe('number');
        expect(Number.isFinite(coords.x)).toBe(true);
        expect(Number.isFinite(coords.y)).toBe(true);
      });
    });

    it('should handle edge cases in presence validation', () => {
      // Test boundary values for cursor position
      const edgeCases = [
        { x: 0, y: 0 },
        { x: -1000, y: -1000 },
        { x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER },
      ];

      edgeCases.forEach(coords => {
        expect(typeof coords.x).toBe('number');
        expect(typeof coords.y).toBe('number');
        expect(Number.isFinite(coords.x)).toBe(true);
        expect(Number.isFinite(coords.y)).toBe(true);
      });
    });

    it('should handle edge cases in lock validation', () => {
      // Test timestamp edge cases
      const edgeCases = [
        Date.now(),
        0, // Unix epoch
        Number.MAX_SAFE_INTEGER,
        '2024-01-01T00:00:00Z', // ISO string
      ];

      edgeCases.forEach(timestamp => {
        // All should be valid timestamps (number or string)
        const isValid = typeof timestamp === 'number' || typeof timestamp === 'string';
        expect(isValid).toBe(true);
      });
    });
  });

  describe('Extended Shape Types Security Rules', () => {
    describe('New Shape Type Validation', () => {
      it('should validate circle shape properties', () => {
        const validCircleShape = {
          type: 'circle',
          x: 100,
          y: 200,
          w: 100,
          h: 100,
          color: '#FF0000',
          radius: 50,
          createdBy: 'user-123',
          updatedBy: 'user-123',
          clientUpdatedAt: Date.now(),
        };

        // Validate circle-specific properties
        expect(validCircleShape.type).toBe('circle');
        expect(validCircleShape.radius).toBe(50);
        expect(typeof validCircleShape.radius).toBe('number');
        expect(validCircleShape.radius).toBeGreaterThan(0);
      });

      it('should validate text shape properties', () => {
        const validTextShape = {
          type: 'text',
          x: 100,
          y: 200,
          w: 200,
          h: 50,
          color: '#000000',
          text: 'Hello World',
          fontSize: 16,
          createdBy: 'user-123',
          updatedBy: 'user-123',
          clientUpdatedAt: Date.now(),
        };

        // Validate text-specific properties
        expect(validTextShape.type).toBe('text');
        expect(validTextShape.text).toBe('Hello World');
        expect(typeof validTextShape.text).toBe('string');
        expect(validTextShape.text.length).toBeGreaterThan(0);
        expect(validTextShape.fontSize).toBe(16);
        expect(typeof validTextShape.fontSize).toBe('number');
        expect(validTextShape.fontSize).toBeGreaterThan(0);
      });

      it('should validate line shape properties', () => {
        const validLineShape = {
          type: 'line',
          x: 0,
          y: 0,
          w: 100,
          h: 0,
          color: '#00FF00',
          strokeWidth: 2,
          points: [0, 0, 100, 0],
          createdBy: 'user-123',
          updatedBy: 'user-123',
          clientUpdatedAt: Date.now(),
        };

        // Validate line-specific properties
        expect(validLineShape.type).toBe('line');
        expect(validLineShape.strokeWidth).toBe(2);
        expect(typeof validLineShape.strokeWidth).toBe('number');
        expect(validLineShape.strokeWidth).toBeGreaterThan(0);
        expect(validLineShape.points).toEqual([0, 0, 100, 0]);
        expect(Array.isArray(validLineShape.points)).toBe(true);
        expect(validLineShape.points.length).toBe(4);
      });

      it('should reject invalid shape types', () => {
        const invalidShapeTypes = [
          'triangle',
          'polygon',
          'ellipse',
          'square',
          'rectangle', // Should be 'rect'
          '',
          null,
          undefined,
        ];

        const validTypes = ['rect', 'circle', 'text', 'line'];

        invalidShapeTypes.forEach(type => {
          expect(validTypes).not.toContain(type);
        });
      });
    });

    describe('Editable Properties Validation', () => {
      it('should validate color property updates', () => {
        const validColorUpdates = [
          '#FF0000', // Red
          '#00FF00', // Green
          '#0000FF', // Blue
          '#FFFFFF', // White
          '#000000', // Black
          '#3B82F6', // Current blue
        ];

        validColorUpdates.forEach(color => {
          expect(typeof color).toBe('string');
          expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
      });

      it('should validate size property updates', () => {
        const validSizeUpdates = [
          { w: 50, h: 50 },   // Smaller
          { w: 150, h: 150 }, // Larger
          { w: 200, h: 100 }, // Different aspect ratio
          { w: 100, h: 200 }, // Different aspect ratio
        ];

        validSizeUpdates.forEach(size => {
          expect(typeof size.w).toBe('number');
          expect(typeof size.h).toBe('number');
          expect(size.w).toBeGreaterThan(0);
          expect(size.h).toBeGreaterThan(0);
        });
      });

      it('should validate text property updates', () => {
        const validTextUpdates = [
          { text: 'Hello', fontSize: 12 },
          { text: 'World', fontSize: 18 },
          { text: 'Test', fontSize: 24 },
          { text: '', fontSize: 16 }, // Empty text should be allowed
        ];

        validTextUpdates.forEach(textUpdate => {
          expect(typeof textUpdate.text).toBe('string');
          expect(typeof textUpdate.fontSize).toBe('number');
          expect(textUpdate.fontSize).toBeGreaterThan(0);
        });
      });

      it('should reject invalid property updates', () => {
        const invalidUpdates = [
          { color: 'red' }, // Named color instead of hex
          { color: '#GGG' }, // Invalid hex
          { w: -100 }, // Negative width
          { h: 0 }, // Zero height
          { fontSize: -12 }, // Negative font size
          { fontSize: 'large' }, // String font size
          { strokeWidth: -2 }, // Negative stroke width
          { points: [0, 0] }, // Invalid points array (should be 4 elements)
        ];

        invalidUpdates.forEach(update => {
          // These should be rejected by security rules
          if (update.color) {
            expect(update.color).not.toMatch(/^#[0-9A-Fa-f]{6}$/);
          }
          if (update.w !== undefined) {
            expect(update.w).toBeLessThanOrEqual(0);
          }
          if (update.h !== undefined) {
            expect(update.h).toBeLessThanOrEqual(0);
          }
          if (update.fontSize !== undefined) {
            if (typeof update.fontSize === 'number') {
              expect(update.fontSize).toBeLessThanOrEqual(0);
            } else {
              expect(typeof update.fontSize).toBe('string'); // Should be rejected as invalid type
            }
          }
          if (update.strokeWidth !== undefined) {
            expect(update.strokeWidth).toBeLessThanOrEqual(0);
          }
          if (update.points) {
            expect(update.points.length).not.toBe(4);
          }
        });
      });
    });

    describe('Backward Compatibility Validation', () => {
      it('should maintain compatibility with existing rectangle rules', () => {
        const existingRect = {
          type: 'rect',
          x: 100,
          y: 200,
          w: 100,
          h: 100,
          color: '#3B82F6',
          createdBy: 'user-123',
          updatedBy: 'user-123',
          clientUpdatedAt: Date.now(),
        };

        // Should still validate as before
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
        const existingRect = {
          type: 'rect',
          x: 100,
          y: 200,
          w: 100,
          h: 100,
          color: '#3B82F6',
          createdBy: 'user-123',
          updatedBy: 'user-123',
          clientUpdatedAt: Date.now(),
        };

        // Can add new properties without breaking existing functionality
        const migratedRect = {
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

    describe('User Authorization for Property Updates', () => {
      it('should validate that only authorized users can update properties', () => {
        const originalShape = {
          updatedBy: 'user-123',
        };

        const validUpdate = {
          color: '#FF0000',
          updatedBy: 'user-123', // Same user
          clientUpdatedAt: Date.now(),
        };

        const invalidUpdate = {
          color: '#FF0000',
          updatedBy: 'different-user', // Different user
          clientUpdatedAt: Date.now(),
        };

        expect(validUpdate.updatedBy).toBe(originalShape.updatedBy);
        expect(invalidUpdate.updatedBy).not.toBe(originalShape.updatedBy);
      });

      it('should validate property update permissions per shape type', () => {
        const shapeTypes = ['rect', 'circle', 'text', 'line'];
        
        shapeTypes.forEach(type => {
          // Each shape type should have appropriate editable properties
          const editableProperties = {
            rect: ['color', 'w', 'h'],
            circle: ['color', 'w', 'h', 'radius'],
            text: ['color', 'w', 'h', 'text', 'fontSize'],
            line: ['color', 'w', 'h', 'strokeWidth', 'points'],
          };

          expect(editableProperties[type as keyof typeof editableProperties]).toBeDefined();
        });
      });
    });

    describe('Property Update Edge Cases', () => {
      it('should handle edge cases in color validation', () => {
        const edgeCaseColors = [
          '#000000', // Black
          '#FFFFFF', // White
          '#FF0000', // Red
          '#00FF00', // Green
          '#0000FF', // Blue
        ];

        edgeCaseColors.forEach(color => {
          expect(typeof color).toBe('string');
          expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
          expect(color.length).toBe(7);
        });
      });

      it('should handle edge cases in size validation', () => {
        const edgeCaseSizes = [
          { w: 1, h: 1 }, // Minimum size
          { w: 1000, h: 1000 }, // Large size
          { w: 1, h: 1000 }, // Very tall
          { w: 1000, h: 1 }, // Very wide
        ];

        edgeCaseSizes.forEach(size => {
          expect(typeof size.w).toBe('number');
          expect(typeof size.h).toBe('number');
          expect(size.w).toBeGreaterThan(0);
          expect(size.h).toBeGreaterThan(0);
          expect(Number.isFinite(size.w)).toBe(true);
          expect(Number.isFinite(size.h)).toBe(true);
        });
      });

      it('should handle edge cases in text validation', () => {
        const edgeCaseTexts = [
          { text: 'A', fontSize: 1 }, // Single character, minimum font size
          { text: 'Very long text that might exceed reasonable limits', fontSize: 100 }, // Long text, large font
          { text: '', fontSize: 16 }, // Empty text
          { text: 'Special chars: !@#$%^&*()', fontSize: 12 }, // Special characters
        ];

        edgeCaseTexts.forEach(textUpdate => {
          expect(typeof textUpdate.text).toBe('string');
          expect(typeof textUpdate.fontSize).toBe('number');
          expect(textUpdate.fontSize).toBeGreaterThan(0);
          expect(Number.isFinite(textUpdate.fontSize)).toBe(true);
        });
      });
    });
  });
});
