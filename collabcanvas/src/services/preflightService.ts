/**
 * Pre-flight Validation Service
 * Validates project completeness before BOM/CPM generation
 * AC: #2, #3
 */

import type { Layer } from '../types';
import type { Scope } from '../types/scope';

export type ViewType = 'scope' | 'time' | 'space' | 'money';

export interface PreflightCheck {
  id: string;
  label: string;
  required: boolean;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  category: 'required' | 'recommended';
}

export interface PreflightValidationResult {
  isValid: boolean;
  checks: PreflightCheck[];
  canGenerate: boolean;
  missingRequired: string[];
  missingRecommended: string[];
}

export interface ProjectContext {
  scaleLine?: {
    id: string;
    realWorldLength: number;
    unit: string;
  } | null;
  layers: Layer[];
  shapes: Map<string, unknown>;
  scope: Scope | null;
}

/**
 * Validate project completeness for BOM/CPM generation
 */
export function validatePreflight(context: ProjectContext): PreflightValidationResult {
  const checks: PreflightCheck[] = [];
  
  // Required checks
  const scaleCheck = checkScaleReference(context.scaleLine);
  checks.push(scaleCheck);
  
  const layersCheck = checkLayersExist(context.layers);
  checks.push(layersCheck);
  
  const annotationsCheck = checkAnnotationsExist(context.shapes);
  checks.push(annotationsCheck);
  
  // Recommended checks
  const scopeCheck = checkScopeUploaded(context.scope);
  checks.push(scopeCheck);
  
  // Determine overall status
  const requiredChecks = checks.filter(c => c.category === 'required');
  const failedRequired = requiredChecks.filter(c => c.status === 'fail');
  const missingRequired = failedRequired.map(c => c.label);
  const missingRecommended = checks
    .filter(c => c.category === 'recommended' && c.status === 'warning')
    .map(c => c.label);
  
  const canGenerate = failedRequired.length === 0;
  
  return {
    isValid: canGenerate,
    checks,
    canGenerate,
    missingRequired,
    missingRecommended,
  };
}

/**
 * Check if scale reference exists (required)
 */
function checkScaleReference(
  scaleLine?: { id: string; realWorldLength: number; unit: string } | null
): PreflightCheck {
  const exists = scaleLine !== null && scaleLine !== undefined && scaleLine.id !== undefined;
  
  return {
    id: 'scale-reference',
    label: 'Scale Reference',
    required: true,
    status: exists ? 'pass' : 'fail',
    message: exists
      ? 'Scale reference is set'
      : 'Scale reference is required. Please set a scale line on your plan.',
    category: 'required',
  };
}

/**
 * Check if layers exist (required)
 */
function checkLayersExist(layers: Layer[]): PreflightCheck {
  const exists = layers.length > 0;
  
  return {
    id: 'layers',
    label: 'Layers',
    required: true,
    status: exists ? 'pass' : 'fail',
    message: exists
      ? `${layers.length} layer(s) found`
      : 'At least one layer is required. Please create a layer and add annotations.',
    category: 'required',
  };
}

/**
 * Check if annotations exist (required)
 */
function checkAnnotationsExist(shapes: Map<string, unknown>): PreflightCheck {
  const exists = shapes.size > 0;
  
  return {
    id: 'annotations',
    label: 'Annotations',
    required: true,
    status: exists ? 'pass' : 'fail',
    message: exists
      ? `${shapes.size} annotation(s) found`
      : 'Annotations are required. Please draw shapes (walls, floors) on your plan.',
    category: 'required',
  };
}

/**
 * Check if scope is uploaded (recommended)
 */
function checkScopeUploaded(scope: Scope | null): PreflightCheck {
  const exists = scope !== null && scope.items !== undefined && scope.items.length > 0;
  
  return {
    id: 'scope',
    label: 'Scope of Work',
    required: false,
    status: exists ? 'pass' : 'warning',
    message: exists
      ? 'Scope of work is uploaded'
      : 'Scope of work is recommended but not required. Upload scope for better BOM accuracy.',
    category: 'recommended',
  };
}

/**
 * Generate AI prompt message for pre-flight validation
 */
export function generatePreflightPrompt(result: PreflightValidationResult): string {
  if (result.canGenerate) {
    let message = '✅ All required checks passed. Ready to generate BOM and Critical Path.\n\n';
    
    if (result.missingRecommended.length > 0) {
      message += '💡 Recommendations:\n';
      result.missingRecommended.forEach(item => {
        message += `- ${item} (recommended but not required)\n`;
      });
      message += '\n';
    }
    
    message += 'Would you like me to proceed with generation?';
    return message;
  }
  
  // Block generation - show what's missing
  let message = '❌ Cannot generate BOM and Critical Path yet. Please complete the following:\n\n';
  
  message += '**Required Items:**\n';
  result.missingRequired.forEach(item => {
    const check = result.checks.find(c => c.label === item);
    message += `- ${item}: ${check?.message || 'Missing'}\n`;
  });
  
  if (result.missingRecommended.length > 0) {
    message += '\n**Recommended Items:**\n';
    result.missingRecommended.forEach(item => {
      const check = result.checks.find(c => c.label === item);
      message += `- ${item}: ${check?.message || 'Missing'}\n`;
    });
  }
  
  message += '\nOnce these are complete, I can generate the BOM and Critical Path.';
  
  return message;
}

/**
 * Generate clarifying questions for missing items
 */
export function generateClarifyingQuestions(result: PreflightValidationResult): string[] {
  const questions: string[] = [];
  
  result.checks.forEach(check => {
    if (check.status === 'fail') {
      switch (check.id) {
        case 'scale-reference':
          questions.push('Have you set a scale reference line on your plan? This is required to calculate real-world measurements.');
          break;
        case 'layers':
          questions.push('Have you created any layers? Please create at least one layer (e.g., "Walls", "Floors") to organize your annotations.');
          break;
        case 'annotations':
          questions.push('Have you drawn any annotations (walls, floors, etc.) on your plan? These are required for material calculations.');
          break;
      }
    } else if (check.status === 'warning' && check.id === 'scope') {
      questions.push('Would you like to upload a scope of work? This helps improve BOM accuracy, but is not required.');
    }
  });
  
  return questions;
}

