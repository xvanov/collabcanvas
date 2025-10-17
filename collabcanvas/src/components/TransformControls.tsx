/**
 * TransformControls component for selected shapes
 * Provides resize handles and rotation controls
 */

import { Group, Rect, Circle } from 'react-konva';
import type { TransformControls as TransformControlsType, ResizeHandle } from '../types';

interface TransformControlsProps {
  transformControls: TransformControlsType;
  onResizeStart?: (handle: ResizeHandle) => void;
  onRotateStart?: () => void;
}

/**
 * Transform controls overlay for selected shapes
 */
export function TransformControls({ 
  transformControls, 
  onResizeStart, 
  onRotateStart 
}: TransformControlsProps) {
  if (!transformControls.isVisible) return null;

  const { x, y, width, height, resizeHandles } = transformControls;

  return (
    <Group>
      {/* Selection border */}
      <Rect
        x={x - 2}
        y={y - 2}
        width={width + 4}
        height={height + 4}
        stroke="#3B82F6"
        strokeWidth={2}
        fill="transparent"
        dash={[5, 5]}
        listening={false}
      />
      
      {/* Resize handles */}
      {resizeHandles.map((handle) => {
        const handleSize = 8;
        let handleX = x;
        let handleY = y;
        
        // Position handles based on their type
        switch (handle) {
          case 'nw':
            handleX = x - handleSize / 2;
            handleY = y - handleSize / 2;
            break;
          case 'n':
            handleX = x + width / 2 - handleSize / 2;
            handleY = y - handleSize / 2;
            break;
          case 'ne':
            handleX = x + width - handleSize / 2;
            handleY = y - handleSize / 2;
            break;
          case 'w':
            handleX = x - handleSize / 2;
            handleY = y + height / 2 - handleSize / 2;
            break;
          case 'e':
            handleX = x + width - handleSize / 2;
            handleY = y + height / 2 - handleSize / 2;
            break;
          case 'sw':
            handleX = x - handleSize / 2;
            handleY = y + height - handleSize / 2;
            break;
          case 's':
            handleX = x + width / 2 - handleSize / 2;
            handleY = y + height - handleSize / 2;
            break;
          case 'se':
            handleX = x + width - handleSize / 2;
            handleY = y + height - handleSize / 2;
            break;
        }
        
        return (
          <Rect
            key={handle}
            x={handleX}
            y={handleY}
            width={handleSize}
            height={handleSize}
            fill="#3B82F6"
            stroke="#FFFFFF"
            strokeWidth={1}
            draggable={false}
            onClick={() => onResizeStart?.(handle)}
            onMouseEnter={(e) => {
              const container = e.target.getStage()?.container();
              if (container) {
                // Set appropriate cursor based on handle position
                const cursors: Record<ResizeHandle, string> = {
                  'nw': 'nw-resize',
                  'n': 'n-resize',
                  'ne': 'ne-resize',
                  'w': 'w-resize',
                  'e': 'e-resize',
                  'sw': 'sw-resize',
                  's': 's-resize',
                  'se': 'se-resize',
                };
                container.style.cursor = cursors[handle];
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
      })}
      
      {/* Rotation handle (above the selection) */}
      <Circle
        x={x + width / 2}
        y={y - 20}
        radius={6}
        fill="#3B82F6"
        stroke="#FFFFFF"
        strokeWidth={1}
        onClick={() => onRotateStart?.()}
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) {
            container.style.cursor = 'grab';
          }
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) {
            container.style.cursor = 'default';
          }
        }}
      />
    </Group>
  );
}
