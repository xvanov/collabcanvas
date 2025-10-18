import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Stage, Layer, Line, Circle } from 'react-konva';
import Konva from 'konva';
import { Shape } from './Shape';
import { CursorOverlay } from './CursorOverlay';
import { LockOverlay } from './LockOverlay';
import { SelectionBox } from './SelectionBox';
import { TransformControls } from './TransformControls';
import { LayersPanel } from './LayersPanel';
import { AlignmentToolbar } from './AlignmentToolbar';
import { SnapIndicators } from './SnapIndicators';
import { useCanvasStore } from '../store/canvasStore';
import { useShapes } from '../hooks/useShapes';
import { usePresence } from '../hooks/usePresence';
import { useLocks } from '../hooks/useLocks';
import { perfMetrics } from '../utils/harness';
import type { SelectionBox as SelectionBoxType } from '../types';

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
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  // Mouse position for snap indicators
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  // Imperative current-user cursor to avoid React re-renders on mousemove
  const overlaysLayerRef = useRef<Konva.Layer>(null);
  const currentCursorRef = useRef<Konva.Circle>(null);
  const isDragging = useRef(false);
  const isSelecting = useRef(false);
  const selectionStart = useRef({ x: 0, y: 0 });
  const lastFrameTime = useRef(performance.now());
  const frameCount = useRef(0);
  const rafId = useRef<number | undefined>(undefined);
  // Throttle React state updates during pan/zoom to prevent RAF queue buildup
  const pendingStateUpdateRef = useRef<number | null>(null);

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

  // Throttled state update function to prevent RAF queue buildup in Chrome
  const scheduleStateUpdate = (pos: { x: number; y: number }, scale: number) => {
    if (pendingStateUpdateRef.current) {
      cancelAnimationFrame(pendingStateUpdateRef.current);
    }
    
    pendingStateUpdateRef.current = requestAnimationFrame(() => {
      setStagePos(pos);
      setStageScale(scale);
      pendingStateUpdateRef.current = null;
    });
  };

  // Initialize refs with initial state values
  useEffect(() => {
    stagePosRef.current = stagePos;
    stageScaleRef.current = stageScale;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (pendingStateUpdateRef.current) {
        cancelAnimationFrame(pendingStateUpdateRef.current);
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
    
    // Update React state only for UI display (throttled)
    scheduleStateUpdate(newPos, clampedScale);
    
    // Notify parent of zoom change
    if (onZoomChange) {
      onZoomChange(clampedScale);
    }
  };

  // Handle keyboard events for arrow key movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [selectedShapeIds, moveSelectedShapes]);

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

    // Update mouse position for snap indicators
    setMousePosition({
      x: stageX,
      y: stageY,
    });

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
      
      // Update React state only for UI display (throttled)
      scheduleStateUpdate(newPos, stageScaleRef.current);
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

  // Handle canvas click - deselect shapes when clicking empty space
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // If clicking on the stage itself (not a shape), deselect
    if (e.target === stageRef.current) {
      deselectShape();
    }
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

  // Expose method to get viewport center for shape creation
  useImperativeHandle(ref, () => ({
    getViewportCenter: () => {
      const stage = stageRef.current;
      if (!stage) return { x: 200, y: 200 };

      // Calculate the center of the visible viewport in stage coordinates
      const centerX = (dimensions.width / 2 - stagePos.x) / stageScale;
      const centerY = (dimensions.height / 2 - stagePos.y) / stageScale;

      return { x: centerX, y: centerY };
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
          {/* Grid layer - non-interactive */}
          <Layer listening={false}>
            {(() => {
              if (!gridState.isVisible) return null;
              
              const visibleWidth = dimensions.width / stageScaleRef.current;
              const visibleHeight = dimensions.height / stageScaleRef.current;
              const startX = -stagePosRef.current.x / stageScaleRef.current;
              const startY = -stagePosRef.current.y / stageScaleRef.current;
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
                        strokeWidth={1 / stageScale}
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
                        strokeWidth={1 / stageScale}
                        opacity={gridState.opacity}
                        listening={false}
                      />
                    );
                  })}
                </>
              );
            })()}
          </Layer>

          {/* Shapes layer - interactive */}
          <Layer>
            {shapes.map((shape) => {
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
            })}
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
          offsetX: stagePos.x,
          offsetY: stagePos.y,
          scale: stageScale,
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
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
