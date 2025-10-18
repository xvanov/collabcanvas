/**
 * Grid and snap service
 * Handles grid calculations and snap-to-grid functionality
 */

import type { SnapIndicator } from '../types';

export interface GridService {
  snapToGrid: (x: number, y: number, gridSize: number) => { x: number; y: number };
  calculateGridLines: (viewport: { width: number; height: number; offsetX: number; offsetY: number; scale: number }, gridSize: number) => {
    verticalLines: Array<{ x: number; y1: number; y2: number }>;
    horizontalLines: Array<{ y: number; x1: number; x2: number }>;
  };
  findSnapPoints: (x: number, y: number, gridSize: number, snapThreshold: number) => SnapIndicator[];
  isNearGridLine: (value: number, gridSize: number, threshold: number) => boolean;
}

export const gridService: GridService = {
  snapToGrid: (x: number, y: number, gridSize: number): { x: number; y: number } => {
    return {
      x: Math.round(x / gridSize) * gridSize || 0,
      y: Math.round(y / gridSize) * gridSize || 0,
    };
  },

  calculateGridLines: (viewport: { width: number; height: number; offsetX: number; offsetY: number; scale: number }, gridSize: number) => {
    const scaledGridSize = gridSize * viewport.scale;
    
    // Calculate visible grid range
    const startX = Math.floor(viewport.offsetX / scaledGridSize) * scaledGridSize;
    const endX = Math.min(startX + viewport.width + scaledGridSize, viewport.width);
    const startY = Math.floor(viewport.offsetY / scaledGridSize) * scaledGridSize;
    const endY = Math.min(startY + viewport.height + scaledGridSize, viewport.height);

    const verticalLines: Array<{ x: number; y1: number; y2: number }> = [];
    const horizontalLines: Array<{ y: number; x1: number; x2: number }> = [];

    // Generate vertical lines
    for (let x = startX; x <= endX; x += scaledGridSize) {
      const lineX = x - viewport.offsetX;
      if (lineX >= 0 && lineX <= viewport.width) {
        verticalLines.push({
          x: lineX,
          y1: 0,
          y2: viewport.height,
        });
      }
    }

    // Generate horizontal lines
    for (let y = startY; y <= endY; y += scaledGridSize) {
      const lineY = y - viewport.offsetY;
      if (lineY >= 0 && lineY <= viewport.height) {
        horizontalLines.push({
          y: lineY,
          x1: 0,
          x2: viewport.width,
        });
      }
    }

    return { verticalLines, horizontalLines };
  },

  findSnapPoints: (x: number, y: number, gridSize: number, snapThreshold: number): SnapIndicator[] => {
    const indicators: SnapIndicator[] = [];
    
    const isNearX = gridService.isNearGridLine(x, gridSize, snapThreshold);
    const isNearY = gridService.isNearGridLine(y, gridSize, snapThreshold);
    
    // Check corner snap first (both x and y snap)
    if (isNearX && isNearY) {
      const snappedX = Math.round(x / gridSize) * gridSize || 0;
      const snappedY = Math.round(y / gridSize) * gridSize || 0;
      indicators.push({
        type: 'corner',
        x: snappedX,
        y: snappedY,
        length: 10,
        visible: true,
      });
    } else {
      // Check horizontal snap (vertical line indicator)
      if (isNearX) {
        const snappedX = Math.round(x / gridSize) * gridSize || 0;
        indicators.push({
          type: 'vertical',
          x: snappedX,
          y: y,
          length: 20,
          visible: true,
        });
      }

      // Check vertical snap (horizontal line indicator)
      if (isNearY) {
        const snappedY = Math.round(y / gridSize) * gridSize || 0;
        indicators.push({
          type: 'horizontal',
          x: x,
          y: snappedY,
          length: 20,
          visible: true,
        });
      }
    }

    return indicators;
  },

  isNearGridLine: (value: number, gridSize: number, threshold: number): boolean => {
    const gridPosition = Math.round(value / gridSize) * gridSize;
    return Math.abs(value - gridPosition) <= threshold;
  },
};
