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

