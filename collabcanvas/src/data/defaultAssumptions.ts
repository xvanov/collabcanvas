/**
 * Default assumptions for material calculations
 * PR-4: Standard construction specifications
 */

import type { WallAssumptions, FloorAssumptions } from '../types/material';

/**
 * Default wall construction assumptions
 */
export const DEFAULT_WALL_ASSUMPTIONS: WallAssumptions = {
  framing: {
    type: 'lumber',
    spacing: 16,
  },
  surface: {
    type: 'drywall',
    thickness: '1/2"',
  },
  finish: {
    coats: 2,
    includePrimer: true,
  },
  height: 8, // Standard 8-foot walls
  doors: 0,
  windows: 0,
};

/**
 * Default floor coating assumptions
 */
export const DEFAULT_FLOOR_ASSUMPTIONS: FloorAssumptions = {
  type: 'epoxy',
  preparation: {
    needsCleaning: true,
    needsEtching: true,
  },
  finish: {
    coats: 2,
    includeTopCoat: true,
  },
};

/**
 * Metal framing variant of wall assumptions
 */
export const METAL_WALL_ASSUMPTIONS: WallAssumptions = {
  ...DEFAULT_WALL_ASSUMPTIONS,
  framing: {
    type: 'metal',
    spacing: 24, // Metal framing commonly uses 24" spacing
  },
};

/**
 * FRP surface variant (common in commercial/industrial)
 */
export const FRP_WALL_ASSUMPTIONS: WallAssumptions = {
  ...DEFAULT_WALL_ASSUMPTIONS,
  surface: {
    type: 'frp',
    thickness: '0.090"',
  },
  finish: {
    coats: 0, // FRP doesn't need painting
    includePrimer: false,
  },
};

/**
 * Commercial wall assumptions (higher walls, metal framing)
 */
export const COMMERCIAL_WALL_ASSUMPTIONS: WallAssumptions = {
  framing: {
    type: 'metal',
    spacing: 24,
  },
  surface: {
    type: 'drywall',
    thickness: '5/8"', // Fire-rated drywall
  },
  finish: {
    coats: 2,
    includePrimer: true,
  },
  height: 10, // Commercial spaces often have 10-foot ceilings
  doors: 0,
  windows: 0,
};

/**
 * Assumption templates by use case
 */
export const ASSUMPTION_TEMPLATES = {
  residential: {
    wall: DEFAULT_WALL_ASSUMPTIONS,
    floor: DEFAULT_FLOOR_ASSUMPTIONS,
  },
  commercial: {
    wall: COMMERCIAL_WALL_ASSUMPTIONS,
    floor: {
      ...DEFAULT_FLOOR_ASSUMPTIONS,
      type: 'tile' as const,
    },
  },
  industrial: {
    wall: FRP_WALL_ASSUMPTIONS,
    floor: {
      ...DEFAULT_FLOOR_ASSUMPTIONS,
      type: 'epoxy' as const,
      finish: {
        coats: 3, // Industrial needs more durable coating
        includeTopCoat: true,
      },
    },
  },
} as const;

/**
 * Get assumptions for a specific scenario
 */
export function getAssumptionsForScenario(
  scenario: 'residential' | 'commercial' | 'industrial',
  type: 'wall' | 'floor'
): WallAssumptions | FloorAssumptions {
  return ASSUMPTION_TEMPLATES[scenario][type];
}

/**
 * Merge user-provided specifications with defaults
 */
export function mergeWithDefaults(
  userSpecs: Partial<WallAssumptions> | Partial<FloorAssumptions>,
  type: 'wall' | 'floor'
): WallAssumptions | FloorAssumptions {
  const defaults = type === 'wall' ? DEFAULT_WALL_ASSUMPTIONS : DEFAULT_FLOOR_ASSUMPTIONS;
  
  return {
    ...defaults,
    ...userSpecs,
  } as WallAssumptions | FloorAssumptions;
}

