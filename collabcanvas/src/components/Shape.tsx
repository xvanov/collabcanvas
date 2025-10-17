/**
 * Shape component for rendering and interacting with different shape types on the canvas
 * Supports drag-to-move interaction with boundary constraints and locking
 */

import { useCallback } from 'react';
import { Rect, Circle, Text, Line } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Shape as ShapeType } from '../types';

interface ShapeProps {
  shape: ShapeType;
  isSelected: boolean;
  isLocked: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  onUpdatePosition: (x: number, y: number) => Promise<void> | void;
  onAcquireLock: () => Promise<boolean>;
  onReleaseLock: () => Promise<void>;
  isLockedByCurrentUser: () => boolean;
  isInteractionEnabled: boolean;
}

/**
 * Multi-type shape component with drag interaction
 */
function ShapeComponent({
  shape,
  isSelected,
  isLocked,
  onSelect,
  onDragEnd,
  onUpdatePosition,
  onAcquireLock,
  onReleaseLock,
  isLockedByCurrentUser,
  isInteractionEnabled,
}: ShapeProps) {
  const handleClick = useCallback(async () => {
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

    onSelect();
  }, [isInteractionEnabled, isLocked, isLockedByCurrentUser, onAcquireLock, onSelect]);

  const handleDragEnd = useCallback(async (e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const pos = node.position();
    
    // Update position with Firestore sync (throttled and optimistic)
    await onUpdatePosition(pos.x, pos.y);
    
    // Release lock when drag operation completes
    if (isLockedByCurrentUser()) {
      await onReleaseLock();
    }
    
    onDragEnd(pos.x, pos.y);
  }, [onUpdatePosition, isLockedByCurrentUser, onReleaseLock, onDragEnd]);

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
    draggable: !isLocked && isInteractionEnabled,
    stroke: stroke,
    strokeWidth: strokeWidth,
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
          fill={undefined}
        />
      );

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
