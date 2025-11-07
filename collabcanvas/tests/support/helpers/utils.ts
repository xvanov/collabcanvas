/**
 * Helper utilities for E2E tests
 * 
 * Pure functions that can be used across tests without framework dependencies.
 * These helpers follow the pure function → fixture pattern.
 * 
 * @see bmad/bmm/testarch/knowledge/fixture-architecture.md
 */

/**
 * Wait for a specific condition with timeout
 * @param condition - Function that returns true when condition is met
 * @param timeout - Maximum wait time in milliseconds
 * @param interval - Check interval in milliseconds
 */
export async function waitForCondition(
  condition: () => Promise<boolean> | boolean,
  timeout = 10000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Generate a unique test identifier
 * @param prefix - Prefix for the identifier
 * @returns Unique identifier string
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

