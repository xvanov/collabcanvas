/**
 * Polyline Tool Component
 * Interactive tool for drawing multi-segment lines with real-world measurements
 */

import { Layer, Line, Circle, Text } from 'react-konva';
import { useCanvasStore } from '../store/canvasStore';
import { calculatePolylineLength, convertToRealWorld, formatMeasurement } from '../services/measurementService';

interface Point {
  x: number;
  y: number;
}

interface PolylineToolProps {
  isActive: boolean;
  onComplete?: () => void;
  points: Point[];
  previewPoint: Point | null;
}

/**
 * Polyline drawing tool for wall measurements
 * Uses fixed sizes for performance (no zoom dependency)
 */
export function PolylineTool({ isActive, points, previewPoint }: PolylineToolProps) {
  const canvasScale = useCanvasStore((state) => state.canvasScale);
  const layers = useCanvasStore((state) => state.layers);
  const activeLayerId = useCanvasStore((state) => state.activeLayerId);

  // Get active layer color
  const activeLayer = layers.find(l => l.id === activeLayerId);
  const color = activeLayer?.name ? '#3B82F6' : '#3B82F6'; // Default blue, could use layer-specific colors

  // Check if scale is set
  const hasScale = canvasScale.scaleLine !== null;

  // Calculate measurements
  const pixelLength = points.length >= 2 ? calculatePolylineLength(points) : 0;
  const realLength = hasScale ? convertToRealWorld(pixelLength, canvasScale) : null;

  if (!isActive) return null;

  // Prepare points for rendering
  const flatPoints: number[] = [];
  points.forEach(p => {
    flatPoints.push(p.x, p.y);
  });

  // Add preview point if exists
  let previewFlatPoints: number[] = [];
  if (previewPoint && points.length > 0) {
    const lastPoint = points[points.length - 1];
    previewFlatPoints = [lastPoint.x, lastPoint.y, previewPoint.x, previewPoint.y];
  }

  return (
    <Layer listening={false}>
      {/* Draw existing line segments */}
      {points.length >= 2 && (
        <Line
          points={flatPoints}
          stroke={color}
          strokeWidth={2}
          lineCap="round"
          lineJoin="round"
        />
      )}

      {/* Draw preview line */}
      {previewFlatPoints.length > 0 && (
        <Line
          points={previewFlatPoints}
          stroke={color}
          strokeWidth={2}
          dash={[10, 5]}
          opacity={0.5}
        />
      )}

      {/* Draw points as circles */}
      {points.map((point, index) => (
        <Circle
          key={index}
          x={point.x}
          y={point.y}
          radius={4}
          fill={color}
          stroke="#FFFFFF"
          strokeWidth={1}
        />
      ))}

      {/* Display measurement */}
      {points.length >= 2 && realLength !== null && canvasScale.scaleLine && (
        <Text
          x={points[points.length - 1].x + 10}
          y={points[points.length - 1].y - 20}
          text={formatMeasurement(realLength, canvasScale.scaleLine.unit)}
          fontSize={14}
          fill="#000000"
          padding={4}
          stroke="#FFFFFF"
          strokeWidth={3}
        />
      )}

      {/* Show warning if no scale */}
      {!hasScale && (
        <Text
          x={100}
          y={100}
          text="⚠️ Set scale before drawing"
          fontSize={16}
          fill="#FF0000"
          padding={8}
        />
      )}
    </Layer>
  );
}

