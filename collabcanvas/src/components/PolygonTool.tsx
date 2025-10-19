/**
 * Polygon Tool Component
 * Interactive tool for drawing closed polygons with area measurements
 */

import { Layer, Line, Circle, Text } from 'react-konva';
import { useCanvasStore } from '../store/canvasStore';
import { calculatePolygonArea, convertAreaToRealWorld, formatMeasurement, calculateDistance } from '../services/measurementService';

interface Point {
  x: number;
  y: number;
}

interface PolygonToolProps {
  isActive: boolean;
  onComplete?: () => void;
  points: Point[];
  previewPoint: Point | null;
}

/**
 * Polygon drawing tool for room area measurements
 * Uses fixed sizes for performance (no zoom dependency)
 */
export function PolygonTool({ isActive, points, previewPoint }: PolygonToolProps) {
  const canvasScale = useCanvasStore((state) => state.canvasScale);
  const layers = useCanvasStore((state) => state.layers);
  const activeLayerId = useCanvasStore((state) => state.activeLayerId);

  // Get active layer color
  const activeLayer = layers.find(l => l.id === activeLayerId);
  const color = activeLayer?.color || '#10B981';

  // Check if scale is set
  const hasScale = canvasScale.scaleLine !== null;

  // Calculate measurements
  const pixelArea = points.length >= 3 ? calculatePolygonArea(points) : 0;
  const realArea = hasScale ? convertAreaToRealWorld(pixelArea, canvasScale) : null;

  // Check if preview point is near first point (for auto-close)
  const snapThreshold = 10; // Fixed pixel threshold
  const isNearFirstPoint = previewPoint && points.length >= 3 
    ? calculateDistance(previewPoint, points[0]) < snapThreshold
    : false;

  if (!isActive) return null;

  // Prepare points for rendering
  const flatPoints: number[] = [];
  points.forEach(p => {
    flatPoints.push(p.x, p.y);
  });

  // Add preview lines
  let previewFlatPoints: number[] = [];
  if (previewPoint && points.length > 0) {
    const lastPoint = points[points.length - 1];
    previewFlatPoints = [lastPoint.x, lastPoint.y, previewPoint.x, previewPoint.y];
    
    // If near first point, also show closing line
    if (isNearFirstPoint && points.length >= 3) {
      previewFlatPoints.push(points[0].x, points[0].y);
    }
  }

  // Calculate polygon center for area label
  let centerX = 0;
  let centerY = 0;
  if (points.length >= 3) {
    points.forEach(p => {
      centerX += p.x;
      centerY += p.y;
    });
    centerX /= points.length;
    centerY /= points.length;
  }

  return (
    <Layer listening={false}>
      {/* Draw polygon fill if we have 3+ points */}
      {points.length >= 3 && (
        <Line
          points={flatPoints}
          fill={color}
          opacity={0.2}
          closed={true}
        />
      )}

      {/* Draw polygon outline */}
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

      {/* Draw vertices as circles */}
      {points.map((point, index) => (
        <Circle
          key={index}
          x={point.x}
          y={point.y}
          radius={index === 0 && isNearFirstPoint ? 6 : 4}
          fill={index === 0 && isNearFirstPoint ? '#FFFF00' : color}
          stroke="#FFFFFF"
          strokeWidth={1}
        />
      ))}

      {/* Display area measurement */}
      {points.length >= 3 && realArea !== null && canvasScale.scaleLine && (
        <Text
          x={centerX}
          y={centerY}
          text={formatMeasurement(realArea, canvasScale.scaleLine.unit, true)}
          fontSize={14}
          fill="#000000"
          padding={4}
          stroke="#FFFFFF"
          strokeWidth={3}
          offsetX={50} // Center the text
        />
      )}

      {/* Show instruction hint */}
      {points.length > 0 && points.length < 3 && (
        <Text
          x={points[points.length - 1].x + 10}
          y={points[points.length - 1].y - 20}
          text={`${points.length} point(s) - need ${3 - points.length} more`}
          fontSize={12}
          fill="#666666"
          padding={4}
        />
      )}

      {/* Show close hint */}
      {points.length >= 3 && previewPoint && (
        <Text
          x={points[points.length - 1].x + 10}
          y={points[points.length - 1].y - 40}
          text={isNearFirstPoint ? "Click to close polygon" : "Right-click or Enter to close"}
          fontSize={12}
          fill="#10B981"
          padding={4}
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

