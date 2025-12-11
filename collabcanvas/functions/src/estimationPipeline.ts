/**
 * Estimation Pipeline Cloud Function
 * Analyzes plan images and annotations to generate ClarificationOutput
 * Uses OpenAI Vision for multi-pass analysis
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { OpenAI } from 'openai';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';
// Node.js 20 has native fetch - no import needed

// Initialize Firebase Admin if not already
if (!admin.apps.length) {
  admin.initializeApp();
}

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env');
const envResult = dotenv.config({ path: envPath, override: true });

const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true' || process.env.NODE_ENV !== 'production';
const apiKeyFromEnv = envResult.parsed?.OPENAI_API_KEY;
const apiKeyFromProcess = process.env.OPENAI_API_KEY;
const apiKey = (isEmulator && apiKeyFromEnv) ? apiKeyFromEnv : (apiKeyFromProcess || apiKeyFromEnv || '');

const openai = new OpenAI({ apiKey });

if (!apiKey) {
  console.warn('⚠️ OPENAI_API_KEY not found. Estimation pipeline will not work.');
}

// ===================
// TYPES
// ===================

interface AnnotatedShape {
  id: string;
  type: string;
  label?: string;
  itemType?: string;
  points?: number[];
  x: number;
  y: number;
  w: number;
  h: number;
  layerId?: string;
}

interface AnnotationSnapshot {
  shapes: AnnotatedShape[];
  layers: Array<{ id: string; name: string }>;
  scale?: {
    pixelsPerUnit: number;
    unit: 'feet' | 'inches' | 'meters';
  };
}

interface EstimationRequest {
  projectId: string;
  sessionId: string;
  planImageUrl: string;
  scopeText: string;
  clarificationData: Record<string, unknown>;
  annotationSnapshot: AnnotationSnapshot;
  passNumber: number;
}

// ===================
// SYSTEM PROMPTS
// ===================

const VISION_ANALYSIS_PROMPT = `You are an expert construction estimator analyzing a floor plan image.
Your task is to identify and quantify all construction elements visible in the plan.

Analyze the image and identify:
1. ROOMS - identify each room, estimate dimensions and square footage
2. WALLS - count walls, estimate lengths, identify interior vs exterior
3. DOORS - count doors, identify types (entry, interior, sliding, pocket)
4. WINDOWS - count windows, estimate sizes
5. FIXTURES - identify kitchen/bathroom fixtures if visible
6. ANNOTATIONS - pay attention to any labels, dimensions, or annotations

For each element, provide:
- Type and description
- Quantity or count
- Estimated dimensions (length, width, area as applicable)
- Confidence level (0.0 to 1.0)
- Location description

Return your analysis as structured JSON.`;

const QUANTIFICATION_PROMPT = `You are generating a detailed Bill of Quantities for a construction project.

Based on the plan analysis and user's scope description, generate quantities for all CSI MasterFormat divisions.

For EACH of the 24 CSI divisions, you must:
1. Determine if it's: included, excluded, by_owner, or not_applicable
2. If excluded, provide a clear exclusion reason
3. If included, list specific line items with:
   - Item description
   - Quantity (MUST be accurate based on plan measurements)
   - Unit (sf, lf, each, etc.)
   - Specifications
   - Confidence (0.0 to 1.0)
   - Source (cad_extraction, user_input, inferred, annotation, standard_allowance)

CSI Divisions to cover:
01 General Requirements, 02 Existing Conditions, 03 Concrete, 04 Masonry,
05 Metals, 06 Wood/Plastics/Composites, 07 Thermal/Moisture, 08 Openings,
09 Finishes, 10 Specialties, 11 Equipment, 12 Furnishings,
13 Special Construction, 14 Conveying Equipment, 21 Fire Suppression,
22 Plumbing, 23 HVAC, 25 Integrated Automation, 26 Electrical,
27 Communications, 28 Electronic Safety/Security, 31 Earthwork,
32 Exterior Improvements, 33 Utilities

Be PRECISE with quantities. Use measurements from the plan.`;

// ===================
// HELPER FUNCTIONS
// ===================

function buildAnnotationContext(annotations: AnnotationSnapshot): string {
  if (!annotations.shapes || annotations.shapes.length === 0) {
    return 'No user annotations provided.';
  }

  const annotationsByType: Record<string, AnnotatedShape[]> = {};
  
  for (const shape of annotations.shapes) {
    const type = shape.itemType || shape.type;
    if (!annotationsByType[type]) {
      annotationsByType[type] = [];
    }
    annotationsByType[type].push(shape);
  }

  let context = 'User annotations from the plan:\n';
  
  for (const [type, shapes] of Object.entries(annotationsByType)) {
    context += `\n${type.toUpperCase()} (${shapes.length} marked):\n`;
    
    for (const shape of shapes) {
      const label = shape.label || 'unlabeled';
      const dims = shape.type === 'polygon' || shape.type === 'polyline'
        ? `points: ${shape.points?.length || 0}`
        : `${Math.round(shape.w)}x${Math.round(shape.h)}`;
      
      context += `  - ${label}: ${dims} at (${Math.round(shape.x)}, ${Math.round(shape.y)})\n`;
    }
  }

  if (annotations.scale) {
    context += `\nScale: ${annotations.scale.pixelsPerUnit} pixels per ${annotations.scale.unit}\n`;
  }

  return context;
}

function createEmptyCSIScope() {
  const divisions = [
    { code: '01', key: 'div01_general_requirements', name: 'General Requirements' },
    { code: '02', key: 'div02_existing_conditions', name: 'Existing Conditions' },
    { code: '03', key: 'div03_concrete', name: 'Concrete' },
    { code: '04', key: 'div04_masonry', name: 'Masonry' },
    { code: '05', key: 'div05_metals', name: 'Metals' },
    { code: '06', key: 'div06_wood_plastics_composites', name: 'Wood, Plastics, and Composites' },
    { code: '07', key: 'div07_thermal_moisture', name: 'Thermal and Moisture Protection' },
    { code: '08', key: 'div08_openings', name: 'Openings' },
    { code: '09', key: 'div09_finishes', name: 'Finishes' },
    { code: '10', key: 'div10_specialties', name: 'Specialties' },
    { code: '11', key: 'div11_equipment', name: 'Equipment' },
    { code: '12', key: 'div12_furnishings', name: 'Furnishings' },
    { code: '13', key: 'div13_special_construction', name: 'Special Construction' },
    { code: '14', key: 'div14_conveying_equipment', name: 'Conveying Equipment' },
    { code: '21', key: 'div21_fire_suppression', name: 'Fire Suppression' },
    { code: '22', key: 'div22_plumbing', name: 'Plumbing' },
    { code: '23', key: 'div23_hvac', name: 'Heating, Ventilating, and Air Conditioning' },
    { code: '25', key: 'div25_integrated_automation', name: 'Integrated Automation' },
    { code: '26', key: 'div26_electrical', name: 'Electrical' },
    { code: '27', key: 'div27_communications', name: 'Communications' },
    { code: '28', key: 'div28_electronic_safety_security', name: 'Electronic Safety and Security' },
    { code: '31', key: 'div31_earthwork', name: 'Earthwork' },
    { code: '32', key: 'div32_exterior_improvements', name: 'Exterior Improvements' },
    { code: '33', key: 'div33_utilities', name: 'Utilities' },
  ];

  const scope: Record<string, unknown> = {};
  
  for (const div of divisions) {
    scope[div.key] = {
      code: div.code,
      name: div.name,
      status: 'not_applicable',
      exclusionReason: 'Not analyzed yet',
      description: '',
      items: [],
    };
  }

  return scope;
}

// ===================
// IMAGE HELPERS
// ===================

/**
 * Downloads an image from URL and converts to base64 data URI
 * This is needed because OpenAI can't access local emulator URLs
 */
