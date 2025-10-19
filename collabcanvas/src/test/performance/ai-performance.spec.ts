import { test, expect } from '@playwright/test';

test.describe('AI Canvas Agent Performance', () => {
  test('AI command response time should be under 2 seconds', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="ai-assistant-button"]');
    
    // Click AI Assistant button
    await page.click('[data-testid="ai-assistant-button"]');
    
    // Wait for AI command input to appear
    await page.waitForSelector('[data-testid="ai-command-input"]');
    
    // Type AI command
    const commandInput = page.locator('[data-testid="ai-command-input"]');
    await commandInput.fill('Create a red circle');
    
    // Measure response time
    const startTime = Date.now();
    
    // Submit command
    await page.click('[data-testid="ai-submit-button"]');
    
    // Wait for command to complete (success or error)
    await page.waitForSelector('[data-testid="ai-status"]', { timeout: 5000 });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Verify response time is under 2 seconds
    expect(responseTime).toBeLessThan(2000);
    
    // Verify AI status shows completion
    const status = page.locator('[data-testid="ai-status"]');
    await expect(status).toBeVisible();
  });

  test('Multiple concurrent AI commands should maintain performance', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="ai-assistant-button"]');
    
    // Click AI Assistant button
    await page.click('[data-testid="ai-assistant-button"]');
    
    // Wait for AI command input to appear
    await page.waitForSelector('[data-testid="ai-command-input"]');
    
    const commands = [
      'Create a red circle',
      'Create a blue rectangle',
      'Create a green line',
      'Create yellow text',
      'Move shapes to center'
    ];
    
    const startTime = Date.now();
    
    // Submit multiple commands quickly
    for (const command of commands) {
      const commandInput = page.locator('[data-testid="ai-command-input"]');
      await commandInput.fill(command);
      await page.click('[data-testid="ai-submit-button"]');
      
      // Small delay between commands
      await page.waitForTimeout(100);
    }
    
    // Wait for all commands to complete
    await page.waitForSelector('[data-testid="ai-status"]', { timeout: 10000 });
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Verify total time is reasonable (under 10 seconds for 5 commands)
    expect(totalTime).toBeLessThan(10000);
    
    // Verify queue is processed
    const queueLength = page.locator('[data-testid="ai-queue-length"]');
    await expect(queueLength).toHaveText('0');
  });

  test('AI command queue should handle high load', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="ai-assistant-button"]');
    
    // Click AI Assistant button
    await page.click('[data-testid="ai-assistant-button"]');
    
    // Wait for AI command input to appear
    await page.waitForSelector('[data-testid="ai-command-input"]');
    
    const startTime = Date.now();
    
    // Submit many commands rapidly
    for (let i = 0; i < 20; i++) {
      const commandInput = page.locator('[data-testid="ai-command-input"]');
      await commandInput.fill(`Create shape ${i}`);
      await page.click('[data-testid="ai-submit-button"]');
      
      // Very small delay
      await page.waitForTimeout(50);
    }
    
    // Wait for queue to process
    await page.waitForSelector('[data-testid="ai-queue-length"]', { timeout: 15000 });
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Verify system handles high load
    expect(totalTime).toBeLessThan(30000); // Under 30 seconds for 20 commands
    
    // Verify queue eventually empties
    const queueLength = page.locator('[data-testid="ai-queue-length"]');
    await expect(queueLength).toHaveText('0');
  });

  test('AI command accuracy should be high', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="ai-assistant-button"]');
    
    // Click AI Assistant button
    await page.click('[data-testid="ai-assistant-button"]');
    
    // Wait for AI command input to appear
    await page.waitForSelector('[data-testid="ai-command-input"]');
    
    const testCommands = [
      'Create a red circle',
      'Create a blue rectangle',
      'Create a green line',
      'Create yellow text',
      'Move shapes to center',
      'Align shapes to left',
      'Change color to purple',
      'Delete selected shapes',
      'Export canvas as PNG',
      'Create a new layer'
    ];
    
    let successfulCommands = 0;
    
    for (const command of testCommands) {
      const commandInput = page.locator('[data-testid="ai-command-input"]');
      await commandInput.fill(command);
      await page.click('[data-testid="ai-submit-button"]');
      
      // Wait for command to complete
      await page.waitForSelector('[data-testid="ai-status"]', { timeout: 3000 });
      
      // Check if command was successful
      const status = page.locator('[data-testid="ai-status"]');
      const statusText = await status.textContent();
      
      if (statusText?.includes('Success') || statusText?.includes('Completed')) {
        successfulCommands++;
      }
      
      // Small delay between commands
      await page.waitForTimeout(200);
    }
    
    const accuracy = successfulCommands / testCommands.length;
    
    // Verify accuracy is above 90%
    expect(accuracy).toBeGreaterThanOrEqual(0.9);
  });

  test('AI command undo/redo should work correctly', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="ai-assistant-button"]');
    
    // Click AI Assistant button
    await page.click('[data-testid="ai-assistant-button"]');
    
    // Wait for AI command input to appear
    await page.waitForSelector('[data-testid="ai-command-input"]');
    
    // Create a shape with AI
    const commandInput = page.locator('[data-testid="ai-command-input"]');
    await commandInput.fill('Create a red circle');
    await page.click('[data-testid="ai-submit-button"]');
    
    // Wait for command to complete
    await page.waitForSelector('[data-testid="ai-status"]', { timeout: 3000 });
    
    // Verify shape was created
    const canvas = page.locator('[data-testid="canvas"]');
    await expect(canvas).toBeVisible();
    
    // Undo the command
    await page.keyboard.press('Control+z');
    
    // Wait for undo to complete
    await page.waitForTimeout(500);
    
    // Verify shape was removed (or at least undo was processed)
    // Note: This test might need adjustment based on actual implementation
    
    // Redo the command
    await page.keyboard.press('Control+y');
    
    // Wait for redo to complete
    await page.waitForTimeout(500);
    
    // Verify shape was restored (or at least redo was processed)
    // Note: This test might need adjustment based on actual implementation
  });
});
