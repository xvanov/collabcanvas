import { vi } from 'vitest';
import '@testing-library/jest-dom';

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
  signOut: vi.fn(() => Promise.resolve()),
  connectAuthEmulator: vi.fn(() => {}),
  connectFirestoreEmulator: vi.fn(() => {}),
  connectDatabaseEmulator: vi.fn(() => {})
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
  orderBy: vi.fn(() => ({})),
  connectFirestoreEmulator: vi.fn(() => {})
}));

// Mock Firebase RTDB
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn(() => ({})),
  onValue: vi.fn(() => vi.fn()),
  off: vi.fn(() => {}),
  set: vi.fn(() => Promise.resolve()),
  update: vi.fn(() => Promise.resolve()),
  remove: vi.fn(() => Promise.resolve()),
  connectDatabaseEmulator: vi.fn(() => {})
}));

// Mock Konva
vi.mock('konva', () => ({
  default: {
    Stage: vi.fn(),
    Layer: vi.fn(),
    Rect: vi.fn(),
    Circle: vi.fn(),
    Line: vi.fn(),
    Text: vi.fn(),
    Group: vi.fn(),
    Transformer: vi.fn()
  }
}));

// Mock react-konva
vi.mock('react-konva', () => ({
  Stage: vi.fn(),
  Layer: vi.fn(),
  Rect: vi.fn(),
  Circle: vi.fn(),
  Line: vi.fn(),
  Text: vi.fn(),
  Group: vi.fn(),
  Transformer: vi.fn()
}));

// Mock Firebase services that the store depends on
vi.mock('../services/firestore', () => ({
  createShape: vi.fn(() => Promise.resolve({ id: 'mock-shape-id' })),
  deleteShape: vi.fn(() => Promise.resolve()),
  updateShape: vi.fn(() => Promise.resolve()),
  subscribeToShapes: vi.fn(() => vi.fn()),
  subscribeToLocks: vi.fn(() => vi.fn()),
  subscribeToPresence: vi.fn(() => vi.fn())
}));

vi.mock('../services/historyService', () => ({
  createHistoryService: vi.fn(() => ({
    pushAction: vi.fn(),
    undo: vi.fn(() => ({ type: 'CREATE', shapeId: 'shape1', data: {}, userId: 'user1', timestamp: Date.now() })),
    redo: vi.fn(() => ({ type: 'CREATE', shapeId: 'shape1', data: {}, userId: 'user1', timestamp: Date.now() })),
    canUndo: vi.fn(() => true),
    canRedo: vi.fn(() => true),
    clearHistory: vi.fn(),
    getHistory: vi.fn(() => ({ actions: [], currentIndex: -1 })),
    getHistoryState: vi.fn(() => ({ past: [], future: [], currentIndex: -1 })),
    setOnActionApplied: vi.fn()
  })),
  createAction: {
    create: vi.fn(() => ({ type: 'CREATE', shapeId: 'shape1', data: {}, userId: 'user1', timestamp: Date.now() })),
    delete: vi.fn(() => ({ type: 'DELETE', shapeId: 'shape1', data: {}, userId: 'user1', timestamp: Date.now() })),
    update: vi.fn(() => ({ type: 'UPDATE', shapeId: 'shape1', data: {}, userId: 'user1', timestamp: Date.now() })),
    move: vi.fn(() => ({ type: 'MOVE', shapeId: 'shape1', data: {}, userId: 'user1', timestamp: Date.now() })),
    bulkDelete: vi.fn(() => ({ type: 'BULK_DELETE', shapeIds: ['shape1'], data: [], userId: 'user1', timestamp: Date.now() })),
    bulkDuplicate: vi.fn(() => ({ type: 'BULK_DUPLICATE', shapeIds: ['shape1'], data: [], userId: 'user1', timestamp: Date.now() })),
    bulkMove: vi.fn(() => ({ type: 'BULK_MOVE', shapeIds: ['shape1'], data: {}, userId: 'user1', timestamp: Date.now() })),
    bulkRotate: vi.fn(() => ({ type: 'BULK_ROTATE', shapeIds: ['shape1'], data: {}, userId: 'user1', timestamp: Date.now() }))
  }
}));

vi.mock('../services/aiService', () => ({
  AIService: vi.fn().mockImplementation(() => ({
    processCommand: vi.fn(() => Promise.resolve({ success: true, message: 'Mock AI response' }))
  }))
}));


// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));