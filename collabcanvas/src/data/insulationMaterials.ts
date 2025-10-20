/**
 * Insulation Material Calculations
 * PR-4: Insulation estimation for walls
 */

import type { MaterialSpec, InsulationType, FramingSpacing } from '../types/material';
import { WASTE_FACTORS } from './materials';

/**
 * Calculate batt insulation materials
 */
export function calculateBattInsulation(
  areaSquareFeet: number,
  rValue: number,
  spacing: FramingSpacing
): MaterialSpec[] {
  const materials: MaterialSpec[] = [];
  
  // Determine insulation type based on R-value and spacing
  const insulationType = rValue >= 19 ? 'R-19' : rValue >= 15 ? 'R-15' : 'R-13';
  const widthLabel = spacing === 16 ? '15"' : '23"'; // Actual width is 1" less than spacing
  
  // Batt insulation is sold by square feet coverage
  const battsNeeded = Math.ceil((areaSquareFeet / 1) * (1 + WASTE_FACTORS.lumber));
  
  materials.push({
    id: 'insulation-batt',
    name: `${insulationType} Batt Insulation (${widthLabel} wide)`,
    category: 'framing',
    unit: 'square-feet',
    quantity: battsNeeded,
    wasteFactor: WASTE_FACTORS.lumber,
    notes: `For ${spacing}" on center framing`,
  });
  
  return materials;
}

/**
 * Calculate spray foam insulation
 */
export function calculateSprayFoamInsulation(
  areaSquareFeet: number,
  rValue: number
): MaterialSpec[] {
  const materials: MaterialSpec[] = [];
  
  // Spray foam coverage depends on thickness
  // R-value of ~3.5 per inch for closed-cell foam
  const thickness = Math.ceil(rValue / 3.5);
  const coveragePerKit = 200; // Board feet per kit (typical)
  const boardFeet = areaSquareFeet * thickness;
  const kitsNeeded = Math.ceil(boardFeet / coveragePerKit);
  
  materials.push({
    id: 'insulation-spray-foam',
    name: `Spray Foam Insulation Kit (R-${rValue})`,
    category: 'framing',
    unit: 'piece',
    quantity: kitsNeeded,
    notes: `${thickness}" thick for R-${rValue}`,
  });
  
  return materials;
}

/**
 * Calculate rigid foam insulation
 */
export function calculateRigidFoamInsulation(
  areaSquareFeet: number,
  rValue: number
): MaterialSpec[] {
  const materials: MaterialSpec[] = [];
  
  // Rigid foam boards (4'x8' = 32 sqft per sheet)
  const sheetCoverage = 32;
  const sheetsNeeded = Math.ceil((areaSquareFeet / sheetCoverage) * (1 + WASTE_FACTORS.lumber));
  
  materials.push({
    id: 'insulation-rigid-foam',
    name: `Rigid Foam Board R-${rValue} (4'x8')`,
    category: 'framing',
    unit: 'piece',
    quantity: sheetsNeeded,
    wasteFactor: WASTE_FACTORS.lumber,
  });
  
  // Foam board adhesive
  materials.push({
    id: 'foam-adhesive',
    name: 'Foam Board Adhesive',
    category: 'framing',
    unit: 'piece',
    quantity: Math.ceil(sheetsNeeded / 10), // 1 tube per 10 boards
    notes: 'Adhesive tubes',
  });
  
  return materials;
}

/**
 * Calculate insulation based on type
 */
export function calculateInsulation(
  areaSquareFeet: number,
  type: InsulationType,
  rValue: number,
  spacing: FramingSpacing
): MaterialSpec[] {
  switch (type) {
    case 'batt':
      return calculateBattInsulation(areaSquareFeet, rValue, spacing);
    case 'spray-foam':
      return calculateSprayFoamInsulation(areaSquareFeet, rValue);
    case 'rigid-foam':
      return calculateRigidFoamInsulation(areaSquareFeet, rValue);
    case 'none':
    default:
      return [];
  }
}

