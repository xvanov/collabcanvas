/**
 * Unit tests for Pre-flight Validation Service
 * Tests AC: #2, #3 - Pre-flight Validation and Blocking
 */

import { describe, it, expect } from 'vitest';
import {
  validatePreflight,
  generatePreflightPrompt,
  generateClarifyingQuestions,
  type PreflightValidationResult,
  type ProjectContext,
} from './preflightService';

describe('Pre-flight Validation Service', () => {
  describe('validatePreflight', () => {
    it('should pass validation when all required checks pass', () => {
      const context: ProjectContext = {
        scaleLine: {
          id: 'scale-1',
          realWorldLength: 10,
          unit: 'feet',
        },
        layers: [{ id: 'layer-1', name: 'Walls', shapes: [], visible: true, locked: false, order: 0 }],
        shapes: new Map([['shape-1', { id: 'shape-1', type: 'polyline' }]]),
        scope: { items: [{ scope: 'demo', description: 'Demo work' }], uploadedBy: 'user1' },
      };

      const result = validatePreflight(context);

      expect(result.isValid).toBe(true);
      expect(result.canGenerate).toBe(true);
      expect(result.missingRequired).toHaveLength(0);
      expect(result.checks).toHaveLength(4);
      expect(result.checks.filter(c => c.status === 'pass')).toHaveLength(4);
    });

    it('should fail validation when scale reference is missing', () => {
      const context: ProjectContext = {
        scaleLine: null,
        layers: [{ id: 'layer-1', name: 'Walls', shapes: [], visible: true, locked: false, order: 0 }],
        shapes: new Map([['shape-1', { id: 'shape-1', type: 'polyline' }]]),
        scope: null,
      };

      const result = validatePreflight(context);

      expect(result.isValid).toBe(false);
      expect(result.canGenerate).toBe(false);
      expect(result.missingRequired).toContain('Scale Reference');
      expect(result.checks.find(c => c.id === 'scale-reference')?.status).toBe('fail');
    });

    it('should fail validation when layers are missing', () => {
      const context: ProjectContext = {
        scaleLine: {
          id: 'scale-1',
          realWorldLength: 10,
          unit: 'feet',
        },
        layers: [],
        shapes: new Map([['shape-1', { id: 'shape-1', type: 'polyline' }]]),
        scope: null,
      };

      const result = validatePreflight(context);

      expect(result.isValid).toBe(false);
      expect(result.canGenerate).toBe(false);
      expect(result.missingRequired).toContain('Layers');
      expect(result.checks.find(c => c.id === 'layers')?.status).toBe('fail');
    });

    it('should fail validation when annotations are missing', () => {
      const context: ProjectContext = {
        scaleLine: {
          id: 'scale-1',
          realWorldLength: 10,
          unit: 'feet',
        },
        layers: [{ id: 'layer-1', name: 'Walls', shapes: [], visible: true, locked: false, order: 0 }],
        shapes: new Map(),
        scope: null,
      };

      const result = validatePreflight(context);

      expect(result.isValid).toBe(false);
      expect(result.canGenerate).toBe(false);
      expect(result.missingRequired).toContain('Annotations');
      expect(result.checks.find(c => c.id === 'annotations')?.status).toBe('fail');
    });

    it('should show warning when scope is missing (recommended)', () => {
      const context: ProjectContext = {
        scaleLine: {
          id: 'scale-1',
          realWorldLength: 10,
          unit: 'feet',
        },
        layers: [{ id: 'layer-1', name: 'Walls', shapes: [], visible: true, locked: false, order: 0 }],
        shapes: new Map([['shape-1', { id: 'shape-1', type: 'polyline' }]]),
        scope: null,
      };

      const result = validatePreflight(context);

      expect(result.isValid).toBe(true); // Can still generate without scope
      expect(result.canGenerate).toBe(true);
      expect(result.missingRecommended).toContain('Scope of Work');
      expect(result.checks.find(c => c.id === 'scope')?.status).toBe('warning');
    });

    it('should pass when scope is uploaded (recommended check)', () => {
      const context: ProjectContext = {
        scaleLine: {
          id: 'scale-1',
          realWorldLength: 10,
          unit: 'feet',
        },
        layers: [{ id: 'layer-1', name: 'Walls', shapes: [], visible: true, locked: false, order: 0 }],
        shapes: new Map([['shape-1', { id: 'shape-1', type: 'polyline' }]]),
        scope: { items: [{ scope: 'demo', description: 'Demo work' }], uploadedBy: 'user1' },
      };

      const result = validatePreflight(context);

      expect(result.checks.find(c => c.id === 'scope')?.status).toBe('pass');
    });
  });

  describe('generatePreflightPrompt', () => {
    it('should generate success message when validation passes', () => {
      const result: PreflightValidationResult = {
        isValid: true,
        canGenerate: true,
        checks: [],
        missingRequired: [],
        missingRecommended: ['Scope of Work'],
      };

      const prompt = generatePreflightPrompt(result);

      expect(prompt).toContain('✅ All required checks passed');
      expect(prompt).toContain('Ready to generate');
    });

    it('should generate blocking message when validation fails', () => {
      const result: PreflightValidationResult = {
        isValid: false,
        canGenerate: false,
        checks: [
          {
            id: 'scale-reference',
            label: 'Scale Reference',
            required: true,
            status: 'fail',
            message: 'Scale reference is required',
            category: 'required',
          },
        ],
        missingRequired: ['Scale Reference'],
        missingRecommended: [],
      };

      const prompt = generatePreflightPrompt(result);

      expect(prompt).toContain('❌ Cannot generate');
      expect(prompt).toContain('Required Items');
      expect(prompt).toContain('Scale Reference');
    });
  });

  describe('generateClarifyingQuestions', () => {
    it('should generate questions for missing required items', () => {
      const result: PreflightValidationResult = {
        isValid: false,
        canGenerate: false,
        checks: [
          {
            id: 'scale-reference',
            label: 'Scale Reference',
            required: true,
            status: 'fail',
            message: 'Scale reference is required',
            category: 'required',
          },
          {
            id: 'layers',
            label: 'Layers',
            required: true,
            status: 'fail',
            message: 'Layers are required',
            category: 'required',
          },
        ],
        missingRequired: ['Scale Reference', 'Layers'],
        missingRecommended: [],
      };

      const questions = generateClarifyingQuestions(result);

      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some(q => q.includes('scale'))).toBe(true);
      expect(questions.some(q => q.includes('layer'))).toBe(true);
    });

    it('should generate question for missing scope (recommended)', () => {
      const result: PreflightValidationResult = {
        isValid: true,
        canGenerate: true,
        checks: [
          {
            id: 'scope',
            label: 'Scope of Work',
            required: false,
            status: 'warning',
            message: 'Scope is recommended',
            category: 'recommended',
          },
        ],
        missingRequired: [],
        missingRecommended: ['Scope of Work'],
      };

      const questions = generateClarifyingQuestions(result);

      expect(questions.some(q => q.includes('scope'))).toBe(true);
    });
  });
});

