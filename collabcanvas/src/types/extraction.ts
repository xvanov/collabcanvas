/**
 * ExtractionResult types for Epic 3 PR2 (CAD parsing).
 *
 * These mirror the CADData / SpaceModel / SpatialRelationships
 * sections in `docs/clarification-output-schema.md` and are aligned
 * with the Python TypedDicts in `functions_py/types/extraction.py`.
 */

export type FileType = 'dwg' | 'dxf' | 'pdf' | 'png' | 'jpg';
export type ExtractionMethod = 'ezdxf' | 'vision';

export interface Dimensions {
  length: number;
  width: number;
  height?: number;
}

export interface Room {
  id: string;
  name: string;
  type: string; // "kitchen", "bathroom", etc.
  sqft: number;
  dimensions: Dimensions;
  confidence: number;
  needsVerification: boolean;
}

export type WallType = 'interior' | 'exterior' | 'load_bearing' | 'partition';

export interface Wall {
  id: string;
  length: number;
  height?: number;
  thickness?: number;
  type: WallType;
  material?: string;
  connectsRooms: string[];
  adjacentWalls: string[];
  confidence: number;
}

export type OpeningType = 'door' | 'window' | 'archway' | 'pass_through';

export type OpeningSide = 'left' | 'right' | 'center';

export type OpeningSwing =
  | 'in'
  | 'out'
  | 'left'
  | 'right'
  | 'sliding'
  | 'pocket';

export interface OpeningPosition {
  distanceFromCorner: number;
  side: OpeningSide;
}

export interface Opening {
  id: string;
  type: OpeningType;
  width: number;
  height: number;
  inWall: string;
  connectsRooms: string[];
  position: OpeningPosition;
  swing?: OpeningSwing;
  confidence: number;
}

export type LengthUnits = 'feet' | 'inches' | 'meters';

export interface BoundingBox {
  length: number;
  width: number;
  height: number;
  units: LengthUnits;
}

export interface Scale {
  detected: boolean;
  ratio?: number;
  units: LengthUnits;
}

export interface SpaceModel {
  totalSqft: number;
  boundingBox: BoundingBox;
  scale: Scale;
  rooms: Room[];
  walls: Wall[];
  openings: Opening[];
}

export type RoomConnectionType = 'door' | 'archway' | 'open' | 'window';

export interface RoomAdjacency {
  room1: string;
  room2: string;
  connection: RoomConnectionType;
  openingId?: string;
}

export interface EntryPoint {
  openingId: string;
  fromSpace: string; // "hallway", "exterior", "garage", etc.
  isPrimary: boolean;
}

export interface SpatialRelationships {
  layoutNarrative: string;
  roomAdjacencies: RoomAdjacency[];
  entryPoints: EntryPoint[];
}

export interface ExtractionResult {
  // File info
  fileUrl: string;
  fileType: FileType;
  extractionMethod: ExtractionMethod;
  extractionConfidence: number; // 0-1 overall confidence

  // Physical space & relationships
  spaceModel: SpaceModel;
  spatialRelationships: SpatialRelationships;

  // Raw extraction payload from parser / model (for debugging)
  rawExtraction?: Record<string, unknown>;
}


