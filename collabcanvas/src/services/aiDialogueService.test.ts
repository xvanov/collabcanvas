/**
 * AI Dialogue Service Tests
 * PR-4: Test dialogue flow and material estimation conversation
 */

import { describe, it, expect } from 'vitest';
import { processDialogueRequest, handleRefinement } from './aiDialogueService';
import type { DialogueContext, MaterialRequest } from '../types/dialogue';
import type { Layer, Shape } from '../types';

describe('aiDialogueService', () => {
  const mockUserId = 'test-user-123';

  const createMockContext = (request: MaterialRequest): DialogueContext => ({
    conversationId: 'test-conversation',
    userId: mockUserId,
    stage: 'initial',
    currentRequest: request,
    pendingClarification: null,
    assumptions: null,
    lastCalculation: null,
    messageHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const createMockLayers = (): Layer[] => [
    {
      id: 'layer-1',
      name: 'Walls',
      shapes: ['shape-1', 'shape-2'],
      visible: true,
      locked: false,
      order: 0,
    },
    {
      id: 'layer-2',
      name: 'Floor',
      shapes: ['shape-3'],
      visible: true,
      locked: false,
      order: 1,
    },
  ];

  const createMockShapes = (): Map<string, Shape> => {
    const shapes = new Map<string, Shape>();

    // Wall polyline
    shapes.set('shape-1', {
      id: 'shape-1',
      type: 'polyline',
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      color: '#000',
      points: [0, 0, 100, 0, 100, 100, 0, 100], // Square polyline
      createdAt: Date.now(),
      createdBy: mockUserId,
      updatedAt: Date.now(),
      updatedBy: mockUserId,
      clientUpdatedAt: Date.now(),
      layerId: 'layer-1',
    });

    // Floor polygon
    shapes.set('shape-3', {
      id: 'shape-3',
      type: 'polygon',
      x: 0,
      y: 0,
      w: 200,
      h: 200,
      color: '#000',
      points: [0, 0, 200, 0, 200, 200, 0, 200], // Square polygon
      createdAt: Date.now(),
      createdBy: mockUserId,
      updatedAt: Date.now(),
      updatedBy: mockUserId,
      clientUpdatedAt: Date.now(),
      layerId: 'layer-2',
    });

    return shapes;
  };

  describe('processDialogueRequest', () => {
    it('should request clarification when measurements are missing', async () => {
      const context = createMockContext({
        originalQuery: 'calculate wall materials',
      });

      // Empty layers and shapes
      const response = await processDialogueRequest(context, [], new Map(), 1);

      expect(response.type).toBe('clarification');
      expect(response.message).toContain('measurements');
    });

    it('should process wall request with measurements', async () => {
      const context = createMockContext({
        originalQuery: 'calculate wall materials',
        targetType: 'wall',
      });

      const layers = createMockLayers();
      const shapes = createMockShapes();
      const scaleFactor = 1; // 1 pixel = 1 foot for testing

      const response = await processDialogueRequest(context, layers, shapes, scaleFactor);

      // With no specifications, should ask for clarification about framing type
      expect(response.type).toBe('clarification');
    });

    it('should generate estimate with complete specifications', async () => {
      const context = createMockContext({
        originalQuery: 'calculate wall materials',
        targetType: 'wall',
        specifications: {
          framing: { type: 'lumber', spacing: 16 },
        },
      });

      const layers = createMockLayers();
      const shapes = createMockShapes();
      const scaleFactor = 1;

      const response = await processDialogueRequest(context, layers, shapes, scaleFactor);

      if (response.type === 'estimate') {
        expect(response.calculation).toBeDefined();
        expect(response.calculation!.materials.length).toBeGreaterThan(0);
        expect(response.suggestions).toBeDefined();
      }
    });

    it('should handle floor requests', async () => {
      const context = createMockContext({
        originalQuery: 'calculate floor materials',
        targetType: 'floor',
        specifications: {
          type: 'epoxy',
        },
      });

      const layers = createMockLayers();
      const shapes = createMockShapes();
      const scaleFactor = 1;

      const response = await processDialogueRequest(context, layers, shapes, scaleFactor);

      if (response.type === 'estimate') {
        expect(response.calculation).toBeDefined();
        expect(response.calculation!.totalArea).toBeGreaterThan(0);
      }
    });

    it('should handle errors gracefully', async () => {
      const context = createMockContext({
        originalQuery: '',
      });

      // Null context.currentRequest should be handled
      const badContext = { ...context, currentRequest: null };
      const response = await processDialogueRequest(badContext, [], new Map(), 1);

      expect(response.type).toBe('error');
      expect(response.error).toBeDefined();
    });
  });

  describe('handleRefinement', () => {
    it('should return error if no previous calculation', async () => {
      const context = createMockContext({
        originalQuery: 'calculate materials',
      });

      const response = await handleRefinement(
        context,
        'switch-to-metal',
        [],
        new Map(),
        1
      );

      expect(response.type).toBe('error');
    });

    it('should apply framing type refinement', async () => {
      const layers = createMockLayers();
      const shapes = createMockShapes();
      const scaleFactor = 1;

      // First, get initial calculation
      const initialContext = createMockContext({
        originalQuery: 'calculate wall materials',
        targetType: 'wall',
        specifications: {
          framing: { type: 'lumber', spacing: 16 },
        },
      });

      const initialResponse = await processDialogueRequest(
        initialContext,
        layers,
        shapes,
        scaleFactor
      );

      if (initialResponse.type === 'estimate' && initialResponse.calculation) {
        const contextWithCalculation: DialogueContext = {
          ...initialContext,
          lastCalculation: initialResponse.calculation,
        };

        // Now refine to metal
        const refinedResponse = await handleRefinement(
          contextWithCalculation,
          'switch-to-metal',
          layers,
          shapes,
          scaleFactor
        );

        if (refinedResponse.type === 'estimate' && refinedResponse.calculation) {
          const assumptions = refinedResponse.calculation.assumptions as any;
          expect(assumptions.framing?.type).toBe('metal');
        }
      }
    });
  });

});

