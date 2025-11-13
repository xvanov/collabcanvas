/**
 * Shared TypeScript types for CollabCanvas
 */

/**
 * Shape types
 */
export type ShapeType = 'rect' | 'circle' | 'text' | 'line' | 'polyline' | 'polygon' | 'arrow-text' | 'boundingbox';

export interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  createdAt: number | null;
  createdBy: string;
  updatedAt: number | null;
  updatedBy: string;
  clientUpdatedAt: number | null;
  // Layer management
  layerId?: string;
  // Optional properties for different shape types
  text?: string;
  fontSize?: number;
  strokeWidth?: number;
  radius?: number;
  points?: number[];
  // Transform properties
  rotation?: number;
  // Bounding box properties
  itemType?: string; // For manual bounding boxes (e.g., "window", "door", "stove")
  confidence?: number; // For AI-generated bounding boxes (0.0-1.0)
  isAIGenerated?: boolean; // Flag to indicate AI-generated bounding box
  source?: 'ai' | 'manual'; // Source of the bounding box annotation
}

/**
 * User data
 */
export interface User {
  uid: string;
  name: string;
  email: string | null;
  photoURL: string | null;
}

/**
 * Presence data (ephemeral, from RTDB)
 */
export interface Presence {
  userId: string;
  name: string;
  color: string;
  cursor: {
    x: number;
    y: number;
  };
  lastSeen: number;
  isActive: boolean;
  currentView?: 'scope' | 'time' | 'space' | 'money';
}

/**
 * Lock data (ephemeral, from RTDB)
 */
export interface Lock {
  userId: string;
  userName: string;
  lockedAt: number;
}

/**
 * Canvas viewport state
 */
export interface ViewportState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Selection box for drag selection
 */
export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Transform operation types
 */
export type TransformOperation = 'move' | 'resize' | 'rotate';

/**
 * Resize handle positions
 */
export type ResizeHandle = 
  | 'nw' | 'n' | 'ne'
  | 'w' | 'e'
  | 'sw' | 's' | 'se';

/**
 * Transform controls state
 */
export interface TransformControls {
  isVisible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  resizeHandles: ResizeHandle[];
}

/**
 * Export options for canvas export functionality
 */
export interface ExportOptions {
  format: 'PNG' | 'SVG';
  quality: number;
  includeBackground: boolean;
  selectedOnly: boolean;
  width?: number;
  height?: number;
}

/**
 * Canvas action data types for undo/redo system
 */
export interface CreateActionData {
  shape: Shape;
}

export interface UpdateActionData {
  property: string;
  newValue: unknown;
  previousData: Record<string, unknown>;
}

export interface MoveActionData {
  x: number;
  y: number;
  previousX: number;
  previousY: number;
}

export interface BulkDeleteActionData {
  deletedShapes: Shape[];
}

export interface BulkDuplicateActionData {
  duplicatedShapes: Shape[];
}

export interface BulkMoveActionData {
  deltaX: number;
  deltaY: number;
}

export interface BulkRotateActionData {
  angle: number;
}

export type CanvasActionData = 
  | CreateActionData
  | UpdateActionData
  | MoveActionData
  | BulkDeleteActionData
  | BulkDuplicateActionData
  | BulkMoveActionData
  | BulkRotateActionData
  | Shape // For DELETE action
  | Record<string, unknown> // For UPDATE revert
  | Shape[] // For bulk operations
  | null; // For actions that don't need data

/**
 * Canvas action for undo/redo system
 */
export interface CanvasAction {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE' | 'BULK_DELETE' | 'BULK_DUPLICATE' | 'BULK_MOVE' | 'BULK_ROTATE';
  shapeId?: string;
  shapeIds?: string[];
  data: CanvasActionData;
  timestamp: number;
  userId: string;
}

/**
 * History state for undo/redo functionality
 */
export interface HistoryState {
  past: CanvasAction[];
  present: CanvasAction | null;
  future: CanvasAction[];
  maxHistorySize: number;
}

