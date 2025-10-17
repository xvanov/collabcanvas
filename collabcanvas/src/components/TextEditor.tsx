/**
 * Text editor component for text shape editing
 * Provides controls for editing text content and font properties
 */

import { useState, useEffect } from 'react';
import type { Shape } from '../types';

interface TextEditorProps {
  shape: Shape;
  onTextChange: (text: string) => void;
  onFontSizeChange: (fontSize: number) => void;
  disabled?: boolean;
}

export function TextEditor({ shape, onTextChange, onFontSizeChange, disabled = false }: TextEditorProps) {
  const [text, setText] = useState(shape.text || '');
  const [fontSize, setFontSize] = useState(shape.fontSize || 16);

  // Update local state when shape changes
  useEffect(() => {
    setText(shape.text || '');
    setFontSize(shape.fontSize || 16);
  }, [shape.text, shape.fontSize]);

  const handleTextChange = (newText: string) => {
    if (disabled) return;
    setText(newText);
    onTextChange(newText);
  };

  const handleFontSizeChange = (newFontSize: number) => {
    if (disabled) return;
    setFontSize(newFontSize);
    onFontSizeChange(newFontSize);
  };

  // Only render for text shapes
  if (shape.type !== 'text') {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Text</h3>
      </div>
      
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          Content
        </label>
        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          disabled={disabled}
          rows={3}
          maxLength={200}
          placeholder="Enter text..."
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 resize-none"
        />
        <div className="text-xs text-gray-500">
          {text.length}/200 characters
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          Font Size
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="8"
            max="72"
            value={fontSize}
            onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
            disabled={disabled}
            className="flex-1"
          />
          <input
            type="number"
            value={fontSize}
            onChange={(e) => handleFontSizeChange(parseInt(e.target.value) || 16)}
            min="8"
            max="72"
            disabled={disabled}
            className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>
      </div>

      {/* Quick font size buttons */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          Quick Sizes
        </label>
        <div className="flex gap-1">
          {[12, 16, 20, 24, 32].map((size) => (
            <button
              key={size}
              onClick={() => handleFontSizeChange(size)}
              disabled={disabled}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                fontSize === size
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {size}px
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700">
          Preview
        </label>
        <div 
          className="min-h-[60px] rounded border border-gray-200 bg-gray-50 p-2 flex items-center justify-center"
          style={{ 
            width: shape.w, 
            height: shape.h,
            color: shape.color,
            fontSize: fontSize,
          }}
        >
          <span className="text-center break-words">
            {text || <span className="text-gray-400 italic">Enter text...</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
