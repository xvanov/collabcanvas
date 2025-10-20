import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type { BillOfMaterials, MaterialSpec } from '../types/material';

const getHomeDepotPriceFn = httpsCallable(functions, 'getHomeDepotPrice');

export async function updateBOMWithPrices(bom: BillOfMaterials): Promise<BillOfMaterials> {
  const store = bom.storeNumber || '3620';
  const updatedMaterials: MaterialSpec[] = [];

  for (const m of bom.totalMaterials) {
    try {
      const result = await getHomeDepotPriceFn({ request: { materialName: m.name, unit: m.unit, storeNumber: store } });
      const data = result.data as { success: boolean; priceUSD: number | null; link: string | null };

      updatedMaterials.push({
        ...m,
        ...(typeof data.priceUSD === 'number' ? { priceUSD: data.priceUSD } : {}),
        ...(data.link ? { homeDepotLink: data.link } : {}),
      });
    } catch {
      updatedMaterials.push({ ...m });
    }
  }

  return {
    ...bom,
    totalMaterials: updatedMaterials,
  };
}


