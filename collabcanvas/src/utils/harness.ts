import type { FieldValue } from 'firebase/firestore';
import type { User } from '../types';

type TimestampLike =
  | number
  | { toMillis?: () => number; seconds?: number; nanoseconds?: number }
  | FieldValue;

export const timestampLikeToMillis = (value: TimestampLike | null): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'object') {
    if ('toMillis' in value && typeof value.toMillis === 'function') {
      try {
        const millis = value.toMillis();
        return Number.isFinite(millis) ? millis : null;
      } catch {
        return null;
      }
    }

    if ('seconds' in value && typeof value.seconds === 'number') {
      const seconds = value.seconds;
      const nanos = 'nanoseconds' in value && typeof value.nanoseconds === 'number' ? value.nanoseconds : 0;
      return seconds * 1000 + Math.floor(nanos / 1_000_000);
    }
  }

  return null;
};

export interface PerfMetricsSummary {
  metadata: {
    enabled: boolean;
    runId: string;
    startedAt: number;
    durationMs: number;
    eventCounts: Record<string, number>;
    fpsSamples: number;
    shapeSamples: number;
    cursorSamples: number;
  };
  fpsSamples: number[];
  shapeLatencySamples: number[];
  cursorLatencySamples: number[];
}

interface PerfMetricsPublicApi {
  readonly enabled: boolean;
  recordFps(value: number): void;
  trackShapeUpdate(shapeId: string, updatedAt: TimestampLike | null, isRemote: boolean): void;
  trackCursorUpdate(userId: string, lastSeen: TimestampLike | null): void;
  markEvent(name: string): void;
  reset(): void;
  exportSummary(): PerfMetricsSummary | null;
}

type HarnessBundle = {
  metrics: PerfMetricsPublicApi;
  user: User | null;
  apis: Record<string, unknown>;
  reset: () => void;
  export: () => PerfMetricsSummary | null;
};

class PerfMetricsInternal implements PerfMetricsPublicApi {
  public readonly enabled: boolean;
  private readonly runId: string;
  private startedAt: number;
  private readonly fpsSamples: number[] = [];
  private readonly shapeLatencySamples: number[] = [];
  private readonly cursorLatencySamples: number[] = [];
  private readonly eventCounts: Map<string, number> = new Map();
  private readonly shapeTimestamps: Map<string, number> = new Map();
  private readonly cursorTimestamps: Map<string, number> = new Map();
  private readonly SAMPLE_LIMIT = 5000;

  constructor(enabled: boolean) {
    this.enabled = enabled;
    this.runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.startedAt = Date.now();
  }

  recordFps(value: number): void {
    if (!this.enabled) return;
    if (!Number.isFinite(value) || value <= 0) return;
    if (this.fpsSamples.length >= this.SAMPLE_LIMIT) {
      this.fpsSamples.shift();
    }
    this.fpsSamples.push(value);
    this.markEvent('fpsSample');
  }

  trackShapeUpdate(shapeId: string, updatedAt: TimestampLike | null, isRemote: boolean): void {
    if (!this.enabled || !shapeId) return;
    const timestamp = timestampLikeToMillis(updatedAt);
    if (timestamp === null) return;
    const lastRecorded = this.shapeTimestamps.get(shapeId);
    if (lastRecorded && lastRecorded >= timestamp) {
      return; // already recorded this update
    }
    this.shapeTimestamps.set(shapeId, timestamp);
    this.markEvent('shapeUpdateSeen');

    const latency = Date.now() - timestamp;
    if (latency < 0) {
      this.markEvent(isRemote ? 'shapeLatencyNegativeRemote' : 'shapeLatencyNegativeLocal');
      return;
    }

    if (latency >= 60_000) {
      this.markEvent('shapeLatencyTooHigh');
      return;
    }

    if (this.shapeLatencySamples.length >= this.SAMPLE_LIMIT) {
      this.shapeLatencySamples.shift();
    }
    this.shapeLatencySamples.push(latency);
    this.markEvent(isRemote ? 'shapeUpdateRemote' : 'shapeUpdateLocal');
  }

  trackCursorUpdate(userId: string, lastSeen: TimestampLike | null): void {
    if (!this.enabled || !userId) return;
    const timestamp = timestampLikeToMillis(lastSeen);
    if (timestamp === null) return;
    const lastRecorded = this.cursorTimestamps.get(userId);
    if (lastRecorded && lastRecorded >= timestamp) {
      return;
    }
    this.cursorTimestamps.set(userId, timestamp);
    this.markEvent('cursorUpdateSeen');

    const latency = Date.now() - timestamp;
    if (latency < 0) {
      this.markEvent('cursorLatencyNegative');
      return;
    }

    if (latency >= 60_000) {
      this.markEvent('cursorLatencyTooHigh');
      return;
    }

    if (this.cursorLatencySamples.length >= this.SAMPLE_LIMIT) {
      this.cursorLatencySamples.shift();
    }
    this.cursorLatencySamples.push(latency);
    this.markEvent('cursorUpdateRemote');
  }

