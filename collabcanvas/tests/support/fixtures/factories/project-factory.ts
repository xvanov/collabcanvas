import { faker } from '@faker-js/faker';
import type { Project, ProjectStatus } from '../../../../src/types/project';

/**
 * Project data factory for test data generation
 * 
 * Uses faker.js to generate realistic, unique test data.
 * Tracks created projects for automatic cleanup.
 * 
 * @see bmad/bmm/testarch/knowledge/data-factories.md
 */
export class ProjectFactory {
  private createdProjects: string[] = [];

  /**
   * Create a project object with sensible defaults
   * @param overrides - Partial project data to override defaults
   * @returns Project object (not persisted)
   */
  createProject(overrides: Partial<Project> = {}): Project {
    const now = Date.now();
    return {
      id: faker.string.uuid(),
      name: faker.company.name(),
      description: faker.lorem.sentence(),
      status: 'estimating' as ProjectStatus,
      ownerId: faker.string.uuid(),
      collaborators: [],
      createdAt: now,
      updatedAt: now,
      createdBy: faker.string.uuid(),
      updatedBy: faker.string.uuid(),
      ...overrides,
    };
  }

  /**
   * Create multiple projects
   * @param count - Number of projects to create
   * @param overrides - Partial project data to override defaults for all projects
   * @returns Array of project objects
   */
  createProjects(count: number, overrides: Partial<Project> = {}): Project[] {
    return Array.from({ length: count }, () => this.createProject(overrides));
  }

  /**
   * Track a project ID for cleanup
   * @param projectId - Project ID to track
   */
  trackProject(projectId: string): void {
    this.createdProjects.push(projectId);
  }

  /**
   * Cleanup all projects created during test execution
   * Called automatically by fixture teardown
   */
  async cleanup(): Promise<void> {
    // TODO: Replace with actual API cleanup when project deletion is implemented
    // for (const projectId of this.createdProjects) {
    //   await fetch(`${process.env.API_URL}/projects/${projectId}`, {
    //     method: 'DELETE',
    //   });
    // }
    this.createdProjects = [];
  }
}

