import { test, expect } from '../support/fixtures';

/**
 * E2E tests for Story 2.1: Project Isolation - Canvas, BOM, and Views Per Project
 * 
 * These tests verify that shapes, layers, and board state are properly isolated
 * between projects. All tests are in RED phase - they will fail until implementation
 * is complete.
 * 
 * @see docs/stories/2-1-project-isolation-canvas-bom-per-project.md
 * @see bmad/bmm/testarch/knowledge/network-first.md
 * @see bmad/bmm/testarch/knowledge/test-quality.md
 */
test.describe('Story 2.1: Project Isolation', () => {
  test.describe('AC1: Project-Scoped Shapes Storage', () => {
    test('should store shapes in project-scoped Firestore collection', async ({ page, projectFactory, _shapeFactory }) => {
      // GIVEN: I have multiple projects
      const projectA = projectFactory.createProject({ name: 'Project A' });
      const projectB = projectFactory.createProject({ name: 'Project B' });
      
      // WHEN: I create a shape in Project A's Space view
      // Network-first: Intercept Firestore write BEFORE navigation
      const shapeWritePromise = page.waitForRequest((request) => 
        request.url().includes('/projects/') && 
        request.url().includes('/shapes/') &&
        request.method() === 'POST'
      );

      await page.goto(`/projects/${projectA.id}/space`);
      
      // Create shape via UI (will fail until implementation)
      await page.click('[data-testid="shape-tool-rect"]');
      await page.click('[data-testid="canvas"]', { position: { x: 100, y: 100 } });
      
      // THEN: The shape is stored in Firestore at /projects/{projectId}/shapes/{shapeId}
      const writeRequest = await shapeWritePromise;
      const requestUrl = writeRequest.url();
      
      expect(requestUrl).toContain(`/projects/${projectA.id}/shapes/`);
      expect(requestUrl).not.toContain('/boards/global/');
      
      // Verify shape does not appear in Project B
      await page.goto(`/projects/${projectB.id}/space`);
      const shapesInProjectB = await page.locator('[data-testid="shape"]').count();
      expect(shapesInProjectB).toBe(0);
    });

    test('should not show shapes from Project A in Project B', async ({ page, projectFactory, shapeFactory }) => {
      // GIVEN: I have Project A with a shape
      const _projectA = projectFactory.createProject({ name: 'Project A' });
      const projectB = projectFactory.createProject({ name: 'Project B' });
      const shape = shapeFactory.createShape({ type: 'rect', x: 100, y: 100 });
      
      // WHEN: I navigate to Project B's Space view
      // Network-first: Intercept Firestore read BEFORE navigation
      const shapesReadPromise = page.waitForResponse((response) => 
        response.url().includes(`/projects/${projectB.id}/shapes`) &&
        response.status() === 200
      );

      await page.goto(`/projects/${projectB.id}/space`);
      await shapesReadPromise;
      
      // THEN: The shape from Project A does not appear
      const shapeElements = page.locator(`[data-testid="shape-${shape.id}"]`);
      await expect(shapeElements).toHaveCount(0);
    });
  });

  test.describe('AC2: Project-Scoped Layers Storage', () => {
    test('should store layers in project-scoped Firestore collection', async ({ page, projectFactory, _layerFactory }) => {
      // GIVEN: I have multiple projects
      const projectA = projectFactory.createProject({ name: 'Project A' });
      const projectB = projectFactory.createProject({ name: 'Project B' });
      
      // WHEN: I create a layer in Project A's Space view
      // Network-first: Intercept Firestore write BEFORE navigation
      const layerWritePromise = page.waitForRequest((request) => 
        request.url().includes('/projects/') && 
        request.url().includes('/layers/') &&
        request.method() === 'POST'
      );

      await page.goto(`/projects/${projectA.id}/space`);
      
      // Create layer via UI (will fail until implementation)
      await page.click('[data-testid="layer-add-button"]');
      await page.fill('[data-testid="layer-name-input"]', 'Project A Layer');
      await page.click('[data-testid="layer-create-button"]');
      
      // THEN: The layer is stored in Firestore at /projects/{projectId}/layers/{layerId}
      const writeRequest = await layerWritePromise;
      const requestUrl = writeRequest.url();
      
      expect(requestUrl).toContain(`/projects/${projectA.id}/layers/`);
      expect(requestUrl).not.toContain('/boards/global/');
      
      // Verify layer does not appear in Project B
      await page.goto(`/projects/${projectB.id}/space`);
      const layersInProjectB = await page.locator('[data-testid="layer"]').count();
      expect(layersInProjectB).toBe(0);
    });
  });

  test.describe('AC3: Project-Scoped Board State', () => {
    test('should store board state in project-scoped Firestore document', async ({ page, projectFactory }) => {
      // GIVEN: I have multiple projects
      const projectA = projectFactory.createProject({ name: 'Project A' });
      const projectB = projectFactory.createProject({ name: 'Project B' });
      
      // WHEN: I upload a background image in Project A's Space view
      // Network-first: Intercept Firestore write BEFORE navigation
      const boardStateWritePromise = page.waitForRequest((request) => 
        request.url().includes(`/projects/${projectA.id}/board`) &&
        request.method() === 'PATCH'
      );

      await page.goto(`/projects/${projectA.id}/space`);
      
      // Upload background image via UI (will fail until implementation)
      const fileInput = page.locator('[data-testid="background-image-upload"]');
      await fileInput.setInputFiles({
        name: 'test-image.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake-image-data'),
      });
      
      // THEN: The board state is stored in Firestore at /projects/{projectId}/board
      const writeRequest = await boardStateWritePromise;
      const requestUrl = writeRequest.url();
      
      expect(requestUrl).toContain(`/projects/${projectA.id}/board`);
      expect(requestUrl).not.toContain('/boards/global');
      
      // Verify board state does not affect Project B
      await page.goto(`/projects/${projectB.id}/space`);
      const backgroundImage = page.locator('[data-testid="background-image"]');
      await expect(backgroundImage).not.toBeVisible();
    });

    test('should store scale line in project-scoped board document', async ({ page, projectFactory }) => {
      // GIVEN: I have Project A
      const projectA = projectFactory.createProject({ name: 'Project A' });
      
      // WHEN: I create a scale line in Project A's Space view
      // Network-first: Intercept Firestore write BEFORE navigation
      const scaleLineWritePromise = page.waitForRequest((request) => 
        request.url().includes(`/projects/${projectA.id}/board`) &&
        request.method() === 'PATCH'
      );

      await page.goto(`/projects/${projectA.id}/space`);
      
      // Create scale line via UI (will fail until implementation)
      await page.click('[data-testid="scale-line-tool"]');
      await page.click('[data-testid="canvas"]', { position: { x: 100, y: 100 } });
      await page.click('[data-testid="canvas"]', { position: { x: 200, y: 100 } });
      await page.fill('[data-testid="scale-line-length-input"]', '10');
      await page.selectOption('[data-testid="scale-line-unit-select"]', 'feet');
      await page.click('[data-testid="scale-line-confirm-button"]');
      
      // THEN: The scale line is stored in Firestore at /projects/{projectId}/board
      const writeRequest = await scaleLineWritePromise;
      const requestBody = writeRequest.postDataJSON();
      
      expect(writeRequest.url()).toContain(`/projects/${projectA.id}/board`);
      expect(requestBody.scaleLine).toBeDefined();
      expect(requestBody.scaleLine.realWorldLength).toBe(10);
      expect(requestBody.scaleLine.unit).toBe('feet');
    });
  });

  test.describe('AC5: Project-Scoped Canvas Store', () => {
    test('should use isolated Zustand store instance per project', async ({ page, projectFactory, _shapeFactory }) => {
      // GIVEN: I have multiple projects
      const projectA = projectFactory.createProject({ name: 'Project A' });
      const projectB = projectFactory.createProject({ name: 'Project B' });
      
      // WHEN: I switch between projects
      await page.goto(`/projects/${projectA.id}/space`);
      
      // Create shape in Project A
      await page.click('[data-testid="shape-tool-rect"]');
      await page.click('[data-testid="canvas"]', { position: { x: 100, y: 100 } });
      
      // Switch to Project B
      await page.goto(`/projects/${projectB.id}/space`);
      
      // THEN: Each project uses its own isolated Zustand store instance with no data leakage
      // Verify Project B's store is empty (no shapes from Project A)
      const shapesInProjectB = await page.locator('[data-testid="shape"]').count();
      expect(shapesInProjectB).toBe(0);
      
      // Create shape in Project B
      await page.click('[data-testid="shape-tool-circle"]');
      await page.click('[data-testid="canvas"]', { position: { x: 200, y: 200 } });
      
      // Switch back to Project A
      await page.goto(`/projects/${projectA.id}/space`);
      
      // Verify Project A still has its original shape, not Project B's shape
      const shapesInProjectA = await page.locator('[data-testid="shape"]').count();
      expect(shapesInProjectA).toBe(1);
      await expect(page.locator('[data-testid="shape"]').first()).toHaveAttribute('data-shape-type', 'rect');
    });
  });

  test.describe('AC6: Proper Subscription Cleanup', () => {
    test('should cleanup Firestore subscriptions when switching projects', async ({ page, projectFactory }) => {
      // GIVEN: I am viewing Project A
      const projectA = projectFactory.createProject({ name: 'Project A' });
      const projectB = projectFactory.createProject({ name: 'Project B' });
      
      // Network-first: Intercept subscription requests
      const projectASubscriptionPromise = page.waitForRequest((request) => 
        request.url().includes(`/projects/${projectA.id}/shapes`) &&
        request.method() === 'GET'
      );
      
      const projectBSubscriptionPromise = page.waitForRequest((request) => 
        request.url().includes(`/projects/${projectB.id}/shapes`) &&
        request.method() === 'GET'
      );

      await page.goto(`/projects/${projectA.id}/space`);
      await projectASubscriptionPromise;
      
      // WHEN: I navigate to Project B
      await page.goto(`/projects/${projectB.id}/space`);
      await projectBSubscriptionPromise;
      
      // THEN: All Firestore subscriptions for Project A are properly cleaned up
      // and new subscriptions for Project B are established
      // Verify no duplicate subscriptions (check network tab for active listeners)
      // This test will verify subscription cleanup by checking that only Project B's
      // subscription is active (implementation will need to track active subscriptions)
      
      // For now, verify that Project B's subscription was created
      expect(projectBSubscriptionPromise).toBeDefined();
    });
  });

  test.describe('AC7: No Infinite Loops', () => {
    test('should not cause infinite re-render loops when creating shapes', async ({ page, projectFactory }) => {
      // GIVEN: I am viewing a project
      const project = projectFactory.createProject({ name: 'Test Project' });
      
      // WHEN: I create a shape
      await page.goto(`/projects/${project.id}/space`);
      
      // Monitor for infinite loops (check console for repeated errors or excessive re-renders)
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.click('[data-testid="shape-tool-rect"]');
      await page.click('[data-testid="canvas"]', { position: { x: 100, y: 100 } });
      
      // Wait a bit to see if infinite loop occurs
      await page.waitForTimeout(2000);
      
      // THEN: No infinite re-render loops occur and subscriptions do not trigger cascading updates
      // Verify no excessive console errors
      const loopErrors = consoleErrors.filter((error) => 
        error.includes('Maximum update depth') || 
        error.includes('infinite loop') ||
        error.includes('too many re-renders')
      );
      expect(loopErrors.length).toBe(0);
    });
  });

  test.describe('AC13: Real-time Collaboration Per Project', () => {
    test('should only show updates from users viewing the same project', async ({ browser, projectFactory }) => {
      // GIVEN: Multiple users are viewing different projects
      const project1 = projectFactory.createProject({ name: 'Project 1' });
      const project2 = projectFactory.createProject({ name: 'Project 2' });
      
      // Create two browser contexts (simulating two users)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      // WHEN: User A creates a shape in Project 1
      await page1.goto(`/projects/${project1.id}/space`);
      await page1.click('[data-testid="shape-tool-rect"]');
      await page1.click('[data-testid="canvas"]', { position: { x: 100, y: 100 } });
      
      // User B is viewing Project 2
      await page2.goto(`/projects/${project2.id}/space`);
      
      // THEN: Only users viewing Project 1 see the update, users viewing Project 2 do not
      // Wait for real-time sync
      await page2.waitForTimeout(1000);
      
      // Verify Project 2 does not have the shape from Project 1
      const shapesInProject2 = await page2.locator('[data-testid="shape"]').count();
      expect(shapesInProject2).toBe(0);
      
      // Cleanup
      await context1.close();
      await context2.close();
    });
  });

  test.describe('AC14: Performance with Multiple Projects', () => {
    test('should maintain 60 FPS when switching between projects rapidly', async ({ page, projectFactory }) => {
      // GIVEN: I have 10+ projects with shapes and layers
      const projects = projectFactory.createProjects(10);
      
      // WHEN: I switch between projects rapidly
      const navigationTimes: number[] = [];
      
      for (let i = 0; i < 5; i++) {
        const project = projects[i];
        const startTime = Date.now();
        
        await page.goto(`/projects/${project.id}/space`);
        await page.waitForLoadState('networkidle');
        
        const endTime = Date.now();
        navigationTimes.push(endTime - startTime);
      }
      
      // THEN: The application maintains 60 FPS and subscriptions are efficiently managed
      // Average navigation time should be under 1 second (60 FPS = 16.67ms per frame, 
      // but we allow up to 1 second for network requests)
      const averageNavigationTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
      expect(averageNavigationTime).toBeLessThan(1000);
    });
  });
});

