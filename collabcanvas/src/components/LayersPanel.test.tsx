/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { LayersPanel } from './LayersPanel';
import { useScopedCanvasStore } from '../store/projectCanvasStore';
import { useLayers } from '../hooks/useLayers';
import { releaseProjectCanvasStore } from '../store/projectCanvasStore';
import { useCanvasStore } from '../store/canvasStore';

// Mock the hooks
vi.mock('../store/projectCanvasStore', async () => {
  const actual = await vi.importActual('../store/projectCanvasStore');
  return {
    ...actual,
    useScopedCanvasStore: vi.fn(),
  };
});

vi.mock('../store/canvasStore', () => ({
  useCanvasStore: vi.fn(),
}));

vi.mock('../hooks/useLayers', () => ({
  useLayers: vi.fn(() => ({
    createLayer: vi.fn(),
    deleteLayer: vi.fn(),
    updateLayer: vi.fn(),
  }))
}));

const mockUseScopedCanvasStore = vi.mocked(useScopedCanvasStore);
const mockUseLayers = vi.mocked(useLayers);
const mockUseCanvasStore = vi.mocked(useCanvasStore);

describe('LayersPanel - Shape Assignment Bug', () => {
  const projectId = 'test-project-1';
  const mockCreateLayer = vi.fn();
  const mockDeleteLayer = vi.fn();
  const mockSetActiveLayer = vi.fn();
  const mockReorderLayers = vi.fn();
  const mockToggleLayerVisibility = vi.fn();
  const mockToggleLayerLock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    releaseProjectCanvasStore(projectId);
    
    // Default mock setup
    mockUseLayers.mockReturnValue({
      createLayer: mockCreateLayer,
      deleteLayer: mockDeleteLayer,
      updateLayer: vi.fn(),
    });

    const mockState = {
      layers: [
        { id: 'default-layer', name: 'Default Layer', shapes: [], visible: true, locked: false, order: 0, color: '#3B82F6' }
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
      canvasScale: {
        scaleLine: null,
        backgroundImage: null,
        isScaleMode: false,
        isImageUploadMode: false,
      },
    };

    // Mock useScopedCanvasStore to return values from mockState
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseScopedCanvasStore.mockImplementation((_projectId: string | undefined, selector: (state: any) => any) => {
      return selector(mockState);
    });

    // Mock useCanvasStore for selectedShapeIds
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseCanvasStore.mockImplementation((selector: (state: any) => any) => {
      return selector({ selectedShapeIds: [] });
    });
  });

  it('should display correct shape count for each layer', () => {
    render(<LayersPanel isVisible={true} onClose={vi.fn()} projectId={projectId} />);
    
    // Should show Default Layer with 2 shapes - check that it exists and has correct count
    expect(screen.getByText('Default Layer')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('should show correct shape count after creating new layer and shape', async () => {
    // Start with default layer active
    const mockState1 = {
      layers: [
        { id: 'default-layer', name: 'Default Layer', shapes: [], visible: true, locked: false, order: 0, color: '#3B82F6' }
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
      canvasScale: {
        scaleLine: null,
        backgroundImage: null,
        isScaleMode: false,
        isImageUploadMode: false,
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseScopedCanvasStore.mockImplementation((_projectId: string | undefined, selector: (state: any) => any) => {
      return selector(mockState1);
    });

    const { rerender } = render(<LayersPanel isVisible={true} onClose={vi.fn()} projectId={projectId} />);
    
    // Initially should show Default Layer with 2 shapes
    expect(screen.getByText('Default Layer')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();

    // Simulate creating a new layer
    const newLayerId = 'layer-123-new';
    const mockState2 = {
      layers: [
        { id: 'default-layer', name: 'Default Layer', shapes: [], visible: true, locked: false, order: 0, color: '#3B82F6' },
        { id: newLayerId, name: 'New Layer', shapes: [], visible: true, locked: false, order: 1, color: '#3B82F6' }
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
      canvasScale: {
        scaleLine: null,
        backgroundImage: null,
        isScaleMode: false,
        isImageUploadMode: false,
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseScopedCanvasStore.mockImplementation((_projectId: string | undefined, selector: (state: any) => any) => {
      return selector(mockState2);
    });

    // Create the new layer
    mockCreateLayer('New Layer');
    rerender(<LayersPanel isVisible={true} onClose={vi.fn()} projectId={projectId} />);

    // Should now show both layers
    expect(screen.getByText('Default Layer')).toBeInTheDocument();
    expect(screen.getByText('New Layer')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument(); // Default layer count
    expect(screen.getByText('(0)')).toBeInTheDocument(); // New layer count

    // Now simulate creating a shape while the new layer is active
    const mockState3 = {
      layers: [
        { id: 'default-layer', name: 'Default Layer', shapes: [], visible: true, locked: false, order: 0, color: '#3B82F6' },
        { id: newLayerId, name: 'New Layer', shapes: [], visible: true, locked: false, order: 1, color: '#3B82F6' }
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
      canvasScale: {
        scaleLine: null,
        backgroundImage: null,
        isScaleMode: false,
        isImageUploadMode: false,
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseScopedCanvasStore.mockImplementation((_projectId: string | undefined, selector: (state: any) => any) => {
      return selector(mockState3);
    });

    rerender(<LayersPanel isVisible={true} onClose={vi.fn()} projectId={projectId} />);

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
    const mockState = {
      layers: [
        { id: 'default-layer', name: 'Default Layer', shapes: [], visible: true, locked: false, order: 0, color: '#3B82F6' },
        { id: newLayerId, name: 'New Layer', shapes: [], visible: true, locked: false, order: 1, color: '#3B82F6' }
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
      canvasScale: {
        scaleLine: null,
        backgroundImage: null,
        isScaleMode: false,
        isImageUploadMode: false,
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseScopedCanvasStore.mockImplementation((_projectId: string | undefined, selector: (state: any) => any) => {
      return selector(mockState);
    });

    render(<LayersPanel isVisible={true} onClose={vi.fn()} projectId={projectId} />);

    // This test should PASS - the shape should appear in the correct layer
    await waitFor(() => {
      expect(screen.getByText('Default Layer')).toBeInTheDocument();
      expect(screen.getByText('New Layer')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument(); // Default layer count
      expect(screen.getByText('(1)')).toBeInTheDocument(); // New layer count
    });
  });
});
