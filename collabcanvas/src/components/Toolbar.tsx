import { AuthButton } from './AuthButton';
import FPSCounter from './FPSCounter';
import ZoomIndicator from './ZoomIndicator';
import { useCanvasStore } from '../store/canvasStore';
import { usePresence } from '../hooks/usePresence';
import { useOffline } from '../hooks/useOffline';
import type { Shape, ShapeType } from '../types';

interface ToolbarProps {
  children?: React.ReactNode;
  fps?: number;
  zoom?: number;
  onCreateShape?: (type: ShapeType) => void;
}

/**
 * Toolbar component
 * Top navigation bar with user authentication info, FPS counter, zoom level, and shape creation controls
 */
export function Toolbar({ children, fps, zoom, onCreateShape }: ToolbarProps) {
  const createShape = useCanvasStore((state) => state.createShape);
  const currentUser = useCanvasStore((state) => state.currentUser);
  const { activeUsersCount } = usePresence();
  const { 
    connectionStatus, 
    connectionStatusColor, 
    hasQueuedUpdates, 
    queuedUpdatesCount,
    retryQueuedUpdates 
  } = useOffline();

  const handleCreateShape = (type: ShapeType) => {
    if (!currentUser) return;

    if (onCreateShape) {
      // Parent will calculate viewport center and create the shape
      onCreateShape(type);
      return;
    }

    // Fallback: create at origin
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

        {children}
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
    </div>
  );
}
