/**
 * Material specifications and calculation formulas
 * PR-4: Construction material database
 */

import type { MaterialSpec } from '../types/material';

/**
 * Standard waste factors for different materials
 */
export const WASTE_FACTORS = {
  lumber: 0.1, // 10% waste
  metal: 0.1,
  drywall: 0.1,
  paint: 0.1,
  frp: 0.1,
  epoxy: 0.1,
  tile: 0.1,
  carpet: 0.1,
  hardwood: 0.15, // 15% waste for hardwood
  trim: 0.1,
} as const;

/**
 * Coverage rates for various materials
 */
export const COVERAGE_RATES = {
  // Paint coverage (square feet per gallon)
  paint: {
    primer: 350,
    paint: 400,
  },
  // FRP adhesive coverage
  frpAdhesive: 100, // sqft per gallon
  // Epoxy coverage
  epoxy: {
    cleaner: 200,
    etching: 150,
    primer: 300,
    baseCoat: 200,
    topCoat: 250,
  },
  // Tile thin-set and grout
  tile: {
    thinset: 50, // sqft per bag
    grout: 75, // sqft per bag
  },
} as const;

/**
 * Standard dimensions for sheet goods
 */
export const SHEET_DIMENSIONS = {
  drywall: {
    width: 4, // feet
    height: 8, // feet
    area: 32, // square feet
  },
  frp: {
    width: 4,
    height: 8,
    area: 32,
  },
} as const;

/**
 * Calculate lumber framing materials
 */
export function calculateLumberFraming(
  lengthFeet: number,
  heightFeet: number,
  spacing: 16 | 24
): MaterialSpec[] {
  const materials: MaterialSpec[] = [];
  
  // Calculate number of studs needed
  const studCount = Math.ceil((lengthFeet * 12) / spacing) + 3; // +3 for ends and corners
  
  materials.push({
    id: 'lumber-studs',
    name: `2x4 Studs (${heightFeet}')`,
    category: 'framing',
    unit: 'piece',
    quantity: Math.ceil(studCount * (1 + WASTE_FACTORS.lumber)),
    wasteFactor: WASTE_FACTORS.lumber,
    notes: `${spacing}" on center spacing`,
  });
  
  // Top and bottom plates (2 runs of the length)
  const plateLength = lengthFeet * 2;
  materials.push({
    id: 'lumber-plates',
    name: '2x4 Plates',
    category: 'framing',
    unit: 'linear-feet',
    quantity: Math.ceil(plateLength * (1 + WASTE_FACTORS.lumber)),
    wasteFactor: WASTE_FACTORS.lumber,
    notes: 'Top and bottom plates',
  });
  
  // 16d nails (approximately 4 nails per stud)
  materials.push({
    id: 'nails-16d',
    name: '16d Common Nails',
    category: 'framing',
    unit: 'piece',
    quantity: studCount * 4,
    notes: 'Approximately 4 nails per stud',
  });
  
  return materials;
}

/**
 * Calculate metal framing materials
 */
export function calculateMetalFraming(
  lengthFeet: number,
  heightFeet: number,
  spacing: 16 | 24
): MaterialSpec[] {
  const materials: MaterialSpec[] = [];
  
  // Calculate number of metal studs needed
  const studCount = Math.ceil((lengthFeet * 12) / spacing) + 3;
  
  materials.push({
    id: 'metal-studs',
    name: `3-5/8" Metal Studs (${heightFeet}')`,
    category: 'framing',
    unit: 'piece',
    quantity: Math.ceil(studCount * (1 + WASTE_FACTORS.metal)),
    wasteFactor: WASTE_FACTORS.metal,
    notes: `${spacing}" on center spacing`,
  });
  
  // Top and bottom tracks
  const trackLength = lengthFeet * 2;
  materials.push({
    id: 'metal-tracks',
    name: '3-5/8" Metal Track',
    category: 'framing',
    unit: 'linear-feet',
    quantity: Math.ceil(trackLength * (1 + WASTE_FACTORS.metal)),
    wasteFactor: WASTE_FACTORS.metal,
    notes: 'Top and bottom tracks',
  });
  
  // Self-drilling screws (#8)
  materials.push({
    id: 'screws-metal',
    name: '#8 Self-Drilling Screws',
    category: 'framing',
    unit: 'piece',
    quantity: studCount * 4,
    notes: 'Approximately 4 screws per stud',
  });
  
  return materials;
}

