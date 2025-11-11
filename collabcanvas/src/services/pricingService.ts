import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { BillOfMaterials, MaterialSpec } from '../types/material';

const getHomeDepotPriceFn = httpsCallable(functions, 'getHomeDepotPrice');

export interface PriceFetchResult {
  material: MaterialSpec;
  success: boolean;
  priceUSD?: number;
  link?: string;
  error?: string;
}

export interface PriceFetchStats {
  total: number;
  successful: number;
  failed: number;
  successRate: number; // Percentage (0-100)
}

// Add timeout wrapper - increased to 60 seconds to match Cloud Function timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 60000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

/**
 * Check if error indicates API unavailability
 */
function isAPIUnavailableError(error: string): boolean {
  const unavailableKeywords = [
    'timeout',
    'network',
    'unavailable',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ECONNRESET',
    'service down',
    'service unavailable',
  ];
  
  const lowerError = error.toLowerCase();
  return unavailableKeywords.some(keyword => lowerError.includes(keyword));
}

/**
 * Fetch prices for all materials in BOM in parallel
 * AC: #5 - Automatic Price Fetching
 * Uses Promise.allSettled() for parallel execution with progressive updates
 * AC: #6, #21, #22 - Price Failure Handling
 */
export async function fetchPricesForBOM(
  bom: BillOfMaterials,
  onProgress?: (stats: PriceFetchStats, updatedBOM?: BillOfMaterials) => void,
  retryFailed?: boolean // Whether to retry failed fetches
): Promise<{ bom: BillOfMaterials; stats: PriceFetchStats }> {
  const store = bom.storeNumber || '3620';
  const deliveryZip = bom.deliveryZip || '04401';
  
  console.log(`[PRICING] Starting parallel price fetch for ${bom.totalMaterials.length} materials`);
  console.log(`[PRICING] Store: ${store}, Delivery Zip: ${deliveryZip}`);

  // Create parallel price fetch promises
  const pricePromises = bom.totalMaterials.map(async (material): Promise<PriceFetchResult> => {
    try {
      console.log(`[PRICING] Fetching price for: ${material.name}${material.unit ? ` (${material.unit})` : ''}`);
      
      const result = await withTimeout(
        getHomeDepotPriceFn({ 
          request: { 
            materialName: material.name, 
            unit: material.unit, 
            storeNumber: store, 
            deliveryZip 
          } 
        })
        // Default timeout: 60 seconds
      );
      
      const data = result.data as { success: boolean; priceUSD: number | null; link: string | null; error?: string };

      if (data.success && data.priceUSD !== null) {
        console.log(`[PRICING] ✅ Success: ${material.name} = $${data.priceUSD}`);
        return {
          material,
          success: true,
          priceUSD: data.priceUSD,
          link: data.link || undefined,
        };
      } else {
        const errorMsg = data.error || 'Unable to find price';
        console.warn(`[PRICING] ⚠️ No price found for: ${material.name} - ${errorMsg}`);
        return {
          material,
          success: false,
          error: errorMsg,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unable to find price - request failed';
      console.error(`[PRICING] ❌ Error fetching price for ${material.name}:`, error);
      
      // Check if this is an API unavailability error (AC: #22)
      const isAPIUnavailable = isAPIUnavailableError(errorMsg);
      
      return {
        material,
        success: false,
        error: isAPIUnavailable 
          ? 'Price API unavailable - please enter price manually'
          : errorMsg.includes('timeout') 
            ? 'Unable to find price - service timed out after 60 seconds' 
            : errorMsg,
      };
    }
  });

  // Execute all price fetches in parallel with progressive updates
  // Process results as they complete (not waiting for all)
  const updatedMaterials = [...bom.totalMaterials];
  let completedCount = 0;
  let successfulCount = 0;
  let results: PriceFetchResult[] = [];

  // Attach handlers to each promise to process results as they complete
  const promiseHandlers = pricePromises.map((promise, index) => 
    promise.then((result) => {
      results[index] = result;
      
      // Find and update the material in the BOM
      const materialIndex = updatedMaterials.findIndex(m => 
        (m.id && m.id === result.material.id) || 
        (!m.id && m.name === result.material.name)
      );

      if (materialIndex >= 0) {
        if (result.success && result.priceUSD !== null) {
          updatedMaterials[materialIndex] = {
            ...updatedMaterials[materialIndex],
            priceUSD: result.priceUSD,
            homeDepotLink: result.link,
            priceError: undefined,
          };
          successfulCount++;
        } else {
          updatedMaterials[materialIndex] = {
            ...updatedMaterials[materialIndex],
            priceError: result.error,
          };
        }
        completedCount++;

        // Update stats and call progress callback with updated BOM
        const stats: PriceFetchStats = {
          total: bom.totalMaterials.length,
          successful: successfulCount,
          failed: completedCount - successfulCount,
          successRate: (successfulCount / completedCount) * 100,
        };

        const updatedBOM: BillOfMaterials = {
          ...bom,
          totalMaterials: [...updatedMaterials], // Create new array for React reactivity
        };

        // Call progress callback for progressive UI updates
        if (onProgress) {
          onProgress(stats, updatedBOM);
        }
      }

      return result;
    }).catch((error) => {
      // Handle promise rejection
      const material = bom.totalMaterials[index];
      const errorResult: PriceFetchResult = {
        material,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      results[index] = errorResult;
      
      const materialIndex = updatedMaterials.findIndex(m => 
        (m.id && m.id === material.id) || 
        (!m.id && m.name === material.name)
      );

      if (materialIndex >= 0) {
        updatedMaterials[materialIndex] = {
          ...updatedMaterials[materialIndex],
          priceError: errorResult.error,
        };
        completedCount++;

        const stats: PriceFetchStats = {
          total: bom.totalMaterials.length,
          successful: successfulCount,
          failed: completedCount - successfulCount,
          successRate: (successfulCount / completedCount) * 100,
        };

        const updatedBOM: BillOfMaterials = {
          ...bom,
          totalMaterials: [...updatedMaterials],
        };

        if (onProgress) {
          onProgress(stats, updatedBOM);
        }
      }

      return errorResult;
    })
  );

  // Wait for all promises to complete (but callbacks fire as each completes)
  await Promise.all(promiseHandlers);

  // Retry failed fetches if requested (AC: #6)
  if (retryFailed) {
    const failedResults = results.filter(r => !r.success);
    if (failedResults.length > 0) {
      console.log(`[PRICING] Retrying ${failedResults.length} failed price fetches...`);
      
      const retryPromises = failedResults.map(async (failedResult): Promise<PriceFetchResult> => {
        try {
          const result = await withTimeout(
            getHomeDepotPriceFn({ 
              request: { 
                materialName: failedResult.material.name, 
                unit: failedResult.material.unit, 
                storeNumber: store, 
                deliveryZip 
              } 
            })
            // Default timeout: 60 seconds
          );
          
          const data = result.data as { success: boolean; priceUSD: number | null; link: string | null; error?: string };
          
          if (data.success && data.priceUSD !== null) {
            console.log(`[PRICING] ✅ Retry success: ${failedResult.material.name} = $${data.priceUSD}`);
            return {
              material: failedResult.material,
              success: true,
              priceUSD: data.priceUSD,
              link: data.link || undefined,
            };
          }
          
          return failedResult; // Keep original failure
        } catch {
          return failedResult; // Keep original failure
        }
      });
      
      const retryResults = await Promise.all(retryPromises);
      
      // Update results with retry outcomes
      results = results.map(original => {
        const retryResult = retryResults.find(r => r.material.id === original.material.id);
        return retryResult || original;
      });
    }
  }

  // Calculate final statistics (materials already updated progressively above)
  const finalSuccessful = results.filter(r => r.success).length;
  const finalFailed = results.length - finalSuccessful;
  const finalSuccessRate = results.length > 0 ? (finalSuccessful / results.length) * 100 : 0;

  const finalStats: PriceFetchStats = {
    total: results.length,
    successful: finalSuccessful,
    failed: finalFailed,
    successRate: finalSuccessRate,
  };

  console.log(`[PRICING] Complete: ${finalSuccessful}/${results.length} materials priced successfully (${finalSuccessRate.toFixed(1)}% success rate)`);

  const finalBOM: BillOfMaterials = {
    ...bom,
    totalMaterials: updatedMaterials,
  };

  return {
    bom: finalBOM,
    stats: finalStats,
  };
}

/**
 * Legacy sequential price fetching (kept for backward compatibility)
 * @deprecated Use fetchPricesForBOM for parallel fetching
 */
export async function updateBOMWithPrices(bom: BillOfMaterials): Promise<BillOfMaterials> {
  const store = bom.storeNumber || '3620';
  const deliveryZip = bom.deliveryZip || '04401'; // Default to Bangor, ME zip (can be made configurable)
  const updatedMaterials: MaterialSpec[] = [];
  
  console.log(`[PRICING] Starting price fetch for ${bom.totalMaterials.length} materials`);
  console.log(`[PRICING] Store: ${store}, Delivery Zip: ${deliveryZip}`);
  console.log(`[PRICING] Functions emulator: ${import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true' ? 'ENABLED' : 'DISABLED'}`);

  for (const m of bom.totalMaterials) {
    try {
      console.log(`[PRICING] Fetching price for: ${m.name}${m.unit ? ` (${m.unit})` : ''}`);
      
      // Add timeout (60 seconds - matches Cloud Function timeout)
      const result = await withTimeout(
        getHomeDepotPriceFn({ request: { materialName: m.name, unit: m.unit, storeNumber: store, deliveryZip } })
        // Default timeout: 60 seconds
      );
      
      console.log(`[PRICING] Received response for ${m.name}:`, result);
      
      const data = result.data as { success: boolean; priceUSD: number | null; link: string | null; error?: string };

      if (data.success && data.priceUSD !== null) {
        console.log(`[PRICING] ✅ Success: ${m.name} = $${data.priceUSD}${data.link ? ` (${data.link})` : ''}`);
        updatedMaterials.push({
          ...m,
          priceUSD: data.priceUSD,
          ...(data.link ? { homeDepotLink: data.link } : {}),
          priceError: undefined, // Clear any previous error
        });
      } else {
        const errorMsg = data.error || 'Unable to find price';
        console.warn(`[PRICING] ⚠️ No price found for: ${m.name}${data.error ? ` - ${data.error}` : ''}`);
        console.log(`[PRICING] Response details:`, { success: data.success, priceUSD: data.priceUSD, error: data.error });
        updatedMaterials.push({ 
          ...m,
          priceError: errorMsg, // Store error message for UI display
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unable to find price - request failed';
      console.error(`[PRICING] ❌ Error fetching price for ${m.name}:`, error);
      console.error(`[PRICING] Error details:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      updatedMaterials.push({ 
        ...m,
        priceError: errorMsg.includes('timeout') 
          ? 'Unable to find price - service timed out after 60 seconds' 
          : errorMsg
      });
    }
  }
  
  const successCount = updatedMaterials.filter(m => m.priceUSD !== null && m.priceUSD !== undefined).length;
  console.log(`[PRICING] Complete: ${successCount}/${bom.totalMaterials.length} materials priced successfully`);

  return {
    ...bom,
    totalMaterials: updatedMaterials,
  };
}


