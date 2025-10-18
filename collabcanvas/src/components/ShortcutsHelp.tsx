/**
 * Shortcuts Help Component
 * Displays keyboard shortcuts help dialog
 */

import { getShortcutText, KEYBOARD_SHORTCUTS } from '../hooks/useKeyboardShortcuts';

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Shortcuts help dialog component
 */
export function ShortcutsHelp({ isOpen, onClose }: ShortcutsHelpProps) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Edit',
      items: [
        { action: 'Undo', shortcut: getShortcutText(KEYBOARD_SHORTCUTS.undo) },
        { action: 'Redo', shortcut: getShortcutText(KEYBOARD_SHORTCUTS.redo) },
        { action: 'Delete', shortcut: getShortcutText(KEYBOARD_SHORTCUTS.delete) },
        { action: 'Duplicate', shortcut: getShortcutText(KEYBOARD_SHORTCUTS.duplicate) },
      ],
    },
    {
      category: 'Selection',
      items: [
        { action: 'Select All', shortcut: getShortcutText(KEYBOARD_SHORTCUTS.selectAll) },
        { action: 'Clear Selection', shortcut: getShortcutText(KEYBOARD_SHORTCUTS.clearSelection) },
      ],
    },
    {
      category: 'Export',
      items: [
        { action: 'Export Canvas', shortcut: getShortcutText(KEYBOARD_SHORTCUTS.export) },
      ],
    },
    {
      category: 'Help',
      items: [
        { action: 'Show Shortcuts', shortcut: getShortcutText(KEYBOARD_SHORTCUTS.showShortcuts) },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close dialog"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {shortcuts.map((category) => (
            <div key={category.category}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.items.map((item) => (
                  <div key={item.action} className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-700">{item.action}</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-md">
                      {item.shortcut}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
              {getShortcutText(KEYBOARD_SHORTCUTS.showShortcuts)}
            </kbd> to toggle this help dialog
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
