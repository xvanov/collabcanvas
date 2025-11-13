/**
 * SageMaker Endpoint Integration Service
 * Client-side service for invoking SageMaker annotation endpoint via Cloud Function
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/**
 * Detection result from SageMaker endpoint
 */
export interface Detection {
  bbox: [number, number, number, number]; // [x_min, y_min, x_max, y_max]
  confidence: number; // 0.0-1.0
  name_hint: string; // e.g., "door", "window"
}

/**
 * Request parameters for annotation endpoint invocation
 */
export interface InvokeAnnotationEndpointRequest {
  imageData: string; // base64-encoded PNG
  projectId: string;
}

/**
 * Response from annotation endpoint invocation
 */
export interface InvokeAnnotationEndpointResponse {
  success: boolean;
  detections: Detection[];
  error?: string;
  message?: string;
}

/**
 * Invoke SageMaker annotation endpoint via Cloud Function
 * 
 * @param imageData - Base64-encoded PNG image data
 * @param projectId - Project ID for context
 * @returns Promise with detections array
 * @throws Error if invocation fails
 */
export async function invokeAnnotationEndpoint(
  imageData: string,
  projectId: string
): Promise<Detection[]> {
  try {
    const sagemakerInvokeFn = httpsCallable<InvokeAnnotationEndpointRequest, InvokeAnnotationEndpointResponse>(
      functions,
      'sagemakerInvoke'
    );

    const result = await sagemakerInvokeFn({
      imageData,
      projectId,
    });

    const data = result.data;

    if (!data.success) {
      throw new Error(data.error || 'Failed to invoke annotation endpoint');
    }

    return data.detections || [];
  } catch (error) {
    console.error('SageMaker Service Error:', error);
    
    // Provide user-friendly error messages
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('service unavailable') || errorMessage.includes('unavailable')) {
        throw new Error('SageMaker endpoint service is unavailable. Please try again later.');
      }
      
      if (errorMessage.includes('not found') || (errorMessage.includes('endpoint') && errorMessage.includes('not found'))) {
        throw new Error('SageMaker endpoint is not available. Please check endpoint configuration.');
      }
      
      if (errorMessage.includes('timeout')) {
        throw new Error('Request timed out. The endpoint may be taking longer than expected. Please try again.');
      }
      
      if (errorMessage.includes('credentials') || errorMessage.includes('aws')) {
        throw new Error('AWS credentials are not configured. Please contact support.');
      }
      
      if (errorMessage.includes('invalid') || errorMessage.includes('format')) {
        throw new Error('Invalid image format. Please ensure the image is a valid PNG.');
      }
    }
    
    throw new Error(`Failed to invoke annotation endpoint: ${error instanceof Error ? error.message : String(error)}`);
  }
}

