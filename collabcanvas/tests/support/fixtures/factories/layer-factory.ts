import { faker } from '@faker-js/faker';
import type { FirestoreLayer } from '../../../../src/services/firestore';

/**
 * Layer data factory for test data generation
 * 
 * Uses faker.js to generate realistic, unique test data.
 * 
 * @see bmad/bmm/testarch/knowledge/data-factories.md
 */
export class LayerFactory {
  /**
   * Create a layer object with sensible defaults
   * @param overrides - Partial layer data to override defaults
   * @returns Layer object (not persisted)
   */
  createLayer(overrides: Partial<FirestoreLayer> = {}): FirestoreLayer {
    const now = Date.now();
    
    return {
      id: faker.string.uuid(),
      name: faker.lorem.word(),
      shapes: [],
      visible: true,
      locked: false,
      order: faker.number.int({ min: 0, max: 100 }),
      color: faker.internet.color(),
      createdAt: now,
      createdBy: faker.string.uuid(),
      updatedAt: now,
      updatedBy: faker.string.uuid(),
      clientUpdatedAt: now,
      ...overrides,
    };
  }

  /**
   * Create multiple layers
   * @param count - Number of layers to create
   * @param overrides - Partial layer data to override defaults for all layers
   * @returns Array of layer objects
   */
  createLayers(count: number, overrides: Partial<FirestoreLayer> = {}): FirestoreLayer[] {
    return Array.from({ length: count }, () => this.createLayer(overrides));
  }
}


