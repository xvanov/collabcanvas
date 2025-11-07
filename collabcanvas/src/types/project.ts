/**
 * Project types for CollabCanvas
 */

export type ProjectStatus = 
  | 'estimating' 
  | 'bid-ready' 
  | 'bid-lost' 
  | 'executing' 
  | 'completed-profitable' 
  | 'completed-unprofitable' 
  | 'completed-unknown';

export type CollaboratorRole = 'editor' | 'viewer';

export interface Collaborator {
  userId: string;
  role: CollaboratorRole;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  ownerId: string;
  collaborators: Collaborator[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  updatedBy: string;
  profitLoss?: number; // Calculated when status is completed-profitable or completed-unprofitable
  actualCosts?: number; // Actual costs entered by user (for profit/loss calculation)
  estimateTotal?: number; // Estimated total from BOM (for profit/loss calculation)
}

