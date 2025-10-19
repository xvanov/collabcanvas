/**
 * AI Dialogue Service for Material Estimation
 * PR-4: Manages conversational material estimation
 */

import type {
  DialogueContext,
  MaterialRequest,
  MissingInformation,
  ClarificationRequest,
  AIDialogueResponse,
  RefinementSuggestion,
} from '../types/dialogue';
import type {
  WallAssumptions,
  FloorAssumptions,
  MaterialCalculation,
  Layer,
  Shape,
} from '../types';
import {
  DEFAULT_WALL_ASSUMPTIONS,
  mergeWithDefaults,
} from '../data/defaultAssumptions';
import {
  calculateWallEstimate,
  calculateFloorEstimate,
  compareMaterialCalculations,
} from './materialService';

/**
 * Process a material estimation request
 */
export async function processDialogueRequest(
  context: DialogueContext,
  layers: Layer[],
  shapes: Map<string, Shape>,
  scaleFactor?: number
): Promise<AIDialogueResponse> {
  try {
    const request = context.currentRequest;
    if (!request) {
      return {
        type: 'error',
        message: 'No active request found.',
        error: 'NO_REQUEST',
      };
    }

    // Extract measurements from layers based on request
    const measurements = extractMeasurementsFromLayers(
      request,
      layers,
      shapes,
      scaleFactor
    );

    // Check if we have enough information
    const missingInfo = identifyMissingInformation(request, measurements);

    if (missingInfo.length > 0) {
      // Need clarification
      return generateClarificationRequest(missingInfo, request);
    }

    // We have enough info - generate estimate
    return await generateEstimate(request, measurements, context.userId);
  } catch (error) {
    console.error('Dialogue processing error:', error);
    return {
      type: 'error',
      message: `Failed to process request: ${error instanceof Error ? error.message : String(error)}`,
      error: String(error),
    };
  }
}

/**
 * Extract measurements from canvas layers
 */
interface ExtractedMeasurements {
  walls?: {
    totalLength: number;
    segments: Array<{ length: number }>;
    layerName?: string;
  };
  floors?: {
    totalArea: number;
    areas: Array<{ area: number }>;
    layerName?: string;
  };
}

function extractMeasurementsFromLayers(
  request: MaterialRequest,
  layers: Layer[],
  shapes: Map<string, Shape>,
  scaleFactor: number = 1
): ExtractedMeasurements {
  const measurements: ExtractedMeasurements = {};

  // Determine target type (excluding 'ceiling' which isn't supported yet)
  const inferredType = request.targetType || inferTypeFromQuery(request.originalQuery);
  const targetType: 'wall' | 'floor' | undefined = 
    inferredType === 'ceiling' ? undefined : inferredType;

  // Find relevant layer
  const targetLayer = request.targetLayer
    ? layers.find(l => l.id === request.targetLayer || l.name === request.targetLayer)
    : findRelevantLayer(layers, targetType);

  if (!targetLayer) {
    return measurements;
  }

  // Extract measurements based on target type
  if (targetType === 'wall' || targetType === undefined) {
    // Look for polylines (wall measurements)
    const polylines = targetLayer.shapes
      .map(shapeId => shapes.get(shapeId))
      .filter((shape): shape is Shape => shape !== undefined && shape.type === 'polyline');

    if (polylines.length > 0) {
      const segments = polylines.map(polyline => {
        const length = calculatePolylineLength(polyline, scaleFactor);
        return { length };
      });

      measurements.walls = {
        totalLength: segments.reduce((sum, s) => sum + s.length, 0),
        segments,
        layerName: targetLayer.name,
      };
    }
  }

  if (targetType === 'floor' || targetType === undefined) {
    // Look for polygons (floor areas)
    const polygons = targetLayer.shapes
      .map(shapeId => shapes.get(shapeId))
      .filter((shape): shape is Shape => shape !== undefined && shape.type === 'polygon');

    if (polygons.length > 0) {
      const areas = polygons.map(polygon => {
        const area = calculatePolygonArea(polygon, scaleFactor);
        return { area };
      });

      measurements.floors = {
        totalArea: areas.reduce((sum, a) => sum + a.area, 0),
        areas,
        layerName: targetLayer.name,
      };
    }
  }

  return measurements;
}

