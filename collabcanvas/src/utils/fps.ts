/**
 * FPS (Frames Per Second) calculation utility
 */

export class FPSCounter {
  private frames: number[] = [];
  private lastTime: number = performance.now();
  private readonly sampleSize: number = 60; // Sample last 60 frames
  
  /**
   * Call this on each frame to update the FPS calculation
   * @returns Current FPS value
   */
  tick(): number {
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    
    // Store frame time
    this.frames.push(delta);
    
    // Keep only last N frames
    if (this.frames.length > this.sampleSize) {
      this.frames.shift();
    }
    
    // Calculate average FPS
    const avgDelta = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    return Math.round(1000 / avgDelta);
  }
  
  /**
   * Reset the FPS counter
   */
  reset(): void {
    this.frames = [];
    this.lastTime = performance.now();
  }
}

