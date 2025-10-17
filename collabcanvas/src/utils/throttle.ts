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
 * Optimized for 20Hz updates (50ms intervals) for better performance
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createCursorThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  return throttle(func, 50); // 20Hz = ~50ms intervals
}

/**
 * Cursor interpolation utilities for smooth movement between network updates
 */
export interface CursorPosition {
  x: number;
  y: number;
  timestamp: number;
}

export class CursorInterpolator {
  private lastKnownPosition: CursorPosition | null = null;
  private targetPosition: CursorPosition | null = null;
  private animationId: number | null = null;
  private readonly interpolationDuration = 50; // ms

  /**
   * Update the target position for interpolation
   */
  updateTargetPosition(x: number, y: number): void {
    const now = performance.now();
    this.targetPosition = { x, y, timestamp: now };
    
    // Start interpolation if we have a last known position
    if (this.lastKnownPosition && !this.animationId) {
      this.startInterpolation();
    }
  }

  /**
   * Get the current interpolated position
   */
  getCurrentPosition(): CursorPosition | null {
    if (!this.lastKnownPosition || !this.targetPosition) {
      return this.targetPosition || this.lastKnownPosition;
    }

    const now = performance.now();
    const elapsed = now - this.targetPosition.timestamp;
    
    // If interpolation is complete, return target position
    if (elapsed >= this.interpolationDuration) {
      this.lastKnownPosition = this.targetPosition;
      this.targetPosition = null;
      return this.lastKnownPosition;
    }

    // Interpolate between last known and target position
    const progress = Math.min(elapsed / this.interpolationDuration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3); // Ease-out cubic

    return {
      x: this.lastKnownPosition.x + (this.targetPosition.x - this.lastKnownPosition.x) * easeOut,
      y: this.lastKnownPosition.y + (this.targetPosition.y - this.lastKnownPosition.y) * easeOut,
      timestamp: now,
    };
  }

  /**
   * Start interpolation animation
   */
  private startInterpolation(): void {
    if (this.animationId) return;

    const animate = () => {
      const current = this.getCurrentPosition();
      
      if (current && this.targetPosition) {
        // Continue animation
        this.animationId = requestAnimationFrame(animate);
      } else {
        // Animation complete
        this.animationId = null;
      }
    };

    this.animationId = requestAnimationFrame(animate);
  }

  /**
   * Set the last known position (typically from network update)
   */
  setLastKnownPosition(x: number, y: number): void {
    const now = performance.now();
    this.lastKnownPosition = { x, y, timestamp: now };
    
    // If we have a target position, start interpolation
    if (this.targetPosition && !this.animationId) {
      this.startInterpolation();
    }
  }

  /**
   * Check if position has actually changed (for optimization)
   */
  hasPositionChanged(x: number, y: number, threshold: number = 1): boolean {
    if (!this.lastKnownPosition) return true;
    
    const dx = Math.abs(x - this.lastKnownPosition.x);
    const dy = Math.abs(y - this.lastKnownPosition.y);
    
    return dx > threshold || dy > threshold;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
