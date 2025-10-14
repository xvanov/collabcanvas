/**
 * LockOverlay component for displaying username on locked shapes
 * Shows which user has locked a shape for editing
 */

import { Text } from 'react-konva';
import type { Lock } from '../types';

interface LockOverlayProps {
  shapeId: string;
  lock: Lock;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Lock overlay component that displays the username of the user who locked the shape
 */
export function LockOverlay({ lock, x, y }: LockOverlayProps) {
  // Position the text above the shape
  const textX = x;
  const textY = y - 25; // 25px above the shape

  return (
    <Text
      text={`🔒 ${lock.userName}`}
      x={textX}
      y={textY}
      fontSize={12}
      fontFamily="Arial, sans-serif"
      fill="#DC2626" // Red color for lock indicator
      fontStyle="bold"
      // Add a subtle background for better readability
      shadowColor="white"
      shadowBlur={2}
      shadowOffsetX={1}
      shadowOffsetY={1}
      listening={false} // Don't interfere with shape interactions
    />
  );
}
