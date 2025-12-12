/**
 * Pipeline Service
 * Handles agent pipeline orchestration for estimate generation
 * Story: 6-2 - Two-phase UI with progress tracking
 */

import { httpsCallable } from 'firebase/functions';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { functions, firestore } from './firebase';

/**
 * Pipeline stage names (from Epic 2 deep agent pipeline)
 */
export const PIPELINE_STAGES = [
  { id: 'clarification', name: 'Understanding requirements', weight: 10 },
  { id: 'cad_analysis', name: 'Analyzing blueprints', weight: 10 },
  { id: 'location', name: 'Gathering location data', weight: 15 },
  { id: 'scope', name: 'Defining project scope', weight: 20 },
  { id: 'cost', name: 'Calculating costs', weight: 20 },
  { id: 'risk', name: 'Assessing risks', weight: 10 },
  { id: 'final', name: 'Finalizing estimate', weight: 15 },
] as const;

export type PipelineStageId = typeof PIPELINE_STAGES[number]['id'];

/**
 * Pipeline status tracked in Firestore
 */
export interface PipelineProgress {
  status: 'idle' | 'running' | 'complete' | 'error';
  currentStage: PipelineStageId | null;
  stageName: string;
  completedStages: PipelineStageId[];
  progressPercent: number;
  startedAt: number | null;
  completedAt: number | null;
  error?: string;
}

/**
 * Agent output stored in Firestore subcollection
 */
export interface AgentOutput {
  agentId: string;
  agentName: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  output?: Record<string, unknown>;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

/**
 * Initial pipeline progress state
 */
export const INITIAL_PROGRESS: PipelineProgress = {
  status: 'idle',
  currentStage: null,
  stageName: '',
  completedStages: [],
  progressPercent: 0,
  startedAt: null,
  completedAt: null,
};

/**
 * Trigger the estimate generation pipeline
 * Calls the orchestrator Cloud Function to start the 7-agent pipeline
 */
export async function triggerEstimatePipeline(
  projectId: string,
  userId: string
): Promise<{ success: boolean; pipelineId?: string; error?: string }> {
  try {
    // Call the materialEstimateCommand or a dedicated orchestrator function
    // The deep agent pipeline from Epic 2 handles all 7 agents
    const triggerPipelineFn = httpsCallable(functions, 'materialEstimateCommand');

    const result = await triggerPipelineFn({
      projectId,
      userId,
      command: 'generate_full_estimate',
    });

    const data = result.data as { success: boolean; pipelineId?: string; error?: string };

    return {
      success: data.success,
      pipelineId: data.pipelineId,
      error: data.error,
    };
  } catch (error) {
    console.error('[PIPELINE] Error triggering pipeline:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start pipeline',
    };
  }
}

/**
 * Calculate overall progress percentage from completed stages
 */
function calculateProgress(completedStages: PipelineStageId[], currentStage: PipelineStageId | null): number {
  let completedWeight = 0;
  let currentWeight = 0;

  for (const stage of PIPELINE_STAGES) {
    if (completedStages.includes(stage.id)) {
      completedWeight += stage.weight;
    } else if (stage.id === currentStage) {
      // Add half the weight for the current running stage
      currentWeight = stage.weight * 0.5;
      break;
    }
  }

  return Math.min(Math.round(completedWeight + currentWeight), 100);
}

/**
 * Get stage display name
 */
function getStageName(stageId: PipelineStageId | null): string {
  if (!stageId) return '';
  const stage = PIPELINE_STAGES.find(s => s.id === stageId);
  return stage?.name || stageId;
}

/**
 * Subscribe to pipeline progress updates via Firestore
 * Listens to the agentOutputs subcollection for real-time progress
 */
export function subscribeToPipelineProgress(
  projectId: string,
  onUpdate: (progress: PipelineProgress) => void,
  onError: (error: Error) => void
): () => void {
  // Subscribe to the pipeline status document
  const statusDocRef = doc(firestore, 'projects', projectId, 'pipeline', 'status');

  const unsubscribeStatus = onSnapshot(
    statusDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();

        // Map Firestore data to PipelineProgress
        const progress: PipelineProgress = {
          status: data.status || 'idle',
          currentStage: data.currentStage || null,
          stageName: getStageName(data.currentStage),
          completedStages: data.completedStages || [],
          progressPercent: calculateProgress(data.completedStages || [], data.currentStage),
          startedAt: data.startedAt || null,
          completedAt: data.completedAt || null,
          error: data.error,
        };

        onUpdate(progress);
      } else {
        // No pipeline status yet - return initial state
        onUpdate(INITIAL_PROGRESS);
      }
    },
    (error) => {
      console.error('[PIPELINE] Subscription error:', error);
      onError(error);
    }
  );

  return unsubscribeStatus;
}

/**
 * Subscribe to individual agent outputs for detailed progress
 * Useful for showing which agents are complete
 */
export function subscribeToAgentOutputs(
  projectId: string,
  onUpdate: (outputs: AgentOutput[]) => void,
  onError: (error: Error) => void
): () => void {
  const outputsRef = collection(firestore, 'projects', projectId, 'agentOutputs');
  const q = query(outputsRef, orderBy('startedAt', 'desc'), limit(10));

  return onSnapshot(
    q,
    (snapshot) => {
      const outputs: AgentOutput[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        outputs.push({
          agentId: doc.id,
          agentName: data.agentName || doc.id,
          status: data.status || 'pending',
          output: data.output,
          error: data.error,
          startedAt: data.startedAt || Date.now(),
          completedAt: data.completedAt,
        });
      });
      onUpdate(outputs);
    },
    (error) => {
      console.error('[PIPELINE] Agent outputs subscription error:', error);
      onError(error);
    }
  );
}

/**
 * Check if pipeline has already completed (BOM exists)
 */
export async function checkPipelineComplete(projectId: string): Promise<boolean> {
  try {
    const { getBOM } = await import('./bomService');
    const bom = await getBOM(projectId);
    return bom !== null && bom.totalMaterials.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the latest pipeline status
 */
export async function getPipelineStatus(projectId: string): Promise<PipelineProgress> {
  try {
    const { getDoc } = await import('firebase/firestore');
    const statusDocRef = doc(firestore, 'projects', projectId, 'pipeline', 'status');
    const snapshot = await getDoc(statusDocRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        status: data.status || 'idle',
        currentStage: data.currentStage || null,
        stageName: getStageName(data.currentStage),
        completedStages: data.completedStages || [],
        progressPercent: calculateProgress(data.completedStages || [], data.currentStage),
        startedAt: data.startedAt || null,
        completedAt: data.completedAt || null,
        error: data.error,
      };
    }

    return INITIAL_PROGRESS;
  } catch (error) {
    console.error('[PIPELINE] Error getting status:', error);
    return INITIAL_PROGRESS;
  }
}
