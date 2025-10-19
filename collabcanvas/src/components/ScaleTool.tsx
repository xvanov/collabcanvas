/**
 * ScaleTool component for construction measurements
 * Handles scale line creation and editing
 */

import { useState } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import type { ScaleLine, UnitType } from '../types';
import { MeasurementInput } from './MeasurementInput';

interface ScaleToolProps {
  onScaleComplete?: (scaleLine: ScaleLine) => void;
  disabled?: boolean;
}

export function ScaleTool({ disabled = false }: ScaleToolProps) {
  const { 
    currentUser, 
    canvasScale, 
    deleteScaleLine, 
    setIsScaleMode,
    updateScaleLine
  } = useCanvasStore();

  const [showEditModal, setShowEditModal] = useState(false);

  const handleActivate = () => {
    if (disabled || !currentUser) return;
    
    // If there's already a scale line, ask user if they want to replace it
    if (canvasScale.scaleLine) {
      const shouldReplace = window.confirm(
        'A scale line already exists. Do you want to replace it?'
      );
      if (!shouldReplace) return;
      
      deleteScaleLine();
    }
    
    setIsScaleMode(true);
  };

  const handleEditScale = () => {
    if (!canvasScale.scaleLine) return;
    setShowEditModal(true);
  };

  const handleEditSubmit = (value: number, unit: UnitType) => {
    updateScaleLine({ 
      realWorldLength: value,
      unit: unit
    });
    setShowEditModal(false);
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
  };

  const handleDeleteScale = () => {
    if (!canvasScale.scaleLine) return;
    
    const shouldDelete = window.confirm('Are you sure you want to delete the scale line?');
    if (shouldDelete) {
      deleteScaleLine();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {canvasScale.scaleLine ? (
        // Edit/Delete existing scale - stack vertically
        <div className="flex flex-col gap-1">
          <button
            onClick={handleEditScale}
            disabled={disabled}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Edit Scale"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Scale
          </button>
          
          <button
            onClick={handleDeleteScale}
            disabled={disabled}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete Scale"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Scale
          </button>
        </div>
      ) : (
        // Create new scale
        <button
          onClick={handleActivate}
          disabled={disabled || !currentUser}
          className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Create Scale Line"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
          </svg>
          Scale Tool
        </button>
      )}
      
      {/* Edit Measurement Modal */}
      <MeasurementInput
        isOpen={showEditModal}
        onClose={handleEditCancel}
        onSubmit={handleEditSubmit}
        initialValue={canvasScale.scaleLine?.realWorldLength || 0}
        initialUnit={canvasScale.scaleLine?.unit || 'feet'}
        title="Edit Scale Measurement"
      />
    </div>
  );
}
