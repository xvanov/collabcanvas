import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Stage, Layer, Line, Circle } from 'react-konva';
import Konva from 'konva';
import { Shape } from './Shape';
import { CursorOverlay } from './CursorOverlay';
import { LockOverlay } from './LockOverlay';
import { useCanvasStore } from '../store/canvasStore';
import { useShapes } from '../hooks/useShapes';
import { usePresence } from '../hooks/usePresence';
import { useLocks } from '../hooks/useLocks';
import { perfMetrics } from '../utils/harness';

interface CanvasProps {
  onFpsUpdate?: (fps: number) => void;
  onZoomChange?: (scale: number) => void;
}

export interface CanvasHandle {
  getViewportCenter: () => { x: number; y: number };
}
/**
 * Main canvas component with Konva integration
 * Supports pan (click and drag) and zoom (mouse wheel) at 60 FPS
 */
const Canvas = forwardRef<CanvasHandle, CanvasProps>(({ onFpsUpdate, onZoomChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  // Imperative current-user cursor to avoid React re-renders on mousemove
  const overlaysLayerRef = useRef<Konva.Layer>(null);
  const currentCursorRef = useRef<Konva.Circle>(null);
  const isDragging = useRef(false);
  const lastFrameTime = useRef(performance.now());
  const frameCount = useRef(0);
  const rafId = useRef<number | undefined>(undefined);

  // Store state
  const { shapes, updateShapePosition } = useShapes();
  const shapeMap = useCanvasStore((state) => state.shapes);
  const selectedShapeId = useCanvasStore((state) => state.selectedShapeId);
  const selectShape = useCanvasStore((state) => state.selectShape);
  const deselectShape = useCanvasStore((state) => state.deselectShape);
  const currentUser = useCanvasStore((state) => state.currentUser);
  
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
    };
  }, [onFpsUpdate]);

  // Handle wheel zoom
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    
    if (!pointer) return;

    // Calculate mouse position in stage coordinates
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
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

    setStageScale(clampedScale);
    setStagePos(newPos);
    
    // Notify parent of zoom change
    if (onZoomChange) {
      onZoomChange(clampedScale);
    }
  };

  // Handle mouse down - start pan if clicking on empty space
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedOnEmpty = e.target === stageRef.current;
    if (clickedOnEmpty) {
      isDragging.current = true;
      deselectShape();
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
    const stagePos = stage.position();
    const stageScale = stage.scaleX();
    
    const stageX = (pointer.x - stagePos.x) / stageScale;
    const stageY = (pointer.y - stagePos.y) / stageScale;

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

    // Pan the canvas if dragging
    if (isDragging.current) {
      setStagePos((prev) => ({
        x: prev.x + e.evt.movementX,
        y: prev.y + e.evt.movementY,
      }));
    }
  };

  // Handle mouse up - stop panning
  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Handle canvas click - deselect shapes when clicking empty space
  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // If clicking on the stage itself (not a shape), deselect
    if (e.target === stageRef.current) {
      deselectShape();
    }
  };

  // Handle shape selection
  const handleShapeSelect = (shapeId: string) => {
    selectShape(shapeId);
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
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          x={stagePos.x}
          y={stagePos.y}
          scaleX={stageScale}
          scaleY={stageScale}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleStageClick}
        >
          {/* Grid layer - non-interactive */}
          <Layer listening={false} hitGraphEnabled={false}>
            {(() => {
              const visibleWidth = dimensions.width / stageScale;
              const visibleHeight = dimensions.height / stageScale;
              const startX = -stagePos.x / stageScale;
              const startY = -stagePos.y / stageScale;
              const endX = startX + visibleWidth;
              const endY = startY + visibleHeight;
              const gridSize = 50;
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
                        stroke="#E0E0E0"
                        strokeWidth={1 / stageScale}
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
                        stroke="#E0E0E0"
                        strokeWidth={1 / stageScale}
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
              const isSelected = selectedShapeId === shape.id;
              return (
                <Shape
                  key={shape.id}
                  id={shape.id}
                  x={shape.x}
                  y={shape.y}
                  width={shape.w}
                  height={shape.h}
                  fill={shape.color}
                  isSelected={isSelected}
                  isLocked={isLocked}
                  onSelect={() => handleShapeSelect(shape.id)}
                  onDragEnd={handleShapeDragEnd}
                  onUpdatePosition={async (nextX, nextY) => {
                    await updateShapePosition(shape.id, nextX, nextY);
                  }}
                  onAcquireLock={async () => acquireShapeLock(shape.id)}
                  onReleaseLock={async () => releaseShapeLock(shape.id)}
                  isLockedByCurrentUser={() => isShapeLockedByCurrentUser(shape.id)}
                  isInteractionEnabled={Boolean(currentUser)}
                />
              );
            })}
          </Layer>

          {/* Overlays layer - non-interactive */}
          <Layer ref={overlaysLayerRef} listening={false} hitGraphEnabled={false}>
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
    </div>
  );
});

Canvas.displayName = 'Canvas';

export default Canvas;
