/**
 * Shape Service
 * Helper functions for creating and managing annotation shapes (polylines and polygons)
 */

import type { Shape } from '../types';

interface Point {
  x: number;
  y: number;
}

/**
 * Create a polyline shape from points
 */
export function createPolylineShape(
  points: Point[],
  color: string,
  userId: string,
  layerId: string
): Shape {
  const id = `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();
  
  // Convert points array to flat array for Konva Line
  const flatPoints: number[] = [];
  points.forEach(p => {
    flatPoints.push(p.x, p.y);
  });
  
  // Calculate bounding box
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  
  // Convert points to be relative to the shape's x, y position
  const relativePoints: number[] = [];
  points.forEach(p => {
    relativePoints.push(p.x - minX, p.y - minY);
  });
  
  return {
    id,
    type: 'polyline',
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
    color,
    points: relativePoints,
    strokeWidth: 2,
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
    clientUpdatedAt: now,
    layerId,
  };
}

/**
 * Create a polygon shape from points
 */
export function createPolygonShape(
  points: Point[],
  color: string,
  userId: string,
  layerId: string
): Shape {
  const id = `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();
  
  // Convert points array to flat array for Konva Line
  const flatPoints: number[] = [];
  points.forEach(p => {
    flatPoints.push(p.x, p.y);
  });
  
  // Calculate bounding box
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  
  // Convert points to be relative to the shape's x, y position
  const relativePoints: number[] = [];
  points.forEach(p => {
    relativePoints.push(p.x - minX, p.y - minY);
  });
  
  return {
    id,
    type: 'polygon',
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
    color,
    points: relativePoints,
    strokeWidth: 2,
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
    clientUpdatedAt: now,
    layerId,
  };
}

/**
 * Update polyline points (add a new point)
 */
export function updatePolylinePoints(
  shape: Shape,
  newPoint: Point,
  userId: string
): Shape {
  // Convert existing relative points to absolute
  const existingRelativePoints = shape.points || [];
  const absolutePoints: Point[] = [];
  for (let i = 0; i < existingRelativePoints.length; i += 2) {
    absolutePoints.push({
      x: shape.x + existingRelativePoints[i],
      y: shape.y + existingRelativePoints[i + 1],
    });
  }
  
  // Add new point (already in absolute coordinates)
  absolutePoints.push(newPoint);
  
  // Recalculate bounding box
  const xs = absolutePoints.map(p => p.x);
  const ys = absolutePoints.map(p => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  
  // Convert back to relative coordinates
  const relativePoints: number[] = [];
  absolutePoints.forEach(p => {
    relativePoints.push(p.x - minX, p.y - minY);
  });
  
  return {
    ...shape,
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
    points: relativePoints,
    updatedAt: Date.now(),
    updatedBy: userId,
    clientUpdatedAt: Date.now(),
  };
}

/**
 * Update polygon points (add a new vertex)
 */
export function updatePolygonPoints(
  shape: Shape,
  newPoint: Point,
  userId: string
): Shape {
  return updatePolylinePoints(shape, newPoint, userId);
}

/**
 * Convert flat points array to Point objects
 * Only processes complete pairs (x, y)
 */
export function flatPointsToPoints(flatPoints: number[]): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < flatPoints.length - 1; i += 2) {
    points.push({ x: flatPoints[i], y: flatPoints[i + 1] });
  }
  return points;
}

/**
 * Convert Point objects to flat points array
 */
export function pointsToFlatPoints(points: Point[]): number[] {
  const flatPoints: number[] = [];
  points.forEach(p => {
    flatPoints.push(p.x, p.y);
  });
  return flatPoints;
}

/**
 * Create a bounding box shape
 */
export function createBoundingBoxShape(
  x: number,
  y: number,
  width: number,
  height: number,
  itemType: string,
  color: string,
  userId: string,
  layerId: string,
  source: 'ai' | 'manual' = 'manual',
  confidence?: number,
  isAIGenerated?: boolean
): Shape {
  const id = `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = Date.now();
  
  return {
    id,
    type: 'boundingbox',
    x,
    y,
    w: width,
    h: height,
    color,
    itemType,
    source,
    confidence,
    isAIGenerated: isAIGenerated ?? (source === 'ai'),
    strokeWidth: 2,
    createdAt: now,
    createdBy: userId,
    updatedAt: now,
    updatedBy: userId,
    clientUpdatedAt: now,
    layerId,
  };
}

