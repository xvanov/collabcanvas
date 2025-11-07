import { faker } from '@faker-js/faker';

/**
 * User data factory for test data generation
 * 
 * Uses faker.js to generate realistic, unique test data.
 * Tracks created users for automatic cleanup.
 * 
 * @see bmad/bmm/testarch/knowledge/data-factories.md
 */
export type User = {
  id: string;
  email: string;
  name: string;
  password?: string;
  createdAt?: Date;
};

export class UserFactory {
  private createdUsers: string[] = [];

  /**
   * Create a user object with sensible defaults
   * @param overrides - Partial user data to override defaults
   * @returns User object (not persisted)
   */
  createUser(overrides: Partial<User> = {}): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      password: faker.internet.password({ length: 12 }),
      createdAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create and persist a user via API
   * @param overrides - Partial user data to override defaults
   * @returns Created user with server-assigned ID
   */
  async createUserViaAPI(overrides: Partial<User> = {}): Promise<User> {
    const user = this.createUser(overrides);
    
    // TODO: Replace with actual API call when authentication is implemented
    // const response = await fetch(`${process.env.API_URL}/users`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(user),
    // });
    // 
    // if (!response.ok) {
    //   throw new Error(`Failed to create user: ${response.status}`);
    // }
    // 
    // const created = await response.json();
    // this.createdUsers.push(created.id);
    // return created;

    // For now, track the user ID for cleanup
    this.createdUsers.push(user.id);
    return user;
  }

  /**
   * Cleanup all users created during test execution
   * Called automatically by fixture teardown
   */
  async cleanup(): Promise<void> {
    // TODO: Replace with actual API cleanup when authentication is implemented
    // for (const userId of this.createdUsers) {
    //   await fetch(`${process.env.API_URL}/users/${userId}`, {
    //     method: 'DELETE',
    //   });
    // }
    this.createdUsers = [];
  }
}

