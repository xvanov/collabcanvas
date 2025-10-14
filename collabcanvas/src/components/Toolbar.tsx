import { AuthButton } from './AuthButton';
import FPSCounter from './FPSCounter';
import ZoomIndicator from './ZoomIndicator';
import { useCanvasStore } from '../store/canvasStore';
import { usePresence } from '../hooks/usePresence';

interface ToolbarProps {
  children?: React.ReactNode;
  fps?: number;
  zoom?: number;
  onCreateShape?: (x: number, y: number) => void;
}

/**
 * Toolbar component
 * Top navigation bar with user authentication info, FPS counter, zoom level, and additional controls
 */
export function Toolbar({ children, fps, zoom, onCreateShape }: ToolbarProps) {
  const createShape = useCanvasStore((state) => state.createShape);
  const currentUser = useCanvasStore((state) => state.currentUser);
  const { activeUsersCount } = usePresence();

  const handleCreateRectangle = () => {
    if (!currentUser) return;

    if (onCreateShape) {
      // Parent will calculate viewport center and create the shape
      onCreateShape(0, 0);
      return;
    }

    // Fallback: create at origin
    const newShape = {
      id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'rect' as const,
      x: 0,
      y: 0,
      w: 100, // Fixed width
      h: 100, // Fixed height
      color: '#3B82F6', // Fixed blue color
      createdAt: Date.now(),
      createdBy: currentUser.uid,
      updatedAt: Date.now(),
      updatedBy: currentUser.uid,
    };

    createShape(newShape);
  };
  return (
    <div className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900">CollabCanvas</h1>
        
        {/* Create Rectangle Button */}
        <button
          onClick={handleCreateRectangle}
          disabled={!currentUser}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Create a new rectangle (100x100px)"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <rect x="4" y="4" width="16" height="16" strokeWidth="2" rx="2" />
          </svg>
          Create Rectangle
        </button>

        {children}
      </div>
      <div className="flex items-center gap-6">
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

