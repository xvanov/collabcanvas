/**
 * Measurement Display Component
 * Shows measurements for polylines and polygons
 */

import { Text } from 'react-konva';
import type { Shape } from '../types';
import { useCanvasStore } from '../store/canvasStore';
import {
  calculatePolylineLength,
  calculatePolygonArea,
  convertToRealWorld,
  convertAreaToRealWorld,
  formatMeasurement,
} from '../services/measurementService';
import { flatPointsToPoints } from '../services/shapeService';

interface MeasurementDisplayProps {
  shape: Shape;
  opacity?: number;
}

/**
 * Display measurements for polylines and polygons
 * Uses fixed font size for performance (avoids re-renders on zoom)
 */
export function MeasurementDisplay({ shape, opacity = 1 }: MeasurementDisplayProps) {
  const canvasScale = useCanvasStore((state) => state.canvasScale);
  
  // Only show measurements for polylines and polygons
  if (shape.type !== 'polyline' && shape.type !== 'polygon') {
    return null;
  }

  // Check if we have a scale set
  if (!canvasScale.scaleLine) {
    return null;
  }

  // Convert flat points to Point objects
  const points = flatPointsToPoints(shape.points || []);
  
  // Check minimum points based on shape type
  if (shape.type === 'polyline' && points.length < 2) {
    return null;
  }
  
  if (shape.type === 'polygon' && points.length < 3) {
    return null;
  }

  // Calculate measurement based on shape type
  let measurementText = '';
  let labelX = shape.x;
  let labelY = shape.y;

  if (shape.type === 'polyline') {
    // Calculate length
    const pixelLength = calculatePolylineLength(points);
    const realLength = convertToRealWorld(pixelLength, canvasScale);
    
    if (realLength !== null) {
      measurementText = formatMeasurement(realLength, canvasScale.scaleLine.unit);
      
      // Position label near the end of the line
      // Points are relative to shape.x, shape.y, so add them for absolute position
      const lastPoint = points[points.length - 1];
      labelX = shape.x + lastPoint.x + 5;
      labelY = shape.y + lastPoint.y - 15;
    }
  } else if (shape.type === 'polygon') {
    // Calculate area
    const pixelArea = calculatePolygonArea(points);
    const realArea = convertAreaToRealWorld(pixelArea, canvasScale);
    
    if (realArea !== null) {
      measurementText = formatMeasurement(realArea, canvasScale.scaleLine.unit, true);
      
      // Position label at polygon center (relative coordinates)
      let centerX = 0;
      let centerY = 0;
      points.forEach(p => {
        centerX += p.x;
        centerY += p.y;
      });
      centerX /= points.length;
      centerY /= points.length;
      
      // Add shape position for absolute positioning
      labelX = shape.x + centerX;
      labelY = shape.y + centerY;
    }
  }

  if (!measurementText) {
    return null;
  }

  return (
    <>
      {/* White background for readability */}
      <Text
        x={labelX}
        y={labelY}
        text={measurementText}
        fontSize={14}
        fill="#FFFFFF"
        padding={6}
        opacity={opacity}
        listening={false}
      />
      
      {/* Actual measurement text */}
      <Text
        x={labelX}
        y={labelY}
        text={measurementText}
        fontSize={14}
        fill="#000000"
        fontStyle="bold"
        padding={6}
        opacity={opacity}
        listening={false}
      />
    </>
  );
}

