/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { LayersPanel } from './LayersPanel';
import { useCanvasStore } from '../store/canvasStore';
import { useLayers } from '../hooks/useLayers';

// Mock the hooks
vi.mock('../store/canvasStore');
vi.mock('../hooks/useLayers', () => ({
  useLayers: vi.fn(() => ({
    createLayer: vi.fn(),
    deleteLayer: vi.fn(),
    updateLayer: vi.fn(),
    reorderLayers: vi.fn(),
    moveShapeToLayer: vi.fn(),
    toggleLayerVisibility: vi.fn(),
    toggleLayerLock: vi.fn(),
    setActiveLayer: vi.fn(),
    layers: [] // Always return empty layers array
  }))
}));

const mockUseCanvasStore = vi.mocked(useCanvasStore);
const mockUseLayers = vi.mocked(useLayers);

describe('LayersPanel - Shape Assignment Bug', () => {
  const mockCreateLayer = vi.fn();
  const mockDeleteLayer = vi.fn();
  const mockSetActiveLayer = vi.fn();
  const mockReorderLayers = vi.fn();
  const mockToggleLayerVisibility = vi.fn();
  const mockToggleLayerLock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock setup
    mockUseLayers.mockReturnValue({
      createLayer: mockCreateLayer,
      deleteLayer: mockDeleteLayer,
      updateLayer: vi.fn(),
      reorderLayers: vi.fn(),
      moveShapeToLayer: vi.fn(),
      toggleLayerVisibility: vi.fn(),
      toggleLayerLock: vi.fn(),
      setActiveLayer: vi.fn(),
      layers: [], // Always return empty layers array
    });

    mockUseCanvasStore.mockReturnValue({
      layers: [
        { id: 'default-layer', name: 'Default Layer', shapes: [], visible: true, locked: false, order: 0 }
      ],
      activeLayerId: 'default-layer',
      setActiveLayer: mockSetActiveLayer,
      shapes: new Map([
        ['shape-1', { id: 'shape-1', type: 'rect', x: 0, y: 0, w: 100, h: 100, layerId: 'default-layer' }],
        ['shape-2', { id: 'shape-2', type: 'circle', x: 50, y: 50, radius: 25, layerId: 'default-layer' }]
      ]),
      selectedShapeIds: [],
      reorderLayers: mockReorderLayers,
      toggleLayerVisibility: mockToggleLayerVisibility,
      toggleLayerLock: mockToggleLayerLock,
    });
  });

  it('should display correct shape count for each layer', () => {
    render(<LayersPanel isVisible={true} onClose={vi.fn()} />);
    
    // Should show Default Layer with 2 shapes - check that it exists and has correct count
    expect(screen.getByText('Default Layer')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('should show correct shape count after creating new layer and shape', async () => {
    // Start with default layer active
    mockUseCanvasStore.mockReturnValue({
      layers: [
        { id: 'default-layer', name: 'Default Layer', shapes: [], visible: true, locked: false, order: 0 }
      ],
      activeLayerId: 'default-layer',
      setActiveLayer: mockSetActiveLayer,
      shapes: new Map([
        ['shape-1', { id: 'shape-1', type: 'rect', x: 0, y: 0, w: 100, h: 100, layerId: 'default-layer' }],
        ['shape-2', { id: 'shape-2', type: 'circle', x: 50, y: 50, radius: 25, layerId: 'default-layer' }]
      ]),
      selectedShapeIds: [],
      reorderLayers: mockReorderLayers,
      toggleLayerVisibility: mockToggleLayerVisibility,
      toggleLayerLock: mockToggleLayerLock,
    });

    const { rerender } = render(<LayersPanel isVisible={true} onClose={vi.fn()} />);
    
    // Initially should show Default Layer with 2 shapes
    expect(screen.getByText('Default Layer')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();

    // Simulate creating a new layer
    const newLayerId = 'layer-123-new';
    mockCreateLayer.mockImplementation(() => {
      // Simulate the layer creation process
      mockUseCanvasStore.mockReturnValue({
        layers: [
          { id: 'default-layer', name: 'Default Layer', shapes: [], visible: true, locked: false, order: 0 },
          { id: newLayerId, name: 'New Layer', shapes: [], visible: true, locked: false, order: 1 }
        ],
        activeLayerId: newLayerId, // New layer becomes active
        setActiveLayer: mockSetActiveLayer,
        shapes: new Map([
          ['shape-1', { id: 'shape-1', type: 'rect', x: 0, y: 0, w: 100, h: 100, layerId: 'default-layer' }],
          ['shape-2', { id: 'shape-2', type: 'circle', x: 50, y: 50, radius: 25, layerId: 'default-layer' }]
        ]),
        selectedShapeIds: [],
        reorderLayers: mockReorderLayers,
        toggleLayerVisibility: mockToggleLayerVisibility,
        toggleLayerLock: mockToggleLayerLock,
      });
    });

    // Create the new layer
    mockCreateLayer('New Layer');
    rerender(<LayersPanel isVisible={true} onClose={vi.fn()} />);

    // Should now show both layers
    expect(screen.getByText('Default Layer')).toBeInTheDocument();
    expect(screen.getByText('New Layer')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument(); // Default layer count
    expect(screen.getByText('(0)')).toBeInTheDocument(); // New layer count

    // Now simulate creating a shape while the new layer is active
    mockUseCanvasStore.mockReturnValue({
      layers: [
        { id: 'default-layer', name: 'Default Layer', shapes: [], visible: true, locked: false, order: 0 },
        { id: newLayerId, name: 'New Layer', shapes: [], visible: true, locked: false, order: 1 }
      ],
      activeLayerId: newLayerId, // New layer is still active
      setActiveLayer: mockSetActiveLayer,
      shapes: new Map([
        ['shape-1', { id: 'shape-1', type: 'rect', x: 0, y: 0, w: 100, h: 100, layerId: 'default-layer' }],
        ['shape-2', { id: 'shape-2', type: 'circle', x: 50, y: 50, radius: 25, layerId: 'default-layer' }],
        ['shape-3', { id: 'shape-3', type: 'rect', x: 100, y: 100, w: 50, h: 50, layerId: newLayerId }] // New shape in new layer
      ]),
      selectedShapeIds: [],
      reorderLayers: mockReorderLayers,
      toggleLayerVisibility: mockToggleLayerVisibility,
      toggleLayerLock: mockToggleLayerLock,
    });

    rerender(<LayersPanel isVisible={true} onClose={vi.fn()} />);

    // This is the critical test - the new shape should appear in the new layer
    await waitFor(() => {
      expect(screen.getByText('Default Layer')).toBeInTheDocument();
      expect(screen.getByText('New Layer')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument(); // Default layer count
      expect(screen.getByText('(1)')).toBeInTheDocument(); // New layer count - should show 1 shape, not 0
    });
  });

  it('should handle the bug where shapes appear in wrong layer', async () => {
    // This test reproduces the exact bug scenario
    const newLayerId = 'layer-123-new';
    
    // Simulate the bug: shape is assigned to new layer in store but appears in default layer
    mockUseCanvasStore.mockReturnValue({
      layers: [
        { id: 'default-layer', name: 'Default Layer', shapes: [], visible: true, locked: false, order: 0 },
        { id: newLayerId, name: 'New Layer', shapes: [], visible: true, locked: false, order: 1 }
      ],
      activeLayerId: newLayerId, // New layer is active
      setActiveLayer: mockSetActiveLayer,
      shapes: new Map([
        ['shape-1', { id: 'shape-1', type: 'rect', x: 0, y: 0, w: 100, h: 100, layerId: 'default-layer' }],
        ['shape-2', { id: 'shape-2', type: 'circle', x: 50, y: 50, radius: 25, layerId: 'default-layer' }],
        ['shape-3', { id: 'shape-3', type: 'rect', x: 100, y: 100, w: 50, h: 50, layerId: newLayerId }] // Correctly assigned to new layer
      ]),
      selectedShapeIds: [],
      reorderLayers: mockReorderLayers,
      toggleLayerVisibility: mockToggleLayerVisibility,
      toggleLayerLock: mockToggleLayerLock,
    });

    render(<LayersPanel isVisible={true} onClose={vi.fn()} />);

    // This test should PASS - the shape should appear in the correct layer
    await waitFor(() => {
      expect(screen.getByText('Default Layer')).toBeInTheDocument();
      expect(screen.getByText('New Layer')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument(); // Default layer count
      expect(screen.getByText('(1)')).toBeInTheDocument(); // New layer count
    });
  });
});
