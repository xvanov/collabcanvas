/**
 * Critical Path Method (CPM) Types
 * For project scheduling and task dependencies
 */

export interface CPMTask {
  id: string;
  name: string;
  description?: string;
  duration: number; // Duration in days
  dependencies: string[]; // Array of task IDs this task depends on
  startDate?: number; // Calculated start date (timestamp)
  endDate?: number; // Calculated end date (timestamp)
  isCritical?: boolean; // Whether this task is on the critical path
  slack?: number; // Slack time in days
  category?: string; // Task category (e.g., 'demo', 'framing', 'plumbing')
}

export interface CPM {
  id: string;
  projectId: string;
  tasks: CPMTask[];
  criticalPath: string[]; // Array of task IDs forming the critical path
  totalDuration: number; // Total project duration in days
  createdAt: number;
  createdBy: string;
  updatedAt: number;
}

export interface CPMGenerationResult {
  success: boolean;
  cpm?: CPM;
  error?: string;
  message?: string;
}

export interface BOMGenerationResult {
  success: boolean;
  bom?: import('./material').BillOfMaterials;
  error?: string;
  message?: string;
}

export interface ParallelGenerationResult {
  bom: BOMGenerationResult;
  cpm: CPMGenerationResult;
  bothSucceeded: boolean;
  bothFailed: boolean;
  partialSuccess: boolean;
}

