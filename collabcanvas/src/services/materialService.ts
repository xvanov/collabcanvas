/**
 * Material Service - Orchestrates material calculations
 * PR-4: Main service for material estimation
 */

import type {
  MaterialCalculation,
  WallAssumptions,
  FloorAssumptions,
  DoorAssumptions,
  WindowAssumptions,
  MaterialSpec,
  BOMExportData,
  BillOfMaterials,
} from '../types/material';
import { calculateWallMaterials } from './calculators/wallCalculator';
import { calculateFloorMaterials } from './calculators/floorCalculator';
import { calculateDoorMaterials } from './calculators/doorCalculator';
import { calculateWindowMaterials } from './calculators/windowCalculator';
import { DEFAULT_WALL_ASSUMPTIONS, DEFAULT_FLOOR_ASSUMPTIONS, DEFAULT_DOOR_ASSUMPTIONS, DEFAULT_WINDOW_ASSUMPTIONS } from '../data/defaultAssumptions';

/**
 * Calculate wall materials with measurements
 */
export function calculateWallEstimate(
  lengthFeet: number,
  assumptions: Partial<WallAssumptions> = {},
  userId: string
): MaterialCalculation {
  const fullAssumptions: WallAssumptions = {
    ...DEFAULT_WALL_ASSUMPTIONS,
    ...assumptions,
  };

  const result = calculateWallMaterials(lengthFeet, fullAssumptions);

  return {
    totalLength: lengthFeet,
    totalArea: lengthFeet * (fullAssumptions.height || 8),
    materials: result.materials,
    assumptions: fullAssumptions,
    calculatedAt: Date.now(),
    calculatedBy: userId,
  };
}

/**
 * Calculate floor materials with measurements
 */
export function calculateFloorEstimate(
  areaSquareFeet: number,
  assumptions: Partial<FloorAssumptions> = {},
  userId: string
): MaterialCalculation {
  const fullAssumptions: FloorAssumptions = {
    ...DEFAULT_FLOOR_ASSUMPTIONS,
    ...assumptions,
  };

  const result = calculateFloorMaterials(areaSquareFeet, fullAssumptions);

  return {
    totalArea: areaSquareFeet,
    materials: result.materials,
    assumptions: fullAssumptions,
    calculatedAt: Date.now(),
    calculatedBy: userId,
  };
}

/**
 * Calculate door hardware materials
 */
export function calculateDoorEstimate(
  doorCount: number,
  assumptions: Partial<DoorAssumptions> = {},
  userId: string
): MaterialCalculation {
  const fullAssumptions: DoorAssumptions = {
    ...DEFAULT_DOOR_ASSUMPTIONS,
    ...assumptions,
    doorCount,
  };

  const result = calculateDoorMaterials(doorCount, fullAssumptions);

  return {
    totalCount: doorCount,
    materials: result.materials,
    assumptions: fullAssumptions,
    calculatedAt: Date.now(),
    calculatedBy: userId,
  };
}

/**
 * Calculate window installation materials
 */
export function calculateWindowEstimate(
  windowCount: number,
  assumptions: Partial<WindowAssumptions> = {},
  userId: string
): MaterialCalculation {
  const fullAssumptions: WindowAssumptions = {
    ...DEFAULT_WINDOW_ASSUMPTIONS,
    ...assumptions,
    windowCount,
  };

  const result = calculateWindowMaterials(windowCount, fullAssumptions);

  return {
    totalCount: windowCount,
    materials: result.materials,
    assumptions: fullAssumptions,
    calculatedAt: Date.now(),
    calculatedBy: userId,
  };
}

/**
 * Calculate materials from layer measurements
 */
export interface LayerMeasurement {
  layerName: string;
  type: 'wall' | 'floor';
  length?: number; // For walls (linear feet)
  area?: number; // For floors (square feet)
}

export function calculateFromLayers(
  layers: LayerMeasurement[],
  wallAssumptions: Partial<WallAssumptions> = {},
  floorAssumptions: Partial<FloorAssumptions> = {},
  userId: string
): MaterialCalculation[] {
  const calculations: MaterialCalculation[] = [];

  // Group by type
  const wallLayers = layers.filter(l => l.type === 'wall' && l.length);
  const floorLayers = layers.filter(l => l.type === 'floor' && l.area);

  // Calculate walls
  if (wallLayers.length > 0) {
    const totalLength = wallLayers.reduce((sum, l) => sum + (l.length || 0), 0);
    calculations.push(calculateWallEstimate(totalLength, wallAssumptions, userId));
  }

  // Calculate floors
  if (floorLayers.length > 0) {
    const totalArea = floorLayers.reduce((sum, l) => sum + (l.area || 0), 0);
    calculations.push(calculateFloorEstimate(totalArea, floorAssumptions, userId));
  }

  return calculations;
}

/**
 * Compare two material calculations
 */
