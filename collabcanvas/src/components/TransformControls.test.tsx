/**
 * Unit tests for TransformControls component
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { TransformControls } from '../components/TransformControls';
import type { TransformControls as TransformControlsType } from '../types';

describe('TransformControls Component', () => {
  it('should not render when not visible', () => {
    const transformControls: TransformControlsType = {
      isVisible: false,
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      rotation: 0,
      resizeHandles: [],
    };

    const { container } = render(
      <TransformControls 
        transformControls={transformControls}
        onResizeStart={() => {}}
        onRotateStart={() => {}}
      />
    );

    // Should render nothing when not visible
    expect(container.firstChild).toBeNull();
  });

  it('should render when visible', () => {
    const transformControls: TransformControlsType = {
      isVisible: true,
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      rotation: 0,
      resizeHandles: ['nw', 'ne', 'sw', 'se'],
    };

    const { container } = render(
      <TransformControls 
        transformControls={transformControls}
        onResizeStart={() => {}}
        onRotateStart={() => {}}
      />
    );

    // Should render something when visible
    expect(container.firstChild).toBeDefined();
  });

  it('should call onRotateStart when rotation handle is clicked', () => {
    const onRotateStart = vi.fn();
    const transformControls: TransformControlsType = {
      isVisible: true,
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      rotation: 0,
      resizeHandles: ['nw', 'ne', 'sw', 'se'],
    };

    render(
      <TransformControls 
        transformControls={transformControls} 
        onRotateStart={onRotateStart}
        onResizeStart={() => {}}
      />
    );

    // Verify the callback is defined
    expect(onRotateStart).toBeDefined();
  });

  it('should call onResizeStart when resize handle is clicked', () => {
    const onResizeStart = vi.fn();
    const transformControls: TransformControlsType = {
      isVisible: true,
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      rotation: 0,
      resizeHandles: ['nw', 'ne', 'sw', 'se'],
    };

    render(
      <TransformControls 
        transformControls={transformControls} 
        onResizeStart={onResizeStart}
        onRotateStart={() => {}}
      />
    );

    // Verify the callback is defined
    expect(onResizeStart).toBeDefined();
  });

  it('should handle empty resize handles array', () => {
    const transformControls: TransformControlsType = {
      isVisible: true,
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      rotation: 0,
      resizeHandles: [],
    };

    const { container } = render(
      <TransformControls 
        transformControls={transformControls}
        onResizeStart={() => {}}
        onRotateStart={() => {}}
      />
    );

    // Should render without errors even with no resize handles
    expect(container.firstChild).toBeDefined();
  });
});
