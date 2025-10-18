/**
 * Keyboard shortcuts hook
 * Handles keyboard shortcuts for undo/redo and other operations
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcuts {
  onUndo?: () => void;
  onRedo?: () => void;
  onExport?: () => void;
  onShowShortcuts?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
}

/**
 * Hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts({
  onUndo,
  onRedo,
  onExport,
  onShowShortcuts,
  onDelete,
  onDuplicate,
  onSelectAll,
  onClearSelection,
}: KeyboardShortcuts) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target as HTMLElement)?.contentEditable === 'true'
    ) {
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? event.metaKey : event.ctrlKey;
    const altKey = event.altKey;
    const shiftKey = event.shiftKey;

    // Undo: Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
    if (ctrlKey && !shiftKey && !altKey && event.key === 'z') {
      event.preventDefault();
      onUndo?.();
      return;
    }

    // Redo: Cmd+Shift+Z (Mac) or Ctrl+Y (Windows/Linux)
    if (
      (isMac && ctrlKey && shiftKey && !altKey && event.key === 'z') ||
      (!isMac && ctrlKey && !shiftKey && !altKey && event.key === 'y')
    ) {
      event.preventDefault();
      onRedo?.();
      return;
    }

    // Export: Cmd+E (Mac) or Ctrl+E (Windows/Linux)
    if (ctrlKey && !shiftKey && !altKey && event.key === 'e') {
      event.preventDefault();
      onExport?.();
      return;
    }

    // Show shortcuts help: Cmd+? (Mac) or Ctrl+? (Windows/Linux)
    if (ctrlKey && !shiftKey && !altKey && event.key === '/') {
      event.preventDefault();
      onShowShortcuts?.();
      return;
    }

    // Delete: Delete key or Backspace
    if ((event.key === 'Delete' || event.key === 'Backspace') && !ctrlKey && !altKey) {
      event.preventDefault();
      onDelete?.();
      return;
    }

    // Duplicate: Cmd+D (Mac) or Ctrl+D (Windows/Linux)
    if (ctrlKey && !shiftKey && !altKey && event.key === 'd') {
      event.preventDefault();
      onDuplicate?.();
      return;
    }

    // Select All: Cmd+A (Mac) or Ctrl+A (Windows/Linux)
    if (ctrlKey && !shiftKey && !altKey && event.key === 'a') {
      event.preventDefault();
      onSelectAll?.();
      return;
    }

    // Clear Selection: Escape
    if (event.key === 'Escape' && !ctrlKey && !altKey && !shiftKey) {
      event.preventDefault();
      onClearSelection?.();
      return;
    }
  }, [
    onUndo,
    onRedo,
    onExport,
    onShowShortcuts,
    onDelete,
    onDuplicate,
    onSelectAll,
    onClearSelection,
  ]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * Get keyboard shortcut display text
 */
export function getShortcutText(shortcut: string): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return shortcut
    .replace('Cmd', isMac ? '⌘' : 'Ctrl')
    .replace('Ctrl', isMac ? '⌘' : 'Ctrl')
    .replace('Shift', isMac ? '⇧' : 'Shift')
    .replace('Alt', isMac ? '⌥' : 'Alt')
    .replace(/\+/g, ''); // Remove all '+' characters
}

/**
 * Common keyboard shortcuts
 */
export const KEYBOARD_SHORTCUTS = {
  undo: 'Cmd+Z',
  redo: 'Cmd+Shift+Z',
  export: 'Cmd+E',
  showShortcuts: 'Cmd+/',
  delete: 'Delete',
  duplicate: 'Cmd+D',
  selectAll: 'Cmd+A',
  clearSelection: 'Escape',
} as const;
