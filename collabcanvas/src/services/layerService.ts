/**
 * Layer management service
 * Handles layer operations and shape-to-layer assignments
 */

import type { Layer, Shape } from '../types';

export interface LayerService {
  createLayer: (name: string, existingLayers: Layer[]) => Layer;
  updateLayer: (layerId: string, updates: Partial<Layer>, existingLayers: Layer[]) => Layer[];
  deleteLayer: (layerId: string, existingLayers: Layer[], shapes: Map<string, Shape>) => {
    layers: Layer[];
    shapes: Map<string, Shape>;
  };
  reorderLayers: (layerIds: string[], existingLayers: Layer[]) => Layer[];
  moveShapeToLayer: (shapeId: string, layerId: string, existingLayers: Layer[], shapes: Map<string, Shape>) => {
    layers: Layer[];
    shapes: Map<string, Shape>;
  };
  getShapesInLayer: (layerId: string, shapes: Map<string, Shape>) => Shape[];
  getLayerForShape: (shapeId: string, layers: Layer[]) => Layer | null;
}

export const layerService: LayerService = {
  createLayer: (name: string, existingLayers: Layer[]): Layer => {
    return {
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      shapes: [],
      visible: true,
      locked: false,
      order: existingLayers.length,
    };
  },

  updateLayer: (layerId: string, updates: Partial<Layer>, existingLayers: Layer[]): Layer[] => {
    return existingLayers.map((layer) =>
      layer.id === layerId ? { ...layer, ...updates } : layer
    );
  },

  deleteLayer: (layerId: string, existingLayers: Layer[], shapes: Map<string, Shape>) => {
    const layerToDelete = existingLayers.find((layer) => layer.id === layerId);
    if (!layerToDelete) {
      return { layers: existingLayers, shapes };
    }

    // Move shapes to default layer
    const defaultLayer = existingLayers.find((layer) => layer.id === 'default-layer');
    const newShapes = new Map(shapes);
    
    if (defaultLayer && layerToDelete.shapes.length > 0) {
      layerToDelete.shapes.forEach((shapeId) => {
        const shape = newShapes.get(shapeId);
        if (shape) {
          newShapes.set(shapeId, { ...shape, layerId: 'default-layer' });
        }
      });
    }

    const newLayers = existingLayers
      .filter((layer) => layer.id !== layerId)
      .map((layer) =>
        layer.id === 'default-layer' && layerToDelete.shapes.length > 0
          ? { ...layer, shapes: [...layer.shapes, ...layerToDelete.shapes] }
          : layer
      );

    return { layers: newLayers, shapes: newShapes };
  },

  reorderLayers: (layerIds: string[], existingLayers: Layer[]): Layer[] => {
    return layerIds.map((id, index) => {
      const layer = existingLayers.find((l) => l.id === id);
      return layer ? { ...layer, order: index } : layer;
    }).filter(Boolean) as Layer[];
  },

  moveShapeToLayer: (shapeId: string, layerId: string, existingLayers: Layer[], shapes: Map<string, Shape>) => {
    const newShapes = new Map(shapes);
    const shape = newShapes.get(shapeId);
    if (!shape) {
      return { layers: existingLayers, shapes };
    }

    newShapes.set(shapeId, { ...shape, layerId });

    const newLayers = existingLayers.map((layer) => ({
      ...layer,
      shapes: layer.shapes.filter((id) => id !== shapeId),
    }));

    const targetLayer = newLayers.find((layer) => layer.id === layerId);
    if (targetLayer) {
      targetLayer.shapes.push(shapeId);
    }

    return { layers: newLayers, shapes: newShapes };
  },

  getShapesInLayer: (layerId: string, shapes: Map<string, Shape>): Shape[] => {
    return Array.from(shapes.values()).filter((shape) => shape.layerId === layerId);
  },

  getLayerForShape: (shapeId: string, layers: Layer[]): Layer | null => {
    return layers.find((layer) => layer.shapes.includes(shapeId)) || null;
  },
};
