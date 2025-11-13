/**
 * Bounding Box Tool Component
 * Interactive tool for drawing bounding boxes with item type labels
 */

import { Layer, Rect } from 'react-konva';
import type { Layer as LayerType } from '../types';

interface BoundingBoxToolProps {
  isActive: boolean;
  startPoint: { x: number; y: number } | null;
  endPoint: { x: number; y: number } | null;
  layers: LayerType[];
  activeLayerId: string;
}

/**
 * Bounding box drawing tool for creating labeled annotations
 */
export function BoundingBoxTool({ isActive, startPoint, endPoint, layers, activeLayerId }: BoundingBoxToolProps) {
  if (!isActive || !startPoint || !endPoint) return null;

  // Get active layer color
  const activeLayer = layers.find(l => l.id === activeLayerId);
  const color = activeLayer?.color || '#3B82F6';

  // Calculate bounding box dimensions
  const x = Math.min(startPoint.x, endPoint.x);
  const y = Math.min(startPoint.y, endPoint.y);
  const width = Math.abs(endPoint.x - startPoint.x);
  const height = Math.abs(endPoint.y - startPoint.y);

  return (
    <Layer listening={false}>
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={undefined}
        stroke={color}
        strokeWidth={2}
        dash={[5, 5]}
        opacity={0.7}
      />
    </Layer>
  );
}