  markEvent(name: string): void {
    if (!this.enabled) return;
    const current = this.eventCounts.get(name) ?? 0;
    this.eventCounts.set(name, current + 1);
  }

  reset(): void {
    if (!this.enabled) return;
    this.fpsSamples.length = 0;
    this.shapeLatencySamples.length = 0;
    this.cursorLatencySamples.length = 0;
    this.shapeTimestamps.clear();
    this.cursorTimestamps.clear();
    this.eventCounts.clear();
    this.startedAt = Date.now();
    this.markEvent('reset');
  }

  exportSummary(): PerfMetricsSummary | null {
    if (!this.enabled) {
      return null;
    }

    return {
      metadata: {
        enabled: this.enabled,
        runId: this.runId,
        startedAt: this.startedAt,
        durationMs: Date.now() - this.startedAt,
        eventCounts: Object.fromEntries(this.eventCounts.entries()),
        fpsSamples: this.fpsSamples.length,
        shapeSamples: this.shapeLatencySamples.length,
        cursorSamples: this.cursorLatencySamples.length,
      },
      fpsSamples: [...this.fpsSamples],
      shapeLatencySamples: [...this.shapeLatencySamples],
      cursorLatencySamples: [...this.cursorLatencySamples],
    };
  }
}

const isBrowser = typeof window !== 'undefined';
const harnessFlag = isBrowser
  ? (() => {
      const params = new URLSearchParams(window.location.search);
      if (params.has('perfHarness')) return true;
      return import.meta.env.VITE_ENABLE_PERF_HARNESS === 'true';
    })()
  : false;

const harnessUser: User | null = isBrowser && harnessFlag
  ? (() => {
      const params = new URLSearchParams(window.location.search);
      const uid = params.get('hUser') ?? `harness-${Math.random().toString(36).slice(2, 10)}`;
      const name = params.get('hName') ?? `Harness ${uid}`;
      const email = params.get('hEmail') ?? `${uid}@perf.local`;
      return {
        uid,
        name,
        email,
        photoURL: null,
      };
    })()
  : null;

const metricsInternal = new PerfMetricsInternal(harnessFlag);

const perfMetricsImpl: PerfMetricsPublicApi = {
  get enabled() {
    return metricsInternal.enabled;
  },
  recordFps(value: number) {
    metricsInternal.recordFps(value);
  },
  trackShapeUpdate(shapeId: string, updatedAt: TimestampLike | null, isRemote: boolean) {
    metricsInternal.trackShapeUpdate(shapeId, updatedAt, isRemote);
  },
  trackCursorUpdate(userId: string, lastSeen: TimestampLike | null) {
    metricsInternal.trackCursorUpdate(userId, lastSeen);
  },
  markEvent(name: string) {
    metricsInternal.markEvent(name);
  },
  reset() {
    metricsInternal.reset();
  },
  exportSummary() {
    return metricsInternal.exportSummary();
  },
};

if (isBrowser) {
  const existingHarness = (window as HarnessWindow).__perfHarness;
  const harnessGlobal: HarnessBundle = {
    metrics: perfMetricsImpl,
    user: harnessUser ?? existingHarness?.user ?? null,
    apis: existingHarness?.apis ?? {},
    reset: () => perfMetricsImpl.reset(),
    export: () => perfMetricsImpl.exportSummary(),
  };
  (window as HarnessWindow).__perfHarness = harnessGlobal;
  (window as HarnessWindow).__perfMetrics = perfMetricsImpl;
}

export const getHarnessUser = (): User | null => harnessUser;

export const isHarnessEnabled = (): boolean => harnessFlag;

export const perfHarnessMetrics = perfMetricsImpl;
export const perfMetrics = perfMetricsImpl;

export const registerHarnessApi = (name: string, api: unknown): void => {
  if (!isBrowser || !harnessFlag) return;
  const harness = (window as HarnessWindow).__perfHarness;
  if (!harness) return;
  harness.apis[name] = api;
};

type HarnessWindow = Window & {
  __perfMetrics?: PerfMetricsPublicApi;
  __perfHarness?: HarnessBundle;
};

export type { PerfMetricsPublicApi };
