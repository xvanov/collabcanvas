/**
 * Shape component for rendering and interacting with rectangles on the canvas
 * Supports drag-to-move interaction with boundary constraints and locking
 */

import { memo } from 'react';
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
  const handleClick = async () => {
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
  };

  const handleDragStart = async () => {
    if (!isInteractionEnabled) return;

    // If shape is locked by another user, prevent drag
    if (isLocked && !isLockedByCurrentUser()) {
      return false; // Prevent drag
    }

    // If shape is not locked, try to acquire lock
    if (!isLockedByCurrentUser()) {
      const lockAcquired = await onAcquireLock();
      if (!lockAcquired) {
        // Failed to acquire lock, prevent drag
        return false;
      }
    }

    return true; // Allow drag
  };

  const handleDragEnd = async (e: KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const pos = node.position();
    
    // Update position with Firestore sync (throttled and optimistic)
    await onUpdatePosition(pos.x, pos.y);
    
    // Release lock when drag operation completes
    if (isLockedByCurrentUser()) {
      await onReleaseLock();
    }
    
    onDragEnd(pos.x, pos.y);
  };

  const handleMouseUp = async () => {
    // Release lock on mouse up if shape is locked by current user
    // This provides immediate feedback when user stops interacting
    if (isLockedByCurrentUser()) {
      await onReleaseLock();
    }
  };

  return (
    <Rect
      id={id}
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      draggable={!isLocked && isInteractionEnabled}
      stroke={isSelected ? '#1E40AF' : undefined}
      strokeWidth={isSelected ? 3 : 0}
      onClick={handleClick}
      onDragStart={handleDragStart}
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
