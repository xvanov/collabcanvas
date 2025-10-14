import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import Konva from 'konva';

interface CanvasProps {
  onFpsUpdate?: (fps: number) => void;
  onZoomChange?: (scale: number) => void;
}

/**
 * Main canvas component with Konva integration
 * Supports pan (click and drag) and zoom (mouse wheel) at 60 FPS
 */
export default function Canvas({ onFpsUpdate, onZoomChange }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const isDragging = useRef(false);
  const lastFrameTime = useRef(performance.now());
  const frameCount = useRef(0);
  const rafId = useRef<number | undefined>(undefined);

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

  // Handle drag start
  const handleDragStart = () => {
    isDragging.current = true;
  };

  // Handle drag end
  const handleDragEnd = () => {
    isDragging.current = false;
  };

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
          draggable
          x={stagePos.x}
          y={stagePos.y}
          scaleX={stageScale}
          scaleY={stageScale}
          onWheel={handleWheel}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <Layer>
            {/* Grid pattern for visual reference - expands with zoom */}
            {(() => {
              // Calculate visible canvas area accounting for zoom
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
                  {/* Vertical grid lines */}
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
                  {/* Horizontal grid lines */}
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
            {/* Shapes will be rendered here in future PRs */}
          </Layer>
        </Stage>
      )}
    </div>
  );
}

