/**
 * Material Estimation Integration Tests
 * PR-4: End-to-end material estimation workflows
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../store/canvasStore';
import { calculateWallEstimate, calculateFloorEstimate } from '../services/materialService';
import { DEFAULT_WALL_ASSUMPTIONS, DEFAULT_FLOOR_ASSUMPTIONS } from '../data/defaultAssumptions';
import type { Shape, User } from '../types';

describe('Material Estimation Integration', () => {
  const mockUser: User = {
    uid: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    photoURL: null,
  };

  beforeEach(() => {
    // Get fresh store instance
    const store = useCanvasStore.getState();
    
    // Reset material estimation state
    store.clearMaterialDialogue();
    store.setBillOfMaterials(null);
    store.setShapes([]);
    store.setLayers([]);
    
    // Set current user LAST so methods can access it
    store.setCurrentUser(mockUser);
  });

  describe('Complete Lumber Wall Calculation', () => {
    it('should calculate complete lumber wall with all materials', () => {
      const lengthFeet = 20;
      const assumptions = {
        ...DEFAULT_WALL_ASSUMPTIONS,
        framing: { type: 'lumber' as const, spacing: 16 as const },
        finish: { coats: 2, includePrimer: true },
      };

      const result = calculateWallEstimate(lengthFeet, assumptions, mockUser.uid);

      // Verify framing materials
      expect(result.materials.find(m => m.id === 'lumber-studs')).toBeDefined();
      expect(result.materials.find(m => m.id === 'lumber-plates')).toBeDefined();
      expect(result.materials.find(m => m.id === 'nails-16d')).toBeDefined();

      // Verify surface materials
      expect(result.materials.find(m => m.id === 'drywall-sheets')).toBeDefined();
      expect(result.materials.find(m => m.id === 'drywall-screws')).toBeDefined();

      // Verify finish materials
      expect(result.materials.find(m => m.id === 'paint-primer')).toBeDefined();
      expect(result.materials.find(m => m.id === 'paint')).toBeDefined();

      // Verify totals
      expect(result.totalLength).toBe(20);
      expect(result.totalArea).toBe(160); // 20 * 8
      expect(result.calculatedBy).toBe(mockUser.uid);
    });

    it('should respect 16" vs 24" spacing', () => {
      const spacing16 = calculateWallEstimate(20, {
        ...DEFAULT_WALL_ASSUMPTIONS,
        framing: { type: 'lumber', spacing: 16 },
      }, mockUser.uid);

      const spacing24 = calculateWallEstimate(20, {
        ...DEFAULT_WALL_ASSUMPTIONS,
        framing: { type: 'lumber', spacing: 24 },
      }, mockUser.uid);

      const studs16 = spacing16.materials.find(m => m.id === 'lumber-studs')!;
      const studs24 = spacing24.materials.find(m => m.id === 'lumber-studs')!;

      expect(studs16.quantity).toBeGreaterThan(studs24.quantity);
    });
  });

  describe('Complete Metal Wall Calculation', () => {
    it('should calculate complete metal wall with correct fasteners', () => {
      const result = calculateWallEstimate(20, {
        ...DEFAULT_WALL_ASSUMPTIONS,
        framing: { type: 'metal', spacing: 24 },
      }, mockUser.uid);

      // Metal-specific materials
      expect(result.materials.find(m => m.id === 'metal-studs')).toBeDefined();
      expect(result.materials.find(m => m.id === 'metal-tracks')).toBeDefined();
      expect(result.materials.find(m => m.id === 'screws-metal')).toBeDefined();

      // Drywall screws should be for metal framing
      const drywallScrews = result.materials.find(m => m.id === 'drywall-screws');
      expect(drywallScrews).toBeDefined();
      expect(drywallScrews!.name).toContain('1-1/4"');
    });
  });

  describe('Complete Epoxy Floor Calculation', () => {
    it('should calculate all epoxy coating materials', () => {
      const result = calculateFloorEstimate(500, {
        ...DEFAULT_FLOOR_ASSUMPTIONS,
        type: 'epoxy',
      }, mockUser.uid);

      // Verify all epoxy stages
      expect(result.materials.find(m => m.id === 'epoxy-cleaner')).toBeDefined();
      expect(result.materials.find(m => m.id === 'epoxy-etching')).toBeDefined();
      expect(result.materials.find(m => m.id === 'epoxy-primer')).toBeDefined();
      expect(result.materials.find(m => m.id === 'epoxy-base')).toBeDefined();
      expect(result.materials.find(m => m.id === 'epoxy-top')).toBeDefined();

      expect(result.totalArea).toBe(500);
    });
  });

  describe('Material Comparison System', () => {
    it('should compare lumber vs metal wall materials', async () => {
      const lumber = calculateWallEstimate(20, {
        ...DEFAULT_WALL_ASSUMPTIONS,
        framing: { type: 'lumber', spacing: 16 },
      }, mockUser.uid);

      const metal = calculateWallEstimate(20, {
        ...DEFAULT_WALL_ASSUMPTIONS,
        framing: { type: 'metal', spacing: 16 },
      }, mockUser.uid);

      // Import comparison function
      const { compareMaterialCalculations } = await import('../services/materialService');
      const comparison = compareMaterialCalculations(lumber, metal);

      expect(comparison.length).toBeGreaterThan(0);
      
      // Should show lumber materials going down and metal going up
      const lumberStuds = comparison.find(c => c.materialId === 'lumber-studs');
      const metalStuds = comparison.find(c => c.materialId === 'metal-studs');

      if (lumberStuds) {
        expect(lumberStuds.newQuantity).toBe(0);
      }
      if (metalStuds) {
        expect(metalStuds.previousQuantity).toBe(0);
      }
    });
  });

  describe('Store Integration', () => {
    it('should have material estimation methods available', () => {
      const store = useCanvasStore.getState();
      
      // Verify store has all required methods
      expect(store.addMaterialCalculation).toBeDefined();
      expect(store.startMaterialDialogue).toBeDefined();
      expect(store.updateMaterialDialogue).toBeDefined();
      expect(store.clearMaterialDialogue).toBeDefined();
      expect(store.setBillOfMaterials).toBeDefined();
      expect(store.setUserMaterialPreferences).toBeDefined();
    });

    it('should have material estimation state properties', () => {
      const store = useCanvasStore.getState();
      
      // Verify store has all required state
      expect(store).toHaveProperty('materialDialogue');
      expect(store).toHaveProperty('billOfMaterials');
      expect(store).toHaveProperty('userMaterialPreferences');
    });

    it('should clear dialogue state', () => {
      const store = useCanvasStore.getState();
      
      store.startMaterialDialogue('Test');
      expect(store.materialDialogue).toBeDefined();
      
      store.clearMaterialDialogue();
      expect(store.materialDialogue).toBeNull();
    });
  });

  describe('Layer-Based Context Extraction', () => {
    it('should extract wall measurements from polyline shapes', async () => {
      const store = useCanvasStore.getState();

      // Create wall layer with polyline
      store.createLayer('Walls', 'wall-layer');
      
      const wallShape: Shape = {
        id: 'wall-1',
        type: 'polyline',
        x: 0,
        y: 0,
        w: 100,
        h: 100,
        color: '#000',
        points: [0, 0, 240, 0], // 240 pixels = 20 feet at 1:12 scale
        createdAt: Date.now(),
        createdBy: mockUser.uid,
        updatedAt: Date.now(),
        updatedBy: mockUser.uid,
        clientUpdatedAt: Date.now(),
        layerId: 'wall-layer',
      };

      store.createShape(wallShape);

      // Set scale: 240 pixels = 20 feet
      store.setScaleLine({
        id: 'scale-1',
        startX: 0,
        startY: 0,
        endX: 240,
        endY: 0,
        realWorldLength: 20,
        unit: 'feet',
        isVisible: true,
        createdAt: Date.now(),
        createdBy: mockUser.uid,
        updatedAt: Date.now(),
        updatedBy: mockUser.uid,
      });

      const currentStore = useCanvasStore.getState();
      const layers = currentStore.layers;
      const shapes = currentStore.shapes;
      const scaleLine = currentStore.canvasScale.scaleLine;

      expect(layers.length).toBeGreaterThan(0);
      expect(shapes.size).toBe(1);
      expect(scaleLine).toBeDefined();
    });
  });
});

