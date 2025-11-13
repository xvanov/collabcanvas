# CollabCanvas E2E Test Suite

This directory contains end-to-end (E2E) tests for CollabCanvas using Playwright.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This will install Playwright and all required dependencies, including browser binaries.

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in environment-specific values:

```bash
cp .env.example .env
```

Edit `.env` with your local configuration:
- `BASE_URL`: Your local development server URL (default: `http://localhost:3000`)
- `API_URL`: API endpoint URL (if applicable)
- `TEST_USER_EMAIL`: Test user email for authentication
- `TEST_USER_PASSWORD`: Test user password

### 3. Verify Setup

Run the example test to verify everything is configured correctly:

```bash
npm run test:e2e
```

## Running Tests

### Basic Commands

- **Run all tests**: `npm run test:e2e`
- **Run tests in UI mode**: `npm run test:e2e:ui`
- **Run tests in headed mode** (see browser): `npm run test:e2e:headed`
- **Debug tests**: `npm run test:e2e:debug`
- **View test report**: `npm run test:e2e:report`

### Advanced Usage

```bash
# Run specific test file
npx playwright test tests/e2e/example.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium

# Run tests matching a pattern
npx playwright test --grep "should load homepage"

# Run tests with specific timeout
npx playwright test --timeout=120000

# Run tests in parallel (default)
npx playwright test --workers=4
```

## Architecture Overview

### Directory Structure

```
tests/
├── e2e/                      # Test files (organize by feature/domain)
│   └── example.spec.ts       # Example test suite
├── support/                  # Framework infrastructure (critical pattern)
│   ├── fixtures/            # Test fixtures (data, mocks)
│   │   ├── index.ts         # Main fixture exports
│   │   └── factories/       # Data factories
│   │       └── user-factory.ts
│   ├── helpers/             # Utility functions
│   └── page-objects/        # Page object models (optional)
└── README.md                 # This file
```

### Fixture Architecture

Tests use a **pure function → fixture → mergeTests** pattern for composability:

1. **Pure Functions**: Framework-agnostic helpers (e.g., `apiRequest()`)
2. **Fixtures**: Playwright-specific wrappers that inject framework dependencies
3. **Composition**: Use `mergeTests()` to combine multiple fixtures

**Example**:
```typescript
import { test, expect } from '../support/fixtures';

test('user can create project', async ({ page, userFactory }) => {
  const user = userFactory.createUser();
  // Test implementation...
});
```

See `bmad/bmm/testarch/knowledge/fixture-architecture.md` for detailed patterns.

### Data Factories

Data factories generate realistic, unique test data using `@faker-js/faker`:

- **Parallel-safe**: UUIDs and timestamps prevent collisions
- **Schema evolution**: Defaults adapt to schema changes automatically
- **Explicit intent**: Overrides show what matters for each test
- **Auto-cleanup**: Fixtures automatically clean up created resources

**Example**:
```typescript
const user = userFactory.createUser({ email: 'test@example.com' });
```

See `bmad/bmm/testarch/knowledge/data-factories.md` for detailed patterns.

## Best Practices

### Selector Strategy

**Always use `data-testid` attributes** for UI elements:

```typescript
// ✅ GOOD
await page.click('[data-testid="login-button"]');
await expect(page.getByTestId('user-menu')).toBeVisible();

// ❌ BAD (brittle CSS selectors)
await page.click('.btn-primary');
await expect(page.locator('.user-menu')).toBeVisible();
```

### Test Isolation

- Each test should be independent and runnable in isolation
- Use fixtures for setup/teardown (automatic cleanup)
- Never rely on test execution order
- Use data factories for unique test data

### Given-When-Then Structure

Structure tests using Given-When-Then:

```typescript
test('user can login', async ({ page }) => {
  // Given: User is on login page
  await page.goto('/login');

  // When: User enters credentials and clicks login
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-button"]');

  // Then: User is redirected to dashboard
  await expect(page).toHaveURL('/dashboard');
});
```

### Network-First Testing

