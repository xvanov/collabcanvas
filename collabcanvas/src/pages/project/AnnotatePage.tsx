import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Toolbar } from '../../components/Toolbar';
import Canvas, { type CanvasHandle } from '../../components/Canvas';
import { ShapePropertiesPanel } from '../../components/ShapePropertiesPanel';
import { ChatPanel } from '../../components/estimate/ChatPanel';
import { EstimateStepper } from '../../components/estimate/EstimateStepper';
import { useCanvasStore } from '../../store/canvasStore';
import { getProjectCanvasStoreApi, useScopedCanvasStore } from '../../store/projectCanvasStore';
import { useAuth } from '../../hooks/useAuth';
import { useShapes } from '../../hooks/useShapes';
import { useLayers } from '../../hooks/useLayers';
import { useLocks } from '../../hooks/useLocks';
import { useOffline } from '../../hooks/useOffline';
import { DiagnosticsHud } from '../../components/DiagnosticsHud';
import { Button } from '../../components/ui';
import type { BackgroundImage, Shape, ShapeType } from '../../types';
import { perfMetrics } from '../../utils/harness';
import { AuthenticatedLayout } from '../../components/layouts/AuthenticatedLayout';

/**
 * AnnotatePage - Plan annotation page with canvas and chatbot.
 *
 * Features:
 * - Canvas for plan annotation (existing Board component logic)
 * - ChatPanel with clarification agent
 * - Agent runs back-and-forth Q&A with user
 * - Shows "Generate Estimate" button when agent signals completion
 * - EstimateStepper at top showing current step
 */
