/**
 * Unit tests for throttling utilities
 * Tests the throttle function and specialized throttles for drag and cursor updates
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { throttle, createDragThrottle, createAdaptiveThrottle, createCoalescingThrottle } from './throttle';

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should execute function immediately on first call', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn('test');

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  it('should throttle subsequent calls within interval', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    // First call - should execute immediately
    throttledFn('first');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Second call within interval - should be throttled
    throttledFn('second');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Third call within interval - should be throttled
    throttledFn('third');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Advance time by 50ms (still within interval)
    vi.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Advance time to complete interval
    vi.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('third');
  });

  it('should execute function immediately when interval has passed', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    // First call
    throttledFn('first');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Advance time beyond interval
    vi.advanceTimersByTime(150);

    // Second call - should execute immediately
    throttledFn('second');
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('second');
  });

  it('should handle multiple rapid calls correctly', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    // Rapid calls
    throttledFn('call1');
    throttledFn('call2');
    throttledFn('call3');
    throttledFn('call4');

    // Only first call should execute immediately
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('call1');

    // Advance time to execute last call
    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('call4');
  });

  it('should clear previous timeout when new call comes in', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    // First call
    throttledFn('first');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Second call (should schedule timeout)
    throttledFn('second');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Third call (should clear previous timeout and schedule new one)
    throttledFn('third');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Advance time - should only execute third call
    vi.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('third');
  });

  it('should preserve function arguments', () => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 100);

    throttledFn('arg1', 'arg2', 'arg3');

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});

describe('createDragThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create throttle with 16ms interval for 60 FPS', () => {
    const mockFn = vi.fn();
    const dragThrottle = createDragThrottle(mockFn);

    // First call should execute immediately
    dragThrottle('test');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Second call within 16ms should be throttled
    dragThrottle('test2');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Advance time by 16ms
    vi.advanceTimersByTime(16);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should handle rapid drag updates correctly', () => {
    const mockFn = vi.fn();
    const dragThrottle = createDragThrottle(mockFn);

    // Simulate rapid drag updates (every 5ms)
    for (let i = 0; i < 10; i++) {
      dragThrottle(`update${i}`);
    }

    // Only first call should execute immediately
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('update0');

    // Advance time by 16ms - should execute last call
    vi.advanceTimersByTime(16);
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenCalledWith('update9');
  });
});

describe('createCoalescingThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create throttle with 16ms interval for 60Hz updates', () => {
    const mockFn = vi.fn();
    const coalescingThrottle = createCoalescingThrottle(mockFn, 16);

    // First call should execute immediately
    coalescingThrottle('test');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Second call within 16ms should be throttled
    coalescingThrottle('test2');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Advance time by 16ms
    vi.advanceTimersByTime(16);
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('test2'); // Should use latest args
  });

  it('should handle rapid cursor updates correctly', () => {
    const mockFn = vi.fn();
    const coalescingThrottle = createCoalescingThrottle(mockFn, 16);

    // Simulate rapid cursor updates (every 2ms)
    for (let i = 0; i < 20; i++) {
      coalescingThrottle(`cursor${i}`);
    }

    // Only first call should execute immediately
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('cursor0');

    // Advance time by 16ms - should execute last call
    vi.advanceTimersByTime(16);
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenCalledWith('cursor19');
  });
});

describe('createAdaptiveThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with base interval and adapt on failures', () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Network error'));
    const adaptiveThrottle = createAdaptiveThrottle(mockFn, 16, 100);

    // First call should execute immediately
    adaptiveThrottle('test');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Second call should be throttled at base interval
    adaptiveThrottle('test2');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Advance time by 16ms
    vi.advanceTimersByTime(16);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should reset interval on successful calls', () => {
    const mockFn = vi.fn().mockResolvedValueOnce('success');
    const adaptiveThrottle = createAdaptiveThrottle(mockFn, 16, 100);

    // First call should execute immediately
    adaptiveThrottle('test1');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Second call immediately - should be throttled
    adaptiveThrottle('test2');
    expect(mockFn).toHaveBeenCalledTimes(1);

    // Advance time by 16ms - should execute second call
    vi.advanceTimersByTime(16);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});

describe('Performance characteristics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should maintain 60 FPS with drag throttle', () => {
    const mockFn = vi.fn();
    const dragThrottle = createDragThrottle(mockFn);

    // Simulate 1 second of drag updates at 120 FPS (every 8ms)
    for (let i = 0; i < 120; i++) {
      dragThrottle(`drag${i}`);
      vi.advanceTimersByTime(8);
    }

    // Should have executed approximately 60 times (60 FPS)
    // Allow some tolerance for timing (±2 calls)
    const callCount = mockFn.mock.calls.length;
    expect(callCount).toBeGreaterThanOrEqual(58);
    expect(callCount).toBeLessThanOrEqual(62);
  });

  it('should maintain 60Hz with coalescing throttle', () => {
    const mockFn = vi.fn();
    const coalescingThrottle = createCoalescingThrottle(mockFn, 16);

    // Simulate 1 second of cursor updates at 120Hz (every 8ms)
    for (let i = 0; i < 120; i++) {
      coalescingThrottle(`cursor${i}`);
      vi.advanceTimersByTime(8);
    }

    // Should have executed approximately 60 times (60Hz)
    // Allow some tolerance for timing (±2 calls)
    const callCount = mockFn.mock.calls.length;
    expect(callCount).toBeGreaterThanOrEqual(58);
    expect(callCount).toBeLessThanOrEqual(62);
  });
});
