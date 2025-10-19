/**
 * Unit tests for SelectionBox component
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SelectionBox } from '../components/SelectionBox';
import type { SelectionBox as SelectionBoxType } from '../types';

describe('SelectionBox Component', () => {
  it('should render selection box with correct properties', () => {
    const selectionBox: SelectionBoxType = {
      x: 100,
      y: 150,
      width: 200,
      height: 100,
    };

    // Just test that the component renders without errors
    const { container } = render(<SelectionBox selectionBox={selectionBox} />);
    expect(container).toBeDefined();
  });

  it('should handle zero dimensions', () => {
    const selectionBox: SelectionBoxType = {
      x: 50,
      y: 50,
      width: 0,
      height: 0,
    };

    const { container } = render(<SelectionBox selectionBox={selectionBox} />);
    expect(container).toBeDefined();
  });

  it('should handle negative dimensions', () => {
    const selectionBox: SelectionBoxType = {
      x: 100,
      y: 100,
      width: -50,
      height: -30,
    };

    const { container } = render(<SelectionBox selectionBox={selectionBox} />);
    expect(container).toBeDefined();
  });
});