async function imageUrlToBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    // Detect content type from URL or default to jpeg
    let mimeType = 'image/jpeg';
    if (imageUrl.toLowerCase().includes('.png')) {
      mimeType = 'image/png';
    } else if (imageUrl.toLowerCase().includes('.webp')) {
      mimeType = 'image/webp';
    }
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Checks if URL is a local emulator URL that OpenAI can't access
 */
function isLocalUrl(url: string): boolean {
  return url.includes('127.0.0.1') || 
         url.includes('localhost') || 
         url.includes('10.0.') || 
         url.includes('192.168.');
}

// ===================
// MAIN PIPELINE
// ===================

async function analyzeWithVision(imageUrl: string, annotationContext: string): Promise<Record<string, unknown>> {
  // Convert local URLs to base64 since OpenAI can't access them
  let imageContent: string;
  if (isLocalUrl(imageUrl)) {
    console.log('[ESTIMATION] Converting local image URL to base64...');
    imageContent = await imageUrlToBase64(imageUrl);
  } else {
    imageContent = imageUrl;
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: VISION_ANALYSIS_PROMPT,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: imageContent,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: `Analyze this floor plan.\n\n${annotationContext}\n\nProvide detailed element identification and measurements.`,
          },
        ],
      },
    ],
    max_tokens: 4000,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from vision analysis');
  }

  return JSON.parse(content);
}

