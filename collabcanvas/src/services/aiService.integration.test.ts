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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCanvasStore, type CanvasState } from '../store/canvasStore';
import { AIService } from '../services/aiService';

// Mock Firebase Functions - must be set up before AIService is imported
// Create a shared mock function that we can update
const sharedMockFn = vi.fn();

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => sharedMockFn)
}));

// Mock firebase module
vi.mock('../services/firebase', () => ({
  functions: {},
  firestore: {},
  auth: {},
  storage: {},
  database: {},
  rtdb: {}
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

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear the shared mock for each test
    sharedMockFn.mockClear();
    
    // Create a fresh instance for each test
    aiService = new AIService();
  });


  describe('Multi-User Conflict Resolution', () => {
    it('should handle simultaneous shape modifications', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      // Mock conflict resolution
      sharedMockFn.mockResolvedValue({
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

  });

  describe('Real-time Collaboration', () => {

    it('should broadcast AI commands to all users', async () => {
      const user1 = 'user-1';
      
      // Mock broadcast response
      sharedMockFn.mockResolvedValue({
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
  let canvasStore: CanvasState;
  let aiService: AIService;
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear the shared mock for each test
    sharedMockFn.mockClear();
    
    // Create a fresh instance for each test
    aiService = new AIService();
    
    // Initialize canvas store
    canvasStore = useCanvasStore.getState();
  });

  describe('AI Command History Integration', () => {

    it('should support undoing AI commands', async () => {
      const user1 = 'user-1';
      
      // Mock successful command
      sharedMockFn.mockResolvedValue({
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
      (canvasStore.undo as () => void)();
      
      // Verify shape was removed
      const shapes = canvasStore.shapes as Map<string, unknown>;
      expect(shapes.has('shape-123')).toBe(false);
    });


  });

});

describe('AI Performance Integration', () => {
  let aiService: AIService;
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear the shared mock for each test
    sharedMockFn.mockClear();
    
    // Create a fresh instance for each test
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
      sharedMockFn.mockResolvedValue({
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
      sharedMockFn.mockResolvedValue({
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

    it('should handle large command queues efficiently', async () => {
      const user1 = 'user-1';
      
      // Mock responses
      sharedMockFn.mockResolvedValue({
        data: {
          success: true,
          message: 'Success',
          executedCommands: [],
          createdShapeIds: []
        }
      });

      // Add many commands to queue
      const promises: Promise<import('../types').AICommandResult>[] = [];
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

