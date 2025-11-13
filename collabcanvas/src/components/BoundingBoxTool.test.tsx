/**
 * Unit tests for Bounding Box Tool Component
 * Tests AC: #8, #9, #10, #11, #12, #13
 */

import { describe, it, expect } from 'vitest';
import { BoundingBoxTool } from './BoundingBoxTool';
import type { Layer } from '../types';

describe('BoundingBoxTool', () => {
  const mockLayers: Layer[] = [
    {
      id: 'layer-1',
      name: 'Layer 1',
      shapes: [],
      visible: true,
      locked: false,
      order: 0,
      color: '#3B82F6',
    },
  ];

  it('should return null when not active', () => {
    const result = BoundingBoxTool({
      isActive: false,
      startPoint: null,
      endPoint: null,
      layers: mockLayers,
      activeLayerId: 'layer-1',
    });
    expect(result).toBeNull();
  });

  it('should return null when start point is null', () => {
    const result = BoundingBoxTool({
      isActive: true,
      startPoint: null,
      endPoint: { x: 100, y: 100 },
      layers: mockLayers,
      activeLayerId: 'layer-1',
    });
    expect(result).toBeNull();
  });

  it('should return null when end point is null', () => {
    const result = BoundingBoxTool({
      isActive: true,
      startPoint: { x: 50, y: 50 },
      endPoint: null,
      layers: mockLayers,
      activeLayerId: 'layer-1',
    });
    expect(result).toBeNull();
  });

  it('should return Konva Layer component when active with valid points', () => {
    const result = BoundingBoxTool({
      isActive: true,
      startPoint: { x: 50, y: 50 },
      endPoint: { x: 150, y: 150 },
      layers: mockLayers,
      activeLayerId: 'layer-1',
    });
    expect(result).not.toBeNull();
    expect(result?.type).toBeDefined();
  });
});

