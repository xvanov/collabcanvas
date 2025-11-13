/**
 * Door Material Calculator
 * Calculates materials for door installation including hardware
 */

import type {
  MaterialSpec,
  DetailedMaterialResult,
} from '../../types/material';

/**
 * Door hardware types
 */
export type DoorHardwareType = 'standard' | 'commercial' | 'heavy-duty';

/**
 * Door assumptions
 */
export interface DoorAssumptions {
  hardwareType: DoorHardwareType;
  includeHinges: boolean;
  includeLockset: boolean;
  includeDoorCloser: boolean;
  includeStrikePlate: boolean;
  includeDoorStop: boolean;
  includeWeatherstripping: boolean;
  doorCount: number;
}

/**
 * Calculate door hardware materials
 */
export function calculateDoorMaterials(
  doorCount: number,
  assumptions: DoorAssumptions
): DetailedMaterialResult {
  const materials: MaterialSpec[] = [];

  // Standard door hardware per door
  if (assumptions.includeHinges) {
    materials.push({
      id: 'door-hinges',
      name: 'Door Hinges (3" x 3.5")',
      category: 'trim',
      unit: 'piece',
      quantity: doorCount * 3, // 3 hinges per door
      wasteFactor: 0.1,
      notes: 'Standard 3 hinges per door',
    });
  }

  if (assumptions.includeLockset) {
    materials.push({
      id: 'door-lockset',
      name: 'Door Lockset (Deadbolt + Handle)',
      category: 'trim',
      unit: 'piece',
      quantity: doorCount,
      wasteFactor: 0.05,
      notes: 'Complete lockset with deadbolt and handle',
    });
  }

  if (assumptions.includeStrikePlate) {
    materials.push({
      id: 'door-strike-plate',
      name: 'Door Strike Plate',
      category: 'trim',
      unit: 'piece',
      quantity: doorCount,
      wasteFactor: 0.1,
      notes: 'Strike plate for door frame',
    });
  }

  if (assumptions.includeDoorStop) {
    materials.push({
      id: 'door-stop',
      name: 'Door Stop (Magnetic)',
      category: 'trim',
      unit: 'piece',
      quantity: doorCount,
      wasteFactor: 0.1,
      notes: 'Magnetic door stop to prevent over-opening',
    });
  }

  if (assumptions.includeWeatherstripping) {
    materials.push({
      id: 'door-weatherstripping',
      name: 'Door Weatherstripping (Self-Adhesive)',
      category: 'trim',
      unit: 'linear-feet',
      quantity: doorCount * 20, // ~20 linear feet per door (perimeter)
      wasteFactor: 0.15,
      notes: 'Weatherstripping for door perimeter',
    });
  }

  // Commercial/heavy-duty specific hardware
  if (assumptions.hardwareType === 'commercial' || assumptions.hardwareType === 'heavy-duty') {
    if (assumptions.includeDoorCloser) {
      materials.push({
        id: 'door-closer',
        name: 'Door Closer (Commercial Grade)',
        category: 'trim',
        unit: 'piece',
        quantity: doorCount,
        wasteFactor: 0.05,
        notes: 'Automatic door closer for commercial applications',
      });
    }

    materials.push({
      id: 'door-push-bar',
      name: 'Push Bar (Exit Device)',
      category: 'trim',
      unit: 'piece',
      quantity: doorCount,
      wasteFactor: 0.05,
      notes: 'Push bar exit device for commercial doors',
    });
  }

  // Additional materials for installation
  materials.push({
    id: 'door-screws',
    name: 'Door Installation Screws (3" #10)',
    category: 'trim',
    unit: 'box',
    quantity: Math.ceil((doorCount * 20) / 100), // ~20 screws per door, 100 per box
    wasteFactor: 0.2,
    notes: 'Screws for mounting hardware',
  });

  materials.push({
    id: 'door-shims',
    name: 'Door Shims (Composite)',
    category: 'trim',
    unit: 'bag',
    quantity: doorCount,
    wasteFactor: 0.2,
    notes: 'Shims for door frame leveling and installation',
  });

  // Build categorized breakdown
  const breakdown = [
    {
      category: 'trim' as const,
      items: materials,
    },
  ];

  return {
    materials,
    breakdown,
    summary: {
      totalItems: materials.reduce((sum, m) => sum + m.quantity, 0),
      totalCategories: 1,
    },
  };
}

/**
 * Calculate materials for a single door
 */
export function calculateSingleDoorMaterials(
  assumptions: DoorAssumptions
): DetailedMaterialResult {
  return calculateDoorMaterials(1, assumptions);
}

/**
 * Calculate materials for multiple doors with different specifications
 */
export function calculateMultipleDoors(
  doors: Array<{ count: number; assumptions?: Partial<DoorAssumptions> }>,
  defaultAssumptions: DoorAssumptions
): DetailedMaterialResult {
  const allMaterials: MaterialSpec[] = [];

  doors.forEach((door) => {
    const doorAssumptions: DoorAssumptions = {
      ...defaultAssumptions,
      ...door.assumptions,
      doorCount: door.count,
    };
    const result = calculateDoorMaterials(door.count, doorAssumptions);
    allMaterials.push(...result.materials);
  });

  // Consolidate duplicate materials
  const consolidated = consolidateMaterials(allMaterials);

  const breakdown = [
    {
      category: 'trim' as const,
      items: consolidated,
    },
  ];

  return {
    materials: consolidated,
    breakdown,
    summary: {
      totalItems: consolidated.reduce((sum, m) => sum + m.quantity, 0),
      totalCategories: 1,
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


