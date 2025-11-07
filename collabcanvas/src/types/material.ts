/**
 * Material Estimation Types for Construction Annotation Tool
 * PR-4: Wall Material Estimation
 */

/**
 * Material categories for construction
 */
export type MaterialCategory = 'framing' | 'surface' | 'finish' | 'flooring' | 'trim' | 'insulation';

/**
 * Wall framing types
 */
export type FramingType = 'lumber' | 'metal';

/**
 * Wall surface types
 */
export type SurfaceType = 'drywall' | 'frp';

/**
 * Floor coating types
 */
export type FloorType = 'epoxy' | 'carpet' | 'hardwood' | 'tile';

/**
 * Measurement units for materials
 */
export type MaterialUnit = 'piece' | 'linear-feet' | 'square-feet' | 'gallon' | 'box' | 'roll' | 'bag';

/**
 * Framing spacing options (in inches)
 */
export type FramingSpacing = 16 | 24;

/**
 * Drywall thickness options
 */
export type DrywallThickness = '1/2"' | '5/8"';

/**
 * FRP panel thickness options
 */
export type FRPThickness = '0.090"' | '0.120"';

/**
 * Tile size options
 */
export type TileSize = '12x12' | '18x18' | '24x24';

/**
 * Material specification for a single material item
 */
export interface MaterialSpec {
  id: string;
  name: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  quantity: number;
  wasteFactor?: number; // Percentage as decimal (e.g., 0.1 for 10%)
  notes?: string;
  /** Optional Home Depot pricing fields populated by server-side lookup */
  priceUSD?: number; // unit price in USD
  homeDepotLink?: string; // product link
  priceError?: string; // Error message if price lookup failed (e.g., "Unable to find price - service timed out")
}

/**
 * Insulation types
 */
export type InsulationType = 'none' | 'batt' | 'spray-foam' | 'rigid-foam';

/**
 * Wall material assumptions with granular control
 */
export interface WallAssumptions {
  framing: {
    type: FramingType;
    spacing: FramingSpacing;
    include?: boolean; // Allow excluding if client provides
  };
  surface: {
    type: SurfaceType;
    thickness: DrywallThickness | FRPThickness;
    includeDrywall?: boolean; // Include drywall layer (default: true for FRP, always true for drywall)
    includeFRP?: boolean; // Include FRP layer (only for type: 'frp')
  };
  finish: {
    coats: number;
    includePrimer: boolean;
    include?: boolean; // Allow excluding paint if client provides
  };
  insulation?: {
    type: InsulationType;
    rValue?: number; // R-value (e.g., R-13, R-19)
  };
  height?: number; // Wall height in feet (default: 8)
  doors?: number;
  windows?: number;
}

/**
 * Floor material assumptions
 */
export interface FloorAssumptions {
  type: FloorType;
  preparation: {
    needsCleaning: boolean;
    needsEtching: boolean;
  };
  finish: {
    coats: number;
    includeTopCoat: boolean;
  };
}

/**
 * Material calculation result
 */
export interface MaterialCalculation {
  totalArea?: number; // Square feet
  totalLength?: number; // Linear feet
  materials: MaterialSpec[];
  assumptions: WallAssumptions | FloorAssumptions;
  calculatedAt: number;
  calculatedBy: string;
}

/**
 * Bill of Materials (BOM)
 */
export interface BillOfMaterials {
  id: string;
  projectName?: string;
  calculations: MaterialCalculation[];
  totalMaterials: MaterialSpec[];
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  notes?: string;
  /** BOM-level store number selection (e.g., '3620' for Durham, NC) */
  storeNumber?: string;
  /** Delivery zip code for pricing (e.g., '04401' for Bangor, ME) */
  deliveryZip?: string;
}

/**
 * Material comparison for showing differences
 */
export interface MaterialComparison {
  material: MaterialSpec;
  previousQuantity: number;
  newQuantity: number;
  difference: number;
  percentageChange: number;
}

/**
 * Export format for BOM
 */
export interface BOMExportData {
  headers: string[];
  rows: string[][];
  metadata: {
    projectName?: string;
    generatedAt: number;
    generatedBy: string;
  };
}

/**
 * Wall framing calculation input
 */
export interface WallFramingInput {
  length: number; // Linear feet
  height: number; // Feet
  spacing: FramingSpacing;
  type: FramingType;
}

/**
 * Wall surface calculation input
 */
export interface WallSurfaceInput {
  area: number; // Square feet
  type: SurfaceType;
  thickness: DrywallThickness | FRPThickness;
  framingType: FramingType;
}

/**
 * Floor coating calculation input
 */
export interface FloorCoatingInput {
  area: number; // Square feet
  type: FloorType;
  preparation?: boolean;
}

/**
 * Material calculation result with breakdown
 */
export interface DetailedMaterialResult {
  materials: MaterialSpec[];
  breakdown: {
    category: MaterialCategory;
    items: MaterialSpec[];
  }[];
  summary: {
    totalItems: number;
    totalCategories: number;
  };
}