/**
 * Infer target type from natural language query
 */
function inferTypeFromQuery(query: string): 'wall' | 'floor' | undefined {
  const lowerQuery = query.toLowerCase();

  const wallKeywords = ['wall', 'framing', 'drywall', 'stud'];
  const floorKeywords = ['floor', 'epoxy', 'tile', 'carpet', 'hardwood'];

  const hasWallKeyword = wallKeywords.some(kw => lowerQuery.includes(kw));
  const hasFloorKeyword = floorKeywords.some(kw => lowerQuery.includes(kw));

  if (hasWallKeyword && !hasFloorKeyword) return 'wall';
  if (hasFloorKeyword && !hasWallKeyword) return 'floor';
  return undefined;
}

/**
 * Find relevant layer based on type
 */
function findRelevantLayer(layers: Layer[], type: 'wall' | 'floor' | undefined): Layer | null {
  if (!type) return layers[0] || null;

  // Look for layer with matching name
  const keywords = type === 'wall' ? ['wall', 'framing'] : ['floor', 'flooring'];
  
  for (const layer of layers) {
    const lowerName = layer.name.toLowerCase();
    if (keywords.some(kw => lowerName.includes(kw))) {
      return layer;
    }
  }

  return null;
}

/**
 * Calculate polyline length (in real-world units based on scale)
 */
function calculatePolylineLength(polyline: Shape, scaleFactor: number): number {
  if (!polyline.points || polyline.points.length < 4) return 0;

  let totalLength = 0;
  const points = polyline.points;

  for (let i = 0; i < points.length - 2; i += 2) {
    const x1 = points[i];
    const y1 = points[i + 1];
    const x2 = points[i + 2];
    const y2 = points[i + 3];

    const dx = x2 - x1;
    const dy = y2 - y1;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    totalLength += segmentLength;
  }

  // Apply scale factor to convert pixels to real-world units
  return totalLength * scaleFactor;
}

/**
 * Calculate polygon area (in square real-world units based on scale)
 */
function calculatePolygonArea(polygon: Shape, scaleFactor: number): number {
  if (!polygon.points || polygon.points.length < 6) return 0;

  // Shoelace formula for polygon area
  let area = 0;
  const points = polygon.points;
  const n = points.length / 2;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const x1 = points[i * 2];
    const y1 = points[i * 2 + 1];
    const x2 = points[j * 2];
    const y2 = points[j * 2 + 1];

    area += x1 * y2 - x2 * y1;
  }

  area = Math.abs(area) / 2;

  // Apply scale factor squared for area
  return area * (scaleFactor * scaleFactor);
}

/**
 * Identify missing information needed for calculation
 */
function identifyMissingInformation(
  request: MaterialRequest,
  measurements: ExtractedMeasurements
): MissingInformation[] {
  const missing: MissingInformation[] = [];

  // Check if we have any measurements
  if (!measurements.walls && !measurements.floors) {
    missing.push({
      field: 'layer',
      question: 'I couldn\'t find any measurements. Could you either:\n1. Create a layer named "Walls" or "Floor" and draw the areas\n2. Specify which layer contains the measurements\n3. Provide the measurements directly',
      type: 'text',
    });
    return missing;
  }

  // For walls: Check if we have framing type specified
  if (measurements.walls) {
    const specs = request.specifications as Partial<WallAssumptions> | undefined;
    if (!specs?.framing) {
      missing.push({
        field: 'framingType',
        question: 'What type of framing would you like?',
        type: 'choice',
        options: [
          { label: 'Lumber (16" spacing)', value: 'lumber-16' },
          { label: 'Lumber (24" spacing)', value: 'lumber-24' },
          { label: 'Metal (16" spacing)', value: 'metal-16' },
          { label: 'Metal (24" spacing)', value: 'metal-24' },
        ],
        defaultValue: 'lumber-16',
      });
    }
  }

  // For floors: Check if we have floor type specified
  if (measurements.floors) {
    const specs = request.specifications as Partial<FloorAssumptions> | undefined;
    if (!specs?.type) {
      missing.push({
        field: 'floorType',
        question: 'What type of flooring?',
        type: 'choice',
        options: [
          { label: 'Epoxy Coating', value: 'epoxy' },
          { label: 'Tile', value: 'tile' },
          { label: 'Carpet', value: 'carpet' },
          { label: 'Hardwood', value: 'hardwood' },
        ],
        defaultValue: 'epoxy',
      });
    }
  }

  return missing;
}