/**
 * Layer management types
 */
export interface Layer {
  id: string;
  name: string;
  shapes: string[];
  visible: boolean;
  locked: boolean;
  order: number;
  // PR-3: default color for shapes in this layer
  color?: string;
}

/**
 * Alignment operation types
 */
export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-horizontal' | 'distribute-vertical';

/**
 * Alignment tools state
 */
export interface AlignmentTools {
  alignLeft: () => void;
  alignCenter: () => void;
  alignRight: () => void;
  alignTop: () => void;
  alignMiddle: () => void;
  alignBottom: () => void;
  distributeHorizontally: () => void;
  distributeVertically: () => void;
}

/**
 * Grid state
 */
export interface GridState {
  isVisible: boolean;
  isSnapEnabled: boolean;
  size: number;
  color: string;
  opacity: number;
}

/**
 * Snap indicators for visual feedback
 */
export interface SnapIndicator {
  type: 'horizontal' | 'vertical' | 'corner';
  x: number;
  y: number;
  length: number;
  visible: boolean;
}

/**
 * AI Canvas Agent Types
 */

/**
 * AI Command Types - 8+ distinct command types for rubric compliance
 */
export type AICommandType = 
  | 'CREATE'      // Create shapes (circle, rectangle, text, line)
  | 'MOVE'        // Move shapes to positions
  | 'RESIZE'      // Resize shapes (scale, specific dimensions)
  | 'ROTATE'      // Rotate shapes
  | 'DELETE'      // Delete shapes
  | 'ALIGN'       // Align shapes (left, center, right, distribute)
  | 'EXPORT'      // Export canvas or shapes
  | 'LAYER'       // Layer operations (create, move to layer)
  | 'COLOR'       // Change shape colors
  | 'DUPLICATE';  // Duplicate shapes

/**
 * AI Command parameters
 */
export interface AICommandParameters {
  // Shape creation parameters
  shapeType?: ShapeType;
  color?: string;
  text?: string;
  fontSize?: number;
  
  // Position and size parameters (flat properties for easier access)
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  radius?: number;
  strokeWidth?: number;
  points?: number[];
  rotation?: number;
  
  // Legacy nested properties (for backward compatibility)
  position?: { x: number; y: number };
  size?: { w: number; h: number };
  
  // Target identification
  targetShapes?: string[];
  targetColor?: string;
  targetType?: ShapeType;
  
  // Layout parameters
  alignment?: AlignmentType;
  spacing?: number;
  direction?: 'horizontal' | 'vertical';
  
  // Export parameters
  exportFormat?: 'PNG' | 'SVG';
  exportQuality?: number;
  
  // Layer parameters
  layerName?: string;
  layerId?: string;
  
  // Complex command parameters
  template?: 'login-form' | 'nav-bar' | 'card-layout' | 'flowchart';
  elementCount?: number;
}

/**
 * AI Command structure
 */
export interface AICommand {
  type: AICommandType;
  action: string;
  parameters: AICommandParameters;
  confidence: number;
  timestamp: number;
  userId: string;
  commandId: string;
}

/**
 * AI Command execution result
 */
export interface AICommandResult {
  success: boolean;
  message: string;
  executedCommands: AICommand[];
  createdShapeIds?: string[];
  modifiedShapeIds?: string[];
  deletedShapeIds?: string[];
  error?: string;
  clarificationNeeded?: {
    question: string;
    options: Array<{
      label: string;
      value: string;
      shapeIds?: string[];
    }>;
  };
}

/**
 * AI Status and state management
 */
export interface AIStatus {
  isProcessing: boolean;
  lastCommand?: string;
  lastResult?: AICommandResult;
  error?: string;
  commandQueue: AICommand[];
  queuePosition?: number;
  rateLimitInfo?: {
    commandsRemaining: number;
    resetTime: number;
  };
}

/**
 * AI Command history entry
 */
export interface AICommandHistory {
  commandId: string;
  command: string;
  result: AICommandResult;
  timestamp: number;
  userId: string;
}