export function AnnotatePage() {
  const navigate = useNavigate();
  const { id: projectId } = useParams<{ id: string }>();
  const location = useLocation();
  const locationState = location.state as { backgroundImage?: BackgroundImage } | null;
  const pendingBackgroundImage = locationState?.backgroundImage;

  const [fps, setFps] = useState<number>(60);
  const [zoom, setZoom] = useState<number>(1);
  const [showLayersPanel, setShowLayersPanel] = useState(false);
  const [showAlignmentToolbar, setShowAlignmentToolbar] = useState(false);
  const [clarificationComplete, setClarificationComplete] = useState(false);

  const { user } = useAuth();
  const setCurrentUser = useCanvasStore((state) => state.setCurrentUser);
  const selectedShapeIds = useCanvasStore((state) => state.selectedShapeIds);
  const clearSelection = useCanvasStore((state) => state.clearSelection);
  const moveSelectedShapes = useCanvasStore((state) => state.moveSelectedShapes);
  const rotateSelectedShapes = useCanvasStore((state) => state.rotateSelectedShapes);
  const setBackgroundImage = useScopedCanvasStore(projectId, (state) => state.setBackgroundImage);

  const { createShape, reloadShapesFromFirestore, deleteShapes, duplicateShapes, updateShapeRotation } =
    useShapes(projectId);
  useLayers(projectId);
  const { clearStaleLocks } = useLocks();
  const { isOnline } = useOffline();
  const canvasRef = useRef<CanvasHandle | null>(null);

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

    if (projectId && user) {
      const projectStore = getProjectCanvasStoreApi(projectId);
      projectStore.getState().setCurrentUser(user);
    }
  }, [user, setCurrentUser, projectId]);

  // Apply background image from navigation state
  // Must wait for user to be set in project store before syncing to Firestore
  useEffect(() => {
    if (projectId && pendingBackgroundImage && setBackgroundImage && user) {
      // Ensure user is set in project store before saving background image
      const projectStore = getProjectCanvasStoreApi(projectId);
      projectStore.getState().setCurrentUser(user);
      // Now save with Firestore sync enabled (skipFirestoreSync: false)
      setBackgroundImage(pendingBackgroundImage, false);
    }
  }, [projectId, pendingBackgroundImage, setBackgroundImage, user]);

  // Initialize board state subscription
  useEffect(() => {
    if (!projectId) return;

    const projectStore = getProjectCanvasStoreApi(projectId);
    const setupSubscription = projectStore.getState().initializeBoardStateSubscription;
    if (!setupSubscription) return;

    const unsubscribe = setupSubscription();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [projectId]);

  // Handle reconnection and reload shapes
  useEffect(() => {
    if (user && isOnline) {
      const timeoutId = setTimeout(() => {
        reloadShapesFromFirestore();
        clearStaleLocks();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [user, isOnline, reloadShapesFromFirestore, clearStaleLocks]);

  // Keyboard shortcuts
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isCustomShortcut =
        event.key === 'Delete' ||
        event.key === 'Backspace' ||
        (event.key.toLowerCase() === 'd' && event.ctrlKey) ||
        (event.key.toLowerCase() === 'd' && event.metaKey) ||
        (event.key.toLowerCase() === 'r' && event.ctrlKey) ||
        (event.key.toLowerCase() === 'r' && event.metaKey) ||
        event.key === 'Escape';

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

      if (!user || selectedShapeIds.length === 0) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        deleteShapes(selectedShapeIds);
        return;
      }

      if (event.key.toLowerCase() === 'd' && (event.ctrlKey || event.metaKey)) {
        duplicateShapes(selectedShapeIds);
        return;
      }

      if (event.key.toLowerCase() === 'r' && (event.ctrlKey || event.metaKey)) {
        rotateSelectedShapes(90);
        selectedShapeIds.forEach((shapeId) => {
          const shape = useCanvasStore.getState().shapes.get(shapeId);
          if (shape) {
            updateShapeRotation(shapeId, shape.rotation || 0);
          }
        });
        return;
      }

      if (event.key === 'Escape') {
        clearSelection();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    user,
    selectedShapeIds,
    deleteShapes,
    duplicateShapes,
    moveSelectedShapes,
    rotateSelectedShapes,
    clearSelection,
    updateShapeRotation,
  ]);

  const handleCreateShape = (type: ShapeType) => {
    if (!user) return;

    const center = canvasRef.current?.getViewportCenter() || { x: 200, y: 200 };
    const activeLayerId = useCanvasStore.getState().activeLayerId;
    const layersState = (useCanvasStore.getState().layers || []) as ReturnType<
      typeof useCanvasStore.getState
    >['layers'];
    const activeLayer = layersState.find((l) => l.id === activeLayerId);
    const activeColor = activeLayer?.color || '#3B82F6';

    const baseShape = {
      id: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      x: center.x - 50,
      y: center.y - 50,
      w: 100,
      h: 100,
      color: activeColor,
      createdAt: Date.now(),
      createdBy: user.uid,
      updatedAt: Date.now(),
      updatedBy: user.uid,
      clientUpdatedAt: Date.now(),
      layerId: activeLayerId,
    };

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

  const handleGenerateEstimate = () => {
    if (projectId) {
      navigate(`/project/${projectId}/estimate`);
    }
  };

  const handleBackToScope = () => {
    if (projectId) {
      navigate(`/project/${projectId}/scope`);
    }
  };

  // Determine completed steps for the stepper
  const completedSteps: ('scope' | 'annotate' | 'estimate')[] = ['scope'];

  // Handler for clarification completion (will be wired to actual agent)
  const handleClarificationComplete = (complete: boolean) => {
    setClarificationComplete(complete);
  };

  return (
    <div className="min-h-screen bg-truecost-bg-primary">
      <AuthenticatedLayout>
        <div className="container-spacious max-w-full pt-20 pb-14 md:pt-24">
          {/* Stepper */}
          {projectId && (
            <EstimateStepper
              currentStep="annotate"
              projectId={projectId}
              completedSteps={completedSteps}
            />
          )}

          {/* Header */}
          <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-body-meta font-medium text-white border border-truecost-glass-border">
                Annotate
              </span>
              <h1 className="font-heading text-h1 text-truecost-text-primary">
                Annotate Your Plans
              </h1>
              <p className="font-body text-body text-truecost-text-secondary/90">
                Mark up your plans and chat with our AI assistant to clarify project details.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={handleBackToScope}>
                Back to Scope
              </Button>
              {clarificationComplete && (
                <Button variant="primary" onClick={handleGenerateEstimate}>
                  Generate Estimate
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
            {/* Left: Canvas */}
            <div className="glass-panel p-3 md:p-4">
              <div className="rounded-xl border border-truecost-glass-border/70 bg-truecost-glass-bg/40">
                <div className="mb-3">
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
                    onActivateBoundingBoxTool={() => canvasRef.current?.activateBoundingBoxTool()}
                    projectId={projectId}
                  />
                </div>

                <div className="flex flex-col gap-3 min-h-[50vh]">
                  <div className="flex-1 min-h-[40vh]">
                    <Canvas
                      ref={canvasRef}
                      projectId={projectId}
                      onFpsUpdate={setFps}
                      onZoomChange={setZoom}
                      showLayersPanel={showLayersPanel}
                      showAlignmentToolbar={showAlignmentToolbar}
                      onCloseLayersPanel={() => setShowLayersPanel(false)}
                      onCloseAlignmentToolbar={() => setShowAlignmentToolbar(false)}
                    />
                  </div>
                  <ShapePropertiesPanel className="w-full" projectId={projectId} />
                </div>
              </div>
            </div>

            {/* Right: Chatbot */}
            <div className="glass-panel h-[600px] lg:h-[700px] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-truecost-glass-border">
                <h3 className="font-heading text-h3 text-truecost-text-primary">
                  Project Assistant
                </h3>
                <p className="text-body-meta text-truecost-text-secondary">
                  I'll ask clarifying questions to help create an accurate estimate.
                </p>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatPanel onClarificationComplete={handleClarificationComplete} />
              </div>
              {!clarificationComplete && (
                <div className="p-4 border-t border-truecost-glass-border bg-truecost-bg-primary/50">
                  <p className="text-body-meta text-truecost-text-muted text-center">
                    Complete the clarification chat to unlock "Generate Estimate"
                  </p>
                </div>
              )}
            </div>
          </div>

          <DiagnosticsHud fps={fps} visible={showDiagnostics} />
        </div>
      </AuthenticatedLayout>
    </div>
  );
}