/**
 * Generate clarification request
 */
function generateClarificationRequest(
  missingInfo: MissingInformation[],
  request: MaterialRequest
): AIDialogueResponse {
  const clarification: ClarificationRequest = {
    question: missingInfo.length === 1
      ? missingInfo[0].question
      : 'I need a few more details to calculate the materials:',
    context: request.originalQuery,
    missingInfo,
    canProceedWithDefaults: missingInfo.every(info => info.defaultValue !== undefined),
    defaultAssumptions: DEFAULT_WALL_ASSUMPTIONS,
  };

  let message = clarification.question;
  if (missingInfo.length > 1) {
    missingInfo.forEach((info, index) => {
      message += `\n${index + 1}. ${info.question}`;
    });
  }

  if (clarification.canProceedWithDefaults) {
    message += '\n\nI can proceed with default assumptions if you\'d like.';
  }

  return {
    type: 'clarification',
    message,
    clarification,
  };
}

/**
 * Generate material estimate
 */
async function generateEstimate(
  request: MaterialRequest,
  measurements: ExtractedMeasurements,
  userId: string
): Promise<AIDialogueResponse> {
  let calculation: MaterialCalculation;
  let message: string;

  // Calculate based on what measurements we have
  if (measurements.walls) {
    const assumptions = mergeWithDefaults(
      request.specifications || {},
      'wall'
    ) as WallAssumptions;

    calculation = calculateWallEstimate(
      measurements.walls.totalLength,
      assumptions,
      userId
    );

    message = `Based on the "${measurements.walls.layerName || 'selected'}" layer, I found ${measurements.walls.totalLength.toFixed(1)} linear feet of walls.\n\nCalculated materials with:\n- ${assumptions.framing.type} framing at ${assumptions.framing.spacing}" spacing\n- ${assumptions.surface.thickness} ${assumptions.surface.type}\n- ${assumptions.finish.coats} coat${assumptions.finish.coats > 1 ? 's' : ''} of paint${assumptions.finish.includePrimer ? ' with primer' : ''}`;
  } else if (measurements.floors) {
    const assumptions = mergeWithDefaults(
      request.specifications || {},
      'floor'
    ) as FloorAssumptions;

    calculation = calculateFloorEstimate(
      measurements.floors.totalArea,
      assumptions,
      userId
    );

    message = `Based on the "${measurements.floors.layerName || 'selected'}" layer, I found ${measurements.floors.totalArea.toFixed(1)} square feet of floor area.\n\nCalculated materials for ${assumptions.type} flooring.`;
  } else {
    return {
      type: 'error',
      message: 'No measurements found.',
      error: 'NO_MEASUREMENTS',
    };
  }

  // Generate refinement suggestions
  const suggestions = generateRefinementSuggestions(calculation);

  return {
    type: 'estimate',
    message,
    calculation,
    suggestions,
  };
}

/**
 * Generate refinement suggestions
 */
function generateRefinementSuggestions(calculation: MaterialCalculation): RefinementSuggestion[] {
  const suggestions: RefinementSuggestion[] = [];

  const assumptions = calculation.assumptions as WallAssumptions | FloorAssumptions;

  // Wall-specific suggestions
  if ('framing' in assumptions) {
    const wallAssumptions = assumptions as WallAssumptions;

    if (wallAssumptions.framing.type === 'lumber') {
      suggestions.push({
        id: 'switch-to-metal',
        label: 'Switch to metal framing',
        description: 'Calculate with metal studs instead of lumber',
        action: 'Change framing type to metal',
        impact: 'Will update stud and fastener quantities',
      });
    } else {
      suggestions.push({
        id: 'switch-to-lumber',
        label: 'Switch to lumber framing',
        description: 'Calculate with lumber studs instead of metal',
        action: 'Change framing type to lumber',
        impact: 'Will update stud and fastener quantities',
      });
    }

    if (wallAssumptions.framing.spacing === 16) {
      suggestions.push({
        id: 'spacing-24',
        label: 'Use 24" spacing',
        description: 'Reduce stud count with wider spacing',
        action: 'Change spacing to 24" on center',
        impact: 'Will reduce stud quantity',
      });
    } else {
      suggestions.push({
        id: 'spacing-16',
        label: 'Use 16" spacing',
        description: 'Increase strength with tighter spacing',
        action: 'Change spacing to 16" on center',
        impact: 'Will increase stud quantity',
      });
    }
  }

  // Floor-specific suggestions
  if ('type' in assumptions) {
    const floorAssumptions = assumptions as FloorAssumptions;
    
    const alternativeFloors = ['epoxy', 'tile', 'carpet', 'hardwood'].filter(
      type => type !== floorAssumptions.type
    );

    alternativeFloors.forEach(type => {
      suggestions.push({
        id: `floor-${type}`,
        label: `Compare ${type} flooring`,
        description: `See material requirements for ${type}`,
        action: `Calculate with ${type} instead`,
      });
    });
  }

  return suggestions;
}

