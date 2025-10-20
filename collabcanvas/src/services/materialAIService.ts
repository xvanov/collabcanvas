/**
 * Material Estimation AI Service
 * Uses OpenAI to parse natural language material requests
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

interface MaterialAIRequest {
  userMessage: string;
  planImageUrl?: string; // For vision-based queries (can be URL or base64 data URI)
  context?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentSpecifications?: any;
    hasCalculation?: boolean;
    layerInfo?: {
      name: string;
      totalLength?: number;
      totalArea?: number;
    };
  };
}

interface MaterialAIResponse {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  specifications?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visionAnalysis?: any;
  needsClarification?: boolean;
  message?: string;
  error?: string;
}

export class MaterialAIService {
  private functions = getFunctions();

  async parseUserRequest(
    userMessage: string,
    context?: MaterialAIRequest['context'],
    planImageUrl?: string
  ): Promise<MaterialAIResponse> {
    try {
      const callable = httpsCallable<MaterialAIRequest, MaterialAIResponse>(
        this.functions,
        'materialEstimateCommand'
      );

      const result = await callable({
        userMessage,
        context,
        planImageUrl,
      });

      return result.data;
    } catch (error) {
      console.error('Material AI Service Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to process request',
      };
    }
  }

  /**
   * Analyze plan image with vision AI
   */
  async analyzePlanImage(
    query: string,
    imageUrl: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context?: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const response = await this.parseUserRequest(query, context, imageUrl);

    if (response.success && response.visionAnalysis) {
      return response.visionAnalysis;
    }

    return null;
  }

  /**
   * Parse initial material request
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async parseInitialRequest(query: string, layerInfo?: any): Promise<any> {
    const response = await this.parseUserRequest(query, {
      layerInfo,
      hasCalculation: false,
    });

    if (response.success && response.specifications) {
      return response.specifications;
    }

    return {};
  }

  /**
   * Parse refinement request
   */
  async parseRefinement(
    refinementQuery: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentSpecifications: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const response = await this.parseUserRequest(refinementQuery, {
      currentSpecifications,
      hasCalculation: true,
    });

    if (response.success && response.specifications) {
      return response.specifications;
    }

    return {};
  }
}