/**
 * Complex command templates
 */
export interface ComplexCommandTemplate {
  name: string;
  description: string;
  elements: Array<{
    type: ShapeType;
    properties: Partial<Shape>;
    position: { x: number; y: number };
  }>;
  layout: {
    spacing: number;
    direction: 'horizontal' | 'vertical' | 'grid';
    alignment: AlignmentType;
  };
}

/**
 * AI Service configuration
 */
export interface AIServiceConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  rateLimitPerMinute: number;
  timeoutMs: number;
}

/**
 * Construction Annotation Tool Types
 */

/**
 * Unit types for construction measurements
 */
export type UnitType = 'feet' | 'inches' | 'meters' | 'centimeters' | 'millimeters' | 'yards';

/**
 * Unit configuration with abbreviations and conversion factors
 */
export interface UnitConfig {
  type: UnitType;
  abbreviation: string;
  fullName: string;
  conversionToInches: number; // Base unit for imperial
  conversionToMeters: number; // Base unit for metric
}

/**
 * Unit configurations
 */
export const UNIT_CONFIGS: Record<UnitType, UnitConfig> = {
  feet: {
    type: 'feet',
    abbreviation: 'FT',
    fullName: 'Feet',
    conversionToInches: 12,
    conversionToMeters: 0.3048,
  },
  inches: {
    type: 'inches',
    abbreviation: 'IN',
    fullName: 'Inches',
    conversionToInches: 1,
    conversionToMeters: 0.0254,
  },
  meters: {
    type: 'meters',
    abbreviation: 'M',
    fullName: 'Meters',
    conversionToInches: 39.3701,
    conversionToMeters: 1,
  },
  centimeters: {
    type: 'centimeters',
    abbreviation: 'CM',
    fullName: 'Centimeters',
    conversionToInches: 0.393701,
    conversionToMeters: 0.01,
  },
  millimeters: {
    type: 'millimeters',
    abbreviation: 'MM',
    fullName: 'Millimeters',
    conversionToInches: 0.0393701,
    conversionToMeters: 0.001,
  },
  yards: {
    type: 'yards',
    abbreviation: 'YD',
    fullName: 'Yards',
    conversionToInches: 36,
    conversionToMeters: 0.9144,
  },
};

/**
 * Get available unit types
 */
export function getAvailableUnits(): UnitType[] {
  return Object.keys(UNIT_CONFIGS) as UnitType[];
}
export interface ScaleLine {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  realWorldLength: number;
  unit: UnitType;
  isVisible: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
}

/**
 * Background image for construction plans
 */
export interface BackgroundImage {
  id: string;
  url: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  aspectRatio: number;
  uploadedAt: number;
  uploadedBy: string;
}

/**
 * Canvas scale state for construction measurements
 */
export interface CanvasScale {
  scaleLine: ScaleLine | null;
  backgroundImage: BackgroundImage | null;
  isScaleMode: boolean;
  isImageUploadMode: boolean;
}

/**
 * Export material estimation types
 */
export type {
  MaterialCategory,
  FramingType,
  SurfaceType,
  FloorType,
  MaterialUnit,
  FramingSpacing,
  DrywallThickness,
  FRPThickness,
  TileSize,
  InsulationType,
  MaterialSpec,
  WallAssumptions,
  FloorAssumptions,
  MaterialCalculation,
  BillOfMaterials,
  MaterialComparison,
  BOMExportData,
  WallFramingInput,
  WallSurfaceInput,
  FloorCoatingInput,
  DetailedMaterialResult,
} from './types/material';

export type {
  DialogueMessageType,
  DialogueStage,
  DialogueMessage,
  MaterialRequest,
  MissingInformation,
  ClarificationRequest,
  ClarificationResponse,
  RefinementRequest,
  DialogueContext,
  UserMaterialPreferences,
  RefinementSuggestion,
  AIDialogueResponse,
  DialogueHistory,
} from './types/dialogue';
