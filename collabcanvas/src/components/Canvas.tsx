import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Stage, Layer, Line, Circle, Image } from 'react-konva';
import Konva from 'konva';
import { Shape } from './Shape';
import { CursorOverlay } from './CursorOverlay';
import { LockOverlay } from './LockOverlay';
import { SelectionBox } from './SelectionBox';
import { TransformControls } from './TransformControls';
import { LayersPanel } from './LayersPanel';
import { AlignmentToolbar } from './AlignmentToolbar';
import { SnapIndicators } from './SnapIndicators';
import { ScaleLine } from './ScaleLine';
import { MeasurementInput } from './MeasurementInput';
import { MeasurementDisplay } from './MeasurementDisplay';
import { PolylineTool } from './PolylineTool';
import { PolygonTool } from './PolygonTool';
import { createPolylineShape, createPolygonShape } from '../services/shapeService';
import { useCanvasStore } from '../store/canvasStore';
import { useShapes } from '../hooks/useShapes';
import { usePresence } from '../hooks/usePresence';
import { useLocks } from '../hooks/useLocks';
import { perfMetrics } from '../utils/harness';
import { calculateViewportBounds, filterVisibleShapes } from '../utils/viewport';
import type { SelectionBox as SelectionBoxType, UnitType } from '../types';

interface CanvasProps {
  onFpsUpdate?: (fps: number) => void;
  onZoomChange?: (scale: number) => void;
  showLayersPanel?: boolean;
  showAlignmentToolbar?: boolean;
  onCloseLayersPanel?: () => void;
  onCloseAlignmentToolbar?: () => void;
}

export interface CanvasHandle {
  getViewportCenter: () => { x: number; y: number };
  getStage: () => Konva.Stage | null;
  activatePolylineTool: () => void;
  activatePolygonTool: () => void;
  deactivateDrawingTools: () => void;
}
/**
 * Main canvas component with Konva integration
 * Supports pan (click and drag) and zoom (mouse wheel) at 60 FPS
 */
