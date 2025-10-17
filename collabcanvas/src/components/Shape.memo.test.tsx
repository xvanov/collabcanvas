import { describe, it, expect } from 'vitest';
import { Shape as ShapeComponent } from './Shape';

type WithDisplayName = { displayName?: string };

describe('Shape memoization', () => {
  it('exposes a displayName for the memoized component', () => {
    const comp = ShapeComponent as unknown as WithDisplayName;
    expect(comp.displayName).toBe('Shape');
  });
});


