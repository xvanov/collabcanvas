import { test as base } from '@playwright/test';
import { UserFactory } from './factories/user-factory';

/**
 * Test fixtures for CollabCanvas E2E tests
 * 
 * This file extends the base Playwright test with custom fixtures.
 * Follow the pure function → fixture → mergeTests pattern for composability.
 * 
 * @see bmad/bmm/testarch/knowledge/fixture-architecture.md
 */
type TestFixtures = {
  userFactory: UserFactory;
};

export const test = base.extend<TestFixtures>({
  userFactory: async ({}, use) => {
    const factory = new UserFactory();
    await use(factory);
    // Auto-cleanup: Delete all users created during test
    await factory.cleanup();
  },
});

export { expect } from '@playwright/test';

