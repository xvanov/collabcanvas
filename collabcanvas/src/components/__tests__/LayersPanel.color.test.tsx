import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LayersPanel } from '../../components/LayersPanel';
import { useCanvasStore } from '../../store/canvasStore';

describe('LayersPanel - Color control (PR-3)', () => {
  beforeEach(() => {
    const initial = useCanvasStore.getState();
    useCanvasStore.setState({
      ...initial,
      layers: [],
      shapes: new Map(),
      activeLayerId: 'default-layer',
    });
  });

  it('renders and allows changing a layer color via color button/picker', async () => {
    // Seed one layer
    useCanvasStore.getState().createLayer('Layer A');

    render(<LayersPanel isVisible={true} onClose={() => {}} />);

    // Expect the Layers panel title
    expect(await screen.findByText('Layers')).toBeTruthy();

    // There should be a color control (text "Color") we will click
    const colorButtons = await screen.findAllByTitle('Change color');
    expect(colorButtons.length).toBeGreaterThan(0);

    // Click first color control to open picker and choose a preset
    fireEvent.click(colorButtons[0]);

    // In PR-3 implementation, the ColorPicker will render preset swatches; select one by title
    // Using a known preset from ColorPicker: '#EF4444' (Red)
    const preset = await screen.findByTitle('#EF4444');
    fireEvent.click(preset);

    // Verify store updated
    const layer = useCanvasStore.getState().layers[0] as any;
    expect(layer['color']).toBe('#EF4444');
  });
});


