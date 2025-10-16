import { useState, useEffect, useRef, useMemo } from 'react';
import { Toolbar } from '../components/Toolbar';
import Canvas from '../components/Canvas';
import { useCanvasStore } from '../store/canvasStore';
import { useAuth } from '../hooks/useAuth';
import { useShapes } from '../hooks/useShapes';
import { useLocks } from '../hooks/useLocks';
import { useOffline } from '../hooks/useOffline';
import { DiagnosticsHud } from '../components/DiagnosticsHud';
import { perfMetrics } from '../utils/harness';

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
  const { createShape, reloadShapesFromFirestore } = useShapes();
  const { clearStaleLocks } = useLocks();
  const { isOnline } = useOffline();
  const canvasRef = useRef<{ getViewportCenter: () => { x: number; y: number } } | null>(null);
  const showDiagnosticsDefault = useMemo(() => {
    if (typeof window === 'undefined') return perfMetrics.enabled;
    const params = new URLSearchParams(window.location.search);
    if (params.has('diagnostics') || params.get('diag') === '1') {
      return true;
    }
    const stored = window.localStorage.getItem('collabcanvas:diagnosticsHUD');
    if (stored === 'on') return true;
    if (stored === 'off') return false;
    return perfMetrics.enabled;
  }, []);
  const [showDiagnostics, setShowDiagnostics] = useState(showDiagnosticsDefault);

  // Update current user in store when user changes
  useEffect(() => {
    setCurrentUser(user);
  }, [user, setCurrentUser]);

  // Handle reconnection and reload shapes
  useEffect(() => {
    if (user && isOnline) {
      // Reload shapes from Firestore on reconnection
      reloadShapesFromFirestore();
      
      // Clear stale locks on reconnection
      clearStaleLocks();
    }
  }, [user, isOnline, reloadShapesFromFirestore, clearStaleLocks]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'd' && event.shiftKey) {
        setShowDiagnostics((prev) => {
          const next = !prev;
          window.localStorage.setItem('collabcanvas:diagnosticsHUD', next ? 'on' : 'off');
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      clientUpdatedAt: Date.now(),
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
      <DiagnosticsHud fps={fps} visible={showDiagnostics} />
    </div>
  );
}