/**
 * Calculate drywall materials
 */
export function calculateDrywallMaterials(
  areaSquareFeet: number,
  thickness: '1/2"' | '5/8"',
  framingType: 'lumber' | 'metal'
): MaterialSpec[] {
  const materials: MaterialSpec[] = [];
  
  // Number of drywall sheets (4x8 = 32 sqft per sheet)
  const sheetCount = Math.ceil((areaSquareFeet / SHEET_DIMENSIONS.drywall.area) * (1 + WASTE_FACTORS.drywall));
  
  materials.push({
    id: 'drywall-sheets',
    name: `${thickness} Drywall Sheets (4'x8')`,
    category: 'surface',
    unit: 'piece',
    quantity: sheetCount,
    wasteFactor: WASTE_FACTORS.drywall,
  });
  
  // Drywall screws
  const screwType = framingType === 'lumber' ? '1-5/8" Drywall Screws' : '1-1/4" Drywall Screws';
  const screwsPerSheet = 50; // Approximate
  
  materials.push({
    id: 'drywall-screws',
    name: screwType,
    category: 'surface',
    unit: 'piece',
    quantity: sheetCount * screwsPerSheet,
    notes: `For ${framingType} framing`,
  });
  
  // Joint compound
  const compoundBuckets = Math.ceil(sheetCount / 8); // Approximately 1 bucket per 8 sheets
  materials.push({
    id: 'joint-compound',
    name: 'Joint Compound (5-gallon)',
    category: 'surface',
    unit: 'piece',
    quantity: compoundBuckets,
  });
  
  // Paper tape
  materials.push({
    id: 'paper-tape',
    name: 'Paper Drywall Tape',
    category: 'surface',
    unit: 'roll',
    quantity: Math.ceil(sheetCount / 4), // 1 roll per 4 sheets
  });
  
  return materials;
}

/**
 * Calculate FRP materials
 */
export function calculateFRPMaterials(
  areaSquareFeet: number,
  thickness: '0.090"' | '0.120"'
): MaterialSpec[] {
  const materials: MaterialSpec[] = [];
  
  // FRP panels (4x8 sheets)
  const panelCount = Math.ceil((areaSquareFeet / SHEET_DIMENSIONS.frp.area) * (1 + WASTE_FACTORS.frp));
  
  materials.push({
    id: 'frp-panels',
    name: `${thickness} FRP Panels (4'x8')`,
    category: 'surface',
    unit: 'piece',
    quantity: panelCount,
    wasteFactor: WASTE_FACTORS.frp,
  });
  
  // FRP adhesive
  const adhesiveGallons = Math.ceil((areaSquareFeet / COVERAGE_RATES.frpAdhesive) * (1 + WASTE_FACTORS.frp));
  materials.push({
    id: 'frp-adhesive',
    name: 'FRP Adhesive',
    category: 'surface',
    unit: 'gallon',
    quantity: adhesiveGallons,
    wasteFactor: WASTE_FACTORS.frp,
  });
  
  // FRP rivets (24 per panel)
  materials.push({
    id: 'frp-rivets',
    name: 'FRP Rivets',
    category: 'surface',
    unit: 'piece',
    quantity: panelCount * 24,
    notes: '24 rivets per panel',
  });
  
  return materials;
}

/**
 * Calculate paint materials
 */
export function calculatePaintMaterials(
  areaSquareFeet: number,
  coats: number,
  includePrimer: boolean
): MaterialSpec[] {
  const materials: MaterialSpec[] = [];
  
  // Primer
  if (includePrimer) {
    const primerGallons = Math.ceil((areaSquareFeet / COVERAGE_RATES.paint.primer) * (1 + WASTE_FACTORS.paint));
    materials.push({
      id: 'paint-primer',
      name: 'Primer',
      category: 'finish',
      unit: 'gallon',
      quantity: primerGallons,
      wasteFactor: WASTE_FACTORS.paint,
    });
  }
  
  // Paint
  const paintGallons = Math.ceil(((areaSquareFeet * coats) / COVERAGE_RATES.paint.paint) * (1 + WASTE_FACTORS.paint));
  materials.push({
    id: 'paint',
    name: 'Paint',
    category: 'finish',
    unit: 'gallon',
    quantity: paintGallons,
    wasteFactor: WASTE_FACTORS.paint,
    notes: `${coats} coat${coats > 1 ? 's' : ''}`,
  });
  
  return materials;
}

