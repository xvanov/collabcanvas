/**
 * Alignment service
 * Handles shape alignment and distribution calculations
 */

import type { Shape } from '../types';

export interface AlignmentService {
  alignShapes: (shapes: Shape[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => Shape[];
  distributeShapes: (shapes: Shape[], direction: 'horizontal' | 'vertical') => Shape[];
  calculateAlignmentValue: (shapes: Shape[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => number;
  calculateDistributionSpacing: (shapes: Shape[], direction: 'horizontal' | 'vertical') => number;
}

export const alignmentService: AlignmentService = {
  alignShapes: (shapes: Shape[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): Shape[] => {
    if (shapes.length < 2) return shapes;

    const alignValue = alignmentService.calculateAlignmentValue(shapes, alignment);
    
    return shapes.map((shape) => {
      switch (alignment) {
        case 'left':
          return { ...shape, x: alignValue };
        case 'right':
          return { ...shape, x: alignValue - shape.w };
        case 'center':
          return { ...shape, x: alignValue - shape.w / 2 };
        case 'top':
          return { ...shape, y: alignValue };
        case 'bottom':
          return { ...shape, y: alignValue - shape.h };
        case 'middle':
          return { ...shape, y: alignValue - shape.h / 2 };
        default:
          return shape;
      }
    });
  },

  distributeShapes: (shapes: Shape[], direction: 'horizontal' | 'vertical'): Shape[] => {
    if (shapes.length < 3) return shapes;

    if (direction === 'horizontal') {
      // Sort by x position
      const sortedShapes = [...shapes].sort((a, b) => a.x - b.x);
      const totalWidth = sortedShapes[sortedShapes.length - 1].x - sortedShapes[0].x;
      const spacing = totalWidth / (sortedShapes.length - 1);
      
      return sortedShapes.map((shape, index) => {
        if (index > 0 && index < sortedShapes.length - 1) {
          return { ...shape, x: sortedShapes[0].x + spacing * index };
        }
        return shape;
      });
    } else {
      // Sort by y position
      const sortedShapes = [...shapes].sort((a, b) => a.y - b.y);
      const totalHeight = sortedShapes[sortedShapes.length - 1].y - sortedShapes[0].y;
      const spacing = totalHeight / (sortedShapes.length - 1);
      
      return sortedShapes.map((shape, index) => {
        if (index > 0 && index < sortedShapes.length - 1) {
          return { ...shape, y: sortedShapes[0].y + spacing * index };
        }
        return shape;
      });
    }
  },

  calculateAlignmentValue: (shapes: Shape[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): number => {
    switch (alignment) {
      case 'left':
        return Math.min(...shapes.map((s) => s.x));
      case 'right':
        return Math.max(...shapes.map((s) => s.x + s.w));
      case 'center': {
        const minX = Math.min(...shapes.map((s) => s.x));
        const maxX = Math.max(...shapes.map((s) => s.x + s.w));
        return (minX + maxX) / 2;
      }
      case 'top':
        return Math.min(...shapes.map((s) => s.y));
      case 'bottom':
        return Math.max(...shapes.map((s) => s.y + s.h));
      case 'middle': {
        const minY = Math.min(...shapes.map((s) => s.y));
        const maxY = Math.max(...shapes.map((s) => s.y + s.h));
        return (minY + maxY) / 2;
      }
      default:
        return 0;
    }
  },

  calculateDistributionSpacing: (shapes: Shape[], direction: 'horizontal' | 'vertical'): number => {
    if (shapes.length < 3) return 0;

    if (direction === 'horizontal') {
      const sortedShapes = [...shapes].sort((a, b) => a.x - b.x);
      const totalWidth = sortedShapes[sortedShapes.length - 1].x - sortedShapes[0].x;
      return totalWidth / (sortedShapes.length - 1);
    } else {
      const sortedShapes = [...shapes].sort((a, b) => a.y - b.y);
      const totalHeight = sortedShapes[sortedShapes.length - 1].y - sortedShapes[0].y;
      return totalHeight / (sortedShapes.length - 1);
    }
  },
};
