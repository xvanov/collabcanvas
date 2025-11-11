/**
 * BOM Service
 * Handles Bill of Materials generation and operations
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { BillOfMaterials, MaterialSpec } from '../types/material';
import { fetchPricesForBOM, type PriceFetchStats } from './pricingService';
import { calculateMargin, type MarginCalculationOptions } from './marginService';
import { getCPM } from './cpmService';

export interface BOMGenerationOptions {
  projectId: string;
  userId: string;
  annotations?: unknown[]; // Shape data from canvas
  scope?: { items: Array<{ scope: string; description: string }> };
  scaleFactor?: number;
  autoFetchPrices?: boolean; // Whether to automatically fetch prices after generation
  onPriceProgress?: (stats: PriceFetchStats) => void; // Progress callback for price fetching
}

/**
 * Generate BOM for a project
 * Calls Cloud Function to analyze annotations and scope, generate material list
 * Optionally fetches prices automatically after generation
 */
export async function generateBOM(options: BOMGenerationOptions): Promise<BillOfMaterials> {
  try {
    // TODO: Create generateBOM Cloud Function
    // For now, return a placeholder structure
    // The actual implementation will call a Cloud Function that uses AI to analyze
    // annotations and scope to generate materials
    
    const generateBOMFn = httpsCallable(functions, 'generateBOM');
    
    const result = await generateBOMFn({
      projectId: options.projectId,
      userId: options.userId,
      annotations: options.annotations || [],
      scope: options.scope,
      scaleFactor: options.scaleFactor,
    });

    const data = result.data as { bom: BillOfMaterials; success: boolean; error?: string };
    
    if (!data.success || !data.bom) {
      throw new Error(data.error || 'Failed to generate BOM');
    }

    let bom = data.bom;

    // Automatically fetch prices if requested (AC: #5)
    if (options.autoFetchPrices !== false) {
      try {
        const priceResult = await fetchPricesForBOM(bom, options.onPriceProgress);
        bom = priceResult.bom;
        console.log(`[BOM] Price fetching complete: ${priceResult.stats.successRate.toFixed(1)}% success rate`);
      } catch (priceError) {
        console.error('[BOM] Error fetching prices:', priceError);
        // Don't fail BOM generation if price fetching fails - prices can be fetched later
      }
    }

    // Calculate margin after prices are fetched (AC: #8, #9)
    try {
      const cpm = await getCPM(options.projectId);
      const marginCalculation = calculateMargin({
        bom,
        cpm,
        marginPercentage: 0.20, // Default 20% margin
      });
      
      bom.margin = {
        ...marginCalculation,
        calculatedAt: Date.now(),
      };
      
      console.log(`[BOM] Margin calculated: $${marginCalculation.marginDollars.toFixed(2)} (${(marginCalculation.marginPercentage * 100).toFixed(1)}%)`);
    } catch (marginError) {
      console.error('[BOM] Error calculating margin:', marginError);
      // Don't fail BOM generation if margin calculation fails - margin can be calculated later
    }

    return bom;
  } catch (error) {
    console.error('BOM Generation Error:', error);
    throw new Error(`Failed to generate BOM: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if BOM is complete (all materials have prices)
 * AC: #7 - BOM Completion Blocking
 */
export function isBOMComplete(bom: BillOfMaterials): {
  isComplete: boolean;
  incompleteMaterials: Array<{ index: number; material: MaterialSpec; reason: string }>;
} {
  const incompleteMaterials: Array<{ index: number; material: MaterialSpec; reason: string }> = [];

  bom.totalMaterials.forEach((material, index) => {
    // Check if material has a price (either fetched or manually entered)
    const hasPrice = material.priceUSD !== null && material.priceUSD !== undefined;
    
    if (!hasPrice) {
      incompleteMaterials.push({
        index,
        material,
        reason: material.priceError 
          ? `Price unavailable: ${material.priceError}` 
          : 'Price not entered',
      });
    }
  });

  return {
    isComplete: incompleteMaterials.length === 0,
    incompleteMaterials,
  };
}

/**
 * Get completion status message for UI display
 */
export function getBOMCompletionMessage(bom: BillOfMaterials): string {
  const { isComplete, incompleteMaterials } = isBOMComplete(bom);

  if (isComplete) {
    return '✅ All materials have prices. BOM is complete.';
  }

  if (incompleteMaterials.length === bom.totalMaterials.length) {
    return `❌ No materials have prices. Please enter prices for all ${bom.totalMaterials.length} materials.`;
  }

  const missingCount = incompleteMaterials.length;
  const totalCount = bom.totalMaterials.length;
  
  let message = `⚠️ BOM incomplete: ${missingCount} of ${totalCount} materials need prices.\n\n`;
  message += '**Materials needing prices:**\n';
  
  incompleteMaterials.slice(0, 10).forEach(({ material, reason }) => {
    message += `- ${material.name} (${material.quantity} ${material.unit}): ${reason}\n`;
  });
  
  if (incompleteMaterials.length > 10) {
    message += `\n... and ${incompleteMaterials.length - 10} more`;
  }
  
  message += '\n\nPlease enter prices for all materials before completing the BOM.';

  return message;
}
export async function getBOM(projectId: string): Promise<BillOfMaterials | null> {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { firestore } = await import('./firebase');
    
    const bomRef = doc(firestore, 'projects', projectId, 'bom', 'data');
    const bomSnap = await getDoc(bomRef);
    
    if (!bomSnap.exists()) {
      return null;
    }
    
    const data = bomSnap.data();
    return {
      id: bomSnap.id,
      ...data,
    } as BillOfMaterials;
  } catch (error) {
    console.error('Error getting BOM:', error);
    throw error;
  }
}

/**
 * Recalculate margin for BOM
 * AC: #8, #9 - Margin Calculation
 * Call this when BOM prices change or CPM is updated
 */
export async function recalculateMargin(
  projectId: string,
  bom: BillOfMaterials,
  marginPercentage?: number
): Promise<BillOfMaterials> {
  try {
    const cpm = await getCPM(projectId);
    const marginCalculation = calculateMargin({
      bom,
      cpm,
      marginPercentage: marginPercentage || bom.margin?.marginPercentage || 0.20,
    });
    
    const updatedBOM: BillOfMaterials = {
      ...bom,
      margin: {
        ...marginCalculation,
        calculatedAt: Date.now(),
      },
    };
    
    console.log(`[BOM] Margin recalculated: $${marginCalculation.marginDollars.toFixed(2)} (${(marginCalculation.marginPercentage * 100).toFixed(1)}%)`);
    
    return updatedBOM;
  } catch (error) {
    console.error('[BOM] Error recalculating margin:', error);
    throw error;
  }
}

/**
 * Update actual cost for a specific material in BOM
 * AC: #12-15 - Actual Cost Input
 * @param projectId - Project ID
 * @param materialId - Material ID or name (for matching)
 * @param actualCostUSD - Actual TOTAL cost in USD (not unit price)
 * @param userId - User ID who is entering the cost
 * @param bom - Optional BOM to update (if not provided, will fetch from Firestore)
 */
export async function updateActualCost(
  projectId: string,
  materialId: string,
  actualCostUSD: number | null,
  userId: string,
  bom?: BillOfMaterials
): Promise<BillOfMaterials> {
  try {
    // Use provided BOM or fetch from Firestore
    let currentBOM = bom;
    if (!currentBOM) {
      currentBOM = await getBOM(projectId);
    }
    
    if (!currentBOM) {
      throw new Error('BOM not found. Please generate a BOM first.');
    }

    // Find material by ID or name
    const materialIndex = currentBOM.totalMaterials.findIndex(m => 
      (m.id && m.id === materialId) || 
      (!m.id && m.name === materialId)
    );

    if (materialIndex === -1) {
      throw new Error(`Material not found: ${materialId}`);
    }

    // Update material with actual cost
    const updatedMaterials = [...currentBOM.totalMaterials];
    updatedMaterials[materialIndex] = {
      ...updatedMaterials[materialIndex],
      actualCostUSD: actualCostUSD !== null ? actualCostUSD : undefined,
      actualCostEnteredAt: actualCostUSD !== null ? Date.now() : undefined,
      actualCostEnteredBy: actualCostUSD !== null ? userId : undefined,
    };

    const updatedBOM: BillOfMaterials = {
      ...currentBOM,
      totalMaterials: updatedMaterials,
    };

    // Save to Firestore
    await saveBOM(projectId, updatedBOM, userId);

    return updatedBOM;
  } catch (error) {
    console.error('[BOM] Error updating actual cost:', error);
    throw error;
  }
}

/**
 * Remove undefined values from an object (Firestore doesn't allow undefined)
 */
function removeUndefinedValues<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        cleaned[key as keyof T] = value.map(item => 
          typeof item === 'object' && item !== null 
            ? removeUndefinedValues(item as Record<string, unknown>) as T[keyof T]
            : item
        ) as T[keyof T];
      } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
        cleaned[key as keyof T] = removeUndefinedValues(value as Record<string, unknown>) as T[keyof T];
      } else {
        cleaned[key as keyof T] = value;
      }
    }
  }
  return cleaned;
}

/**
 * Save BOM to Firestore
 */
export async function saveBOM(projectId: string, bom: BillOfMaterials, userId: string): Promise<void> {
  try {
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    const { firestore } = await import('./firebase');
    
    const bomRef = doc(firestore, 'projects', projectId, 'bom', 'data');
    
    // Remove undefined values before saving (Firestore doesn't allow undefined)
    const cleanedBOM = removeUndefinedValues(bom);
    
    await setDoc(bomRef, {
      ...cleanedBOM,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    }, { merge: true });
  } catch (error) {
    console.error('Error saving BOM:', error);
    throw error;
  }
}

