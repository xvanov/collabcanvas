/**
 * AI Dialogue Types for Material Estimation
 * PR-4: Conversational Material Estimation
 */

import type { MaterialCalculation, WallAssumptions, FloorAssumptions, MaterialComparison } from './material';

/**
 * Dialogue message types
 */
export type DialogueMessageType = 'user' | 'assistant' | 'system' | 'clarification' | 'estimate';

/**
 * Dialogue state stages
 */
export type DialogueStage = 'initial' | 'gathering' | 'calculating' | 'refining' | 'complete';

/**
 * Dialogue message
 */
export interface DialogueMessage {
  id: string;
  type: DialogueMessageType;
  content: string;
  timestamp: number;
  userId?: string;
  metadata?: {
    calculation?: MaterialCalculation;
    assumptions?: WallAssumptions | FloorAssumptions;
    changes?: MaterialComparison[];
  };
}

/**
 * Material request from user
 */
export interface MaterialRequest {
  originalQuery: string;
  targetType?: 'wall' | 'floor' | 'ceiling';
  targetLayer?: string;
  measurements?: {
    length?: number;
    area?: number;
    height?: number;
  };
  specifications?: Partial<WallAssumptions | FloorAssumptions>;
}

/**
 * Missing information that needs clarification
 */
export interface MissingInformation {
  field: string;
  question: string;
  type: 'choice' | 'number' | 'text';
  options?: Array<{
    label: string;
    value: string | number;
  }>;
  defaultValue?: string | number;
}

/**
 * Clarification request from AI
 */
export interface ClarificationRequest {
  question: string;
  context: string;
  missingInfo: MissingInformation[];
  canProceedWithDefaults: boolean;
  defaultAssumptions?: Partial<WallAssumptions | FloorAssumptions>;
}

/**
 * User response to clarification
 */
export interface ClarificationResponse {
  clarificationId: string;
  answers: Record<string, string | number>;
  proceedWithDefaults?: boolean;
}

/**
 * Refinement request (user wants to change something)
 */
export interface RefinementRequest {
  originalRequestId: string;
  changes: string; // Natural language description of changes
  specificChanges?: Partial<WallAssumptions | FloorAssumptions>;
}

/**
 * Dialogue context for maintaining conversation state
 */
export interface DialogueContext {
  conversationId: string;
  userId: string;
  stage: DialogueStage;
  currentRequest: MaterialRequest | null;
  pendingClarification: ClarificationRequest | null;
  assumptions: WallAssumptions | FloorAssumptions | null;
  lastCalculation: MaterialCalculation | null;
  messageHistory: DialogueMessage[];
  createdAt: number;
  updatedAt: number;
}

/**
 * User preferences for material estimation
 */
export interface UserMaterialPreferences {
  userId: string;
  defaultFramingType: 'lumber' | 'metal';
  defaultSpacing: 16 | 24;
  defaultWallHeight: number;
  preferredUnits: 'imperial' | 'metric';
  alwaysAskForDoors: boolean;
  alwaysAskForWindows: boolean;
  updatedAt: number;
}

/**
 * Suggestion for refinement
 */
export interface RefinementSuggestion {
  id: string;
  label: string;
  description: string;
  action: string; // What will change
  impact?: string; // How it affects the estimate
}

/**
 * AI response structure
 */
export interface AIDialogueResponse {
  type: 'estimate' | 'clarification' | 'confirmation' | 'error';
  message: string;
  calculation?: MaterialCalculation;
  clarification?: ClarificationRequest;
  suggestions?: RefinementSuggestion[];
  error?: string;
}

/**
 * Dialogue history entry for tracking past conversations
 */
export interface DialogueHistory {
  id: string;
  userId: string;
  request: MaterialRequest;
  response: AIDialogueResponse;
  finalCalculation?: MaterialCalculation;
  timestamp: number;
}

