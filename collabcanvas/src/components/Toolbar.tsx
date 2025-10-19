import { AuthButton } from './AuthButton';
import FPSCounter from './FPSCounter';
import ZoomIndicator from './ZoomIndicator';
import { useCanvasStore } from '../store/canvasStore';
import { usePresence } from '../hooks/usePresence';
import { useOffline } from '../hooks/useOffline';
import type { Shape, ShapeType, ExportOptions } from '../types';
import { useState } from 'react';
import { ExportDialog } from './ExportDialog';
import { ShortcutsHelp } from './ShortcutsHelp';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { createExportService } from '../services/exportService';
import Konva from 'konva';
import { AICommandInput } from './AICommandInput';
import { AIClarificationDialog } from './AIClarificationDialog';

interface ToolbarProps {
  children?: React.ReactNode;
  fps?: number;
  zoom?: number;
  onCreateShape?: (type: ShapeType) => void;
  stageRef?: Konva.Stage | null; // Konva Stage reference for export
  onToggleLayers?: () => void;
  onToggleAlignment?: () => void;
  onToggleGrid?: () => void;
}

/**
 * Toolbar component
 * Top navigation bar with user authentication info, FPS counter, zoom level, and shape creation controls
 */
export function Toolbar({ children, fps, zoom, onCreateShape, stageRef, onToggleLayers, onToggleAlignment, onToggleGrid }: ToolbarProps) {
  const createShape = useCanvasStore((state) => state.createShape);
  const currentUser = useCanvasStore((state) => state.currentUser);
  const selectedShapeIds = useCanvasStore((state) => state.selectedShapeIds);
  const shapes = useCanvasStore((state) => state.shapes);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const canUndo = useCanvasStore((state) => state.canUndo);
  const canRedo = useCanvasStore((state) => state.canRedo);
  const deleteSelectedShapes = useCanvasStore((state) => state.deleteSelectedShapes);
  const duplicateSelectedShapes = useCanvasStore((state) => state.duplicateSelectedShapes);
  const clearSelection = useCanvasStore((state) => state.clearSelection);
  const selectShapes = useCanvasStore((state) => state.selectShapes);
  const gridState = useCanvasStore((state) => state.gridState);
  const toggleGrid = useCanvasStore((state) => state.toggleGrid);
  const { activeUsersCount } = usePresence();
  const { 
    connectionStatus, 
    connectionStatusColor, 
    hasQueuedUpdates, 
    queuedUpdatesCount,
    retryQueuedUpdates 
  } = useOffline();

  // Export dialog state
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  
  // AI Assistant state
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [clarificationDialog, setClarificationDialog] = useState<{
    question: string;
    options: Array<{
      label: string;
      value: string;
      shapeIds?: string[];
    }>;
  } | null>(null);
  
  // AI status from store
  const isProcessingAICommand = useCanvasStore((state) => state.isProcessingAICommand);
  const commandQueue = useCanvasStore((state) => state.commandQueue);

  // Export functionality
  const handleExport = async (options: ExportOptions) => {
    if (!stageRef || !currentUser) return;

    try {
      const exportService = createExportService(stageRef);
      
      let blob: Blob;
      if (options.selectedOnly && selectedShapeIds.length > 0) {
        blob = await exportService.exportSelectedShapes(options, selectedShapeIds);
      } else {
        blob = await exportService.exportCanvas(options);
      }
      
      const filename = exportService.generateFilename(options);
      exportService.downloadBlob(blob, filename);
    } catch (error) {
      console.error('Export failed:', error);
      // TODO: Show error toast
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onUndo: canUndo() ? undo : undefined,
    onRedo: canRedo() ? redo : undefined,
    onExport: () => setIsExportDialogOpen(true),
    onShowShortcuts: () => setIsShortcutsHelpOpen(true),
    onDelete: selectedShapeIds.length > 0 ? deleteSelectedShapes : undefined,
    onDuplicate: selectedShapeIds.length > 0 ? duplicateSelectedShapes : undefined,
    onSelectAll: () => selectShapes(Array.from(shapes.keys())),
    onClearSelection: clearSelection,
  });

  const handleCreateShape = (type: ShapeType) => {
    if (!currentUser) return;

    if (onCreateShape) {
      // Parent will calculate viewport center and create the shape
      onCreateShape(type);
      return;
    }

    // Fallback: create at origin
    // Get the current active layer ID
    const activeLayerId = useCanvasStore.getState().activeLayerId;
    
    const baseShape: Shape = {
      id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      color: '#3B82F6',
      createdAt: Date.now(),
      createdBy: currentUser.uid,
      updatedAt: Date.now(),
      updatedBy: currentUser.uid,
      clientUpdatedAt: Date.now(),
      layerId: activeLayerId, // Assign to the currently active layer
    };

    // Add type-specific properties
    const shape = { ...baseShape };
    switch (type) {
      case 'circle':
        shape.radius = 50;
        break;
      case 'text':
        shape.text = '';
        shape.fontSize = 16;
        shape.w = 200;
        shape.h = 50;
        break;
      case 'line':
        shape.strokeWidth = 2;
        shape.points = [0, 0, 100, 0];
        shape.h = 0;
        break;
    }

    createShape(shape);
  };

  const shapeButtons = [
    {
      type: 'rect' as ShapeType,
      label: 'Rectangle',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="4" y="4" width="16" height="16" strokeWidth="2" rx="2" />
        </svg>
      ),
    },
    {
      type: 'circle' as ShapeType,
      label: 'Circle',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="8" strokeWidth="2" />
        </svg>
      ),
    },
    {
      type: 'text' as ShapeType,
      label: 'Text',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      ),
    },
    {
      type: 'line' as ShapeType,
      label: 'Line',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12h16" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900">CollabCanvas</h1>
        
        {/* Shape Creation Buttons */}
        <div className="flex items-center gap-2">
          {shapeButtons.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => handleCreateShape(type)}
              disabled={!currentUser}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title={`Create a new ${label.toLowerCase()}`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-gray-300"></div>

        {/* Edit Actions */}
        <div className="flex items-center gap-2">
          {/* Undo Button */}
          <button
            onClick={undo}
            disabled={!canUndo() || !currentUser}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo (Cmd+Z)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Undo
          </button>

          {/* Redo Button */}
          <button
            onClick={redo}
            disabled={!canRedo() || !currentUser}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo (Cmd+Shift+Z)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
            </svg>
            Redo
          </button>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-gray-300"></div>

        {/* Export Actions */}
        <div className="flex items-center gap-2">
          {/* Export Button */}
          <button
            onClick={() => setIsExportDialogOpen(true)}
            disabled={!currentUser || !stageRef}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export Canvas (Cmd+E)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </button>

          {/* AI Assistant Button */}
          <button
            onClick={() => setIsAIAssistantOpen(true)}
            disabled={!currentUser}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isProcessingAICommand || (commandQueue && commandQueue.length > 0)
                ? 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500'
                : 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500'
            }`}
            title="AI Assistant - Natural language commands"
          >
            {isProcessingAICommand ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            )}
          AI Assistant
          {commandQueue && commandQueue.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-white text-purple-600 rounded-full">
              {commandQueue.length}
            </span>
          )}
          </button>

          {/* Shortcuts Help Button */}
          <button
            onClick={() => setIsShortcutsHelpOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            title="Show Keyboard Shortcuts (Cmd+/)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Help
          </button>
        </div>

        {children}

        {/* Professional Tools */}
        <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
          <button
            onClick={onToggleLayers}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              onToggleLayers ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
            title="Toggle Layers Panel"
            disabled={!onToggleLayers}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Layers
          </button>

          <button
            onClick={onToggleAlignment}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              onToggleAlignment ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
            title="Toggle Alignment Toolbar"
            disabled={!onToggleAlignment}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Align
          </button>

          <button
            onClick={() => {
              toggleGrid();
              if (onToggleGrid) onToggleGrid();
            }}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              gridState.isVisible 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={`${gridState.isVisible ? 'Hide' : 'Show'} Grid`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Grid
          </button>
        </div>
      </div>
      <div className="flex items-center gap-6">
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-sm">
          <div className={`h-2 w-2 rounded-full ${connectionStatusColor.replace('text-', 'bg-')}`}></div>
          <span className={`font-medium ${connectionStatusColor}`}>
            {connectionStatus}
          </span>
          {hasQueuedUpdates && (
            <button
              onClick={retryQueuedUpdates}
              className="ml-2 rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200"
              title={`Retry ${queuedUpdatesCount} queued updates`}
            >
              Retry ({queuedUpdatesCount})
            </button>
          )}
        </div>

        {/* Active Users Count */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="font-medium">{activeUsersCount + (currentUser ? 1 : 0)}</span>
            <span className="text-gray-500">active</span>
          </div>
        </div>
        
        {zoom !== undefined && <ZoomIndicator scale={zoom} />}
        {fps !== undefined && <FPSCounter fps={fps} />}
        <AuthButton />
      </div>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        onExport={handleExport}
        hasSelectedShapes={selectedShapeIds.length > 0}
      />

      {/* Shortcuts Help Dialog */}
      <ShortcutsHelp
        isOpen={isShortcutsHelpOpen}
        onClose={() => setIsShortcutsHelpOpen(false)}
      />

      {/* AI Command Input */}
      <AICommandInput
        isVisible={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
      />

      {/* AI Clarification Dialog */}
      {clarificationDialog && (
        <AIClarificationDialog
          clarification={clarificationDialog}
          onSelect={(option) => {
            // Handle clarification selection
            console.log('Selected option:', option);
            setClarificationDialog(null);
            // TODO: Resubmit command with clarification
          }}
          onCancel={() => setClarificationDialog(null)}
        />
      )}
    </div>
  );
}
