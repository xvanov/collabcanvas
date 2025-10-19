/**
 * FileUpload component for construction plan images
 * Integrates with Firebase Storage and canvas state
 */

import React, { useRef, useState } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { uploadConstructionPlanImage, validateImageFile } from '../services/storage';
import type { BackgroundImage } from '../types';

interface FileUploadProps {
  onUploadComplete?: (image: BackgroundImage) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
}

export function FileUpload({ onUploadComplete, onUploadError, disabled = false }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { currentUser, canvasScale, setBackgroundImage, setIsImageUploadMode } = useCanvasStore();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      onUploadError?.(validation.error || 'Invalid file');
      return;
    }

    setIsUploading(true);
    setIsImageUploadMode(true);

    try {
      // Upload to Firebase Storage
      const backgroundImage = await uploadConstructionPlanImage(file, currentUser.uid);
      
      // Update canvas state
      setBackgroundImage(backgroundImage);
      
      // Notify parent component
      onUploadComplete?.(backgroundImage);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
      setIsImageUploadMode(false);
    }
  };

  const handleButtonClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleDeleteImage = () => {
    if (confirm('Are you sure you want to delete the current background image?')) {
      setBackgroundImage(null);
    }
  };

  const hasBackgroundImage = !!canvasScale.backgroundImage;

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || isUploading}
      />
      
      {!hasBackgroundImage ? (
        <button
          onClick={handleButtonClick}
          disabled={disabled || isUploading || !currentUser}
          className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Upload Construction Plan"
        >
          {isUploading ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Uploading...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Plan
            </>
          )}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            Plan: {canvasScale.backgroundImage?.fileName || 'Unknown'}
          </span>
          <button
            onClick={handleDeleteImage}
            disabled={disabled || !currentUser}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete current plan"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Plan
          </button>
          <button
            onClick={handleButtonClick}
            disabled={disabled || isUploading || !currentUser}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Replace with new plan"
          >
            {isUploading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Replace Plan
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

