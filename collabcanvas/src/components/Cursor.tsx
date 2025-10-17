import { Circle, Text } from 'react-konva';
import { memo } from 'react';

interface CursorProps {
  x: number;
  y: number;
  color: string;
  name: string;
  isCurrentUser?: boolean;
}

/**
 * Cursor component for displaying user cursors on the canvas
 * Shows a colored dot with user name label
 * Memoized to prevent unnecessary re-renders
 */
export const Cursor = memo(function Cursor({ x, y, color, name, isCurrentUser = false }: CursorProps) {
  return (
    <>
      {/* Cursor dot */}
      <Circle
        x={x}
        y={y}
        radius={isCurrentUser ? 4 : 6}
        fill={color}
        stroke={isCurrentUser ? '#FFFFFF' : '#FFFFFF'}
        strokeWidth={isCurrentUser ? 1 : 2}
        listening={false}
        perfectDrawEnabled={false}
      />
      
      {/* Name label (only for other users, not current user) */}
      {!isCurrentUser && (
        <Text
          x={x + 8}
          y={y - 8}
          text={name}
          fontSize={12}
          fontFamily="Arial, sans-serif"
          fill="#333333"
          padding={4}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
    </>
  );
});
