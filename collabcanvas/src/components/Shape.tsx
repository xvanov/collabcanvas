/**
 * Shape component for rendering and interacting with rectangles on the canvas
 * Supports drag-to-move interaction with boundary constraints and locking
 */

import { memo, useCallback } from 'react';
import { Rect } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';

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
  onUpdatePosition: (x: number, y: number) => Promise<void> | void;
  onAcquireLock: () => Promise<boolean>;
  onReleaseLock: () => Promise<void>;
  isLockedByCurrentUser: () => boolean;
  isInteractionEnabled: boolean;
}

/**
 * Rectangle shape component with drag interaction
 */
function ShapeComponent({
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

  return (
    <Rect
      id={id}
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      draggable={!isLocked && isInteractionEnabled}
      stroke={stroke}
      strokeWidth={strokeWidth}
      onClick={handleClick}
      onDragEnd={handleDragEnd}
      onMouseUp={handleMouseUp}
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

export const Shape = memo(ShapeComponent);
Shape.displayName = 'Shape';
