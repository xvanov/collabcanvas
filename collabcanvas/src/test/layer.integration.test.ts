import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../store/canvasStore';

describe('Layer color inheritance & propagation - Integration (PR-3)', () => {
  beforeEach(() => {
    const initial = useCanvasStore.getState();
    useCanvasStore.setState({
      ...initial,
      layers: [],
      shapes: new Map(),
      activeLayerId: 'default-layer',
    });
  });

  it('new shapes adopt active layer color; changing layer color updates shapes', () => {
    const s = useCanvasStore.getState();
    s.createLayer('A');
    const la = useCanvasStore.getState().layers[0];
    useCanvasStore.getState().setActiveLayer(la.id);

    // Create two shapes bound to Layer A
    const now = Date.now();
    const shapes = new Map(useCanvasStore.getState().shapes);
    shapes.set('sa', {
      id: 'sa', type: 'rect', x: 0, y: 0, w: 10, h: 10,
      color: '#3B82F6', createdAt: now, createdBy: 'u', updatedAt: now, updatedBy: 'u', clientUpdatedAt: now,
      layerId: la.id,
    });
    shapes.set('sb', {
      id: 'sb', type: 'rect', x: 0, y: 0, w: 10, h: 10,
      color: '#3B82F6', createdAt: now, createdBy: 'u', updatedAt: now, updatedBy: 'u', clientUpdatedAt: now,
      layerId: la.id,
    });
    useCanvasStore.setState({ shapes });

    // Expect adoption of layer color (PR-3 behavior)
    const laColor = useCanvasStore.getState().layers[0].color;
    expect(useCanvasStore.getState().shapes.get('sa')!.color).toBe(laColor);
    expect(useCanvasStore.getState().shapes.get('sb')!.color).toBe(laColor);

    // Change layer color
    useCanvasStore.getState().updateLayer(la.id, { color: '#00AA00' });
    expect(useCanvasStore.getState().shapes.get('sa')!.color).toBe('#00AA00');
    expect(useCanvasStore.getState().shapes.get('sb')!.color).toBe('#00AA00');
  });
});