async function generateQuantification(
  visionAnalysis: Record<string, unknown>,
  scopeText: string,
  clarificationData: Record<string, unknown>,
  annotationContext: string
): Promise<Record<string, unknown>> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: QUANTIFICATION_PROMPT,
      },
      {
        role: 'user',
        content: `Generate Bill of Quantities based on:

SCOPE DESCRIPTION:
${scopeText}

CLARIFICATION DATA:
${JSON.stringify(clarificationData, null, 2)}

PLAN ANALYSIS:
${JSON.stringify(visionAnalysis, null, 2)}

USER ANNOTATIONS:
${annotationContext}

Generate complete CSI scope with accurate quantities. Return as JSON with csiScope object containing all 24 divisions.`,
      },
    ],
    max_tokens: 8000,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from quantification');
  }

  return JSON.parse(content);
}

async function generateSpatialModel(
  visionAnalysis: Record<string, unknown>,
  _annotations: AnnotationSnapshot
): Promise<Record<string, unknown>> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: `Based on this plan analysis, generate a spatial model:

${JSON.stringify(visionAnalysis, null, 2)}

Generate JSON with:
- spaceModel: { totalSqft, boundingBox, scale, rooms[], walls[], openings[] }
- spatialRelationships: { layoutNarrative (min 200 chars describing the space), roomAdjacencies[], entryPoints[] }

The layoutNarrative should describe what's next to what, traffic flow, and key spatial relationships.`,
      },
    ],
    max_tokens: 3000,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from spatial model generation');
  }

  return JSON.parse(content);
}

// ===================
// CLOUD FUNCTION
// ===================

