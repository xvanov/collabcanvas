/**
 * Floor Material Calculator
 * PR-4: Calculates materials for floor coatings and finishes
 */

import type {
  MaterialSpec,
  FloorAssumptions,
  DetailedMaterialResult,
  FloorType,
  TileSize,
} from '../../types/material';
import {
  calculateEpoxyMaterials,
  calculateTileMaterials,
  calculateCarpetMaterials,
  calculateHardwoodMaterials,
} from '../../data/materials';

/**
 * Calculate complete floor materials based on assumptions
 */
export function calculateFloorMaterials(
  areaSquareFeet: number,
  assumptions: FloorAssumptions
): DetailedMaterialResult {
  const materials: MaterialSpec[] = [];

  // Calculate materials based on floor type
  switch (assumptions.type) {
    case 'epoxy':
      materials.push(...calculateEpoxyMaterials(areaSquareFeet));
      break;
    case 'carpet':
      materials.push(...calculateCarpetMaterials(areaSquareFeet));
      break;
    case 'hardwood':
      materials.push(...calculateHardwoodMaterials(areaSquareFeet));
      break;
    case 'tile':
      // Default to 12x12 tiles if not specified
      materials.push(...calculateTileMaterials(areaSquareFeet, '12x12'));
      break;
  }

  // Build categorized breakdown
  const breakdown = [
    {
      category: 'flooring' as const,
      items: materials,
    },
  ];

  return {
    materials,
    breakdown,
    summary: {
      totalItems: materials.reduce((sum, m) => sum + m.quantity, 0),
      totalCategories: 1,
    },
  };
}

/**
 * Calculate epoxy coating materials with preparation steps
 */
export function calculateEpoxyCoating(
  areaSquareFeet: number,
  includePreparation: boolean = true
): MaterialSpec[] {
  const materials = calculateEpoxyMaterials(areaSquareFeet);

  if (!includePreparation) {
    // Filter out preparation materials (cleaner and etching)
    return materials.filter(
      m => !m.id.includes('cleaner') && !m.id.includes('etching')
    );
  }

  return materials;
}

/**
 * Calculate tile materials with specific size
 */
export function calculateTileFlooring(
  areaSquareFeet: number,
  tileSize: TileSize = '12x12'
): MaterialSpec[] {
  return calculateTileMaterials(areaSquareFeet, tileSize);
}

/**
 * Calculate carpet materials
 */
export function calculateCarpetFlooring(
  areaSquareFeet: number
): MaterialSpec[] {
  return calculateCarpetMaterials(areaSquareFeet);
}

/**
 * Calculate hardwood flooring materials
 */
export function calculateHardwoodFlooring(
  areaSquareFeet: number
): MaterialSpec[] {
  return calculateHardwoodMaterials(areaSquareFeet);
}

/**
 * Calculate materials for a specific floor type
 */
export function calculateFloorByType(
  areaSquareFeet: number,
  type: FloorType,
  options?: {
    tileSize?: TileSize;
    includePreparation?: boolean;
  }
): MaterialSpec[] {
  switch (type) {
    case 'epoxy':
      return calculateEpoxyCoating(
        areaSquareFeet,
        options?.includePreparation ?? true
      );
    case 'tile':
      return calculateTileFlooring(areaSquareFeet, options?.tileSize);
    case 'carpet':
      return calculateCarpetFlooring(areaSquareFeet);
    case 'hardwood':
      return calculateHardwoodFlooring(areaSquareFeet);
    default:
      return [];
  }
}

/**
 * Calculate total materials for multiple floor areas
 */
export function calculateMultipleFloors(
  areas: Array<{ area: number; type?: FloorType }>,
  defaultType: FloorType = 'epoxy'
): DetailedMaterialResult {
  const allMaterials: MaterialSpec[] = [];

  areas.forEach((floorArea) => {
    const type = floorArea.type || defaultType;
    const materials = calculateFloorByType(floorArea.area, type);
    allMaterials.push(...materials);
  });

  // Consolidate duplicate materials
  const consolidated = consolidateMaterials(allMaterials);

  const breakdown = [
    {
      category: 'flooring' as const,
      items: consolidated,
    },
  ];

  return {
    materials: consolidated,
    breakdown,
    summary: {
      totalItems: consolidated.reduce((sum, m) => sum + m.quantity, 0),
      totalCategories: 1,
    },
  };
}

/**
 * Consolidate duplicate materials by summing quantities
 */
function consolidateMaterials(materials: MaterialSpec[]): MaterialSpec[] {
  const consolidated = new Map<string, MaterialSpec>();

  materials.forEach((material) => {
    const existing = consolidated.get(material.id);
    if (existing) {
      // Sum quantities
      existing.quantity += material.quantity;
    } else {
      // Add new entry
      consolidated.set(material.id, { ...material });
    }
  });

  return Array.from(consolidated.values());
}

/**
 * Convert polygon area to floor material estimate
 */
export function polygonAreaToFloorMaterials(
  areaSquareFeet: number,
  assumptions: FloorAssumptions
): DetailedMaterialResult {
  return calculateFloorMaterials(areaSquareFeet, assumptions);
}

/**
 * Estimate coverage area based on room dimensions
 */
export function calculateRoomArea(lengthFeet: number, widthFeet: number): number {
  return lengthFeet * widthFeet;
}

