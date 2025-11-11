/**
 * Variance Calculation Service
 * AC: #17, #18 - Variance Calculation
 * Calculates variance between estimate and actual costs
 */

import type { MaterialSpec } from '../types/material';

export interface MaterialVariance {
  material: MaterialSpec;
  estimateTotal: number;
  actualTotal: number;
  varianceDollars: number;
  variancePercentage: number;
}

export interface VarianceSummary {
  materials: MaterialVariance[];
  totalEstimate: number;
  totalActual: number;
  totalVarianceDollars: number;
  totalVariancePercentage: number;
}

/**
 * Calculate variance for a single material
 * Variance percentage: ((actual - estimate) / estimate) × 100%
 * AC: #24 - Variance calculation error handling with data validation
 */
export function calculateMaterialVariance(material: MaterialSpec): MaterialVariance | null {
  // Validate inputs
  if (!material || typeof material !== 'object') {
    console.warn('[VARIANCE] Invalid material object provided');
    return null;
  }

  // Only calculate if material has both estimate and actual costs
  const hasEstimate = typeof material.priceUSD === 'number' && material.priceUSD > 0 && material.priceUSD !== undefined;
  const hasActual = typeof material.actualCostUSD === 'number' && material.actualCostUSD !== undefined;

  if (!hasEstimate || !hasActual) {
    return null;
  }

  // Validate quantity
  if (typeof material.quantity !== 'number' || material.quantity <= 0 || isNaN(material.quantity)) {
    console.warn(`[VARIANCE] Invalid quantity for material ${material.name}: ${material.quantity}`);
    return null;
  }

  // Validate prices
  if (isNaN(material.priceUSD!) || isNaN(material.actualCostUSD!)) {
    console.warn(`[VARIANCE] Invalid price values for material ${material.name}`);
    return null;
  }

  const estimateUnitPrice = material.priceUSD!;
  // actualCostUSD is stored as TOTAL cost, not unit price
  const actualTotal = material.actualCostUSD!;
  const estimateTotal = material.quantity * estimateUnitPrice;
  
  // Validate totals are finite numbers
  if (!Number.isFinite(estimateTotal) || !Number.isFinite(actualTotal)) {
    console.warn(`[VARIANCE] Non-finite totals for material ${material.name}`);
    return null;
  }
  
  const varianceDollars = actualTotal - estimateTotal;

  // Calculate variance percentage
  // Handle edge case: zero estimate (avoid division by zero)
  let variancePercentage = 0;
  if (estimateTotal !== 0) {
    variancePercentage = (varianceDollars / estimateTotal) * 100;
    
    // Validate variance percentage is finite
    if (!Number.isFinite(variancePercentage)) {
      console.warn(`[VARIANCE] Non-finite variance percentage for material ${material.name}`);
      return null;
    }
  } else if (actualTotal > 0) {
    // If estimate was 0 but actual > 0, variance is infinite (represented as 100%)
    variancePercentage = 100;
  }

  return {
    material,
    estimateTotal,
    actualTotal,
    varianceDollars,
    variancePercentage,
  };
}

/**
 * Calculate variance summary for all materials with actual costs
 * AC: #17, #18 - Variance Calculation
 * AC: #24 - Variance calculation error handling with data validation
 */
export function calculateVarianceSummary(materials: MaterialSpec[]): VarianceSummary {
  // Validate input
  if (!Array.isArray(materials)) {
    console.warn('[VARIANCE] Invalid materials array provided');
    return {
      materials: [],
      totalEstimate: 0,
      totalActual: 0,
      totalVarianceDollars: 0,
      totalVariancePercentage: 0,
    };
  }

  const variances: MaterialVariance[] = [];
  let totalEstimate = 0;
  let totalActual = 0;

  materials.forEach(material => {
    try {
      const variance = calculateMaterialVariance(material);
      if (variance) {
        variances.push(variance);
        totalEstimate += variance.estimateTotal;
        totalActual += variance.actualTotal;
      }
    } catch (error) {
      // AC: #24 - Handle variance calculation errors gracefully
      console.error(`[VARIANCE] Error calculating variance for material ${material.name}:`, error);
      // Skip this material but continue processing others
    }
  });

  const totalVarianceDollars = totalActual - totalEstimate;
  
  // Calculate total variance percentage
  // Handle edge case: zero total estimate
  let totalVariancePercentage = 0;
  if (totalEstimate !== 0) {
    totalVariancePercentage = (totalVarianceDollars / totalEstimate) * 100;
    
    // Validate total variance percentage is finite
    if (!Number.isFinite(totalVariancePercentage)) {
      console.warn('[VARIANCE] Non-finite total variance percentage, defaulting to 0');
      totalVariancePercentage = 0;
    }
  } else if (totalActual > 0) {
    // If total estimate was 0 but total actual > 0, variance is infinite (represented as 100%)
    totalVariancePercentage = 100;
  }

  return {
    materials: variances,
    totalEstimate,
    totalActual,
    totalVarianceDollars,
    totalVariancePercentage,
  };
}

/**
 * Format variance percentage for display
 */
export function formatVariancePercentage(percentage: number): string {
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
}

/**
 * Get variance severity level for highlighting
 * Returns: 'low' | 'medium' | 'high' | 'critical'
 */
export function getVarianceSeverity(percentage: number): 'low' | 'medium' | 'high' | 'critical' {
  const absPercentage = Math.abs(percentage);
  
  if (absPercentage < 5) return 'low';
  if (absPercentage < 15) return 'medium';
  if (absPercentage < 30) return 'high';
  return 'critical';
}

