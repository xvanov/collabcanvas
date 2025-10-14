/**
 * Shape component for rendering and interacting with rectangles on the canvas
 * Supports drag-to-move interaction with boundary constraints
 */

import { Rect } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useCanvasStore } from '../store/canvasStore';
import { useShapes } from '../hooks/useShapes';

interface ShapeProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  isSelected: boolean;
  isLocked: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
}

/**
 * Rectangle shape component with drag interaction
 */
export function Shape({
  id,
  x,
  y,
  width,
  height,
  fill,
  isSelected,
  isLocked,
  onSelect,
  onDragEnd,
}: ShapeProps) {
  const { updateShapePosition } = useShapes();
  const currentUser = useCanvasStore((state) => state.currentUser);

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const pos = node.position();
    
    // Update position with Firestore sync (throttled and optimistic)
    if (currentUser) {
      updateShapePosition(id, pos.x, pos.y);
    }
    
    onDragEnd(pos.x, pos.y);
  };

  return (
    <Rect
      id={id}
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      draggable={!isLocked}
      stroke={isSelected ? '#1E40AF' : undefined}
      strokeWidth={isSelected ? 3 : 0}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={handleDragEnd}
      shadowColor="black"
      shadowBlur={isSelected ? 10 : 5}
      shadowOpacity={isSelected ? 0.4 : 0.2}
      shadowOffsetX={0}
      shadowOffsetY={2}
      // Cursor styles
      onMouseEnter={(e) => {
        const container = e.target.getStage()?.container();
        if (container) {
          container.style.cursor = isLocked ? 'not-allowed' : 'move';
        }
      }}
      onMouseLeave={(e) => {
        const container = e.target.getStage()?.container();
        if (container) {
          container.style.cursor = 'default';
        }
      }}
    />
  );
}

