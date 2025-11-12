import { faker } from '@faker-js/faker';
import type { Shape } from '../../../../src/types';

/**
 * Shape data factory for test data generation
 * 
 * Uses faker.js to generate realistic, unique test data.
 * 
 * @see bmad/bmm/testarch/knowledge/data-factories.md
 */
export class ShapeFactory {
  /**
   * Create a shape object with sensible defaults
   * @param overrides - Partial shape data to override defaults
   * @returns Shape object (not persisted)
   */
  createShape(overrides: Partial<Shape> = {}): Shape {
    const now = Date.now();
    const type = overrides.type || 'rect';
    
    const baseShape: Shape = {
      id: faker.string.uuid(),
      type,
      x: faker.number.int({ min: 0, max: 1000 }),
      y: faker.number.int({ min: 0, max: 1000 }),
      w: faker.number.int({ min: 10, max: 200 }),
      h: faker.number.int({ min: 10, max: 200 }),
      color: faker.internet.color(),
      createdAt: now,
      createdBy: faker.string.uuid(),
      updatedAt: now,
      updatedBy: faker.string.uuid(),
      clientUpdatedAt: now,
    };

    // Add type-specific properties
    if (type === 'circle') {
      baseShape.radius = faker.number.int({ min: 5, max: 50 });
    }
    
    if (type === 'text') {
      baseShape.text = faker.lorem.word();
      baseShape.fontSize = faker.number.int({ min: 12, max: 48 });
    }
    
    if (type === 'line' || type === 'polyline' || type === 'polygon') {
      baseShape.strokeWidth = faker.number.int({ min: 1, max: 5 });
    }
    
    if (type === 'polyline' || type === 'polygon') {
      const pointCount = faker.number.int({ min: 3, max: 8 });
      baseShape.points = Array.from({ length: pointCount * 2 }, () =>
        faker.number.int({ min: 0, max: 1000 })
      );
    }

    return {
      ...baseShape,
      ...overrides,
    };
  }

  /**
   * Create multiple shapes
   * @param count - Number of shapes to create
   * @param overrides - Partial shape data to override defaults for all shapes
   * @returns Array of shape objects
   */
  createShapes(count: number, overrides: Partial<Shape> = {}): Shape[] {
    return Array.from({ length: count }, () => this.createShape(overrides));
  }
}

