import { useState, useEffect, useRef } from 'react';
import { Toolbar } from '../components/Toolbar';
import Canvas from '../components/Canvas';
import { useCanvasStore } from '../store/canvasStore';
import { useAuth } from '../hooks/useAuth';

/**
 * Board page (main canvas view)
 * Protected route - only accessible to authenticated users
 * Contains the Konva canvas with pan/zoom support
 */
export function Board() {
  const [fps, setFps] = useState<number>(60);
  const [zoom, setZoom] = useState<number>(1);
  const { user } = useAuth();
  const setCurrentUser = useCanvasStore((state) => state.setCurrentUser);
  const createShape = useCanvasStore((state) => state.createShape);
  const canvasRef = useRef<{ getViewportCenter: () => { x: number; y: number } } | null>(null);

  // Update current user in store when user changes
  useEffect(() => {
    setCurrentUser(user);
  }, [user, setCurrentUser]);

  const handleCreateShape = () => {
    if (!user) return;

    // Get viewport center from Canvas component
    const center = canvasRef.current?.getViewportCenter() || { x: 200, y: 200 };

    const newShape = {
      id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'rect' as const,
      x: center.x - 50, // Center the 100px shape
      y: center.y - 50,
      w: 100,
      h: 100,
      color: '#3B82F6',
      createdAt: Date.now(),
      createdBy: user.uid,
      updatedAt: Date.now(),
      updatedBy: user.uid,
    };

    createShape(newShape);
  };

  return (
    <div className="flex h-screen flex-col">
      <Toolbar fps={fps} zoom={zoom} onCreateShape={handleCreateShape}>
        {/* Additional toolbar controls will be added in future PRs */}
      </Toolbar>
      <div className="flex-1">
        <Canvas 
          ref={canvasRef}
          onFpsUpdate={setFps} 
          onZoomChange={setZoom} 
        />
      </div>
    </div>
  );
}

