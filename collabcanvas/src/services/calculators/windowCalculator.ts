/**
 * Window Material Calculator
 * Calculates materials for window installation including flashing, caulk, and sealants
 */

import type {
  MaterialSpec,
  DetailedMaterialResult,
} from '../../types/material';

/**
 * Window types
 */
export type WindowType = 'standard' | 'commercial' | 'impact-resistant';

/**
 * Window assumptions
 */
export interface WindowAssumptions {
  windowType: WindowType;
  includeFlashing: boolean;
  includeCaulk: boolean;
  includeSealant: boolean;
  includeTrim: boolean;
  includeInsulation: boolean;
  windowCount: number;
  averageWindowPerimeter?: number; // Linear feet per window (default calculated)
}

/**
 * Calculate window installation materials
 */
export function calculateWindowMaterials(
  windowCount: number,
  assumptions: WindowAssumptions
): DetailedMaterialResult {
  const materials: MaterialSpec[] = [];

  // Average window perimeter (if not specified, estimate based on standard window sizes)
  const avgPerimeter = assumptions.averageWindowPerimeter || 12; // ~12 linear feet for standard window

  // Flashing materials
  if (assumptions.includeFlashing) {
    materials.push({
      id: 'window-flashing-tape',
      name: 'Window Flashing Tape (Self-Adhesive)',
      category: 'trim',
      unit: 'roll',
      quantity: Math.ceil((windowCount * avgPerimeter) / 50), // ~50 linear feet per roll
      wasteFactor: 0.15,
      notes: 'Self-adhesive flashing tape for window perimeter',
    });

    materials.push({
      id: 'window-flashing-metal',
      name: 'Metal Flashing (Aluminum)',
      category: 'trim',
      unit: 'linear-feet',
      quantity: windowCount * avgPerimeter,
      wasteFactor: 0.2,
      notes: 'Metal flashing for window head and sill',
    });
  }

  // Caulk and sealants
  if (assumptions.includeCaulk) {
    materials.push({
      id: 'window-caulk',
      name: 'Window Caulk (Acrylic Latex)',
      category: 'trim',
      unit: 'tube',
      quantity: Math.ceil((windowCount * avgPerimeter) / 25), // ~25 linear feet per tube
      wasteFactor: 0.2,
      notes: 'Acrylic latex caulk for interior window sealing',
    });
  }

  if (assumptions.includeSealant) {
    materials.push({
      id: 'window-sealant',
      name: 'Window Sealant (Silicone)',
      category: 'trim',
      unit: 'tube',
      quantity: Math.ceil((windowCount * avgPerimeter) / 20), // ~20 linear feet per tube
      wasteFactor: 0.2,
      notes: 'Silicone sealant for exterior window weatherproofing',
    });

    materials.push({
      id: 'window-backer-rod',
      name: 'Backer Rod (Foam)',
      category: 'trim',
      unit: 'linear-feet',
      quantity: windowCount * avgPerimeter,
      wasteFactor: 0.15,
      notes: 'Foam backer rod for sealant application',
    });
  }

  // Window trim
  if (assumptions.includeTrim) {
    materials.push({
      id: 'window-trim-interior',
      name: 'Interior Window Trim (1x4)',
      category: 'trim',
      unit: 'linear-feet',
      quantity: windowCount * avgPerimeter,
      wasteFactor: 0.15,
      notes: 'Interior trim boards for window frame',
    });

    materials.push({
      id: 'window-trim-exterior',
      name: 'Exterior Window Trim (1x6)',
      category: 'trim',
      unit: 'linear-feet',
      quantity: windowCount * avgPerimeter,
      wasteFactor: 0.15,
      notes: 'Exterior trim boards for window frame',
    });
  }

  // Insulation around windows
  if (assumptions.includeInsulation) {
    materials.push({
      id: 'window-insulation-foam',
      name: 'Window Insulation Foam (Expanding)',
      category: 'insulation',
      unit: 'can',
      quantity: Math.ceil(windowCount / 2), // ~2 windows per can
      wasteFactor: 0.2,
      notes: 'Expanding foam insulation for window gaps',
    });
  }

  // Installation hardware
  materials.push({
    id: 'window-screws',
    name: 'Window Installation Screws (3" #10)',
    category: 'trim',
    unit: 'box',
    quantity: Math.ceil((windowCount * 16) / 100), // ~16 screws per window, 100 per box
    wasteFactor: 0.2,
    notes: 'Screws for mounting window frame',
  });

  materials.push({
    id: 'window-shims',
    name: 'Window Shims (Composite)',
    category: 'trim',
    unit: 'bag',
    quantity: windowCount,
    wasteFactor: 0.2,
    notes: 'Shims for window frame leveling and installation',
  });

  // Commercial/impact-resistant specific materials
  if (assumptions.windowType === 'commercial' || assumptions.windowType === 'impact-resistant') {
    materials.push({
      id: 'window-security-film',
      name: 'Window Security Film',
      category: 'trim',
      unit: 'square-feet',
      quantity: windowCount * 20, // Estimate 20 sq ft per window
      wasteFactor: 0.15,
      notes: 'Security film for impact-resistant windows',
    });
  }

  // Build categorized breakdown
  const breakdown = [
    {
      category: 'trim' as const,
      items: materials.filter(m => m.category === 'trim'),
    },
    {
      category: 'insulation' as const,
      items: materials.filter(m => m.category === 'insulation'),
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
 * Calculate materials for a single window
 */
export function calculateSingleWindowMaterials(
  assumptions: WindowAssumptions
): DetailedMaterialResult {
  return calculateWindowMaterials(1, assumptions);
}

/**
 * Calculate materials for multiple windows with different specifications
 */
export function calculateMultipleWindows(
  windows: Array<{ count: number; assumptions?: Partial<WindowAssumptions> }>,
  defaultAssumptions: WindowAssumptions
): DetailedMaterialResult {
  const allMaterials: MaterialSpec[] = [];

  windows.forEach((window) => {
    const windowAssumptions: WindowAssumptions = {
      ...defaultAssumptions,
      ...window.assumptions,
      windowCount: window.count,
    };
    const result = calculateWindowMaterials(window.count, windowAssumptions);
    allMaterials.push(...result.materials);
  });

  // Consolidate duplicate materials
  const consolidated = consolidateMaterials(allMaterials);

  const breakdown = [
    {
      category: 'trim' as const,
      items: consolidated.filter(m => m.category === 'trim'),
    },
    {
      category: 'insulation' as const,
      items: consolidated.filter(m => m.category === 'insulation'),
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
      existing.quantity += material.quantity;
    } else {
      consolidated.set(material.id, { ...material });
    }
  });

  return Array.from(consolidated.values());
}


