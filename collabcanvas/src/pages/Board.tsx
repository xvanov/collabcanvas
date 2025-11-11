import { useState, useEffect, useRef, useMemo } from 'react';
import { Toolbar } from '../components/Toolbar';
import Canvas from '../components/Canvas';
import { ShapePropertiesPanel } from '../components/ShapePropertiesPanel';
import { useCanvasStore } from '../store/canvasStore';
import { useAuth } from '../hooks/useAuth';
import { useShapes } from '../hooks/useShapes';
import { useLayers } from '../hooks/useLayers';
import { useLocks } from '../hooks/useLocks';
import { useOffline } from '../hooks/useOffline';
import { DiagnosticsHud } from '../components/DiagnosticsHud';
import { FloatingAIChat } from '../components/shared/FloatingAIChat';
import type { Shape, ShapeType } from '../types';
import { perfMetrics } from '../utils/harness';
import Konva from 'konva';

/**
 * Board page (main canvas view)
 * Protected route - only accessible to authenticated users
 * Contains the Konva canvas with pan/zoom support
 */
export function Board() {
  const [fps, setFps] = useState<number>(60);
  const [zoom, setZoom] = useState<number>(1);
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [showAlignmentToolbar, setShowAlignmentToolbar] = useState(false);
  const { user } = useAuth();
  const setCurrentUser = useCanvasStore((state) => state.setCurrentUser);
  const selectedShapeIds = useCanvasStore((state) => state.selectedShapeIds);
  const clearSelection = useCanvasStore((state) => state.clearSelection);
  const moveSelectedShapes = useCanvasStore((state) => state.moveSelectedShapes);
  const rotateSelectedShapes = useCanvasStore((state) => state.rotateSelectedShapes);
  const { createShape, reloadShapesFromFirestore, deleteShapes, duplicateShapes, updateShapeRotation } = useShapes();
  useLayers(); // Initialize layer synchronization
  const { clearStaleLocks } = useLocks();
  const { isOnline } = useOffline();
  const initializeBoardStateSubscription = useCanvasStore((state) => state.initializeBoardStateSubscription);
  const canvasRef = useRef<{ 
    getViewportCenter: () => { x: number; y: number }; 
    getStage: () => Konva.Stage | null;
    activatePolylineTool: () => void;
    activatePolygonTool: () => void;
    deactivateDrawingTools: () => void;
  } | null>(null);
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

  // Handle reconnection and reload shapes with debounce
  useEffect(() => {
    if (user && isOnline) {
      // Debounce reload to prevent excessive calls
      const timeoutId = setTimeout(() => {
        // Reload shapes from Firestore on reconnection
        reloadShapesFromFirestore();
        
        // Clear stale locks on reconnection
        clearStaleLocks();
        
        // Initialize board state subscription (background image, scale line)
        initializeBoardStateSubscription();
      }, 1000); // 1 second debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [user, isOnline, reloadShapesFromFirestore, clearStaleLocks, initializeBoardStateSubscription]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle keys if user is typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Prevent default behavior for our custom shortcuts
      const isCustomShortcut = (
        event.key === 'Delete' || 
        event.key === 'Backspace' ||
        (event.key.toLowerCase() === 'd' && event.ctrlKey) ||
        (event.key.toLowerCase() === 'd' && event.metaKey) ||
        (event.key.toLowerCase() === 'r' && event.ctrlKey) ||
        (event.key.toLowerCase() === 'r' && event.metaKey) ||
        event.key === 'Escape'
      );

      if (isCustomShortcut) {
        event.preventDefault();
      }

      // Diagnostics toggle (Shift+D)
      if (event.key.toLowerCase() === 'd' && event.shiftKey) {
        setShowDiagnostics((prev) => {
          const next = !prev;
          window.localStorage.setItem('collabcanvas:diagnosticsHUD', next ? 'on' : 'off');
          return next;
        });
        return;
      }

      // Only handle bulk operations if user is authenticated and has shapes selected
      if (!user || selectedShapeIds.length === 0) {
        return;
      }

      // Delete selected shapes
      if (event.key === 'Delete' || event.key === 'Backspace') {
        deleteShapes(selectedShapeIds);
        return;
      }

      // Duplicate selected shapes (Ctrl+D or Cmd+D)
      if (event.key.toLowerCase() === 'd' && (event.ctrlKey || event.metaKey)) {
        duplicateShapes(selectedShapeIds);
        return;
      }

      // Rotate selected shapes (Ctrl+R or Cmd+R)
      if (event.key.toLowerCase() === 'r' && (event.ctrlKey || event.metaKey)) {
        rotateSelectedShapes(90);
        // Sync rotation to Firestore for each selected shape
        selectedShapeIds.forEach(shapeId => {
          const shape = useCanvasStore.getState().shapes.get(shapeId);
          if (shape) {
            updateShapeRotation(shapeId, shape.rotation || 0);
          }
        });
        return;
      }

      // Handle Escape key to clear selection
      if (event.key === 'Escape') {
        clearSelection();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, selectedShapeIds, deleteShapes, duplicateShapes, moveSelectedShapes, rotateSelectedShapes, clearSelection, updateShapeRotation]);

  const handleCreateShape = (type: ShapeType) => {
    if (!user) return;

    // Get viewport center from Canvas component
    const center = canvasRef.current?.getViewportCenter() || { x: 200, y: 200 };

    // Get the current active layer ID
    const activeLayerId = useCanvasStore.getState().activeLayerId;

    const layersState = (useCanvasStore.getState().layers || []) as ReturnType<typeof useCanvasStore.getState>['layers'];
    const activeLayer = layersState.find(l => l.id === activeLayerId);
    const activeColor = activeLayer?.color || '#3B82F6';
    const baseShape = {
      id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      x: center.x - 50, // Center the 100px shape
      y: center.y - 50,
      w: 100,
      h: 100,
      color: activeColor,
      createdAt: Date.now(),
      createdBy: user.uid,
      updatedAt: Date.now(),
      updatedBy: user.uid,
      clientUpdatedAt: Date.now(),
      layerId: activeLayerId, // Assign to the currently active layer
    };

    // Add type-specific properties
    const shape: Shape = { ...baseShape };
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

  return (
    <div className="flex h-screen flex-col">
      <Toolbar 
        fps={fps} 
        zoom={zoom} 
        onCreateShape={handleCreateShape}
        stageRef={canvasRef.current?.getStage()}
        onToggleLayers={() => setShowLayersPanel(!showLayersPanel)}
        onToggleAlignment={() => setShowAlignmentToolbar(!showAlignmentToolbar)}
        onToggleGrid={() => {}}
        onActivatePolylineTool={() => canvasRef.current?.activatePolylineTool()}
        onActivatePolygonTool={() => canvasRef.current?.activatePolygonTool()}
      >
        {/* Additional toolbar controls will be added in future PRs */}
      </Toolbar>
      <div className="flex flex-1">
        <div className="flex-1">
          <Canvas 
            ref={canvasRef}
            onFpsUpdate={setFps} 
            onZoomChange={setZoom}
            showLayersPanel={showLayersPanel}
            showAlignmentToolbar={showAlignmentToolbar}
            onCloseLayersPanel={() => setShowLayersPanel(false)}
            onCloseAlignmentToolbar={() => setShowAlignmentToolbar(false)}
          />
        </div>
        <ShapePropertiesPanel className="w-80" />
      </div>
      <DiagnosticsHud fps={fps} visible={showDiagnostics} />
      <FloatingAIChat />
    </div>
  );
}
