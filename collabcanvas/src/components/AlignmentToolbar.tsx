/**
 * AlignmentToolbar component
 * Provides alignment and distribution controls for selected shapes
 */

import { useCanvasStore } from '../store/canvasStore';

interface AlignmentToolbarProps {
  isVisible: boolean;
  onClose: () => void;
}

export function AlignmentToolbar({ isVisible, onClose }: AlignmentToolbarProps) {
  const {
    selectedShapeIds,
    alignSelectedShapes,
    distributeSelectedShapes,
  } = useCanvasStore();

  if (!isVisible) return null;

  const canAlign = selectedShapeIds.length >= 2;
  const canDistribute = selectedShapeIds.length >= 3;

  const alignmentButtons = [
    {
      id: 'left',
      label: 'Align Left',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
        </svg>
      ),
      action: () => alignSelectedShapes('left'),
    },
    {
      id: 'center',
      label: 'Align Center',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M8 12h8m-8 6h16" />
        </svg>
      ),
      action: () => alignSelectedShapes('center'),
    },
    {
      id: 'right',
      label: 'Align Right',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M12 12h8m-8 6h16" />
        </svg>
      ),
      action: () => alignSelectedShapes('right'),
    },
    {
      id: 'top',
      label: 'Align Top',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h8m-8 6h16m-8 6h8" />
        </svg>
      ),
      action: () => alignSelectedShapes('top'),
    },
    {
      id: 'middle',
      label: 'Align Middle',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-8 6h8" />
        </svg>
      ),
      action: () => alignSelectedShapes('middle'),
    },
    {
      id: 'bottom',
      label: 'Align Bottom',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h8m-8 6h16m-8 6h8" />
        </svg>
      ),
      action: () => alignSelectedShapes('bottom'),
    },
  ];

  const distributionButtons = [
    {
      id: 'distribute-horizontal',
      label: 'Distribute Horizontally',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
      action: () => distributeSelectedShapes('horizontal'),
    },
    {
      id: 'distribute-vertical',
      label: 'Distribute Vertically',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h8m-8 6h16m-8 6h8" />
        </svg>
      ),
      action: () => distributeSelectedShapes('vertical'),
    },
  ];

  return (
    <div className="fixed left-4 top-20 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Alignment</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4">
        {/* Selection Info */}
        <div className="mb-4 text-sm text-gray-600">
          {selectedShapeIds.length === 0 && 'No shapes selected'}
          {selectedShapeIds.length === 1 && '1 shape selected'}
          {selectedShapeIds.length > 1 && `${selectedShapeIds.length} shapes selected`}
        </div>

        {/* Alignment Controls */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Align</h4>
          <div className="grid grid-cols-3 gap-2">
            {alignmentButtons.map((button) => (
              <button
                key={button.id}
                onClick={button.action}
                disabled={!canAlign}
                className={`flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-colors ${
                  canAlign
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
                title={button.label}
              >
                {button.icon}
                <span className="text-xs">{button.label.split(' ')[1]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Distribution Controls */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Distribute</h4>
          <div className="grid grid-cols-2 gap-2">
            {distributionButtons.map((button) => (
              <button
                key={button.id}
                onClick={button.action}
                disabled={!canDistribute}
                className={`flex flex-col items-center gap-1 p-2 rounded-md text-xs font-medium transition-colors ${
                  canDistribute
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
                title={button.label}
              >
                {button.icon}
                <span className="text-xs">{button.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-4 text-xs text-gray-500">
          <p>• Align: Requires 2+ shapes</p>
          <p>• Distribute: Requires 3+ shapes</p>
        </div>
      </div>
    </div>
  );
}