/**
 * Calculate trim materials
 */
export function calculateTrimMaterials(
  lengthFeet: number,
  doors: number,
  windows: number
): MaterialSpec[] {
  const materials: MaterialSpec[] = [];
  
  // Baseboards (along the length)
  const baseboardLength = Math.ceil(lengthFeet * (1 + WASTE_FACTORS.trim));
  materials.push({
    id: 'baseboards',
    name: 'Baseboards',
    category: 'trim',
    unit: 'linear-feet',
    quantity: baseboardLength,
    wasteFactor: WASTE_FACTORS.trim,
  });
  
  // Door trim (approximately 17 linear feet per door)
  if (doors > 0) {
    const doorTrimLength = Math.ceil(doors * 17 * (1 + WASTE_FACTORS.trim));
    materials.push({
      id: 'door-trim',
      name: 'Door Trim',
      category: 'trim',
      unit: 'linear-feet',
      quantity: doorTrimLength,
      wasteFactor: WASTE_FACTORS.trim,
      notes: `${doors} door${doors > 1 ? 's' : ''}`,
    });
  }
  
  // Window trim (approximately 15 linear feet per window)
  if (windows > 0) {
    const windowTrimLength = Math.ceil(windows * 15 * (1 + WASTE_FACTORS.trim));
    materials.push({
      id: 'window-trim',
      name: 'Window Trim',
      category: 'trim',
      unit: 'linear-feet',
      quantity: windowTrimLength,
      wasteFactor: WASTE_FACTORS.trim,
      notes: `${windows} window${windows > 1 ? 's' : ''}`,
    });
  }
  
  return materials;
}

/**
 * Calculate epoxy floor coating materials
 */
export function calculateEpoxyMaterials(areaSquareFeet: number): MaterialSpec[] {
  const materials: MaterialSpec[] = [];
  
  // Cleaner/degreaser
  materials.push({
    id: 'epoxy-cleaner',
    name: 'Epoxy Cleaner/Degreaser',
    category: 'flooring',
    unit: 'gallon',
    quantity: Math.ceil((areaSquareFeet / COVERAGE_RATES.epoxy.cleaner) * (1 + WASTE_FACTORS.epoxy)),
    wasteFactor: WASTE_FACTORS.epoxy,
  });
  
  // Etching solution
  materials.push({
    id: 'epoxy-etching',
    name: 'Etching Solution',
    category: 'flooring',
    unit: 'gallon',
    quantity: Math.ceil((areaSquareFeet / COVERAGE_RATES.epoxy.etching) * (1 + WASTE_FACTORS.epoxy)),
    wasteFactor: WASTE_FACTORS.epoxy,
  });
  
  // Primer
  materials.push({
    id: 'epoxy-primer',
    name: 'Epoxy Primer',
    category: 'flooring',
    unit: 'gallon',
    quantity: Math.ceil((areaSquareFeet / COVERAGE_RATES.epoxy.primer) * (1 + WASTE_FACTORS.epoxy)),
    wasteFactor: WASTE_FACTORS.epoxy,
  });
  
  // Base coat
  materials.push({
    id: 'epoxy-base',
    name: 'Epoxy Base Coat',
    category: 'flooring',
    unit: 'gallon',
    quantity: Math.ceil((areaSquareFeet / COVERAGE_RATES.epoxy.baseCoat) * (1 + WASTE_FACTORS.epoxy)),
    wasteFactor: WASTE_FACTORS.epoxy,
  });
  
  // Top coat
  materials.push({
    id: 'epoxy-top',
    name: 'Epoxy Top Coat',
    category: 'flooring',
    unit: 'gallon',
    quantity: Math.ceil((areaSquareFeet / COVERAGE_RATES.epoxy.topCoat) * (1 + WASTE_FACTORS.epoxy)),
    wasteFactor: WASTE_FACTORS.epoxy,
  });
  
  return materials;
}

/**
 * Calculate tile materials
 */