export function compareMaterialCalculations(
  previous: MaterialCalculation,
  current: MaterialCalculation
): Array<{
  materialId: string;
  materialName: string;
  previousQuantity: number;
  newQuantity: number;
  difference: number;
  percentageChange: number;
}> {
  const comparisons: Array<{
    materialId: string;
    materialName: string;
    previousQuantity: number;
    newQuantity: number;
    difference: number;
    percentageChange: number;
  }> = [];

  // Create maps for easy lookup
  const prevMap = new Map(previous.materials.map(m => [m.id, m]));
  const currMap = new Map(current.materials.map(m => [m.id, m]));

  // Check all materials
  const allIds = new Set([
    ...prevMap.keys(),
    ...currMap.keys(),
  ]);

  allIds.forEach(id => {
    const prev = prevMap.get(id);
    const curr = currMap.get(id);

    const previousQuantity = prev?.quantity || 0;
    const newQuantity = curr?.quantity || 0;
    const difference = newQuantity - previousQuantity;
    const percentageChange = previousQuantity > 0
      ? ((difference / previousQuantity) * 100)
      : 100;

    if (difference !== 0) {
      comparisons.push({
        materialId: id,
        materialName: curr?.name || prev?.name || id,
        previousQuantity,
        newQuantity,
        difference,
        percentageChange,
      });
    }
  });

  return comparisons;
}

/**
 * Convert Home Depot API link to public-facing link
 * Converts apionline.homedepot.com to www.homedepot.com for copy-pastable URLs
 */
function convertToPublicHomeDepotLink(apiLink: string | null | undefined): string {
  if (!apiLink) return '';
  
  // Convert apionline.homedepot.com to www.homedepot.com
  // Example: https://apionline.homedepot.com/p/... -> https://www.homedepot.com/p/...
  return apiLink.replace(/apionline\.homedepot\.com/g, 'www.homedepot.com');
}

/**
 * Generate CSV export data for BOM
 */
export function generateBOMExport(
  bom: BillOfMaterials,
  projectName?: string
): BOMExportData {
  const headers = ['Category', 'Item', 'Quantity', 'Unit', 'Notes', 'Price', 'Link (Home Depot)', 'Total'];
  const rows: string[][] = [];

  // Add all materials
  bom.totalMaterials.forEach(material => {
    const price = typeof material.priceUSD === 'number' ? material.priceUSD.toFixed(2) : '';
    // Convert API link to public-facing link for copy-pastable URLs
    const link = convertToPublicHomeDepotLink(material.homeDepotLink);
    const total = typeof material.priceUSD === 'number' ? (material.quantity * material.priceUSD).toFixed(2) : '';

    rows.push([
      material.category,
      material.name,
      material.quantity.toString(),
      material.unit,
      material.notes || '',
      price,
      link,
      total,
    ]);
  });

  return {
    headers,
    rows,
    metadata: {
      projectName: projectName || bom.projectName || 'Material Estimate',
      generatedAt: Date.now(),
      generatedBy: bom.createdBy,
    },
  };
}

/**
 * Convert BOM export data to CSV string
 */
export function bomToCSV(exportData: BOMExportData): string {
  const lines: string[] = [];

  // Add metadata as comments
  lines.push(`# Project: ${exportData.metadata.projectName}`);
  lines.push(`# Generated: ${new Date(exportData.metadata.generatedAt).toLocaleString()}`);
  lines.push('');

  // Add headers
  lines.push(exportData.headers.join(','));

  // Add data rows
  exportData.rows.forEach(row => {
    // Escape commas and quotes in cell values
    const escapedRow = row.map(cell => {
      if (cell.includes(',') || cell.includes('"')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    });
    lines.push(escapedRow.join(','));
  });

  return lines.join('\n');
}

/**
 * Download BOM as CSV file
 */
export function downloadBOMAsCSV(bom: BillOfMaterials, projectName?: string): void {
  const exportData = generateBOMExport(bom, projectName);
  const csvContent = bomToCSV(exportData);

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${exportData.metadata.projectName}-BOM.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Merge multiple material calculations into one
 */
export function mergeMaterialCalculations(
  calculations: MaterialCalculation[]
): MaterialCalculation {
  if (calculations.length === 0) {
    throw new Error('Cannot merge empty calculations array');
  }

  if (calculations.length === 1) {
    return calculations[0];
  }

  // Combine all materials
  const allMaterials: MaterialSpec[] = [];
  calculations.forEach(calc => {
    allMaterials.push(...calc.materials);
  });

  // Consolidate duplicates
  const consolidated = consolidateMaterials(allMaterials);

  // Sum totals
  const totalArea = calculations.reduce((sum, c) => sum + (c.totalArea || 0), 0);
  const totalLength = calculations.reduce((sum, c) => sum + (c.totalLength || 0), 0);

  return {
    totalArea: totalArea > 0 ? totalArea : undefined,
    totalLength: totalLength > 0 ? totalLength : undefined,
    materials: consolidated,
    assumptions: calculations[0].assumptions, // Use first calculation's assumptions
    calculatedAt: Date.now(),
    calculatedBy: calculations[0].calculatedBy,
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
      existing.quantity += material.quantity;
    } else {
      consolidated.set(material.id, { ...material });
    }
  });

  return Array.from(consolidated.values());
}

