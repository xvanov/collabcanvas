/**
 * Margin Calculation Service
 * AC: #8, #9 - Margin Calculation
 * Calculates margin in dollars and time/slack for estimates
 */

import type { BillOfMaterials } from '../types/material';
import type { CPM } from '../types/cpm';

export interface MarginCalculation {
  materialCost: number;
  laborCost: number;
  subtotal: number; // Materials + Labor
  marginPercentage: number;
  marginDollars: number; // Profit amount in dollars
  marginTimeSlack: number; // Buffer time in days
  total: number; // Subtotal + Margin
}

export interface MarginCalculationOptions {
  bom: BillOfMaterials;
  cpm?: CPM | null; // Optional CPM for labor calculation
  marginPercentage?: number; // Default: 20% (0.20)
  laborRatePerHour?: number; // Default: $50/hour for MVP
  hoursPerDay?: number; // Default: 8 hours per day
}

/**
 * Calculate material costs from BOM
 * Sum of all material prices × quantities
 */
export function calculateMaterialCost(bom: BillOfMaterials): number {
  return bom.totalMaterials.reduce((total, material) => {
    // Only include materials with valid prices
    if (typeof material.priceUSD === 'number' && material.priceUSD > 0) {
      const quantity = material.quantity || 0;
      const unitPrice = material.priceUSD;
      return total + (quantity * unitPrice);
    }
    return total;
  }, 0);
}

/**
 * Calculate labor costs from CPM
 * For MVP: Uses basic labor rate × total project hours
 * Future: Will use task-specific labor rates and crew sizes
 */
export function calculateLaborCost(
  cpm: CPM | null | undefined,
  laborRatePerHour: number = 50,
  hoursPerDay: number = 8
): number {
  if (!cpm || !cpm.tasks || cpm.tasks.length === 0) {
    return 0;
  }

  // Calculate total project hours from CPM duration
  // For MVP: Use total duration in days × hours per day
  const totalDays = cpm.totalDuration || 0;
  const totalHours = totalDays * hoursPerDay;
  
  // Calculate labor cost: hours × rate
  return totalHours * laborRatePerHour;
}

/**
 * Calculate margin in dollars
 * Margin = (Materials + Labor) × margin percentage
 */
export function calculateMarginDollars(
  subtotal: number,
  marginPercentage: number
): number {
  return subtotal * marginPercentage;
}

/**
 * Calculate margin in time/slack (buffer time)
 * Margin time = project duration × margin percentage
 * This adds buffer time to ensure realistic estimate
 */
export function calculateMarginTimeSlack(
  projectDurationDays: number,
  marginPercentage: number
): number {
  return projectDurationDays * marginPercentage;
}

/**
 * Calculate complete margin breakdown
 * AC: #8, #9 - Margin Calculation
 */
export function calculateMargin(options: MarginCalculationOptions): MarginCalculation {
  const {
    bom,
    cpm,
    marginPercentage = 0.20, // Default 20% margin
    laborRatePerHour = 50, // Default $50/hour for MVP
    hoursPerDay = 8, // Default 8 hours per day
  } = options;

  // Calculate material costs
  const materialCost = calculateMaterialCost(bom);

  // Calculate labor costs from CPM (if available)
  const laborCost = calculateLaborCost(cpm, laborRatePerHour, hoursPerDay);

  // Calculate subtotal (materials + labor)
  const subtotal = materialCost + laborCost;

  // Calculate margin in dollars
  const marginDollars = calculateMarginDollars(subtotal, marginPercentage);

  // Calculate margin in time/slack (buffer time)
  const projectDurationDays = cpm?.totalDuration || 0;
  const marginTimeSlack = calculateMarginTimeSlack(projectDurationDays, marginPercentage);

  // Calculate total (subtotal + margin)
  const total = subtotal + marginDollars;

  return {
    materialCost,
    laborCost,
    subtotal,
    marginPercentage,
    marginDollars,
    marginTimeSlack,
    total,
  };
}

/**
 * Format margin for display
 */
export function formatMargin(margin: MarginCalculation): {
  materialCost: string;
  laborCost: string;
  subtotal: string;
  marginDollars: string;
  marginTimeSlack: string;
  total: string;
  marginPercentage: string;
} {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return {
    materialCost: formatter.format(margin.materialCost),
    laborCost: formatter.format(margin.laborCost),
    subtotal: formatter.format(margin.subtotal),
    marginDollars: formatter.format(margin.marginDollars),
    marginTimeSlack: `${margin.marginTimeSlack.toFixed(1)} days`,
    total: formatter.format(margin.total),
    marginPercentage: `${(margin.marginPercentage * 100).toFixed(1)}%`,
  };
}