export function calculateTileMaterials(
  areaSquareFeet: number,
  size: '12x12' | '18x18' | '24x24'
): MaterialSpec[] {
  const materials: MaterialSpec[] = [];
  
  // Determine tile area based on size
  const tileArea = size === '12x12' ? 1 : size === '18x18' ? 2.25 : 4;
  const tileCount = Math.ceil((areaSquareFeet / tileArea) * (1 + WASTE_FACTORS.tile));
  
  materials.push({
    id: 'tiles',
    name: `${size} Tiles`,
    category: 'flooring',
    unit: 'piece',
    quantity: tileCount,
    wasteFactor: WASTE_FACTORS.tile,
  });
  
  // Thin-set mortar
  materials.push({
    id: 'thinset',
    name: 'Thin-set Mortar',
    category: 'flooring',
    unit: 'bag',
    quantity: Math.ceil((areaSquareFeet / COVERAGE_RATES.tile.thinset) * (1 + WASTE_FACTORS.tile)),
    wasteFactor: WASTE_FACTORS.tile,
  });
  
  // Grout
  materials.push({
    id: 'grout',
    name: 'Tile Grout',
    category: 'flooring',
    unit: 'bag',
    quantity: Math.ceil((areaSquareFeet / COVERAGE_RATES.tile.grout) * (1 + WASTE_FACTORS.tile)),
    wasteFactor: WASTE_FACTORS.tile,
  });
  
  return materials;
}

/**
 * Calculate carpet materials
 */
export function calculateCarpetMaterials(areaSquareFeet: number): MaterialSpec[] {
  const materials: MaterialSpec[] = [];
  
  const rollWidth = 12; // Standard 12-foot wide rolls
  const rolls = Math.ceil((areaSquareFeet / (rollWidth * 12)) * (1 + WASTE_FACTORS.carpet));
  
  materials.push({
    id: 'carpet-rolls',
    name: 'Carpet Rolls (12\' wide)',
    category: 'flooring',
    unit: 'roll',
    quantity: rolls,
    wasteFactor: WASTE_FACTORS.carpet,
  });
  
  // Padding
  materials.push({
    id: 'carpet-padding',
    name: 'Carpet Padding',
    category: 'flooring',
    unit: 'square-feet',
    quantity: Math.ceil(areaSquareFeet * (1 + WASTE_FACTORS.carpet)),
    wasteFactor: WASTE_FACTORS.carpet,
  });
  
  // Tack strips (perimeter)
  const perimeter = Math.sqrt(areaSquareFeet) * 4;
  materials.push({
    id: 'tack-strips',
    name: 'Tack Strips',
    category: 'flooring',
    unit: 'linear-feet',
    quantity: Math.ceil(perimeter * (1 + WASTE_FACTORS.carpet)),
    wasteFactor: WASTE_FACTORS.carpet,
  });
  
  return materials;
}

/**
 * Calculate hardwood flooring materials
 */
export function calculateHardwoodMaterials(areaSquareFeet: number): MaterialSpec[] {
  const materials: MaterialSpec[] = [];
  
  const boxCoverage = 20; // Standard box covers 20 sqft
  const boxes = Math.ceil((areaSquareFeet / boxCoverage) * (1 + WASTE_FACTORS.hardwood));
  
  materials.push({
    id: 'hardwood-boxes',
    name: 'Hardwood Flooring Boxes',
    category: 'flooring',
    unit: 'box',
    quantity: boxes,
    wasteFactor: WASTE_FACTORS.hardwood,
    notes: '20 sqft per box',
  });
  
  // Underlayment
  materials.push({
    id: 'underlayment',
    name: 'Underlayment',
    category: 'flooring',
    unit: 'square-feet',
    quantity: Math.ceil(areaSquareFeet * (1 + WASTE_FACTORS.hardwood)),
    wasteFactor: WASTE_FACTORS.hardwood,
  });
  
  // Flooring nails (approximately 2.5 nails per sqft)
  materials.push({
    id: 'flooring-nails',
    name: 'Flooring Nails',
    category: 'flooring',
    unit: 'piece',
    quantity: Math.ceil(areaSquareFeet * 2.5),
    notes: 'Approximately 2.5 nails per sqft',
  });
  
  return materials;
}