const Canvas = forwardRef<CanvasHandle, CanvasProps>(({ onFpsUpdate, onZoomChange, showLayersPanel = false, showAlignmentToolbar = false, onCloseLayersPanel, onCloseAlignmentToolbar }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  // Imperative stage position and scale to avoid React re-renders during pan/zoom
  const stagePosRef = useRef({ x: 0, y: 0 });
  const stageScaleRef = useRef(1);
  // Mouse position for snap indicators
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  // Measurement input modal state
  const [showMeasurementInput, setShowMeasurementInput] = useState(false);
  const [pendingScaleLine, setPendingScaleLine] = useState<{ endX: number; endY: number } | null>(null);
  // Drawing tool states
  const [activeDrawingTool, setActiveDrawingTool] = useState<'polyline' | 'polygon' | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [drawingPreviewPoint, setDrawingPreviewPoint] = useState<{ x: number; y: number } | null>(null);
  // Imperative current-user cursor to avoid React re-renders on mousemove
  const overlaysLayerRef = useRef<Konva.Layer>(null);
  const currentCursorRef = useRef<Konva.Circle>(null);
  const isDragging = useRef(false);
  const isSelecting = useRef(false);
  const selectionStart = useRef({ x: 0, y: 0 });
  const lastFrameTime = useRef(performance.now());
  const frameCount = useRef(0);
  const rafId = useRef<number | undefined>(undefined);

  // Store state
  const { shapes, updateShapePosition } = useShapes();
  const shapeMap = useCanvasStore((state) => state.shapes);
  const selectedShapeIds = useCanvasStore((state) => state.selectedShapeIds);
  const selectShape = useCanvasStore((state) => state.selectShape);
  const deselectShape = useCanvasStore((state) => state.deselectShape);
  const addToSelection = useCanvasStore((state) => state.addToSelection);
  const removeFromSelection = useCanvasStore((state) => state.removeFromSelection);
  const clearSelection = useCanvasStore((state) => state.clearSelection);
  const selectShapes = useCanvasStore((state) => state.selectShapes);
  const selectionBox = useCanvasStore((state) => state.selectionBox);
  const setSelectionBox = useCanvasStore((state) => state.setSelectionBox);
  const transformControls = useCanvasStore((state) => state.transformControls);
  const updateTransformControls = useCanvasStore((state) => state.updateTransformControls);
  const moveSelectedShapes = useCanvasStore((state) => state.moveSelectedShapes);
  const currentUser = useCanvasStore((state) => state.currentUser);
  const activeLayerId = useCanvasStore((state) => state.activeLayerId);
  const layers = useCanvasStore((state) => state.layers);
  const gridState = useCanvasStore((state) => state.gridState);
  const canvasScale = useCanvasStore((state) => state.canvasScale);
  const setScaleLine = useCanvasStore((state) => state.setScaleLine);
  const updateScaleLine = useCanvasStore((state) => state.updateScaleLine);
  const deleteScaleLine = useCanvasStore((state) => state.deleteScaleLine);
  const setIsScaleMode = useCanvasStore((state) => state.setIsScaleMode);
  const createShape = useCanvasStore((state) => state.createShape);
  
  // Debug: Track activeLayerId changes
  useEffect(() => {
    console.log('🔄 activeLayerId changed to:', activeLayerId);
  }, [activeLayerId]);
  
  // Presence state
  const { users: otherUsers, updateCursorPosition } = usePresence();
  
  // Locks state
  const {
    locks,
    isShapeLockedByOtherUser,
    isShapeLockedByCurrentUser,
    acquireShapeLock,
    releaseShapeLock,
  } = useLocks();

  // REMOVED scheduleStateUpdate - No longer updating React state during zoom/pan for performance

  // Cursor update function (throttling handled in usePresence)
  // Cache cursor for Firefox performance optimization
  useEffect(() => {
    if (currentCursorRef.current) {
      currentCursorRef.current.cache();
    }
  }, [currentUser]);

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // FPS counter using requestAnimationFrame for accurate rendering frame tracking
  useEffect(() => {
    if (!onFpsUpdate) return;

    const measureFPS = () => {
      const now = performance.now();
      frameCount.current++;
      
      const elapsed = now - lastFrameTime.current;
      
      // Update FPS every second
      if (elapsed >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / elapsed);
        onFpsUpdate(fps);
        perfMetrics.recordFps(fps);
        
        // Performance warning when FPS drops below 60
        if (fps < 60) {
          console.warn(`[PERFORMANCE] FPS dropped to ${fps}. Target: 60 FPS. Consider reducing number of shapes or enabling viewport culling.`);
        }
        
        frameCount.current = 0;
        lastFrameTime.current = now;
      }

      // Continue measuring on next frame
      rafId.current = requestAnimationFrame(measureFPS);
    };

    // Start measuring
    rafId.current = requestAnimationFrame(measureFPS);

    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [onFpsUpdate]);

  // Handle wheel zoom - imperative updates for performance
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stageScaleRef.current;
    const pointer = stage.getPointerPosition();
    
    if (!pointer) return;

    // Calculate mouse position in stage coordinates
    const mousePointTo = {
      x: (pointer.x - stagePosRef.current.x) / oldScale,
      y: (pointer.y - stagePosRef.current.y) / oldScale,
    };

    // Zoom calculation
    const scaleBy = 1.05;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    
    // Clamp zoom between 0.1x and 5x
    const clampedScale = Math.max(0.1, Math.min(5, newScale));

    // Calculate new position to keep mouse point stable
    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    // Update refs imperatively
    stagePosRef.current = newPos;
    stageScaleRef.current = clampedScale;
    
    // Update stage directly without React re-render
    stage.position(newPos);
    stage.scale({ x: clampedScale, y: clampedScale });
    
    // REMOVED: scheduleStateUpdate - Don't trigger React re-renders during zoom!
    // Only notify parent for zoom indicator display
    if (onZoomChange) {
      onZoomChange(clampedScale);
    }
  };

  // Handle keyboard events for arrow key movement and Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape key to cancel scale mode
      if (e.key === 'Escape' && canvasScale.isScaleMode) {
        setIsScaleMode(false);
        if (canvasScale.scaleLine) {
          deleteScaleLine();
        }
        return;
      }

      // Only handle arrow keys when canvas has focus
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        return;
      }

      // Check if we have selected shapes
      if (selectedShapeIds.length === 0) {
        return;
      }

      e.preventDefault();
      
      const moveDistance = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case 'ArrowUp':
          moveSelectedShapes(0, -moveDistance);
          break;
        case 'ArrowDown':
          moveSelectedShapes(0, moveDistance);
          break;
        case 'ArrowLeft':
          moveSelectedShapes(-moveDistance, 0);
          break;
        case 'ArrowRight':
          moveSelectedShapes(moveDistance, 0);
          break;
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedShapeIds, moveSelectedShapes, canvasScale.isScaleMode, canvasScale.scaleLine, deleteScaleLine, setIsScaleMode]);

  // Handle mouse down - start pan if clicking on empty space, or start selection
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedOnEmpty = e.target === stageRef.current;
    const stage = stageRef.current;
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    // Convert pointer position to stage coordinates
    const currentStagePos = stagePosRef.current;
    const currentStageScale = stageScaleRef.current;
    
    const stageX = (pointer.x - currentStagePos.x) / currentStageScale;
    const stageY = (pointer.y - currentStagePos.y) / currentStageScale;
    
    if (clickedOnEmpty) {
      // Check if Shift key is held for multi-select
      if (e.evt.shiftKey) {
        // Start drag selection
        isSelecting.current = true;
        selectionStart.current = { x: stageX, y: stageY };
        setSelectionBox({
          x: stageX,
          y: stageY,
          width: 0,
          height: 0,
        });
      } else {
        // Clear selection and start panning
        clearSelection();
        isDragging.current = true;
      }
    }
  };

  // Handle mouse move - pan the canvas if dragging, track cursor position always
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    // Get the mouse position in stage coordinates
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Convert pointer position to stage coordinates (accounting for pan and zoom)
    const currentStagePos = stagePosRef.current;
    const currentStageScale = stageScaleRef.current;
    
    const stageX = (pointer.x - currentStagePos.x) / currentStageScale;
    const stageY = (pointer.y - currentStagePos.y) / currentStageScale;

    // Imperatively update current user's cursor position to avoid React re-render
    if (currentCursorRef.current) {
      currentCursorRef.current.position({ x: stageX, y: stageY });
      // Firefox optimization: draw only the cursor node, not the entire layer
      currentCursorRef.current.draw();
    }

    // Update cursor position in RTDB (throttled in usePresence) - only if user is authenticated
    if (currentUser) {
      updateCursorPosition(stageX, stageY);
    }

    // Update mouse position for snap indicators - ONLY if snap is enabled
    if (gridState.isSnapEnabled) {
      setMousePosition({
        x: stageX,
        y: stageY,
      });
    }

    // Update drawing preview point
    if (activeDrawingTool) {
      setDrawingPreviewPoint({ x: stageX, y: stageY });
    }

    // Handle drag selection
    if (isSelecting.current) {
      const startX = selectionStart.current.x;
      const startY = selectionStart.current.y;
      
      const selectionBox: SelectionBoxType = {
        x: Math.min(startX, stageX),
        y: Math.min(startY, stageY),
        width: Math.abs(stageX - startX),
        height: Math.abs(stageY - startY),
      };
      
      setSelectionBox(selectionBox);
      return;
    }

    // Pan the canvas if dragging - imperative updates for performance
    if (isDragging.current) {
      const newPos = {
        x: stagePosRef.current.x + e.evt.movementX,
        y: stagePosRef.current.y + e.evt.movementY,
      };
      
      // Update refs imperatively
      stagePosRef.current = newPos;
      
      // Update stage directly without React re-render
      stage.position(newPos);
      
      // REMOVED: scheduleStateUpdate - Don't trigger React re-renders during pan!
    }
  };

  // Handle mouse up - stop panning and selection
  const handleMouseUp = () => {
    if (isSelecting.current && selectionBox) {
      // Find shapes that intersect with the selection box
      const intersectingShapes = shapes.filter(shape => {
        const shapeRight = shape.x + shape.w;
        const shapeBottom = shape.y + shape.h;
        const boxRight = selectionBox.x + selectionBox.width;
        const boxBottom = selectionBox.y + selectionBox.height;
        
        return !(shape.x > boxRight || 
                shapeRight < selectionBox.x || 
                shape.y > boxBottom || 
                shapeBottom < selectionBox.y);
      });
      
      // Select intersecting shapes
      if (intersectingShapes.length > 0) {
        const shapeIds = intersectingShapes.map(shape => shape.id);
        selectShapes(shapeIds);
        
        // Update transform controls
        updateTransformControls({
          isVisible: true,
          x: Math.min(...intersectingShapes.map(s => s.x)),
          y: Math.min(...intersectingShapes.map(s => s.y)),
          width: Math.max(...intersectingShapes.map(s => s.x + s.w)) - Math.min(...intersectingShapes.map(s => s.x)),
          height: Math.max(...intersectingShapes.map(s => s.y + s.h)) - Math.min(...intersectingShapes.map(s => s.y)),
          rotation: 0,
          resizeHandles: ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'],
        });
      }
      
      // Clear selection box
      setSelectionBox(null);
    }
    
    isDragging.current = false;
    isSelecting.current = false;
  };

  // Handle canvas click - deselect shapes when clicking empty space or handle scale tool or drawing tools
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // If clicking on the stage itself (not a shape), deselect
    if (e.target === stageRef.current) {
      const stage = stageRef.current;
      if (stage) {
        const pointerPosition = stage.getPointerPosition();
        if (pointerPosition) {
          // Get actual current stage position and scale
          const stagePos = stage.position();
          const stageScale = stage.scaleX(); // Use scaleX since scale is uniform
          
          // Convert screen coordinates to canvas coordinates
          const canvasX = (pointerPosition.x - stagePos.x) / stageScale;
          const canvasY = (pointerPosition.y - stagePos.y) / stageScale;
          
          // Handle scale tool clicks
          if (canvasScale.isScaleMode) {
            handleScaleToolClick(canvasX, canvasY);
            return; // Don't deselect when in scale mode
          }
          
          // Handle polyline/polygon tool clicks
          if (activeDrawingTool) {
            handleDrawingToolClick(canvasX, canvasY, e);
            return; // Don't deselect when drawing
          }
        }
      }
      
      deselectShape();
    }
  };

  // Complete the current drawing
  const completeDrawing = useCallback(() => {
    if (!currentUser || !activeDrawingTool) return;
    
    if (activeDrawingTool === 'polyline' && drawingPoints.length < 2) return;
    if (activeDrawingTool === 'polygon' && drawingPoints.length < 3) return;

    const activeLayer = layers.find(l => l.id === activeLayerId);
    const shapeColor = activeLayer?.color || '#3B82F6';

    const shape = activeDrawingTool === 'polyline'
      ? createPolylineShape(drawingPoints, shapeColor, currentUser.uid, activeLayerId)
      : createPolygonShape(drawingPoints, shapeColor, currentUser.uid, activeLayerId);

    createShape(shape);

    // Reset drawing state
    setDrawingPoints([]);
    setDrawingPreviewPoint(null);
    setActiveDrawingTool(null);
  }, [currentUser, activeDrawingTool, drawingPoints, layers, activeLayerId, createShape]);

  // Handle drawing tool clicks (polyline/polygon)
  const handleDrawingToolClick = useCallback((x: number, y: number, e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!activeDrawingTool || !currentUser) return;

    const point = { x, y };

    // Check if double-click to complete
    if (e.evt.detail === 2 && drawingPoints.length >= 2) {
      completeDrawing();
      return;
    }

    // Check if clicking near first point for polygon (snap to close)
    if (activeDrawingTool === 'polygon' && drawingPoints.length >= 3) {
      const firstPoint = drawingPoints[0];
      const distance = Math.sqrt(
        Math.pow(point.x - firstPoint.x, 2) + Math.pow(point.y - firstPoint.y, 2)
      );
      const snapThreshold = 10; // Fixed pixel threshold
      
      if (distance < snapThreshold) {
        completeDrawing();
        return;
      }
    }

    // Add point to drawing
    setDrawingPoints(prev => [...prev, point]);
  }, [activeDrawingTool, currentUser, drawingPoints, completeDrawing]);

  // Handle Escape key to cancel or undo point
  useEffect(() => {
    const handleDrawingKeyDown = (e: KeyboardEvent) => {
      if (!activeDrawingTool) return;

      if (e.key === 'Escape') {
        if (drawingPoints.length > 0) {
          // Undo last point
          setDrawingPoints(prev => prev.slice(0, -1));
        } else {
          // Cancel drawing
          setActiveDrawingTool(null);
          setDrawingPoints([]);
          setDrawingPreviewPoint(null);
        }
      } else if (e.key === 'Enter') {
        completeDrawing();
      }
    };

    if (activeDrawingTool) {
      window.addEventListener('keydown', handleDrawingKeyDown);
      return () => window.removeEventListener('keydown', handleDrawingKeyDown);
    }
  }, [activeDrawingTool, drawingPoints, completeDrawing]);
  // Handle scale tool clicks
  const handleScaleToolClick = (x: number, y: number) => {
    if (!canvasScale.isScaleMode || !currentUser) return;

    // If there's no existing scale line, start creating one
    if (!canvasScale.scaleLine) {
      // First click - set start point and create a temporary line
      const scaleLine = {
        id: `scale-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        startX: x,
        startY: y,
        endX: x, // Same as start point initially
        endY: y,
        realWorldLength: 0, // Will be set after second click
        unit: 'feet' as const,
        isVisible: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
      };
      setScaleLine(scaleLine);
    } else {
      // Second click - set end point and show measurement input modal
      setPendingScaleLine({ endX: x, endY: y });
      setShowMeasurementInput(true);
    }
  };

  // Handle measurement input submission
  const handleMeasurementSubmit = (value: number, unit: UnitType) => {
    if (!pendingScaleLine) return;
    
    updateScaleLine({
      endX: pendingScaleLine.endX,
      endY: pendingScaleLine.endY,
      realWorldLength: value,
      unit: unit,
    });
    
    // Exit scale mode after successful creation
    setIsScaleMode(false);
    setShowMeasurementInput(false);
    setPendingScaleLine(null);
  };

  // Handle measurement input cancellation
  const handleMeasurementCancel = () => {
    // Remove the temporary line and exit scale mode
    deleteScaleLine();
    setIsScaleMode(false);
    setShowMeasurementInput(false);
    setPendingScaleLine(null);
  };

  // Handle shape selection
  const handleShapeSelect = (shapeId: string, event?: Konva.KonvaEventObject<MouseEvent>) => {
    if (event?.evt.shiftKey) {
      // Multi-select: add to selection if not already selected, remove if already selected
      if (selectedShapeIds.includes(shapeId)) {
        removeFromSelection(shapeId);
      } else {
        addToSelection(shapeId);
      }
    } else {
      // Single select: clear current selection and select this shape
      selectShape(shapeId);
    }
  };

  // Handle shape drag end - no additional action needed, Shape component handles it
  const handleShapeDragEnd = () => {
    // Shape component already updates the store
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getViewportCenter: () => {
      const stage = stageRef.current;
      if (!stage) return { x: 200, y: 200 };

      // Calculate the center of the visible viewport in stage coordinates
      // Use refs for current values, not state
      const centerX = (dimensions.width / 2 - stagePosRef.current.x) / stageScaleRef.current;
      const centerY = (dimensions.height / 2 - stagePosRef.current.y) / stageScaleRef.current;

      return { x: centerX, y: centerY };
    },
    getStage: () => stageRef.current,
    activatePolylineTool: () => {
      setActiveDrawingTool('polyline');
      setDrawingPoints([]);
      setDrawingPreviewPoint(null);
    },
    activatePolygonTool: () => {
      setActiveDrawingTool('polygon');
      setDrawingPoints([]);
      setDrawingPreviewPoint(null);
    },
    deactivateDrawingTools: () => {
      setActiveDrawingTool(null);
      setDrawingPoints([]);
      setDrawingPreviewPoint(null);
    },
  }));
  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ backgroundColor: '#F5F5F5' }}
      tabIndex={0}
      onFocus={() => console.log('Canvas focused')}
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          x={stagePosRef.current.x}
          y={stagePosRef.current.y}
          scaleX={stageScaleRef.current}
          scaleY={stageScaleRef.current}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleStageClick}
        >
          {/* Background Image Layer - non-interactive */}
          <Layer listening={false}>
            {canvasScale.backgroundImage && (
              <Image
                image={(() => {
                  const img = new window.Image();
                  img.src = canvasScale.backgroundImage.url;
                  return img;
                })()}
                x={0}
                y={0}
                width={canvasScale.backgroundImage.width}
                height={canvasScale.backgroundImage.height}
                listening={false}
              />
            )}
          </Layer>

          {/* Scale Line Layer - non-interactive */}
          <Layer listening={false}>
            {canvasScale.scaleLine && (
           <ScaleLine
             scaleLine={canvasScale.scaleLine}
             scale={stageScaleRef.current}
           />
            )}
          </Layer>

          {/* Grid layer - non-interactive */}
          <Layer listening={false}>
            {(() => {
              if (!gridState.isVisible) return null;
              
              // Use refs to avoid triggering React re-renders
              const currentScale = stageScaleRef.current;
              const visibleWidth = dimensions.width / currentScale;
              const visibleHeight = dimensions.height / currentScale;
              const startX = -stagePosRef.current.x / currentScale;
              const startY = -stagePosRef.current.y / currentScale;
              const endX = startX + visibleWidth;
              const endY = startY + visibleHeight;
              const gridSize = gridState.size;
              const firstX = Math.floor(startX / gridSize) * gridSize;
              const firstY = Math.floor(startY / gridSize) * gridSize;
              const verticalLines = Math.ceil((endX - firstX) / gridSize) + 1;
              const horizontalLines = Math.ceil((endY - firstY) / gridSize) + 1;
              return (
                <>
                  {Array.from({ length: verticalLines }).map((_, i) => {
                    const x = firstX + i * gridSize;
                    return (
                      <Line
                        key={`v-${i}`}
                        points={[x, startY - gridSize, x, endY + gridSize]}
                        stroke={gridState.color}
                        strokeWidth={1 / currentScale}
                        opacity={gridState.opacity}
                        listening={false}
                      />
                    );
                  })}
                  {Array.from({ length: horizontalLines }).map((_, i) => {
                    const y = firstY + i * gridSize;
                    return (
                      <Line
                        key={`h-${i}`}
                        points={[startX - gridSize, y, endX + gridSize, y]}
                        stroke={gridState.color}
                        strokeWidth={1 / currentScale}
                        opacity={gridState.opacity}
                        listening={false}
                      />
                    );
                  })}
                </>
              );
            })()}
          </Layer>

          {/* Drawing tools layer - active polyline/polygon drawing */}
          {activeDrawingTool === 'polyline' && (
            <PolylineTool
              isActive={true}
              onComplete={() => setActiveDrawingTool(null)}
              points={drawingPoints}
              previewPoint={drawingPreviewPoint}
            />
          )}
          {activeDrawingTool === 'polygon' && (
            <PolygonTool
              isActive={true}
              onComplete={() => setActiveDrawingTool(null)}
              points={drawingPoints}
              previewPoint={drawingPreviewPoint}
            />
          )}

          {/* Shapes layer - interactive */}
          <Layer>
            {(() => {
              // Calculate viewport bounds for object culling
              const viewportBounds = calculateViewportBounds(
                dimensions.width,
                dimensions.height,
                stagePosRef.current.x,
                stagePosRef.current.y,
                stageScaleRef.current
              );
              
              // Filter shapes to only render visible ones (viewport culling)
              // Use padding of 200px to include shapes near viewport edge
              const visibleShapes = filterVisibleShapes(shapes, viewportBounds, 200);
              
              // Log culling stats in development (only if significant reduction)
              if (import.meta.env.DEV && shapes.length > 50) {
                const culledCount = shapes.length - visibleShapes.length;
                if (culledCount > 0) {
                  console.log(`[PERFORMANCE] Viewport culling: ${visibleShapes.length}/${shapes.length} shapes visible (${culledCount} culled)`);
                }
              }
              
              return visibleShapes.map((shape) => {
              const isLocked = isShapeLockedByOtherUser(shape.id);
              const isSelected = selectedShapeIds.includes(shape.id);
              // Handle shapes without layerId (created before layer system) - assign them to default layer
              const shapeLayerId = shape.layerId || 'default-layer';
              const isInActiveLayer = shapeLayerId === activeLayerId;
              
              // Debug: Log shape rendering info
              if (shape.id.includes('8vuzjs6fj')) { // Log for the specific shape from your example
                console.log('🎨 Rendering shape:', {
                  shapeId: shape.id,
                  shapeLayerId,
                  activeLayerId,
                  isInActiveLayer,
                  layers: layers.map(l => ({ id: l.id, name: l.name }))
                });
              }
              
              // Find the layer to check its visibility and lock status
              const layer = layers.find(l => l.id === shapeLayerId);
              const isLayerVisible = layer ? layer.visible : true; // Default to visible if layer not found
              const isLayerLocked = layer ? layer.locked : false; // Default to unlocked if layer not found
              
              // Calculate opacity based on layer visibility and active layer
              let opacity = 1;
              if (!isLayerVisible) {
                opacity = 0; // Completely hide if layer is invisible
              } else if (!isInActiveLayer) {
                opacity = 0.3; // Dim if not in active layer
              }
              
              // Check if shape should be locked (either by user or by layer)
              const isShapeLockedByLayer = isLayerLocked;
              const isShapeLockedByUser = isLocked;
              const isShapeLocked = isShapeLockedByUser || isShapeLockedByLayer;
              
              return (
                <Shape
                  key={shape.id}
                  shape={shape}
                  isSelected={isSelected}
                  isLocked={isShapeLocked}
                  opacity={opacity}
                  onSelect={(event) => handleShapeSelect(shape.id, event)}
                  onDragEnd={handleShapeDragEnd}
                  onUpdatePosition={async (nextX, nextY) => {
                    await updateShapePosition(shape.id, nextX, nextY);
                  }}
                  onAcquireLock={async () => acquireShapeLock(shape.id)}
                  onReleaseLock={async () => releaseShapeLock(shape.id)}
                  isLockedByCurrentUser={() => isShapeLockedByCurrentUser(shape.id)}
                  isInteractionEnabled={Boolean(currentUser)}
                  selectedShapeIds={selectedShapeIds}
                  onMoveSelectedShapes={moveSelectedShapes}
                />
              );
            })})()}
          </Layer>

          {/* Measurement displays layer - non-interactive */}
          <Layer listening={false}>
            {(() => {
              // Calculate viewport bounds for measurement culling
              const viewportBounds = calculateViewportBounds(
                dimensions.width,
                dimensions.height,
                stagePosRef.current.x,
                stagePosRef.current.y,
                stageScaleRef.current
              );
              
              // Filter shapes to only render measurements for visible shapes
              const visibleShapes = filterVisibleShapes(shapes, viewportBounds, 200);
              
              return visibleShapes.map((shape) => {
              if (shape.type !== 'polyline' && shape.type !== 'polygon') return null;
              
              const shapeLayerId = shape.layerId || 'default-layer';
              const layer = layers.find(l => l.id === shapeLayerId);
              const isLayerVisible = layer ? layer.visible : true;
              
              if (!isLayerVisible) return null;
              
              const isInActiveLayer = shapeLayerId === activeLayerId;
              const opacity = isInActiveLayer ? 1 : 0.3;
              
              return (
                <MeasurementDisplay
                  key={`measure-${shape.id}`}
                  shape={shape}
                  opacity={opacity}
                />
              );
            });
            })()}
          </Layer>

          {/* Overlays layer - non-interactive */}
          <Layer ref={overlaysLayerRef} listening={false}>
            {/* Selection box for drag selection */}
            {selectionBox && <SelectionBox selectionBox={selectionBox} />}
            
            {/* Transform controls for selected shapes */}
            <TransformControls 
              transformControls={transformControls}
              onResizeStart={(handle) => {
                // TODO: Implement resize functionality
                console.log('Resize start:', handle);
              }}
              onRotateStart={() => {
                // Rotate selected shapes by 90 degrees
                const rotateSelectedShapes = useCanvasStore.getState().rotateSelectedShapes;
                rotateSelectedShapes(90);
              }}
            />
            
            {Array.from(locks.entries()).map(([shapeId, lock]) => {
              const shape = shapeMap.get(shapeId);
              const isLockedByOther = isShapeLockedByOtherUser(shapeId);
              if (!shape || !isLockedByOther) return null;
              return (
                <LockOverlay
                  key={`lock-${shapeId}`}
                  shapeId={shapeId}
                  lock={lock}
                  x={shape.x}
                  y={shape.y}
                  width={shape.w}
                  height={shape.h}
                />
              );
            })}
            {currentUser && (
              <Circle
                ref={currentCursorRef}
                x={0}
                y={0}
                radius={4}
                fill="#3B82F6"
                stroke="#FFFFFF"
                strokeWidth={1}
                listening={false}
                perfectDrawEnabled={false}
              />
            )}
            <CursorOverlay users={otherUsers} />
          </Layer>
        </Stage>
      )}

      {/* Snap Indicators */}
      <SnapIndicators
        mousePosition={mousePosition}
        viewport={{
          width: dimensions.width,
          height: dimensions.height,
          offsetX: stagePosRef.current.x,
          offsetY: stagePosRef.current.y,
          scale: stageScaleRef.current,
        }}
      />

      {/* Layers Panel */}
      <LayersPanel
        isVisible={showLayersPanel}
        onClose={onCloseLayersPanel || (() => {})}
      />

      {/* Alignment Toolbar */}
      <AlignmentToolbar
        isVisible={showAlignmentToolbar}
        onClose={onCloseAlignmentToolbar || (() => {})}
      />

      {/* Measurement Input Modal */}
      <MeasurementInput
        isOpen={showMeasurementInput}
        onClose={handleMeasurementCancel}
        onSubmit={handleMeasurementSubmit}
        title="Set Scale Measurement"
      />
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
