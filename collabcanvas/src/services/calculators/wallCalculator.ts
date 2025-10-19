/**
 * Wall Material Calculator
 * PR-4: Calculates materials for wall construction
 */

import type {
  MaterialSpec,
  WallFramingInput,
  WallSurfaceInput,
  WallAssumptions,
  DetailedMaterialResult,
} from '../../types/material';
import {
  calculateLumberFraming,
  calculateMetalFraming,
  calculateDrywallMaterials,
  calculateFRPMaterials,
  calculatePaintMaterials,
  calculateTrimMaterials,
} from '../../data/materials';

/**
 * Calculate complete wall materials based on assumptions
 */
export function calculateWallMaterials(
  lengthFeet: number,
  assumptions: WallAssumptions
): DetailedMaterialResult {
  const materials: MaterialSpec[] = [];
  const height = assumptions.height || 8;
  const area = lengthFeet * height;

  // 1. Framing materials
  const framingInput: WallFramingInput = {
    length: lengthFeet,
    height,
    spacing: assumptions.framing.spacing,
    type: assumptions.framing.type,
  };
  
  const framingMaterials = calculateFramingMaterials(framingInput);
  materials.push(...framingMaterials);

  // 2. Surface materials (drywall or FRP)
  const surfaceInput: WallSurfaceInput = {
    area,
    type: assumptions.surface.type,
    thickness: assumptions.surface.thickness,
    framingType: assumptions.framing.type,
  };
  
  const surfaceMaterials = calculateSurfaceMaterials(surfaceInput);
  materials.push(...surfaceMaterials);

  // 3. Finish materials (paint, if applicable)
  if (assumptions.finish.coats > 0) {
    const paintMaterials = calculatePaintMaterials(
      area,
      assumptions.finish.coats,
      assumptions.finish.includePrimer
    );
    materials.push(...paintMaterials);
  }

  // 4. Trim materials (if doors/windows specified)
  if (assumptions.doors || assumptions.windows) {
    const trimMaterials = calculateTrimMaterials(
      lengthFeet,
      assumptions.doors || 0,
      assumptions.windows || 0
    );
    materials.push(...trimMaterials);
  }

  // Build categorized breakdown
  const breakdown = [
    {
      category: 'framing' as const,
      items: materials.filter(m => m.category === 'framing'),
    },
    {
      category: 'surface' as const,
      items: materials.filter(m => m.category === 'surface'),
    },
    {
      category: 'finish' as const,
      items: materials.filter(m => m.category === 'finish'),
    },
    {
      category: 'trim' as const,
      items: materials.filter(m => m.category === 'trim'),
    },
  ].filter(cat => cat.items.length > 0);

  return {
    materials,
    breakdown,
    summary: {
      totalItems: materials.reduce((sum, m) => sum + m.quantity, 0),
      totalCategories: breakdown.length,
    },
  };
}

/**
 * Calculate framing materials based on type
 */
export function calculateFramingMaterials(input: WallFramingInput): MaterialSpec[] {
  if (input.type === 'lumber') {
    return calculateLumberFraming(input.length, input.height, input.spacing);
  } else {
    return calculateMetalFraming(input.length, input.height, input.spacing);
  }
}

/**
 * Calculate surface materials based on type
 */
export function calculateSurfaceMaterials(input: WallSurfaceInput): MaterialSpec[] {
  if (input.type === 'drywall') {
    return calculateDrywallMaterials(
      input.area,
      input.thickness as '1/2"' | '5/8"',
      input.framingType
    );
  } else {
    return calculateFRPMaterials(
      input.area,
      input.thickness as '0.090"' | '0.120"'
    );
  }
}

/**
 * Calculate materials for a single wall segment
 */
export function calculateWallSegment(
  lengthFeet: number,
  heightFeet: number,
  assumptions: WallAssumptions
): MaterialSpec[] {
  const tempAssumptions = { ...assumptions, height: heightFeet };
  const result = calculateWallMaterials(lengthFeet, tempAssumptions);
  return result.materials;
}

/**
 * Calculate total materials for multiple wall segments
 */
export function calculateMultipleWalls(
  segments: Array<{ length: number; height?: number }>,
  assumptions: WallAssumptions
): DetailedMaterialResult {
  const allMaterials: MaterialSpec[] = [];

  segments.forEach((segment) => {
    const height = segment.height || assumptions.height || 8;
    const tempAssumptions = { ...assumptions, height };
    const result = calculateWallMaterials(segment.length, tempAssumptions);
    allMaterials.push(...result.materials);
  });

  // Consolidate duplicate materials
  const consolidated = consolidateMaterials(allMaterials);

  // Build breakdown
  const breakdown = [
    {
      category: 'framing' as const,
      items: consolidated.filter(m => m.category === 'framing'),
    },
    {
      category: 'surface' as const,
      items: consolidated.filter(m => m.category === 'surface'),
    },
    {
      category: 'finish' as const,
      items: consolidated.filter(m => m.category === 'finish'),
    },
    {
      category: 'trim' as const,
      items: consolidated.filter(m => m.category === 'trim'),
    },
  ].filter(cat => cat.items.length > 0);

  return {
    materials: consolidated,
    breakdown,
    summary: {
      totalItems: consolidated.reduce((sum, m) => sum + m.quantity, 0),
      totalCategories: breakdown.length,
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
 * Estimate wall height from shape data if not provided
 */
export function estimateWallHeight(
  isCommercial: boolean = false
): number {
  if (isCommercial) {
    return 10; // Commercial spaces typically have 10' ceilings
  }
  return 8; // Standard residential height
}

/**
 * Calculate area from length and height
 */
export function calculateWallArea(lengthFeet: number, heightFeet: number): number {
  return lengthFeet * heightFeet;
}

/**
 * Convert linear feet measurement to wall material estimate
 */
export function linearFeetToWallMaterials(
  linearFeet: number,
  assumptions: WallAssumptions
): DetailedMaterialResult {
  return calculateWallMaterials(linearFeet, assumptions);
}

