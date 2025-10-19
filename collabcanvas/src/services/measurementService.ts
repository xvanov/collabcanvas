/**
 * Measurement Service
 * Provides accurate distance and area calculations for construction annotations
 */

import type { UnitType, CanvasScale } from '../types';

interface Point {
  x: number;
  y: number;
}

/**
 * Calculate Euclidean distance between two points
 */
export function calculateDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate total length of a polyline (sum of all segment lengths)
 */
export function calculatePolylineLength(points: Point[]): number {
  if (points.length < 2) return 0;
  
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalLength += calculateDistance(points[i], points[i + 1]);
  }
  
  return totalLength;
}

/**
 * Calculate area of a polygon using the Shoelace formula
 * Returns absolute value (always positive)
 */
export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0;
  
  let area = 0;
  const n = points.length;
  
  // Shoelace formula
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  
  return Math.abs(area / 2);
}

/**
 * Convert pixel measurement to real-world units using scale
 */
export function convertToRealWorld(
  pixelValue: number,
  canvasScale: CanvasScale
): number | null {
  const scaleLine = canvasScale.scaleLine;
  
  if (!scaleLine || scaleLine.realWorldLength === 0) {
    return null;
  }
  
  // Calculate pixel length of scale line
  const scalePixelLength = calculateDistance(
    { x: scaleLine.startX, y: scaleLine.startY },
    { x: scaleLine.endX, y: scaleLine.endY }
  );
  
  if (scalePixelLength === 0) {
    return null;
  }
  
  // Scale ratio: real-world units per pixel
  const ratio = scaleLine.realWorldLength / scalePixelLength;
  
  return pixelValue * ratio;
}

/**
 * Convert pixel area to real-world area (square units)
 */
export function convertAreaToRealWorld(
  pixelArea: number,
  canvasScale: CanvasScale
): number | null {
  const scaleLine = canvasScale.scaleLine;
  
  if (!scaleLine || scaleLine.realWorldLength === 0) {
    return null;
  }
  
  // Calculate pixel length of scale line
  const scalePixelLength = calculateDistance(
    { x: scaleLine.startX, y: scaleLine.startY },
    { x: scaleLine.endX, y: scaleLine.endY }
  );
  
  if (scalePixelLength === 0) {
    return null;
  }
  
  // Scale ratio: real-world units per pixel
  const ratio = scaleLine.realWorldLength / scalePixelLength;
  
  // Area scales with ratio squared
  return pixelArea * ratio * ratio;
}

/**
 * Format measurement with unit and proper precision
 */
export function formatMeasurement(
  value: number,
  unit: UnitType,
  isArea: boolean = false
): string {
  // Format to 2 decimal places
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  // Get unit abbreviation
  let unitStr = '';
  switch (unit) {
    case 'feet':
      unitStr = isArea ? 'sq ft' : 'ft';
      break;
    case 'inches':
      unitStr = isArea ? 'sq in' : 'in';
      break;
    case 'meters':
      unitStr = isArea ? 'sq m' : 'm';
      break;
    case 'centimeters':
      unitStr = isArea ? 'sq cm' : 'cm';
      break;
    case 'millimeters':
      unitStr = isArea ? 'sq mm' : 'mm';
      break;
    case 'yards':
      unitStr = isArea ? 'sq yd' : 'yd';
      break;
  }
  
  return `${formatted} ${unitStr}`;
}

/**
 * Get unit abbreviation for display
 */
export function getUnitAbbreviation(unit: UnitType, isArea: boolean = false): string {
  switch (unit) {
    case 'feet':
      return isArea ? 'sq ft' : 'ft';
    case 'inches':
      return isArea ? 'sq in' : 'in';
    case 'meters':
      return isArea ? 'sq m' : 'm';
    case 'centimeters':
      return isArea ? 'sq cm' : 'cm';
    case 'millimeters':
      return isArea ? 'sq mm' : 'mm';
    case 'yards':
      return isArea ? 'sq yd' : 'yd';
  }
}

