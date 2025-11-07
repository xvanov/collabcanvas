/**
 * Throttling utilities for performance optimization
 * Used for drag updates and cursor updates to maintain 60 FPS
 */

/**
 * Creates a throttled function that only executes at most once per interval
 * @param func Function to throttle
 * @param interval Minimum interval between executions (in milliseconds)
 * @returns Throttled function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastExecuted = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function throttled(...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecuted;

    if (timeSinceLastExecution >= interval) {
      // Execute immediately if enough time has passed
      lastExecuted = now;
      func(...args);
    } else {
      // Schedule execution for the remaining time
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        lastExecuted = Date.now();
        func(...args);
        timeoutId = null;
      }, interval - timeSinceLastExecution);
    }
  };
}

/**
 * Creates a throttled function specifically for drag updates
 * Optimized for 60 FPS (16ms intervals)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createDragThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  return throttle(func, 16); // 60 FPS = ~16ms intervals
}

/**
 * Creates an adaptive throttled function that adjusts interval based on network conditions
 * Starts at 16ms (60Hz) and adapts up to 100ms (10Hz) based on write success/failure
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdaptiveThrottle<T extends (...args: any[]) => any>(
  func: T,
  baseInterval: number = 16,
  maxInterval: number = 100
): (...args: Parameters<T>) => void {
  let currentInterval = baseInterval;
  let lastExecuted = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let consecutiveFailures = 0;

  const adaptiveFunc = (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecuted;

    if (timeSinceLastExecution >= currentInterval) {
      // Execute immediately if enough time has passed
      lastExecuted = now;
      try {
        func(...args);
        // Reset on success
        consecutiveFailures = 0;
        currentInterval = baseInterval;
      } catch (error) {
        // Increase interval on failure
        consecutiveFailures++;
        currentInterval = Math.min(currentInterval * 1.5, maxInterval);
        console.warn(`Adaptive throttle: ${consecutiveFailures} consecutive failures, interval increased to ${currentInterval}ms`);
        throw error;
      }
    } else {
      // Schedule execution for the remaining time
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        lastExecuted = Date.now();
        try {
          func(...args);
          consecutiveFailures = 0;
          currentInterval = baseInterval;
        } catch (error) {
          consecutiveFailures++;
          currentInterval = Math.min(currentInterval * 1.5, maxInterval);
          console.warn(`Adaptive throttle: ${consecutiveFailures} consecutive failures, interval increased to ${currentInterval}ms`);
          throw error;
        }
        timeoutId = null;
      }, currentInterval - timeSinceLastExecution);
    }
  };

  return adaptiveFunc;
}

/**
 * Creates a coalescing throttled function that batches multiple calls
 * Only executes the latest arguments after the throttle interval
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createCoalescingThrottle<T extends (...args: any[]) => any>(
  func: T,
  interval: number = 16
): (...args: Parameters<T>) => void {
  let lastExecuted = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let latestArgs: Parameters<T> | null = null;

  const coalescingFunc = (...args: Parameters<T>) => {
    latestArgs = args; // Always keep the latest arguments
    
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecuted;

    if (timeSinceLastExecution >= interval) {
      // Execute immediately if enough time has passed
      lastExecuted = now;
      if (latestArgs) {
        func(...latestArgs);
        latestArgs = null;
      }
    } else {
      // Schedule execution for the remaining time
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = setTimeout(() => {
        lastExecuted = Date.now();
        if (latestArgs) {
          func(...latestArgs);
          latestArgs = null;
        }
        timeoutId = null;
      }, interval - timeSinceLastExecution);
    }
  };

  return coalescingFunc;
}

/**
 * Batch update utility for grouping multiple updates together
 * Uses requestAnimationFrame to batch updates within a single frame
 */
export class BatchUpdater {
  private pendingUpdates: Array<() => void> = [];
  private rafId: number | null = null;

  /**
   * Schedule an update to be batched
   * @param update - Function to execute in batch
   */
  schedule(update: () => void): void {
    this.pendingUpdates.push(update);
    
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.flush();
      });
    }
  }

  /**
   * Execute all pending updates immediately
   */
  flush(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    const updates = this.pendingUpdates;
    this.pendingUpdates = [];
    
    // Execute all updates
    updates.forEach(update => {
      try {
        update();
      } catch (error) {
        console.error('Error in batched update:', error);
      }
    });
  }

  /**
   * Cancel all pending updates
   */
  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pendingUpdates = [];
  }
}
