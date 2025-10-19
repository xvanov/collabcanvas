/**
 * Color picker component for shape editing
 * Provides a simple color palette for quick color selection
 */

import { useState, useRef } from 'react';

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  disabled?: boolean;
  swatchOnly?: boolean; // render just a small color swatch without text
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#000000', // Black
  '#FFFFFF', // White
];

export function ColorPicker({ currentColor, onColorChange, disabled = false, swatchOnly = false }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const handleColorSelect = (color: string) => {
    console.log('ColorPicker: handleColorSelect called with:', color);
    onColorChange(color);
    setIsOpen(false);
  };

  const openMenu = () => {
    if (!btnRef.current) return setIsOpen(true);
    const rect = btnRef.current.getBoundingClientRect();
    const margin = 8;
    const estWidth = 220; // estimated popover width
    const estHeight = 300; // estimated popover height
    let left = Math.min(Math.max(margin, rect.left), window.innerWidth - estWidth - margin);
    let top = rect.bottom + margin;
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < estHeight + margin) {
      top = Math.max(margin, rect.top - estHeight - margin);
    }
    setMenuPos({ top, left });
    setIsOpen(true);
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        disabled={disabled}
        className={swatchOnly
          ? "flex items-center rounded border border-gray-300 bg-white p-1 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          : "flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"}
        title="Change color"
      >
        <div
          className={swatchOnly ? "h-4 w-4 rounded border border-gray-300" : "h-4 w-4 rounded border border-gray-300"}
          style={{ backgroundColor: currentColor }}
        />
        {!swatchOnly && 'Color'}
      </button>

      {isOpen && (
        <div
          className="fixed z-50 rounded-lg border border-gray-200 bg-white p-3 shadow-lg max-h-[70vh] overflow-auto"
          style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px`, width: 220 }}
        >
          <div className="grid grid-cols-4 gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                className={`h-8 w-8 rounded border-2 transition-all hover:scale-110 ${
                  currentColor === color ? 'border-gray-900' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          
          {/* Custom color input */}
          <div className="mt-3 border-t border-gray-200 pt-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Custom Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={currentColor}
                onChange={(e) => {
                  console.log('Custom color selected:', e.target.value);
                  handleColorSelect(e.target.value);
                }}
                className="h-8 w-16 rounded border border-gray-300 cursor-pointer"
                title="Choose custom color"
              />
              <input
                type="text"
                value={currentColor}
                onChange={(e) => {
                  console.log('Custom color text input:', e.target.value);
                  // Validate hex color format
                  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                    handleColorSelect(e.target.value);
                  }
                }}
                placeholder="#000000"
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                title="Enter hex color code"
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Current: {currentColor}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
