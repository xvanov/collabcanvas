/**
 * Trim Estimation Service
 * Standalone trim calculations without wall requirements
 */

import type { MaterialCalculation } from '../types/material';
import { calculateTrimMaterials } from '../data/materials';

/**
 * Calculate trim materials for doors and windows only
 * No wall measurements needed
 */
export function calculateTrimEstimate(
  doors: number,
  windows: number,
  userId: string,
  baseboardLength: number = 0
): MaterialCalculation {
  const materials = calculateTrimMaterials(baseboardLength, doors, windows);

  return {
    materials,
    assumptions: {
      doors,
      windows,
      baseboardLength,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    calculatedAt: Date.now(),
    calculatedBy: userId,
  };
}

