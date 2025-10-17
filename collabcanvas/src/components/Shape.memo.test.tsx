import { describe, it, expect } from 'vitest';
import { Shape as ShapeComponent } from './Shape';

describe('Shape component', () => {
  it('exports a Shape component', () => {
    expect(ShapeComponent).toBeDefined();
    expect(typeof ShapeComponent).toBe('function');
  });
});


