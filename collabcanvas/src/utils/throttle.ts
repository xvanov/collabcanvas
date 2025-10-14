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
 * Creates a throttled function specifically for cursor updates
 * Optimized for 60Hz updates (16ms intervals)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createCursorThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  return throttle(func, 16); // 60Hz = ~16ms intervals
}
