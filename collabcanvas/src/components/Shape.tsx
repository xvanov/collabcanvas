/**
 * Shape component for rendering and interacting with different shape types on the canvas
 * Supports drag-to-move interaction with boundary constraints and locking
 */

import { useCallback } from 'react';
import { Rect, Circle, Text, Line, Group } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Shape as ShapeType } from '../types';

interface ShapeProps {
  shape: ShapeType;
  isSelected: boolean;
  isLocked: boolean;
  opacity?: number;
  onSelect: (event?: KonvaEventObject<MouseEvent>) => void;
  onDragEnd: (x: number, y: number) => void;
  onUpdatePosition: (x: number, y: number) => Promise<void> | void;
  onAcquireLock: () => Promise<boolean>;
  onReleaseLock: () => Promise<void>;
  isLockedByCurrentUser: () => boolean;
  isInteractionEnabled: boolean;
  selectedShapeIds: string[];
  onMoveSelectedShapes: (deltaX: number, deltaY: number) => void;
}

/**
 * Multi-type shape component with drag interaction
 */
function ShapeComponent({
  shape,
  isSelected,
  isLocked,
  opacity = 1,
  onSelect,
  onDragEnd,
  onUpdatePosition,
  onAcquireLock,
  onReleaseLock,
  isLockedByCurrentUser,
  isInteractionEnabled,
  selectedShapeIds,
  onMoveSelectedShapes,
}: ShapeProps) {
  const handleClick = useCallback(async (e: KonvaEventObject<MouseEvent>) => {
    if (!isInteractionEnabled) return;

    // If shape is locked by another user, don't allow selection
    if (isLocked && !isLockedByCurrentUser()) {
      return;
    }

    // If shape is not locked, try to acquire lock
    if (!isLockedByCurrentUser()) {
      const lockAcquired = await onAcquireLock();
      if (!lockAcquired) {
        // Failed to acquire lock, don't select
        return;
      }
    }

    onSelect(e);
  }, [isInteractionEnabled, isLocked, isLockedByCurrentUser, onAcquireLock, onSelect]);

  const handleDragEnd = useCallback(async (e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const pos = node.position();
    
    // Check if this shape is part of a multi-selection
    if (selectedShapeIds.length > 1 && selectedShapeIds.includes(shape.id)) {
      // Calculate the delta from the original position
      const deltaX = pos.x - shape.x;
      const deltaY = pos.y - shape.y;
      
      // Move all selected shapes by the same delta
      onMoveSelectedShapes(deltaX, deltaY);
    } else {
      // Single shape drag - update position with Firestore sync
      await onUpdatePosition(pos.x, pos.y);
    }
    
    // Release lock when drag operation completes
    if (isLockedByCurrentUser()) {
      await onReleaseLock();
    }
    
    onDragEnd(pos.x, pos.y);
  }, [onUpdatePosition, isLockedByCurrentUser, onReleaseLock, onDragEnd, selectedShapeIds, shape.id, shape.x, shape.y, onMoveSelectedShapes]);

  const handleMouseUp = useCallback(async () => {
    // Don't release lock on mouse up - only on drag end
    // This allows users to click to lock without immediately releasing
  }, []);

  const stroke = isSelected ? '#1E40AF' : undefined;
  const strokeWidth = isSelected ? 3 : 0;

  const commonProps = {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    rotation: shape.rotation || 0,
    draggable: !isLocked && isInteractionEnabled,
    stroke: stroke,
    strokeWidth: strokeWidth,
    opacity: opacity,
    onClick: handleClick,
    onDragEnd: handleDragEnd,
    onMouseUp: handleMouseUp,
    // Cursor styles
    onMouseEnter: (e: KonvaEventObject<MouseEvent>) => {
      const container = e.target.getStage()?.container();
      if (container) {
        container.style.cursor = isLocked ? 'not-allowed' : 'move';
      }
    },
    onMouseLeave: (e: KonvaEventObject<MouseEvent>) => {
      const container = e.target.getStage()?.container();
      if (container) {
        container.style.cursor = 'default';
      }
    },
  };

  // Render different shape types based on shape.type
  switch (shape.type) {
    case 'rect':
      return (
        <Rect
          {...commonProps}
          width={shape.w}
          height={shape.h}
          fill={shape.color}
        />
      );

    case 'circle':
      return (
        <Circle
          {...commonProps}
          radius={shape.radius || Math.min(shape.w, shape.h) / 2}
          fill={shape.color}
        />
      );

    case 'text':
      return (
        <Text
          {...commonProps}
          text={shape.text || 'Text'}
          fontSize={shape.fontSize || 16}
          fill={shape.color}
          width={shape.w}
          height={shape.h}
          align="center"
          verticalAlign="middle"
        />
      );

    case 'line':
      return (
        <Line
          {...commonProps}
          points={shape.points || [0, 0, shape.w, 0]}
          stroke={shape.color}
          strokeWidth={shape.strokeWidth || 2}
          hitStrokeWidth={20} // Make hit detection area wider for easier selection
          fill={undefined}
        />
      );

    case 'polyline':
      return (
        <Line
          {...commonProps}
          points={shape.points || []}
          stroke={shape.color}
          strokeWidth={shape.strokeWidth || 2}
          hitStrokeWidth={20} // Make hit detection area wider for easier selection
          fill={undefined}
          lineCap="round"
          lineJoin="round"
        />
      );

    case 'polygon':
      return (
        <Line
          {...commonProps}
          points={shape.points || []}
          stroke={shape.color}
          strokeWidth={shape.strokeWidth || 2}
          hitStrokeWidth={20} // Make hit detection area wider for easier selection
          fill={shape.color}
          opacity={opacity * 0.3} // Semi-transparent fill
          closed={true}
          lineCap="round"
          lineJoin="round"
        />
      );

    case 'boundingbox': {
      // Distinct styling for AI-generated vs manual bounding boxes
      const isAI = shape.isAIGenerated || shape.source === 'ai';
      const boxColor = isAI ? '#10B981' : shape.color; // Green for AI, layer color for manual
      const boxStrokeWidth = shape.strokeWidth || 2;
      const boxDash = isAI ? [5, 5] : undefined; // Dashed border for AI-generated
      
      // Build label text
      let labelText = '';
      if (shape.itemType) {
        labelText = shape.itemType;
      }
      if (isAI && shape.confidence !== undefined) {
        labelText += labelText ? ` (${(shape.confidence * 100).toFixed(0)}%)` : `${(shape.confidence * 100).toFixed(0)}%`;
      }
      
      return (
        <Group
          x={shape.x}
          y={shape.y}
          rotation={shape.rotation || 0}
          draggable={commonProps.draggable}
          opacity={opacity}
          onClick={handleClick}
          onDragEnd={handleDragEnd}
          onMouseUp={handleMouseUp}
          onMouseEnter={commonProps.onMouseEnter}
          onMouseLeave={commonProps.onMouseLeave}
        >
          <Rect
            width={shape.w}
            height={shape.h}
            fill={undefined}
            stroke={stroke || boxColor}
            strokeWidth={strokeWidth || boxStrokeWidth}
            dash={boxDash}
          />
          {labelText && (
            <Text
              x={0}
              y={-20}
              text={labelText}
              fontSize={12}
              fill="#FFFFFF"
              padding={4}
              stroke="#000000"
              strokeWidth={1}
            />
          )}
        </Group>
      );
    }

    default:
      // Fallback to rectangle for unknown types
      return (
        <Rect
          {...commonProps}
          width={shape.w}
          height={shape.h}
          fill={shape.color}
        />
      );
  }
}

export const Shape = ShapeComponent;
