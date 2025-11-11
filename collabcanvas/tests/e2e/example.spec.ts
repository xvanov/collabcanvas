import { test, expect } from '../support/fixtures';

/**
 * Example E2E test suite demonstrating fixture and factory usage
 * 
 * This test demonstrates:
 * - Using custom fixtures (userFactory)
 * - Data factory pattern for test data
 * - Proper selector strategy (data-testid)
 * - Given-When-Then test structure
 */
test.describe('Example Test Suite', () => {
  test('should load homepage', async ({ page }) => {
    // Given: User navigates to homepage
    await page.goto('/');

    // Then: Page should load successfully
    await expect(page).toHaveTitle(/CollabCanvas/i);
  });

  test('should demonstrate user factory usage', async ({ page, userFactory }) => {
    // Given: A test user is created
    const user = userFactory.createUser({ email: 'test@example.com' });

    // When: User data is available
    // Then: User object should have required fields
    expect(user.email).toBe('test@example.com');
    expect(user.id).toBeTruthy();
    expect(user.name).toBeTruthy();

    // Note: When authentication is implemented, use:
    // const createdUser = await userFactory.createUserViaAPI();
    // Then proceed with UI testing
  });

  test('should demonstrate page interaction', async ({ page }) => {
    // Given: User is on the homepage
    await page.goto('/');

    // When: User interacts with page elements (using data-testid selectors)
    // Example: await page.click('[data-testid="login-button"]');

    // Then: Expected behavior occurs
    // Example: await expect(page.getByTestId('user-menu')).toBeVisible();
  });
});





