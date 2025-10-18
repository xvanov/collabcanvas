/**
 * Export Dialog Component
 * Provides UI for canvas export options
 */

import { useState } from 'react';
import type { ExportOptions } from '../types';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  hasSelectedShapes: boolean;
}

/**
 * Export dialog component
 */
export function ExportDialog({ isOpen, onClose, onExport, hasSelectedShapes }: ExportDialogProps) {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'PNG',
    quality: 1.0,
    includeBackground: true,
    selectedOnly: false,
  });

  const handleExport = () => {
    onExport(options);
    onClose();
  };

  const handleOptionChange = (key: keyof ExportOptions, value: ExportOptions[keyof ExportOptions]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Export Canvas</h2>
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

        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleOptionChange('format', 'PNG')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  options.format === 'PNG'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                PNG
              </button>
              <button
                onClick={() => handleOptionChange('format', 'SVG')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  options.format === 'SVG'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                SVG
              </button>
            </div>
          </div>

          {/* Quality (PNG only) */}
          {options.format === 'PNG' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quality: {Math.round(options.quality * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={options.quality}
                onChange={(e) => handleOptionChange('quality', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}

          {/* Background */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.includeBackground}
                onChange={(e) => handleOptionChange('includeBackground', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Include background</span>
            </label>
          </div>

          {/* Selected Only */}
          {hasSelectedShapes && (
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.selectedOnly}
                  onChange={(e) => handleOptionChange('selectedOnly', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Export selected shapes only</span>
              </label>
            </div>
          )}

          {/* Custom Dimensions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Width (px)
              </label>
              <input
                type="number"
                value={options.width || ''}
                onChange={(e) => handleOptionChange('width', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Auto"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height (px)
              </label>
              <input
                type="number"
                value={options.height || ''}
                onChange={(e) => handleOptionChange('height', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Auto"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
