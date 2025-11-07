import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { BillOfMaterials, MaterialSpec } from '../types/material';

const getHomeDepotPriceFn = httpsCallable(functions, 'getHomeDepotPrice');

// Add timeout wrapper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

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
      
      // Add timeout (30 seconds)
      const result = await withTimeout(
        getHomeDepotPriceFn({ request: { materialName: m.name, unit: m.unit, storeNumber: store, deliveryZip } }),
        30000
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
          ? 'Unable to find price - service timed out after 30 seconds' 
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


