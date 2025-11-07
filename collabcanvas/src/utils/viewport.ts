/**
 * Viewport and canvas utilities for pan/zoom transformations and boundary checking
 */

import Konva from 'konva';

/**
 * Clamps a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Clamps zoom scale to reasonable bounds
 * @param scale - The zoom scale to clamp
 * @param minScale - Minimum allowed scale (default: 0.1)
 * @param maxScale - Maximum allowed scale (default: 5)
 * @returns Clamped scale value
 */
export function clampZoom(scale: number, minScale = 0.1, maxScale = 5): number {
  return clamp(scale, minScale, maxScale);
}

/**
 * Checks if a point is within the viewport bounds
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param viewportWidth - Width of viewport
 * @param viewportHeight - Height of viewport
 * @returns True if point is within bounds
 */
export function isWithinBounds(
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number
): boolean {
  return x >= 0 && x <= viewportWidth && y >= 0 && y <= viewportHeight;
}

/**
 * Constrains a shape's position to stay within viewport bounds
 * @param x - X coordinate of shape
 * @param y - Y coordinate of shape
 * @param shapeWidth - Width of shape
 * @param shapeHeight - Height of shape
 * @param viewportWidth - Width of viewport
 * @param viewportHeight - Height of viewport
 * @returns Constrained position {x, y}
 */
export function constrainToBounds(
  x: number,
  y: number,
  shapeWidth: number,
  shapeHeight: number,
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number } {
  const constrainedX = clamp(x, 0, viewportWidth - shapeWidth);
  const constrainedY = clamp(y, 0, viewportHeight - shapeHeight);
  
  return { x: constrainedX, y: constrainedY };
}

/**
 * Calculates new zoom scale based on mouse wheel delta
 * @param currentScale - Current zoom scale
 * @param delta - Mouse wheel delta (positive = zoom out, negative = zoom in)
 * @returns New zoom scale
 */
export function calculateZoomScale(
  currentScale: number,
  delta: number
): number {
  const scaleBy = 1.05; // Zoom factor per unit (matches Canvas component)
  const newScale = delta > 0 ? currentScale / scaleBy : currentScale * scaleBy;
  return clampZoom(newScale);
}

/**
 * Calculates the pointer position relative to the stage
 * @param stage - Konva stage instance
 * @returns Pointer position {x, y} or null if not available
 */
export function getRelativePointerPosition(stage: Konva.Stage): { x: number; y: number } | null {
  const pointer = stage.getPointerPosition();
  if (!pointer) return null;
  
  const transform = stage.getAbsoluteTransform().copy();
  transform.invert();
  
  return transform.point(pointer);
}

/**
 * Viewport bounds in world coordinates (after pan/zoom transform)
 */
export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Calculates viewport bounds in world coordinates
 * @param viewportWidth - Width of viewport in pixels
 * @param viewportHeight - Height of viewport in pixels
 * @param offsetX - X offset (pan) in pixels
 * @param offsetY - Y offset (pan) in pixels
 * @param scale - Zoom scale
 * @returns Viewport bounds in world coordinates
 */
export function calculateViewportBounds(
  viewportWidth: number,
  viewportHeight: number,
  offsetX: number,
  offsetY: number,
  scale: number
): ViewportBounds {
  // Convert viewport pixel coordinates to world coordinates
  const minX = -offsetX / scale;
  const minY = -offsetY / scale;
  const maxX = minX + viewportWidth / scale;
  const maxY = minY + viewportHeight / scale;
  
  return { minX, minY, maxX, maxY };
}

/**
 * Checks if a shape is visible in the viewport
 * Uses bounding box intersection test
 * @param shapeX - Shape X position
 * @param shapeY - Shape Y position
 * @param shapeWidth - Shape width
 * @param shapeHeight - Shape height
 * @param viewportBounds - Viewport bounds in world coordinates
 * @param padding - Extra padding around viewport to include shapes near edge (default: 100)
 * @returns True if shape is visible or near viewport
 */
export function isShapeVisible(
  shapeX: number,
  shapeY: number,
  shapeWidth: number,
  shapeHeight: number,
  viewportBounds: ViewportBounds,
  padding = 100
): boolean {
  // Expand viewport bounds by padding to include shapes near edge
  const expandedMinX = viewportBounds.minX - padding;
  const expandedMinY = viewportBounds.minY - padding;
  const expandedMaxX = viewportBounds.maxX + padding;
  const expandedMaxY = viewportBounds.maxY + padding;
  
  // Calculate shape bounds
  const shapeMinX = shapeX;
  const shapeMinY = shapeY;
  const shapeMaxX = shapeX + shapeWidth;
  const shapeMaxY = shapeY + shapeHeight;
  
  // Check for intersection (AABB collision detection)
  return !(
    shapeMaxX < expandedMinX ||
    shapeMinX > expandedMaxX ||
    shapeMaxY < expandedMinY ||
    shapeMinY > expandedMaxY
  );
}

/**
 * Filters shapes to only those visible in the viewport
 * @param shapes - Array of shapes to filter
 * @param viewportBounds - Viewport bounds in world coordinates
 * @param padding - Extra padding around viewport (default: 100)
 * @returns Filtered array of visible shapes
 */
export function filterVisibleShapes<T extends { x: number; y: number; w: number; h: number }>(
  shapes: T[],
  viewportBounds: ViewportBounds,
  padding = 100
): T[] {
  return shapes.filter(shape => 
    isShapeVisible(shape.x, shape.y, shape.w, shape.h, viewportBounds, padding)
  );
}