**Always intercept network requests before navigation**:

```typescript
test('user sees dashboard data', async ({ page }) => {
  // Setup network interception BEFORE navigation
  await page.route('**/api/dashboard', (route) => {
    route.fulfill({ json: { data: 'mock-data' } });
  });

  // Then navigate
  await page.goto('/dashboard');
});
```

See `bmad/bmm/testarch/knowledge/network-first.md` for detailed patterns.

### Timeout Standards

Standard timeouts are configured in `playwright.config.ts`:
- **Test timeout**: 60s
- **Action timeout**: 15s (click, fill, etc.)
- **Navigation timeout**: 30s (page.goto, page.reload)
- **Expect timeout**: 10s (assertions)

Avoid hard waits (`page.waitForTimeout()`). Use event-based waits instead.

## CI Integration

Tests run automatically in CI/CD pipelines:

- **Retries**: Failed tests retry 2 times in CI
- **Workers**: Serial execution in CI (1 worker) for stability
- **Artifacts**: Screenshots, videos, and traces captured on failure
- **Reports**: HTML and JUnit XML reports generated

### Artifact Storage

- **Screenshots**: `test-results/` (only on failure)
- **Videos**: `test-results/` (only on failure)
- **Traces**: `test-results/` (only on failure)
- **HTML Report**: `test-results/html/`
- **JUnit XML**: `test-results/junit.xml`

## Knowledge Base References

This test framework follows patterns from the BMAD Test Architect knowledge base:

- **Fixture Architecture**: `bmad/bmm/testarch/knowledge/fixture-architecture.md`
  - Pure function → fixture → mergeTests composition
  - Auto-cleanup patterns
  - Composable fixture system

- **Data Factories**: `bmad/bmm/testarch/knowledge/data-factories.md`
  - Factory functions with overrides
  - API-first setup (10-50x faster than UI)
  - Nested factory patterns

- **Network-First Testing**: `bmad/bmm/testarch/knowledge/network-first.md`
  - Intercept-before-navigate workflow
  - HAR capture and deterministic waits
  - Edge mocking strategies

- **Playwright Configuration**: `bmad/bmm/testarch/knowledge/playwright-config.md`
  - Environment-based configuration
  - Timeout standards
  - Artifact output configuration
  - Parallelization settings

- **Test Quality**: `bmad/bmm/testarch/knowledge/test-quality.md`
  - Deterministic test design
  - Isolation rules
  - Green criteria

## Troubleshooting

### Tests Fail to Run

1. **Check BASE_URL**: Ensure `.env` has correct `BASE_URL` and app is running
2. **Check Node version**: Ensure Node version matches `.nvmrc`
3. **Install browsers**: Run `npx playwright install` if browsers are missing

### Tests Are Flaky

1. **Check timeouts**: Increase timeouts if tests timeout frequently
2. **Check network**: Ensure network interception happens before navigation
3. **Check isolation**: Ensure tests don't depend on execution order
4. **Check cleanup**: Verify fixtures clean up resources properly

### Debugging Failures

1. **View trace**: Run `npx playwright show-trace test-results/path-to-trace.zip`
2. **Run in headed mode**: `npm run test:e2e:headed` to see browser
3. **Use debug mode**: `npm run test:e2e:debug` to step through tests
4. **Check artifacts**: Review screenshots/videos in `test-results/`

## Next Steps

1. **Write your first test**: Copy `example.spec.ts` and modify for your feature
2. **Add data factories**: Create factories for your domain entities
3. **Create fixtures**: Add fixtures for authentication, API helpers, etc.
4. **Set up CI**: Configure CI pipeline to run tests automatically

## Related Workflows

- **`*ci`**: Scaffold CI/CD quality pipeline
- **`*test-design`**: Create comprehensive test scenarios
- **`*atdd`**: Generate E2E tests before implementation
- **`*automate`**: Generate comprehensive test automation

---

**Framework**: Playwright  
**Version**: 1.50.0  
**Last Updated**: 2025-01-27







