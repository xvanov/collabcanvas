import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { LayersPanel } from '../../components/LayersPanel';
import { getProjectCanvasStoreApi, releaseProjectCanvasStore } from '../../store/projectCanvasStore';

describe('LayersPanel - Color control (PR-3)', () => {
  const projectId = 'test-project-1';

  beforeEach(() => {
    // Clean up store between tests
    releaseProjectCanvasStore(projectId);
    const store = getProjectCanvasStoreApi(projectId);
    store.setState({
      layers: [],
      shapes: new Map(),
      activeLayerId: 'default-layer',
    });
  });

  it('renders and allows changing a layer color via color button/picker', async () => {
    // Seed one layer
    const store = getProjectCanvasStoreApi(projectId);
    store.getState().createLayer('Layer A');

    render(<LayersPanel isVisible={true} onClose={() => {}} projectId={projectId} />);

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
    const layer = store.getState().layers[0];
    expect(layer.color).toBe('#EF4444');
  });
});


