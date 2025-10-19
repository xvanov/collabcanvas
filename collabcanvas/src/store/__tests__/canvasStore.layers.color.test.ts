import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../../store/canvasStore';

// Note: We intentionally access dynamic fields via bracket-notation to avoid TS compile errors
// for fields that will be introduced by PR-3 (e.g., layer.color).

const DEFAULT_LAYER_COLOR = '#3B82F6';

describe('CanvasStore - Layer Colors (PR-3)', () => {
  beforeEach(() => {
    // reset store to initial state before each test
    const initial = useCanvasStore.getState();
    useCanvasStore.setState({
      ...initial,
      layers: [],
      shapes: new Map(),
      activeLayerId: 'default-layer',
    });
  });

  it('creates a layer with a default color', () => {
    const { createLayer, layers } = useCanvasStore.getState();
    createLayer('Layer A');
    const created = useCanvasStore.getState().layers[0] as any;
    expect(created).toBeDefined();
    // Expect PR-3 to add a color property to layers and default it
    expect(created['color']).toBe(DEFAULT_LAYER_COLOR);
  });

  it('newly created shapes adopt active layer color by default', () => {
    const s = useCanvasStore.getState();
    s.createLayer('Layer A');
    const layerA = (useCanvasStore.getState().layers[0] as any);
    useCanvasStore.getState().setActiveLayer(layerA.id);

    // Simulate creating a shape through store (mimic Board behavior)
    const shapeId = 'shape-1';
    const now = Date.now();
    const newShape: any = {
      id: shapeId,
      type: 'rect',
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      color: '#000000', // will be overwritten by PR-3 logic
      createdAt: now,
      createdBy: 'user',
      updatedAt: now,
      updatedBy: 'user',
      clientUpdatedAt: now,
      layerId: layerA.id,
    };

    const before = useCanvasStore.getState().shapes;
    const updated = new Map(before);
    updated.set(shapeId, newShape);
    useCanvasStore.setState({ shapes: updated });

    // Expect PR-3 to automatically set shape color to layer color on create
    const saved = useCanvasStore.getState().shapes.get(shapeId) as any;
    expect(saved['color']).toBe(layerA['color']);
  });

  it('changing a layer color propagates to all shapes in that layer', () => {
    const s = useCanvasStore.getState();
    s.createLayer('Layer A');
    const layerA = (useCanvasStore.getState().layers[0] as any);

    // Seed shapes in Layer A with arbitrary colors that should be overwritten
    const seedShapes = new Map<string, any>();
    for (let i = 0; i < 3; i++) {
      seedShapes.set(`shape-${i}`, {
        id: `shape-${i}`,
        type: 'rect',
        x: 0,
        y: 0,
        w: 10,
        h: 10,
        color: i === 0 ? '#123456' : '#abcdef',
        createdAt: Date.now(),
        createdBy: 'user',
        updatedAt: Date.now(),
        updatedBy: 'user',
        clientUpdatedAt: Date.now(),
        layerId: layerA.id,
      });
    }
    useCanvasStore.setState({ shapes: seedShapes });

    // Expect PR-3 to provide a layer color update method or allow updateLayer to accept color
    useCanvasStore.getState().updateLayer(layerA.id, { color: '#FF0000' } as any);

    // After change, every shape in Layer A should now have the new layer color
    for (let i = 0; i < 3; i++) {
      const sh = useCanvasStore.getState().shapes.get(`shape-${i}`) as any;
      expect(sh['color']).toBe('#FF0000');
    }
  });
});


