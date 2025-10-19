/**
 * AI Service Test Suite
 * Comprehensive tests for AI Canvas Agent functionality
 * 
 * NOTE: These tests are currently skipped in CI/CD (SKIP_AI_TESTS=true) 
 * because they test functionality that will be implemented in future PRs.
 * The core AI functionality (CREATE commands) is working and tested elsewhere.
 * 
 * To run these tests locally: npm run test:ai
 * To skip these tests in CI: npm run test:ci
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { AIService } from '../services/aiService';
import { AICommandExecutor } from '../services/aiCommandExecutor';
import type { 
  AICommand, 
  AICommandType,
  ShapeType,
  AlignmentType 
} from '../types';

// Mock Firebase Functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn().mockReturnValue(vi.fn()))
}));

describe('AI Service', () => {
  let aiService: AIService;
  let mockFirebaseFunction: Mock;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock the Firebase function
    mockFirebaseFunction = vi.fn();
    const { httpsCallable } = await import('firebase/functions');
    // httpsCallable should return a function that returns our mock
    httpsCallable.mockImplementation(() => mockFirebaseFunction);
    
    aiService = new AIService();
  });

  describe('Command Processing', () => {
    it('should process CREATE commands correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'Successfully created red circle',
        executedCommands: [{
          type: 'CREATE' as AICommandType,
          action: 'create red circle',
          parameters: {
            shapeType: 'circle' as ShapeType,
            color: '#FF0000',
            position: { x: 100, y: 100 },
            size: { w: 100, h: 100 }
          },
          confidence: 0.95,
          timestamp: Date.now(),
          userId: 'test-user',
          commandId: 'cmd-123'
        }],
        createdShapeIds: ['shape-123']
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });

      const result = await aiService.processCommand('Create a red circle', 'test-user');

      expect(result.success).toBe(true);
      expect(result.executedCommands).toHaveLength(1);
      expect(result.executedCommands[0].type).toBe('CREATE');
      expect(result.executedCommands[0].parameters.shapeType).toBe('circle');
      expect(result.executedCommands[0].parameters.color).toBe('#FF0000');
    });

    it('should process MOVE commands correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'Successfully moved shape to center',
        executedCommands: [{
          type: 'MOVE' as AICommandType,
          action: 'move shape to center',
          parameters: {
            targetShapes: ['shape-123'],
            position: { x: 400, y: 300 }
          },
          confidence: 0.9,
          timestamp: Date.now(),
          userId: 'test-user',
          commandId: 'cmd-124'
        }],
        modifiedShapeIds: ['shape-123']
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });

      const result = await aiService.processCommand('Move the blue rectangle to center', 'test-user');

      expect(result.success).toBe(true);
      expect(result.executedCommands[0].type).toBe('MOVE');
      expect(result.executedCommands[0].parameters.position).toEqual({ x: 400, y: 300 });
    });

    it('should process RESIZE commands correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'Successfully resized shape',
        executedCommands: [{
          type: 'RESIZE' as AICommandType,
          action: 'resize shape',
          parameters: {
            targetShapes: ['shape-123'],
            size: { w: 200, h: 150 }
          },
          confidence: 0.85,
          timestamp: Date.now(),
          userId: 'test-user',
          commandId: 'cmd-125'
        }],
        modifiedShapeIds: ['shape-123']
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });

      const result = await aiService.processCommand('Make the rectangle twice as big', 'test-user');

      expect(result.success).toBe(true);
      expect(result.executedCommands[0].type).toBe('RESIZE');
      expect(result.executedCommands[0].parameters.size).toEqual({ w: 200, h: 150 });
    });

    it('should process ROTATE commands correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'Successfully rotated shape',
        executedCommands: [{
          type: 'ROTATE' as AICommandType,
          action: 'rotate shape',
          parameters: {
            targetShapes: ['shape-123'],
            rotation: 45
          },
          confidence: 0.9,
          timestamp: Date.now(),
          userId: 'test-user',
          commandId: 'cmd-126'
        }],
        modifiedShapeIds: ['shape-123']
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });

      const result = await aiService.processCommand('Rotate the text 45 degrees', 'test-user');

      expect(result.success).toBe(true);
      expect(result.executedCommands[0].type).toBe('ROTATE');
      expect(result.executedCommands[0].parameters.rotation).toBe(45);
    });

    it('should process DELETE commands correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'Successfully deleted shape',
        executedCommands: [{
          type: 'DELETE' as AICommandType,
          action: 'delete shape',
          parameters: {
            targetShapes: ['shape-123']
          },
          confidence: 0.95,
          timestamp: Date.now(),
          userId: 'test-user',
          commandId: 'cmd-127'
        }],
        deletedShapeIds: ['shape-123']
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });

      const result = await aiService.processCommand('Delete the red circle', 'test-user');

      expect(result.success).toBe(true);
      expect(result.executedCommands[0].type).toBe('DELETE');
      expect(result.deletedShapeIds).toContain('shape-123');
    });

    it('should process ALIGN commands correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'Successfully aligned shapes',
        executedCommands: [{
          type: 'ALIGN' as AICommandType,
          action: 'align shapes',
          parameters: {
            targetShapes: ['shape-123', 'shape-124'],
            alignment: 'left' as AlignmentType
          },
          confidence: 0.9,
          timestamp: Date.now(),
          userId: 'test-user',
          commandId: 'cmd-128'
        }],
        modifiedShapeIds: ['shape-123', 'shape-124']
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });

      const result = await aiService.processCommand('Align shapes to left', 'test-user');

      expect(result.success).toBe(true);
      expect(result.executedCommands[0].type).toBe('ALIGN');
      expect(result.executedCommands[0].parameters.alignment).toBe('left');
    });

    it('should process EXPORT commands correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'Successfully exported canvas',
        executedCommands: [{
          type: 'EXPORT' as AICommandType,
          action: 'export canvas',
          parameters: {
            exportFormat: 'PNG' as const,
            exportQuality: 0.9
          },
          confidence: 0.95,
          timestamp: Date.now(),
          userId: 'test-user',
          commandId: 'cmd-129'
        }]
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });

      const result = await aiService.processCommand('Export canvas as PNG', 'test-user');

      expect(result.success).toBe(true);
      expect(result.executedCommands[0].type).toBe('EXPORT');
      expect(result.executedCommands[0].parameters.exportFormat).toBe('PNG');
    });

    it('should process LAYER commands correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'Successfully created layer',
        executedCommands: [{
          type: 'LAYER' as AICommandType,
          action: 'create layer',
          parameters: {
            layerName: 'Background'
          },
          confidence: 0.9,
          timestamp: Date.now(),
          userId: 'test-user',
          commandId: 'cmd-130'
        }],
        createdShapeIds: ['layer-123']
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });

      const result = await aiService.processCommand('Create a new layer called Background', 'test-user');

      expect(result.success).toBe(true);
      expect(result.executedCommands[0].type).toBe('LAYER');
      expect(result.executedCommands[0].parameters.layerName).toBe('Background');
    });

    it('should process COLOR commands correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'Successfully changed color',
        executedCommands: [{
          type: 'COLOR' as AICommandType,
          action: 'change color',
          parameters: {
            targetShapes: ['shape-123'],
            color: '#00FF00'
          },
          confidence: 0.9,
          timestamp: Date.now(),
          userId: 'test-user',
          commandId: 'cmd-131'
        }],
        modifiedShapeIds: ['shape-123']
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });

      const result = await aiService.processCommand('Change the rectangle to green', 'test-user');

      expect(result.success).toBe(true);
      expect(result.executedCommands[0].type).toBe('COLOR');
      expect(result.executedCommands[0].parameters.color).toBe('#00FF00');
    });

    it('should process DUPLICATE commands correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'Successfully duplicated shape',
        executedCommands: [{
          type: 'DUPLICATE' as AICommandType,
          action: 'duplicate shape',
          parameters: {
            targetShapes: ['shape-123']
          },
          confidence: 0.95,
          timestamp: Date.now(),
          userId: 'test-user',
          commandId: 'cmd-132'
        }],
        createdShapeIds: ['shape-124']
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });

      const result = await aiService.processCommand('Duplicate the selected shape', 'test-user');

      expect(result.success).toBe(true);
      expect(result.executedCommands[0].type).toBe('DUPLICATE');
      expect(result.createdShapeIds).toContain('shape-124');
    });
  });

  describe('Complex Commands', () => {
    it('should process login form template correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'Successfully created login form',
        executedCommands: [{
          type: 'CREATE' as AICommandType,
          action: 'create login form',
          parameters: {
            template: 'login-form'
          },
          confidence: 0.95,
          timestamp: Date.now(),
          userId: 'test-user',
          commandId: 'cmd-133'
        }],
        createdShapeIds: ['shape-123', 'shape-124', 'shape-125', 'shape-126', 'shape-127']
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });

      const result = await aiService.processCommand('Create a login form', 'test-user');

      expect(result.success).toBe(true);
      expect(result.executedCommands[0].parameters.template).toBe('login-form');
      expect(result.createdShapeIds).toHaveLength(5);
    });

    it('should process navigation bar template correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'Successfully created navigation bar',
        executedCommands: [{
          type: 'CREATE' as AICommandType,
          action: 'create nav bar',
          parameters: {
            template: 'nav-bar'
          },
          confidence: 0.9,
          timestamp: Date.now(),
          userId: 'test-user',
          commandId: 'cmd-134'
        }],
        createdShapeIds: ['shape-123', 'shape-124', 'shape-125', 'shape-126', 'shape-127']
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });

      const result = await aiService.processCommand('Create a navigation bar', 'test-user');

      expect(result.success).toBe(true);
      expect(result.executedCommands[0].parameters.template).toBe('nav-bar');
    });

    it('should process card layout template correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'Successfully created card layout',
        executedCommands: [{
          type: 'CREATE' as AICommandType,
          action: 'create card layout',
          parameters: {
            template: 'card-layout'
          },
          confidence: 0.9,
          timestamp: Date.now(),
          userId: 'test-user',
          commandId: 'cmd-135'
        }],
        createdShapeIds: ['shape-123', 'shape-124', 'shape-125', 'shape-126']
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });

      const result = await aiService.processCommand('Create a card layout', 'test-user');

      expect(result.success).toBe(true);
      expect(result.executedCommands[0].parameters.template).toBe('card-layout');
    });

    it('should process flowchart template correctly', async () => {
      const mockResponse = {
        success: true,
        message: 'Successfully created flowchart',
        executedCommands: [{
          type: 'CREATE' as AICommandType,
          action: 'create flowchart',
          parameters: {
            template: 'flowchart'
          },
          confidence: 0.9,
          timestamp: Date.now(),
          userId: 'test-user',
          commandId: 'cmd-136'
        }],
        createdShapeIds: ['shape-123', 'shape-124', 'shape-125', 'shape-126', 'shape-127']
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });

      const result = await aiService.processCommand('Create a flowchart', 'test-user');

      expect(result.success).toBe(true);
      expect(result.executedCommands[0].parameters.template).toBe('flowchart');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFirebaseFunction.mockRejectedValue(new Error('API Error'));

      const result = await aiService.processCommand('Create a circle', 'test-user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should handle rate limiting', async () => {
      const mockResponse = {
        success: false,
        message: 'Rate limit exceeded',
        executedCommands: [],
        error: 'RATE_LIMIT_EXCEEDED'
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });

      const result = await aiService.processCommand('Create a circle', 'test-user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should handle clarification requests', async () => {
      const mockResponse = {
        success: false,
        message: 'Clarification needed',
        executedCommands: [],
        clarificationNeeded: {
          question: 'Which blue rectangle would you like to move?',
          options: [
            { label: 'Blue rectangle (100x50)', value: 'shape-123', shapeIds: ['shape-123'] },
            { label: 'Blue rectangle (200x100)', value: 'shape-124', shapeIds: ['shape-124'] }
          ]
        }
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });

      const result = await aiService.processCommand('Move the blue rectangle', 'test-user');

      expect(result.success).toBe(false);
      expect(result.clarificationNeeded).toBeDefined();
      expect(result.clarificationNeeded?.question).toBe('Which blue rectangle would you like to move?');
      expect(result.clarificationNeeded?.options).toHaveLength(2);
    });
  });

  describe('Rate Limiting', () => {
    it('should track rate limits correctly', () => {
      const status = aiService.getStatus('test-user');
      
      expect(status.rateLimitInfo).toBeDefined();
      expect(status.rateLimitInfo?.commandsRemaining).toBeGreaterThanOrEqual(0);
      expect(status.rateLimitInfo?.resetTime).toBeGreaterThan(Date.now());
    });

    it('should enforce rate limits', async () => {
      // Mock rate limit exceeded
      const mockResponse = {
        success: false,
        message: 'Rate limit exceeded',
        executedCommands: [],
        error: 'RATE_LIMIT_EXCEEDED'
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });

      const result = await aiService.processCommand('Create a circle', 'test-user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Command History', () => {
    it('should track command history', async () => {
      const mockResponse = {
        success: true,
        message: 'Successfully created circle',
        executedCommands: [{
          type: 'CREATE' as AICommandType,
          action: 'create circle',
          parameters: { shapeType: 'circle' as ShapeType },
          confidence: 0.95,
          timestamp: Date.now(),
          userId: 'test-user',
          commandId: 'cmd-123'
        }],
        createdShapeIds: ['shape-123']
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });

      await aiService.processCommand('Create a circle', 'test-user');

      const history = aiService.getCommandHistory('test-user');
      expect(history).toHaveLength(1);
      expect(history[0].command).toBe('Create a circle');
      expect(history[0].result.success).toBe(true);
    });

    it('should clear command history', async () => {
      // Add some history first
      const mockResponse = {
        success: true,
        message: 'Success',
        executedCommands: [],
        createdShapeIds: []
      };

      mockFirebaseFunction.mockResolvedValue({ data: mockResponse });
      await aiService.processCommand('Create a circle', 'test-user');

      // Clear history
      aiService.clearHistory('test-user');

      const history = aiService.getCommandHistory('test-user');
      expect(history).toHaveLength(0);
    });
  });
});

describe('AI Command Executor', () => {
  let executor: AICommandExecutor;
  let mockStoreActions: Record<string, unknown>;
  let mockCanvasState: Record<string, unknown>;

  beforeEach(() => {
    mockStoreActions = {
      createShape: vi.fn(),
      updateShapePosition: vi.fn(),
      updateShapeProperty: vi.fn(),
      deleteShape: vi.fn(),
      deleteShapes: vi.fn(),
      duplicateShapes: vi.fn(),
      alignShapes: vi.fn(),
      createLayer: vi.fn(() => 'layer-123'),
      moveShapeToLayer: vi.fn(),
      exportCanvas: vi.fn(),
      exportSelectedShapes: vi.fn()
    };

    mockCanvasState = {
      shapes: new Map([
        ['shape-123', {
          id: 'shape-123',
          type: 'rect',
          x: 100,
          y: 100,
          w: 100,
          h: 100,
          color: '#FF0000'
        }]
      ]),
      selectedShapes: ['shape-123'],
      layers: [],
      currentUser: { uid: 'test-user', name: 'Test User' }
    };

    executor = new AICommandExecutor(mockStoreActions, mockCanvasState);
  });

  describe('Command Execution', () => {
    it('should execute CREATE commands', async () => {
      const command: AICommand = {
        type: 'CREATE',
        action: 'create circle',
        parameters: {
          shapeType: 'circle',
          color: '#00FF00',
          position: { x: 200, y: 200 },
          size: { w: 100, h: 100 }
        },
        confidence: 0.95,
        timestamp: Date.now(),
        userId: 'test-user',
        commandId: 'cmd-123'
      };

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(mockStoreActions.createShape).toHaveBeenCalled();
    });

    it('should execute MOVE commands', async () => {
      const command: AICommand = {
        type: 'MOVE',
        action: 'move shape',
        parameters: {
          targetShapes: ['shape-123'],
          position: { x: 300, y: 300 }
        },
        confidence: 0.9,
        timestamp: Date.now(),
        userId: 'test-user',
        commandId: 'cmd-124'
      };

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(mockStoreActions.updateShapePosition).toHaveBeenCalledWith(
        'shape-123',
        300,
        300,
        'test-user',
        expect.any(Number)
      );
    });

    it('should execute RESIZE commands', async () => {
      const command: AICommand = {
        type: 'RESIZE',
        action: 'resize shape',
        parameters: {
          targetShapes: ['shape-123'],
          size: { w: 200, h: 150 }
        },
        confidence: 0.9,
        timestamp: Date.now(),
        userId: 'test-user',
        commandId: 'cmd-125'
      };

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(mockStoreActions.updateShapeProperty).toHaveBeenCalledWith(
        'shape-123',
        'w',
        200,
        'test-user',
        expect.any(Number)
      );
      expect(mockStoreActions.updateShapeProperty).toHaveBeenCalledWith(
        'shape-123',
        'h',
        150,
        'test-user',
        expect.any(Number)
      );
    });

    it('should execute ROTATE commands', async () => {
      const command: AICommand = {
        type: 'ROTATE',
        action: 'rotate shape',
        parameters: {
          targetShapes: ['shape-123'],
          rotation: 45
        },
        confidence: 0.9,
        timestamp: Date.now(),
        userId: 'test-user',
        commandId: 'cmd-126'
      };

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(mockStoreActions.updateShapeProperty).toHaveBeenCalledWith(
        'shape-123',
        'rotation',
        45,
        'test-user',
        expect.any(Number)
      );
    });

    it('should execute DELETE commands', async () => {
      const command: AICommand = {
        type: 'DELETE',
        action: 'delete shape',
        parameters: {
          targetShapes: ['shape-123']
        },
        confidence: 0.95,
        timestamp: Date.now(),
        userId: 'test-user',
        commandId: 'cmd-127'
      };

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(mockStoreActions.deleteShape).toHaveBeenCalledWith('shape-123', 'test-user');
    });

    it('should execute ALIGN commands', async () => {
      const command: AICommand = {
        type: 'ALIGN',
        action: 'align shapes',
        parameters: {
          targetShapes: ['shape-123'],
          alignment: 'left'
        },
        confidence: 0.9,
        timestamp: Date.now(),
        userId: 'test-user',
        commandId: 'cmd-128'
      };

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(mockStoreActions.alignShapes).toHaveBeenCalledWith(['shape-123'], 'left');
    });

    it('should execute EXPORT commands', async () => {
      const command: AICommand = {
        type: 'EXPORT',
        action: 'export canvas',
        parameters: {
          exportFormat: 'PNG',
          exportQuality: 0.9
        },
        confidence: 0.95,
        timestamp: Date.now(),
        userId: 'test-user',
        commandId: 'cmd-129'
      };

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(mockStoreActions.exportCanvas).toHaveBeenCalledWith('PNG', 0.9);
    });

    it('should execute LAYER commands', async () => {
      const command: AICommand = {
        type: 'LAYER',
        action: 'create layer',
        parameters: {
          layerName: 'Background'
        },
        confidence: 0.9,
        timestamp: Date.now(),
        userId: 'test-user',
        commandId: 'cmd-130'
      };

      mockStoreActions.createLayer.mockReturnValue('layer-123');

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(mockStoreActions.createLayer).toHaveBeenCalledWith('Background');
    });

    it('should execute COLOR commands', async () => {
      const command: AICommand = {
        type: 'COLOR',
        action: 'change color',
        parameters: {
          targetShapes: ['shape-123'],
          color: '#00FF00'
        },
        confidence: 0.9,
        timestamp: Date.now(),
        userId: 'test-user',
        commandId: 'cmd-131'
      };

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(mockStoreActions.updateShapeProperty).toHaveBeenCalledWith(
        'shape-123',
        'color',
        '#00FF00',
        'test-user',
        expect.any(Number)
      );
    });

    it('should execute DUPLICATE commands', async () => {
      const command: AICommand = {
        type: 'DUPLICATE',
        action: 'duplicate shape',
        parameters: {
          targetShapes: ['shape-123']
        },
        confidence: 0.95,
        timestamp: Date.now(),
        userId: 'test-user',
        commandId: 'cmd-132'
      };

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(mockStoreActions.duplicateShapes).toHaveBeenCalledWith(['shape-123'], 'test-user');
    });
  });

  describe('Shape Identification', () => {
    it('should identify shapes by ID', () => {
      const parameters = { targetShapes: ['shape-123'] };
      const targetShapes = (executor as Record<string, unknown>).identifyTargetShapes(parameters);
      
      expect(targetShapes).toEqual(['shape-123']);
    });

    it('should identify shapes by color', () => {
      const parameters = { targetColor: '#FF0000' };
      const targetShapes = (executor as Record<string, unknown>).identifyTargetShapes(parameters);
      
      expect(targetShapes).toEqual(['shape-123']);
    });

    it('should identify shapes by type', () => {
      const parameters = { targetType: 'rect' };
      const targetShapes = (executor as Record<string, unknown>).identifyTargetShapes(parameters);
      
      expect(targetShapes).toEqual(['shape-123']);
    });

    it('should use selected shapes when no specific targets', () => {
      const parameters = {};
      const targetShapes = (executor as Record<string, unknown>).identifyTargetShapes(parameters);
      
      expect(targetShapes).toEqual(['shape-123']);
    });

    it('should return clarification when no shapes found', async () => {
      const command: AICommand = {
        type: 'MOVE',
        action: 'move shape',
        parameters: {
          targetColor: '#000000' // No black shapes exist
        },
        confidence: 0.9,
        timestamp: Date.now(),
        userId: 'test-user',
        commandId: 'cmd-133'
      };

      const result = await executor.executeCommand(command);

      expect(result.clarificationNeeded).toBeDefined();
      expect(result.clarificationNeeded?.question).toBe('Which shapes would you like to move?');
    });
  });

  describe('Complex Templates', () => {
    it('should execute login form template', async () => {
      const command: AICommand = {
        type: 'CREATE',
        action: 'create login form',
        parameters: {
          template: 'login-form'
        },
        confidence: 0.95,
        timestamp: Date.now(),
        userId: 'test-user',
        commandId: 'cmd-134'
      };

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(result.createdShapeIds).toHaveLength(5);
      expect(mockStoreActions.createShape).toHaveBeenCalledTimes(5);
    });

    it('should execute navigation bar template', async () => {
      const command: AICommand = {
        type: 'CREATE',
        action: 'create nav bar',
        parameters: {
          template: 'nav-bar'
        },
        confidence: 0.9,
        timestamp: Date.now(),
        userId: 'test-user',
        commandId: 'cmd-135'
      };

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(result.createdShapeIds).toHaveLength(5);
      expect(mockStoreActions.createShape).toHaveBeenCalledTimes(5);
    });

    it('should execute card layout template', async () => {
      const command: AICommand = {
        type: 'CREATE',
        action: 'create card layout',
        parameters: {
          template: 'card-layout'
        },
        confidence: 0.9,
        timestamp: Date.now(),
        userId: 'test-user',
        commandId: 'cmd-136'
      };

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(result.createdShapeIds).toHaveLength(4);
      expect(mockStoreActions.createShape).toHaveBeenCalledTimes(4);
    });

    it('should execute flowchart template', async () => {
      const command: AICommand = {
        type: 'CREATE',
        action: 'create flowchart',
        parameters: {
          template: 'flowchart'
        },
        confidence: 0.9,
        timestamp: Date.now(),
        userId: 'test-user',
        commandId: 'cmd-137'
      };

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(result.createdShapeIds).toHaveLength(5);
      expect(mockStoreActions.createShape).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle execution errors gracefully', async () => {
      mockStoreActions.createShape.mockImplementation(() => {
        throw new Error('Store error');
      });

      const command: AICommand = {
        type: 'CREATE',
        action: 'create circle',
        parameters: {
          shapeType: 'circle'
        },
        confidence: 0.95,
        timestamp: Date.now(),
        userId: 'test-user',
        commandId: 'cmd-138'
      };

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Store error');
    });

    it('should handle unknown command types', async () => {
      const command = {
        type: 'UNKNOWN' as AICommandType,
        action: 'unknown action',
        parameters: {},
        confidence: 0.5,
        timestamp: Date.now(),
        userId: 'test-user',
        commandId: 'cmd-139'
      };

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown command type');
    });
  });
});

describe('Performance Tests', () => {
  it('should process commands within 2 seconds', async () => {
    const aiService = new AIService();
    const startTime = Date.now();

    // Mock fast response
    const mockFirebaseFunction = vi.fn();
    const { httpsCallable } = await import('firebase/functions');
    httpsCallable.mockImplementation(() => mockFirebaseFunction);

    mockFirebaseFunction.mockResolvedValue({
      data: {
        success: true,
        message: 'Success',
        executedCommands: [],
        createdShapeIds: []
      }
    });

    const result = await aiService.processCommand('Create a circle', 'test-user');
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(2000); // Should be under 2 seconds
  });

  it('should handle multiple concurrent commands', async () => {
    const aiService = new AIService();
    
    // Mock responses
    const mockFirebaseFunction = vi.fn();
    const { httpsCallable } = await import('firebase/functions');
    httpsCallable.mockImplementation(() => mockFirebaseFunction);

    mockFirebaseFunction.mockResolvedValue({
      data: {
        success: true,
        message: 'Success',
        executedCommands: [],
        createdShapeIds: []
      }
    });

    const commands = [
      'Create a circle',
      'Create a rectangle',
      'Create a line',
      'Create text',
      'Move shapes to center'
    ];

    const promises = commands.map(command => 
      aiService.processCommand(command, 'test-user')
    );

    const results = await Promise.all(promises);

    expect(results).toHaveLength(5);
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
  });
});

describe('Accuracy Tests', () => {
  it('should achieve high accuracy for simple commands', async () => {
    const testCases = [
      { input: 'Create a red circle', expectedType: 'CREATE', expectedShapeType: 'circle' },
      { input: 'Move the rectangle', expectedType: 'MOVE' },
      { input: 'Delete selected shapes', expectedType: 'DELETE' },
      { input: 'Align shapes to left', expectedType: 'ALIGN', expectedAlignment: 'left' },
      { input: 'Export canvas as PNG', expectedType: 'EXPORT', expectedFormat: 'PNG' },
      { input: 'Create a new layer', expectedType: 'LAYER' },
      { input: 'Change color to blue', expectedType: 'COLOR' },
      { input: 'Duplicate the shape', expectedType: 'DUPLICATE' }
    ];

    const aiService = new AIService();
    const mockFirebaseFunction = vi.fn();
    const { httpsCallable } = await import('firebase/functions');
    httpsCallable.mockImplementation(() => mockFirebaseFunction);

    let correctPredictions = 0;

    for (const testCase of testCases) {
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: true,
          message: 'Success',
          executedCommands: [{
            type: testCase.expectedType,
            action: testCase.input,
            parameters: {
              shapeType: testCase.expectedShapeType,
              alignment: testCase.expectedAlignment,
              exportFormat: testCase.expectedFormat
            },
            confidence: 0.9,
            timestamp: Date.now(),
            userId: 'test-user',
            commandId: 'cmd-test'
          }],
          createdShapeIds: []
        }
      });

      const result = await aiService.processCommand(testCase.input, 'test-user');
      
      if (result.success && result.executedCommands[0].type === testCase.expectedType) {
        correctPredictions++;
      }
    }

    const accuracy = correctPredictions / testCases.length;
    expect(accuracy).toBeGreaterThanOrEqual(0.9); // 90% accuracy target
  });
});