export const estimationPipeline = onCall({
  cors: true,
  secrets: ['OPENAI_API_KEY'],
  timeoutSeconds: 300, // 5 minutes for multi-pass analysis
  memory: '1GiB',
}, async (request) => {
  try {
    const data = request.data as EstimationRequest;
    const {
      projectId,
      sessionId,
      planImageUrl,
      scopeText,
      clarificationData,
      annotationSnapshot,
      passNumber = 1,
    } = data;

    if (!planImageUrl || !scopeText) {
      throw new HttpsError('invalid-argument', 'Plan image URL and scope text are required');
    }

    console.log(`[ESTIMATION] Starting pass ${passNumber} for session ${sessionId}`);

    // Build annotation context
    const annotationContext = buildAnnotationContext(annotationSnapshot);

    // Pass 1: Vision analysis of the plan
    console.log('[ESTIMATION] Running vision analysis...');
    const visionAnalysis = await analyzeWithVision(planImageUrl, annotationContext);

    // Pass 2: Generate spatial model
    console.log('[ESTIMATION] Generating spatial model...');
    const spatialData = await generateSpatialModel(visionAnalysis, annotationSnapshot);

    // Pass 3: Generate CSI quantification
    console.log('[ESTIMATION] Generating quantification...');
    const quantificationData = await generateQuantification(
      visionAnalysis,
      scopeText,
      clarificationData,
      annotationContext
    );

    // Assemble ClarificationOutput
    const estimateId = `est_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract project brief from clarification data
    const projectBrief = {
      projectType: (clarificationData.projectType as string) || 'other',
      location: (clarificationData.location as Record<string, unknown>) || {
        fullAddress: '',
        streetAddress: '',
        city: '',
        state: '',
        zipCode: '',
      },
      scopeSummary: {
        description: scopeText,
        totalSqft: (spatialData.spaceModel as Record<string, unknown>)?.totalSqft || 0,
        rooms: [],
        finishLevel: (clarificationData.finishLevel as string) || 'mid_range',
        projectComplexity: 'moderate',
        includedDivisions: [] as string[],
        excludedDivisions: [] as string[],
        byOwnerDivisions: [] as string[],
        notApplicableDivisions: [] as string[],
        totalIncluded: 0,
        totalExcluded: 0,
      },
      specialRequirements: (clarificationData.specialRequirements as string[]) || [],
      exclusions: (clarificationData.exclusions as string[]) || [],
      timeline: {
        flexibility: (clarificationData.flexibility as string) || 'flexible',
      } as { desiredStart?: string; deadline?: string; flexibility: string },
    };
    
    // Only add timeline fields if they have values (Firestore rejects undefined)
    if (clarificationData.desiredStart) {
      projectBrief.timeline.desiredStart = clarificationData.desiredStart as string;
    }
    if (clarificationData.deadline) {
      projectBrief.timeline.deadline = clarificationData.deadline as string;
    }

    // Get CSI scope from quantification or create empty
    const csiScope = (quantificationData.csiScope as Record<string, unknown>) || createEmptyCSIScope();

    // Count divisions by status
    const divisionCounts = { included: 0, excluded: 0, byOwner: 0, notApplicable: 0 };
    for (const [, div] of Object.entries(csiScope)) {
      const divObj = div as Record<string, unknown>;
      const status = divObj.status as string;
      const code = divObj.code as string;
      
      // Skip if code is undefined
      if (!code) continue;
      
      switch (status) {
        case 'included':
          divisionCounts.included++;
          projectBrief.scopeSummary.includedDivisions.push(code);
          break;
        case 'excluded':
          divisionCounts.excluded++;
          projectBrief.scopeSummary.excludedDivisions.push(code);
          break;
        case 'by_owner':
          divisionCounts.byOwner++;
          projectBrief.scopeSummary.byOwnerDivisions.push(code);
          break;
        default:
          divisionCounts.notApplicable++;
          projectBrief.scopeSummary.notApplicableDivisions.push(code);
      }
    }
    projectBrief.scopeSummary.totalIncluded = divisionCounts.included;
    projectBrief.scopeSummary.totalExcluded = divisionCounts.excluded;

    // Build CAD data
    const cadData = {
      fileUrl: planImageUrl,
      fileType: planImageUrl.toLowerCase().includes('.png') ? 'png' : 
                planImageUrl.toLowerCase().includes('.jpg') ? 'jpg' : 'jpeg',
      extractionMethod: 'vision',
      extractionConfidence: 0.85,
      spaceModel: spatialData.spaceModel || {
        totalSqft: 0,
        boundingBox: { length: 0, width: 0, height: 0, units: 'feet' },
        scale: { detected: false, units: 'feet' },
        rooms: [],
        walls: [],
        openings: [],
      },
      spatialRelationships: spatialData.spatialRelationships || {
        layoutNarrative: 'Space analysis pending.',
        roomAdjacencies: [],
        entryPoints: [],
      },
    };

    // Build flags
    const flags = {
      lowConfidenceItems: [] as Array<{ field: string; confidence: number; reason: string }>,
      missingData: [] as string[],
      userVerificationRequired: false,
      verificationItems: [] as string[],
    };

    // Check for low confidence items
    if ((cadData.spaceModel as Record<string, unknown>).totalSqft === 0) {
      flags.missingData.push('Total square footage not detected');
      flags.userVerificationRequired = true;
    }

    const clarificationOutput = {
      estimateId,
      schemaVersion: '3.0.0',
      timestamp: new Date().toISOString(),
      clarificationStatus: 'complete',
      projectBrief,
      csiScope,
      cadData,
      conversation: {
        inputMethod: 'text',
        messageCount: 0,
        clarificationQuestions: [],
        confidenceScore: 0.85,
      },
      flags,
    };

    // Save to Firestore
    const db = admin.firestore();
    await db.collection('projects').doc(projectId)
      .collection('estimations').doc(sessionId)
      .update({
        clarificationOutput,
        status: 'complete',
        analysisPassCount: passNumber,
        lastAnalysisAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    console.log(`[ESTIMATION] Complete. Generated estimate ${estimateId}`);

    return {
      success: true,
      estimateId,
      clarificationOutput,
      passNumber,
    };
  } catch (error) {
    console.error('Estimation Pipeline Error:', error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      'internal',
      `Estimation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

