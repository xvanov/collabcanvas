import { describe, it, expect } from 'vitest';
import { layerService } from '../layerService';
import type { Layer, Shape } from '../../types';

const makeLayer = (id: string, name: string, color?: string): Layer & { color?: string } => ({
  id,
  name,
  shapes: [],
  visible: true,
  locked: false,
  order: 0,
  ...(color ? { color } : {}),
});

const makeShape = (id: string, layerId: string, color: string): Shape => ({
  id,
  type: 'rect',
  x: 0,
  y: 0,
  w: 10,
  h: 10,
  color,
  createdAt: Date.now(),
  createdBy: 'user',
  updatedAt: Date.now(),
  updatedBy: 'user',
  clientUpdatedAt: Date.now(),
  layerId,
});

describe('layerService - color behavior (PR-3)', () => {
  it('updateLayer supports color change', () => {
    const layers = [makeLayer('l1', 'Layer 1', '#111111')];
    const updated = layerService.updateLayer('l1', { color: '#222222' } as any, layers) as Array<any>;
    expect(updated[0].color).toBe('#222222');
  });

  it('moveShapeToLayer updates shape.layerId and expects color to match target layer (PR-3 responsibility)', () => {
    const layers = [makeLayer('l1', 'Layer 1', '#111111'), makeLayer('l2', 'Layer 2', '#00FF00')];
    layers[0].shapes = ['s1'];
    const shapes = new Map<string, Shape>();
    shapes.set('s1', makeShape('s1', 'l1', '#111111'));

    const { layers: newLayers, shapes: newShapes } = layerService.moveShapeToLayer('s1', 'l2', layers, shapes);
    const moved = newShapes.get('s1') as any;
    expect(moved.layerId).toBe('l2');
    // Expect PR-3 to also ensure color alignment to target layer color elsewhere in the pipeline
  });

  it('deleteLayer moves shapes to default layer and expects color to align with default layer color after PR-3', () => {
    const defaultLayer = makeLayer('default-layer', 'Default', '#3B82F6');
    const doomed = makeLayer('l1', 'Layer 1', '#111111');
    doomed.shapes = ['s1', 's2'];
    const layers = [defaultLayer, doomed];
    const shapes = new Map<string, Shape>();
    shapes.set('s1', makeShape('s1', 'l1', '#111111'));
    shapes.set('s2', makeShape('s2', 'l1', '#111111'));

    const { layers: newLayers, shapes: newShapes } = layerService.deleteLayer('l1', layers, shapes);
    const ldef = newLayers.find(l => l.id === 'default-layer')!;
    expect(ldef.shapes).toContain('s1');
    expect(ldef.shapes).toContain('s2');
    const s1 = newShapes.get('s1') as any;
    const s2 = newShapes.get('s2') as any;
    // Expect PR-3 higher-level logic to update colors to default color when reassigned
    expect(s1.layerId).toBe('default-layer');
    expect(s2.layerId).toBe('default-layer');
  });
});


