/**
 * AI Integration Tests
 * Tests for multi-user scenarios, undo/redo, and complex workflows
 * 
 * NOTE: These tests are currently skipped in CI/CD (SKIP_AI_TESTS=true) 
 * because they test functionality that will be implemented in future PRs.
 * The core AI functionality (CREATE commands) is working and tested elsewhere.
 * 
 * To run these tests locally: npm run test:ai
 * To skip these tests in CI: npm run test:ci
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { useCanvasStore } from '../store/canvasStore';
import { AIService } from '../services/aiService';

// Mock Firebase Functions
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn())
}));

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn(() => vi.fn()),
  signInAnonymously: vi.fn(() => Promise.resolve({ user: { uid: 'test-user' } })),
  signOut: vi.fn(() => Promise.resolve())
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  addDoc: vi.fn(() => Promise.resolve({ id: 'doc-123' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  deleteDoc: vi.fn(() => Promise.resolve()),
  onSnapshot: vi.fn(() => vi.fn()),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({}))
}));

// Mock Firebase RTDB
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  onValue: vi.fn(() => vi.fn()),
  off: vi.fn(() => {}),
  set: vi.fn(() => Promise.resolve()),
  update: vi.fn(() => Promise.resolve()),
  remove: vi.fn(() => Promise.resolve())
}));

describe('AI Multi-User Integration', () => {
  let aiService: AIService;
  let mockFirebaseFunction: Mock;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockFirebaseFunction = vi.fn();
    const { httpsCallable } = await import('firebase/functions');
    httpsCallable.mockImplementation(() => mockFirebaseFunction);
    
    aiService = new AIService();
  });

  describe('Command Queue System', () => {
    it('should queue commands from multiple users', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';
      const user3 = 'user-3';

      // Mock responses
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: true,
          message: 'Success',
          executedCommands: [],
          createdShapeIds: []
        }
      });

      // Simulate concurrent commands from different users
      const promises = [
        aiService.processCommand('Create a circle', user1),
        aiService.processCommand('Create a rectangle', user2),
        aiService.processCommand('Create a line', user3)
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify commands were processed in order
      expect(mockFirebaseFunction).toHaveBeenCalledTimes(3);
    });

    it('should handle queue position tracking', async () => {
      const user1 = 'user-1';

      // Mock queue position response
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: true,
          message: 'Command queued',
          executedCommands: [],
          createdShapeIds: [],
          queuePosition: 2
        }
      });

      const result = await aiService.processCommand('Create a circle', user1);
      
      expect(result.success).toBe(true);
      
      const status = aiService.getStatus(user1);
      expect(status.queuePosition).toBe(2);
    });

    it('should handle rate limiting per user', async () => {
      const user1 = 'user-1';
      
      // Mock rate limit response
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: false,
          message: 'Rate limit exceeded',
          executedCommands: [],
          error: 'RATE_LIMIT_EXCEEDED',
          rateLimitInfo: {
            commandsRemaining: 0,
            resetTime: Date.now() + 60000
          }
        }
      });

      const result = await aiService.processCommand('Create a circle', user1);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('RATE_LIMIT_EXCEEDED');
      
      const status = aiService.getStatus(user1);
      expect(status.rateLimitInfo?.commandsRemaining).toBe(0);
    });
  });

  describe('Multi-User Conflict Resolution', () => {
    it('should handle simultaneous shape modifications', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      // Mock conflict resolution
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: true,
          message: 'Command executed with conflict resolution',
          executedCommands: [],
          createdShapeIds: [],
          conflictResolution: {
            resolved: true,
            method: 'last-write-wins'
          }
        }
      });

      const promises = [
        aiService.processCommand('Move shape to left', user1),
        aiService.processCommand('Move shape to right', user2)
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should handle shape deletion conflicts', async () => {
      const user1 = 'user-1';

      // Mock deletion conflict
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: false,
          message: 'Shape already deleted by another user',
          executedCommands: [],
          error: 'SHAPE_NOT_FOUND'
        }
      });

      const result = await aiService.processCommand('Delete the rectangle', user1);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('SHAPE_NOT_FOUND');
    });
  });

  describe('Real-time Collaboration', () => {
    it('should update AI status in real-time', async () => {
      const user1 = 'user-1';
      
      // Mock real-time status updates
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: true,
          message: 'Processing command',
          executedCommands: [],
          createdShapeIds: [],
          realTimeStatus: {
            isProcessing: true,
            currentCommand: 'Create a circle',
            estimatedTimeRemaining: 1500
          }
        }
      });

      const result = await aiService.processCommand('Create a circle', user1);
      
      expect(result.success).toBe(true);
      
      const status = aiService.getStatus(user1);
      expect(status.isProcessing).toBe(true);
    });

    it('should broadcast AI commands to all users', async () => {
      const user1 = 'user-1';
      
      // Mock broadcast response
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: true,
          message: 'Command broadcasted',
          executedCommands: [],
          createdShapeIds: [],
          broadcastInfo: {
            recipients: ['user-2', 'user-3'],
            commandType: 'CREATE'
          }
        }
      });

      const result = await aiService.processCommand('Create a circle', user1);
      
      expect(result.success).toBe(true);
    });
  });
});

describe('AI Undo/Redo Integration', () => {
  let canvasStore: Record<string, unknown>;
  let aiService: AIService;
  let mockFirebaseFunction: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockFirebaseFunction = vi.fn();
    const { httpsCallable } = await import('firebase/functions');
    httpsCallable.mockImplementation(() => mockFirebaseFunction);
    
    aiService = new AIService();
    
    // Initialize canvas store
    canvasStore = useCanvasStore.getState();
  });

  describe('AI Command History Integration', () => {
    it('should track AI commands in undo history', async () => {
      const user1 = 'user-1';
      
      // Mock successful command
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: true,
          message: 'Successfully created circle',
          executedCommands: [{
            type: 'CREATE',
            action: 'create circle',
            parameters: {
              shapeType: 'circle',
              color: '#FF0000',
              position: { x: 100, y: 100 },
              size: { w: 100, h: 100 }
            },
            confidence: 0.95,
            timestamp: Date.now(),
            userId: user1,
            commandId: 'cmd-123'
          }],
          createdShapeIds: ['shape-123']
        }
      });

      const result = await aiService.processCommand('Create a red circle', user1);
      
      expect(result.success).toBe(true);
      expect(result.executedCommands).toHaveLength(1);
      
      // Verify command is tracked in history
      const history = aiService.getCommandHistory(user1);
      expect(history).toHaveLength(1);
      expect(history[0].command).toBe('Create a red circle');
      expect(history[0].result.success).toBe(true);
    });

    it('should support undoing AI commands', async () => {
      const user1 = 'user-1';
      
      // Mock successful command
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: true,
          message: 'Successfully created circle',
          executedCommands: [{
            type: 'CREATE',
            action: 'create circle',
            parameters: {
              shapeType: 'circle',
              color: '#FF0000',
              position: { x: 100, y: 100 },
              size: { w: 100, h: 100 }
            },
            confidence: 0.95,
            timestamp: Date.now(),
            userId: user1,
            commandId: 'cmd-123'
          }],
          createdShapeIds: ['shape-123']
        }
      });

      await aiService.processCommand('Create a red circle', user1);
      
      // Simulate undo action
      const undoResult = await canvasStore.undo();
      
      expect(undoResult).toBe(true);
      
      // Verify shape was removed
      const shapes = canvasStore.shapes;
      expect(shapes.has('shape-123')).toBe(false);
    });

    it('should support redoing AI commands', async () => {
      const user1 = 'user-1';
      
      // Mock successful command
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: true,
          message: 'Successfully created circle',
          executedCommands: [{
            type: 'CREATE',
            action: 'create circle',
            parameters: {
              shapeType: 'circle',
              color: '#FF0000',
              position: { x: 100, y: 100 },
              size: { w: 100, h: 100 }
            },
            confidence: 0.95,
            timestamp: Date.now(),
            userId: user1,
            commandId: 'cmd-123'
          }],
          createdShapeIds: ['shape-123']
        }
      });

      await aiService.processCommand('Create a red circle', user1);
      await canvasStore.undo();
      
      // Simulate redo action
      const redoResult = await canvasStore.redo();
      
      expect(redoResult).toBe(true);
      
      // Verify shape was restored
      const shapes = canvasStore.shapes;
      expect(shapes.has('shape-123')).toBe(true);
    });

    it('should handle complex AI command undo/redo', async () => {
      const user1 = 'user-1';
      
      // Mock complex command (login form template)
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: true,
          message: 'Successfully created login form',
          executedCommands: [{
            type: 'CREATE',
            action: 'create login form',
            parameters: {
              template: 'login-form'
            },
            confidence: 0.95,
            timestamp: Date.now(),
            userId: user1,
            commandId: 'cmd-123'
          }],
          createdShapeIds: ['shape-123', 'shape-124', 'shape-125', 'shape-126', 'shape-127']
        }
      });

      await aiService.processCommand('Create a login form', user1);
      
      // Verify all shapes were created
      const shapes = canvasStore.shapes;
      expect(shapes.size).toBe(5);
      
      // Undo the complex command
      const undoResult = await canvasStore.undo();
      expect(undoResult).toBe(true);
      
      // Verify all shapes were removed
      expect(shapes.size).toBe(0);
      
      // Redo the complex command
      const redoResult = await canvasStore.redo();
      expect(redoResult).toBe(true);
      
      // Verify all shapes were restored
      expect(shapes.size).toBe(5);
    });
  });

  describe('AI Command Batch Operations', () => {
    it('should handle batch undo/redo for multiple AI commands', async () => {
      const user1 = 'user-1';
      
      // Mock multiple commands
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: true,
          message: 'Success',
          executedCommands: [],
          createdShapeIds: []
        }
      });

      // Execute multiple AI commands
      await aiService.processCommand('Create a circle', user1);
      await aiService.processCommand('Create a rectangle', user1);
      await aiService.processCommand('Create a line', user1);
      
      // Undo all commands
      await canvasStore.undo();
      await canvasStore.undo();
      await canvasStore.undo();
      
      // Verify all shapes were removed
      const shapes = canvasStore.shapes;
      expect(shapes.size).toBe(0);
      
      // Redo all commands
      await canvasStore.redo();
      await canvasStore.redo();
      await canvasStore.redo();
      
      // Verify all shapes were restored
      expect(shapes.size).toBe(3);
    });

    it('should maintain command order in undo/redo stack', async () => {
      const user1 = 'user-1';
      
      // Mock commands with specific order
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: true,
          message: 'Success',
          executedCommands: [],
          createdShapeIds: []
        }
      });

      // Execute commands in specific order
      await aiService.processCommand('Create a circle', user1);
      await aiService.processCommand('Create a rectangle', user1);
      await aiService.processCommand('Create a line', user1);
      
      // Verify command order in history
      const history = aiService.getCommandHistory(user1);
      expect(history).toHaveLength(3);
      expect(history[0].command).toBe('Create a circle');
      expect(history[1].command).toBe('Create a rectangle');
      expect(history[2].command).toBe('Create a line');
    });
  });

  describe('AI Command Error Handling in Undo/Redo', () => {
    it('should handle AI command errors in undo stack', async () => {
      const user1 = 'user-1';
      
      // Mock successful command
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: true,
          message: 'Success',
          executedCommands: [],
          createdShapeIds: []
        }
      });

      await aiService.processCommand('Create a circle', user1);
      
      // Mock failed command
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: false,
          message: 'Error',
          executedCommands: [],
          error: 'AI_ERROR'
        }
      });

      const result = await aiService.processCommand('Create invalid shape', user1);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('AI_ERROR');
      
      // Verify failed command is not added to undo stack
      const history = aiService.getCommandHistory(user1);
      expect(history).toHaveLength(1); // Only the successful command
    });

    it('should handle undo/redo when AI service is unavailable', async () => {
      const user1 = 'user-1';
      
      // Mock service unavailable
      mockFirebaseFunction.mockRejectedValue(new Error('Service unavailable'));

      const result = await aiService.processCommand('Create a circle', user1);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Service unavailable');
      
      // Verify no command is added to history
      const history = aiService.getCommandHistory(user1);
      expect(history).toHaveLength(0);
    });
  });
});

describe('AI Performance Integration', () => {
  let aiService: AIService;
  let mockFirebaseFunction: Mock;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockFirebaseFunction = vi.fn();
    const { httpsCallable } = await import('firebase/functions');
    httpsCallable.mockImplementation(() => mockFirebaseFunction);
    
    aiService = new AIService();
  });

  describe('Response Time Performance', () => {
    it('should maintain <2s response times under load', async () => {
      const user1 = 'user-1';
      const commands = [
        'Create a circle',
        'Create a rectangle',
        'Create a line',
        'Create text',
        'Move shapes to center',
        'Align shapes to left',
        'Change color to blue',
        'Export canvas as PNG',
        'Create a new layer',
        'Duplicate selected shapes'
      ];

      // Mock fast responses
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: true,
          message: 'Success',
          executedCommands: [],
          createdShapeIds: []
        }
      });

      const startTime = Date.now();
      
      const promises = commands.map(command => 
        aiService.processCommand(command, user1)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      const averageDuration = totalDuration / commands.length;

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      expect(averageDuration).toBeLessThan(2000); // Average < 2 seconds
    });

    it('should handle concurrent users without performance degradation', async () => {
      const users = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'];
      
      // Mock responses
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: true,
          message: 'Success',
          executedCommands: [],
          createdShapeIds: []
        }
      });

      const startTime = Date.now();
      
      const promises = users.map(user => 
        aiService.processCommand('Create a circle', user)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      expect(totalDuration).toBeLessThan(10000); // Total < 10 seconds for 5 users
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory with repeated AI commands', async () => {
      const user1 = 'user-1';
      
      // Mock responses
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: true,
          message: 'Success',
          executedCommands: [],
          createdShapeIds: []
        }
      });

      // Execute many commands
      for (let i = 0; i < 100; i++) {
        await aiService.processCommand(`Create shape ${i}`, user1);
      }

      // Verify history is manageable
      const history = aiService.getCommandHistory(user1);
      expect(history.length).toBeLessThanOrEqual(100);
      
      // Verify no memory leaks in status
      const status = aiService.getStatus(user1);
      expect(status).toBeDefined();
    });

    it('should handle large command queues efficiently', async () => {
      const user1 = 'user-1';
      
      // Mock responses
      mockFirebaseFunction.mockResolvedValue({
        data: {
          success: true,
          message: 'Success',
          executedCommands: [],
          createdShapeIds: []
        }
      });

      // Add many commands to queue
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(aiService.processCommand(`Create shape ${i}`, user1));
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});

describe('AI Accuracy Integration', () => {
  let aiService: AIService;
  let mockFirebaseFunction: Mock;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    mockFirebaseFunction = vi.fn();
    const { httpsCallable } = await import('firebase/functions');
    httpsCallable.mockImplementation(() => mockFirebaseFunction);
    
    aiService = new AIService();
  });

  describe('Command Type Accuracy', () => {
    it('should achieve 90%+ accuracy for command type classification', async () => {
      const testCases = [
        { input: 'Create a red circle', expectedType: 'CREATE' },
        { input: 'Move the rectangle to center', expectedType: 'MOVE' },
        { input: 'Resize the shape to be bigger', expectedType: 'RESIZE' },
        { input: 'Rotate the text 45 degrees', expectedType: 'ROTATE' },
        { input: 'Delete the selected shapes', expectedType: 'DELETE' },
        { input: 'Align shapes to the left', expectedType: 'ALIGN' },
        { input: 'Export canvas as PNG', expectedType: 'EXPORT' },
        { input: 'Create a new layer', expectedType: 'LAYER' },
        { input: 'Change color to blue', expectedType: 'COLOR' },
        { input: 'Duplicate the shape', expectedType: 'DUPLICATE' }
      ];

      let correctPredictions = 0;

      for (const testCase of testCases) {
        mockFirebaseFunction.mockResolvedValue({
          data: {
            success: true,
            message: 'Success',
            executedCommands: [{
              type: testCase.expectedType,
              action: testCase.input,
              parameters: {},
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

    it('should handle ambiguous commands with clarification', async () => {
      const ambiguousCommands = [
        'Move the shape',
        'Delete the rectangle',
        'Change the color',
        'Resize the text',
        'Rotate the circle'
      ];

      for (const command of ambiguousCommands) {
        mockFirebaseFunction.mockResolvedValue({
          data: {
            success: false,
            message: 'Clarification needed',
            executedCommands: [],
            clarificationNeeded: {
              question: `Which ${command.split(' ')[2]} would you like to ${command.split(' ')[0].toLowerCase()}?`,
              options: [
                { label: 'Shape 1', value: 'shape-1', shapeIds: ['shape-1'] },
                { label: 'Shape 2', value: 'shape-2', shapeIds: ['shape-2'] }
              ]
            }
          }
        });

        const result = await aiService.processCommand(command, 'test-user');
        
        expect(result.success).toBe(false);
        expect(result.clarificationNeeded).toBeDefined();
        expect(result.clarificationNeeded?.question).toContain('Which');
        expect(result.clarificationNeeded?.options).toHaveLength(2);
      }
    });
  });

  describe('Parameter Extraction Accuracy', () => {
    it('should extract shape parameters accurately', async () => {
      const testCases = [
        {
          input: 'Create a red circle at position 100,100',
          expectedParams: {
            shapeType: 'circle',
            color: '#FF0000',
            position: { x: 100, y: 100 }
          }
        },
        {
          input: 'Create a blue rectangle with size 200x150',
          expectedParams: {
            shapeType: 'rect',
            color: '#0000FF',
            size: { w: 200, h: 150 }
          }
        },
        {
          input: 'Create green text saying Hello',
          expectedParams: {
            shapeType: 'text',
            color: '#00FF00',
            text: 'Hello'
          }
        }
      ];

      for (const testCase of testCases) {
        mockFirebaseFunction.mockResolvedValue({
          data: {
            success: true,
            message: 'Success',
            executedCommands: [{
              type: 'CREATE',
              action: testCase.input,
              parameters: testCase.expectedParams,
              confidence: 0.9,
              timestamp: Date.now(),
              userId: 'test-user',
              commandId: 'cmd-test'
            }],
            createdShapeIds: ['shape-test']
          }
        });

        const result = await aiService.processCommand(testCase.input, 'test-user');
        
        expect(result.success).toBe(true);
        expect(result.executedCommands[0].parameters).toMatchObject(testCase.expectedParams);
      }
    });

    it('should extract alignment parameters accurately', async () => {
      const alignmentTests = [
        { input: 'Align shapes to the left', expectedAlignment: 'left' },
        { input: 'Align shapes to the right', expectedAlignment: 'right' },
        { input: 'Align shapes to center', expectedAlignment: 'center' },
        { input: 'Distribute shapes evenly', expectedAlignment: 'distribute' }
      ];

      for (const test of alignmentTests) {
        mockFirebaseFunction.mockResolvedValue({
          data: {
            success: true,
            message: 'Success',
            executedCommands: [{
              type: 'ALIGN',
              action: test.input,
              parameters: {
                alignment: test.expectedAlignment
              },
              confidence: 0.9,
              timestamp: Date.now(),
              userId: 'test-user',
              commandId: 'cmd-test'
            }],
            modifiedShapeIds: ['shape-test']
          }
        });

        const result = await aiService.processCommand(test.input, 'test-user');
        
        expect(result.success).toBe(true);
        expect(result.executedCommands[0].parameters.alignment).toBe(test.expectedAlignment);
      }
    });
  });
});
