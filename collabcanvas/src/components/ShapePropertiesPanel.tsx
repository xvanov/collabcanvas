/**
 * Shape properties panel for editing selected shapes
 * Combines color picker, size editor, and text editor
 */

import { ColorPicker } from './ColorPicker';
import { SizeEditor } from './SizeEditor';
import { useCanvasStore } from '../store/canvasStore';
import { useShapes } from '../hooks/useShapes';

interface ShapePropertiesPanelProps {
  className?: string;
  projectId?: string;
}

export function ShapePropertiesPanel({ className = '', projectId }: ShapePropertiesPanelProps) {
  const selectedShapeId = useCanvasStore((state) => state.selectedShapeId);
  const shapes = useCanvasStore((state) => state.shapes);
  const currentUser = useCanvasStore((state) => state.currentUser);
  const { updateShapeProperty } = useShapes(projectId);

  const selectedShape = selectedShapeId ? shapes.get(selectedShapeId) : null;

  if (!selectedShape || !currentUser) {
    return (
      <div className={`bg-white border-l border-gray-200 p-4 ${className}`}>
        <div className="text-sm text-gray-500 text-center">
          Select a shape to edit its properties
        </div>
      </div>
    );
  }

  const handleColorChange = async (color: string) => {
    await updateShapeProperty(selectedShape.id, 'color', color);
  };

  const handleSizeChange = async (width: number, height: number) => {
    await updateShapeProperty(selectedShape.id, 'w', width);
    await updateShapeProperty(selectedShape.id, 'h', height);
  };

  const handleTextChange = async (text: string) => {
    await updateShapeProperty(selectedShape.id, 'text', text);
  };

  const handleFontSizeChange = async (fontSize: number) => {
    await updateShapeProperty(selectedShape.id, 'fontSize', fontSize);
  };

  const handleStrokeWidthChange = async (strokeWidth: number) => {
    await updateShapeProperty(selectedShape.id, 'strokeWidth', strokeWidth);
  };

  const handleLineLengthChange = async (length: number) => {
    await updateShapeProperty(selectedShape.id, 'w', length);
    await updateShapeProperty(selectedShape.id, 'points', [0, 0, length, 0]);
  };

  const handleRadiusChange = async (radius: number) => {
    await updateShapeProperty(selectedShape.id, 'radius', radius);
  };

  return (
    <div className={`bg-white border-l border-gray-200 p-4 space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Shape Properties</h2>
        <div className="text-xs text-gray-500">
          {selectedShape.type.charAt(0).toUpperCase() + selectedShape.type.slice(1)}
        </div>
      </div>

      {/* Color Picker */}
      <div className="space-y-2">
        <ColorPicker
          currentColor={selectedShape.color}
          onColorChange={handleColorChange}
          disabled={!currentUser}
        />
      </div>

      {/* Rectangle Size Editor */}
      {selectedShape.type === 'rect' && (
        <SizeEditor
          shape={selectedShape}
          onSizeChange={handleSizeChange}
          disabled={!currentUser}
        />
      )}

      {/* Circle Properties */}
      {selectedShape.type === 'circle' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Circle Properties</h3>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">
              Radius
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={selectedShape.radius || Math.min(selectedShape.w, selectedShape.h) / 2}
                onChange={(e) => handleRadiusChange(parseInt(e.target.value) || 50)}
                min="10"
                max="250"
                disabled={!currentUser}
                className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <span className="text-xs text-gray-500">px</span>
            </div>
          </div>
        </div>
      )}

      {/* Line Properties */}
      {selectedShape.type === 'line' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Line Properties</h3>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">
              Length
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={selectedShape.w}
                onChange={(e) => {
                  const length = parseInt(e.target.value) || 100;
                  handleLineLengthChange(length);
                }}
                min="10"
                max="1000"
                disabled={!currentUser}
                className="w-20 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <span className="text-xs text-gray-500">px</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">
              Stroke Width
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="1"
                max="20"
                value={selectedShape.strokeWidth || 2}
                onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
                disabled={!currentUser}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 w-12 text-center">
                {selectedShape.strokeWidth || 2}px
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Text Properties */}
      {selectedShape.type === 'text' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Text Properties</h3>
          </div>
          
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">
              Content
            </label>
            <textarea
              value={selectedShape.text || ''}
              onChange={(e) => handleTextChange(e.target.value)}
              disabled={!currentUser}
              rows={3}
              maxLength={200}
              placeholder="Enter text..."
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 resize-none"
            />
            <div className="text-xs text-gray-500">
              {(selectedShape.text || '').length}/200 characters
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
                value={selectedShape.fontSize || 16}
                onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                disabled={!currentUser}
                className="flex-1"
              />
              <input
                type="number"
                value={selectedShape.fontSize || 16}
                onChange={(e) => handleFontSizeChange(parseInt(e.target.value) || 16)}
                min="8"
                max="72"
                disabled={!currentUser}
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
                  disabled={!currentUser}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    (selectedShape.fontSize || 16) === size
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Shape Info */}
      <div className="pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div>ID: {selectedShape.id}</div>
          <div>Position: ({Math.round(selectedShape.x)}, {Math.round(selectedShape.y)})</div>
          <div>Size: {Math.round(selectedShape.w)} × {Math.round(selectedShape.h)}</div>
          {selectedShape.createdBy && (
            <div>Created by: {selectedShape.createdBy}</div>
          )}
        </div>
      </div>
    </div>
  );
}
