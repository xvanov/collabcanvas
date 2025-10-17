/**
 * Size editor component for shape editing
 * Provides controls for adjusting shape dimensions while maintaining aspect ratio
 */

import { useState, useEffect } from 'react';
import type { Shape } from '../types';

interface SizeEditorProps {
  shape: Shape;
  onSizeChange: (width: number, height: number) => void;
  disabled?: boolean;
}

export function SizeEditor({ shape, onSizeChange, disabled = false }: SizeEditorProps) {
  const [width, setWidth] = useState(shape.w);
  const [height, setHeight] = useState(shape.h);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(shape.w / shape.h);

  // Update local state when shape changes
  useEffect(() => {
    setWidth(shape.w);
    setHeight(shape.h);
    setAspectRatio(shape.w / shape.h);
  }, [shape.w, shape.h]);

  // Helper function to safely parse number input
  const parseNumberInput = (value: string): number | null => {
    if (value === '') return null; // Empty input is valid (don't update)
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  };

  const handleWidthChange = (newWidth: number) => {
    if (disabled) return;
    
    // Validate input - must be positive number
    if (isNaN(newWidth) || newWidth <= 0) {
      return; // Don't update if invalid
    }
    
    setWidth(newWidth);
    
    if (maintainAspectRatio) {
      const newHeight = Math.round(newWidth / aspectRatio);
      setHeight(newHeight);
      onSizeChange(newWidth, newHeight);
    } else {
      onSizeChange(newWidth, height);
    }
  };

  const handleHeightChange = (newHeight: number) => {
    if (disabled) return;
    
    // Validate input - must be positive number
    if (isNaN(newHeight) || newHeight <= 0) {
      return; // Don't update if invalid
    }
    
    setHeight(newHeight);
    
    if (maintainAspectRatio) {
      const newWidth = Math.round(newHeight * aspectRatio);
      setWidth(newWidth);
      onSizeChange(newWidth, newHeight);
    } else {
      onSizeChange(width, newHeight);
    }
  };

  const handleAspectRatioToggle = () => {
    if (disabled) return;
    
    setMaintainAspectRatio(!maintainAspectRatio);
    if (!maintainAspectRatio) {
      // Recalculate aspect ratio when enabling
      setAspectRatio(width / height);
    }
  };

  // Shape-specific size controls
  const getSizeControls = () => {
    switch (shape.type) {
      case 'circle':
        return (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">
              Radius
            </label>
            <input
              type="number"
              value={Math.round(Math.min(width, height) / 2)}
              onChange={(e) => {
                const radius = parseInt(e.target.value) || 0;
                const diameter = radius * 2;
                handleWidthChange(diameter);
                handleHeightChange(diameter);
              }}
              min="1"
              max="500"
              disabled={disabled}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        );

      case 'line':
        return (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">
              Length
            </label>
            <input
              type="number"
              value={width}
              onChange={(e) => {
                const parsed = parseNumberInput(e.target.value);
                if (parsed !== null) {
                  handleWidthChange(parsed);
                }
              }}
              min="1"
              max="1000"
              disabled={disabled}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <label className="block text-xs font-medium text-gray-700">
              Stroke Width
            </label>
            <input
              type="range"
              value={shape.strokeWidth || 2}
              onChange={() => {
                // This would need to be handled by the parent component
                // For now, we'll just show the slider
              }}
              min="1"
              max="20"
              disabled={disabled}
              className="w-full"
            />
            <div className="text-xs text-gray-500 text-center">
              {shape.strokeWidth || 2}px
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">
              Width
            </label>
            <input
              type="number"
              value={width}
              onChange={(e) => {
                const parsed = parseNumberInput(e.target.value);
                if (parsed !== null) {
                  handleWidthChange(parsed);
                }
              }}
              min="50"
              max="500"
              disabled={disabled}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <label className="block text-xs font-medium text-gray-700">
              Height
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => {
                const parsed = parseNumberInput(e.target.value);
                if (parsed !== null) {
                  handleHeightChange(parsed);
                }
              }}
              min="20"
              max="200"
              disabled={disabled}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <label className="block text-xs font-medium text-gray-700">
              Font Size
            </label>
            <input
              type="number"
              value={shape.fontSize || 16}
              onChange={() => {
                // This would need to be handled by the parent component
              }}
              min="8"
              max="72"
              disabled={disabled}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        );

      default: // rect
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="aspect-ratio"
                checked={maintainAspectRatio}
                onChange={handleAspectRatioToggle}
                disabled={disabled}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <label htmlFor="aspect-ratio" className="text-xs font-medium text-gray-700">
                Maintain aspect ratio
              </label>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Width
                </label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => {
                    const parsed = parseNumberInput(e.target.value);
                    if (parsed !== null) {
                      handleWidthChange(parsed);
                    }
                  }}
                  min="1"
                  max="500"
                  disabled={disabled}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Height
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => {
                    const parsed = parseNumberInput(e.target.value);
                    if (parsed !== null) {
                      handleHeightChange(parsed);
                    }
                  }}
                  min="1"
                  max="500"
                  disabled={disabled}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Size</h3>
      </div>
      {getSizeControls()}
    </div>
  );
}