/**
 * Handle refinement request
 */
export async function handleRefinement(
  context: DialogueContext,
  refinementId: string,
  layers: Layer[],
  shapes: Map<string, Shape>,
  scaleFactor?: number
): Promise<AIDialogueResponse> {
  if (!context.lastCalculation || !context.currentRequest) {
    return {
      type: 'error',
      message: 'No previous calculation to refine.',
      error: 'NO_PREVIOUS_CALCULATION',
    };
  }

  // Apply refinement to assumptions
  const updatedRequest = applyRefinement(
    context.currentRequest,
    refinementId,
    context.lastCalculation
  );

  // Generate new estimate
  const measurements = extractMeasurementsFromLayers(
    updatedRequest,
    layers,
    shapes,
    scaleFactor
  );

  const response = await generateEstimate(updatedRequest, measurements, context.userId);

  // If successful, add comparison
  if (response.type === 'estimate' && response.calculation) {
    const changes = compareMaterialCalculations(
      context.lastCalculation,
      response.calculation
    );

    if (changes.length > 0) {
      response.message += '\n\nChanges from previous estimate:\n';
      changes.forEach(change => {
        const direction = change.difference > 0 ? '+' : '';
        response.message += `- ${change.materialName}: ${direction}${change.difference.toFixed(0)} (${direction}${change.percentageChange.toFixed(1)}%)\n`;
      });
    }
  }

  return response;
}

/**
 * Apply refinement to request
 */
function applyRefinement(
  request: MaterialRequest,
  refinementId: string,
  previousCalculation: MaterialCalculation
): MaterialRequest {
  const updatedRequest = { ...request };
  const assumptions = previousCalculation.assumptions;

  // Type guard to check if assumptions has framing property
  const isWallAssumptions = (a: typeof assumptions): a is WallAssumptions => 
    'framing' in a;

  // Parse refinement ID and apply changes
  if (refinementId === 'switch-to-metal' && isWallAssumptions(assumptions)) {
    updatedRequest.specifications = {
      ...updatedRequest.specifications,
      framing: {
        type: 'metal' as const,
        spacing: assumptions.framing.spacing,
      },
    };
  } else if (refinementId === 'switch-to-lumber' && isWallAssumptions(assumptions)) {
    updatedRequest.specifications = {
      ...updatedRequest.specifications,
      framing: {
        type: 'lumber' as const,
        spacing: assumptions.framing.spacing,
      },
    };
  } else if (refinementId === 'spacing-24' && isWallAssumptions(assumptions)) {
    updatedRequest.specifications = {
      ...updatedRequest.specifications,
      framing: {
        type: assumptions.framing.type,
        spacing: 24 as const,
      },
    };
  } else if (refinementId === 'spacing-16' && isWallAssumptions(assumptions)) {
    updatedRequest.specifications = {
      ...updatedRequest.specifications,
      framing: {
        type: assumptions.framing.type,
        spacing: 16 as const,
      },
    };
  } else if (refinementId.startsWith('floor-')) {
    const floorType = refinementId.replace('floor-', '');
    updatedRequest.specifications = {
      ...updatedRequest.specifications,
      type: floorType as 'epoxy' | 'tile' | 'carpet' | 'hardwood',
    };
  }

  return updatedRequest;
}

