/**
 * Project access control utilities
 * Helper functions to check user permissions for projects
 */

import type { Project, CollaboratorRole } from '../types/project';

/**
 * Get user's role for a project
 * Returns 'owner' | 'editor' | 'viewer' | null
 */
export function getUserProjectRole(project: Project, userId: string): 'owner' | 'editor' | 'viewer' | null {
  if (project.ownerId === userId) {
    return 'owner';
  }
  
  const collaborator = project.collaborators.find(c => c.userId === userId);
  return collaborator?.role || null;
}

/**
 * Check if user can edit a project
 * Owners and editors can edit, viewers cannot
 */
export function canEditProject(project: Project, userId: string): boolean {
  const role = getUserProjectRole(project, userId);
  return role === 'owner' || role === 'editor';
}

/**
 * Check if user can delete a project
 * Only owners can delete
 */
export function canDeleteProject(project: Project, userId: string): boolean {
  return project.ownerId === userId;
}

/**
 * Check if user can share a project
 * Only owners can share
 */
export function canShareProject(project: Project, userId: string): boolean {
  return project.ownerId === userId;
}

/**
 * Check if user has access to view a project
 * Owners, editors, and viewers can view
 */
export function canViewProject(project: Project, userId: string): boolean {
  const role = getUserProjectRole(project, userId);
  return role !== null;
}

