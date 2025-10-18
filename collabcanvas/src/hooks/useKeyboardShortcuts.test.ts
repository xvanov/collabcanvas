/**
 * Tests for Keyboard Shortcuts Hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, getShortcutText, KEYBOARD_SHORTCUTS, type KeyboardShortcutCallbacks } from '../hooks/useKeyboardShortcuts';

// Mock React Testing Library
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();

// Mock document
Object.defineProperty(document, 'addEventListener', {
  value: mockAddEventListener,
  writable: true,
});

Object.defineProperty(document, 'removeEventListener', {
  value: mockRemoveEventListener,
  writable: true,
});

// Mock navigator.platform
Object.defineProperty(navigator, 'platform', {
  value: 'MacIntel',
  writable: true,
});

describe('useKeyboardShortcuts', () => {
  let mockCallbacks: KeyboardShortcutCallbacks;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCallbacks = {
      onUndo: vi.fn(),
      onRedo: vi.fn(),
      onExport: vi.fn(),
      onShowShortcuts: vi.fn(),
      onDelete: vi.fn(),
      onDuplicate: vi.fn(),
      onSelectAll: vi.fn(),
      onClearSelection: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register keydown event listener on mount', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks));

    expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should remove keydown event listener on unmount', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts(mockCallbacks));

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should handle undo shortcut (Cmd+Z on Mac)', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = {
      key: 'z',
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      target: document.body,
      preventDefault: vi.fn(),
    };

    eventHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockCallbacks.onUndo).toHaveBeenCalled();
  });

  it('should handle redo shortcut (Cmd+Shift+Z on Mac)', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = {
      key: 'z',
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      shiftKey: true,
      target: document.body,
      preventDefault: vi.fn(),
    };

    eventHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockCallbacks.onRedo).toHaveBeenCalled();
  });

  it('should handle export shortcut (Cmd+E)', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = {
      key: 'e',
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      target: document.body,
      preventDefault: vi.fn(),
    };

    eventHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockCallbacks.onExport).toHaveBeenCalled();
  });

  it('should handle shortcuts help shortcut (Cmd+/)', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = {
      key: '/',
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      target: document.body,
      preventDefault: vi.fn(),
    };

    eventHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockCallbacks.onShowShortcuts).toHaveBeenCalled();
  });

  it('should handle delete shortcut (Delete key)', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = {
      key: 'Delete',
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      target: document.body,
      preventDefault: vi.fn(),
    };

    eventHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockCallbacks.onDelete).toHaveBeenCalled();
  });

  it('should handle duplicate shortcut (Cmd+D)', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = {
      key: 'd',
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      target: document.body,
      preventDefault: vi.fn(),
    };

    eventHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockCallbacks.onDuplicate).toHaveBeenCalled();
  });

  it('should handle select all shortcut (Cmd+A)', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = {
      key: 'a',
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      target: document.body,
      preventDefault: vi.fn(),
    };

    eventHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockCallbacks.onSelectAll).toHaveBeenCalled();
  });

  it('should handle clear selection shortcut (Escape)', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = {
      key: 'Escape',
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      target: document.body,
      preventDefault: vi.fn(),
    };

    eventHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockCallbacks.onClearSelection).toHaveBeenCalled();
  });

  it('should not trigger shortcuts when typing in input fields', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const mockInput = document.createElement('input');
    const event = {
      key: 'z',
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      target: mockInput,
      preventDefault: vi.fn(),
    };

    eventHandler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(mockCallbacks.onUndo).not.toHaveBeenCalled();
  });

  it('should not trigger shortcuts when typing in textarea', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const mockTextarea = document.createElement('textarea');
    const event = {
      key: 'z',
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      target: mockTextarea,
      preventDefault: vi.fn(),
    };

    eventHandler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(mockCallbacks.onUndo).not.toHaveBeenCalled();
  });

  it('should not trigger shortcuts when typing in contentEditable elements', () => {
    renderHook(() => useKeyboardShortcuts(mockCallbacks));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const mockDiv = document.createElement('div');
    mockDiv.contentEditable = 'true';
    const event = {
      key: 'z',
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      target: mockDiv,
      preventDefault: vi.fn(),
    };

    eventHandler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(mockCallbacks.onUndo).not.toHaveBeenCalled();
  });

  it('should handle Windows/Linux shortcuts (Ctrl instead of Cmd)', () => {
    // Mock Windows platform
    Object.defineProperty(navigator, 'platform', {
      value: 'Win32',
      writable: true,
    });

    renderHook(() => useKeyboardShortcuts(mockCallbacks));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = {
      key: 'z',
      metaKey: false,
      ctrlKey: true,
      altKey: false,
      shiftKey: false,
      target: document.body,
      preventDefault: vi.fn(),
    };

    eventHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockCallbacks.onUndo).toHaveBeenCalled();
  });

  it('should handle Windows/Linux redo shortcut (Ctrl+Y)', () => {
    // Mock Windows platform
    Object.defineProperty(navigator, 'platform', {
      value: 'Win32',
      writable: true,
    });

    renderHook(() => useKeyboardShortcuts(mockCallbacks));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = {
      key: 'y',
      metaKey: false,
      ctrlKey: true,
      altKey: false,
      shiftKey: false,
      target: document.body,
      preventDefault: vi.fn(),
    };

    eventHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(mockCallbacks.onRedo).toHaveBeenCalled();
  });

  it('should not call undefined callbacks', () => {
    const partialCallbacks = {
      onUndo: vi.fn(),
      // Other callbacks are undefined
    };

    renderHook(() => useKeyboardShortcuts(partialCallbacks));

    const eventHandler = mockAddEventListener.mock.calls[0][1];
    const event = {
      key: 'e',
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      target: document.body,
      preventDefault: vi.fn(),
    };

    // Should not throw error even though onExport is undefined
    expect(() => eventHandler(event)).not.toThrow();
  });
});

describe('getShortcutText', () => {
  beforeEach(() => {
    // Mock Mac platform
    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      writable: true,
    });
  });

  it('should convert Cmd to ⌘ on Mac', () => {
    const result = getShortcutText('Cmd+Z');
    expect(result).toBe('⌘Z');
  });

  it('should convert Shift to ⇧ on Mac', () => {
    const result = getShortcutText('Cmd+Shift+Z');
    expect(result).toBe('⌘⇧Z');
  });

  it('should convert Alt to ⌥ on Mac', () => {
    const result = getShortcutText('Cmd+Alt+Z');
    expect(result).toBe('⌘⌥Z');
  });

  it('should convert Ctrl to Ctrl on Mac', () => {
    const result = getShortcutText('Ctrl+Z');
    expect(result).toBe('⌘Z');
  });

  it('should handle Windows platform', () => {
    // Mock Windows platform
    Object.defineProperty(navigator, 'platform', {
      value: 'Win32',
      writable: true,
    });

    const result = getShortcutText('Cmd+Z');
    expect(result).toBe('CtrlZ');
  });
});

describe('KEYBOARD_SHORTCUTS', () => {
  it('should have all required shortcuts defined', () => {
    expect(KEYBOARD_SHORTCUTS.undo).toBe('Cmd+Z');
    expect(KEYBOARD_SHORTCUTS.redo).toBe('Cmd+Shift+Z');
    expect(KEYBOARD_SHORTCUTS.export).toBe('Cmd+E');
    expect(KEYBOARD_SHORTCUTS.showShortcuts).toBe('Cmd+/');
    expect(KEYBOARD_SHORTCUTS.delete).toBe('Delete');
    expect(KEYBOARD_SHORTCUTS.duplicate).toBe('Cmd+D');
    expect(KEYBOARD_SHORTCUTS.selectAll).toBe('Cmd+A');
    expect(KEYBOARD_SHORTCUTS.clearSelection).toBe('Escape');
  });
});
