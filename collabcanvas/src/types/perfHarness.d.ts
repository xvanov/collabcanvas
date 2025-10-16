import type { PerfMetricsPublicApi, PerfMetricsSummary } from '../utils/harness';
import type { User } from '../types';

declare global {
  interface Window {
    __perfMetrics?: PerfMetricsPublicApi;
    __perfHarness?: {
      metrics: PerfMetricsPublicApi;
      user: User | null;
      apis: Record<string, unknown>;
      reset: () => void;
      export: () => PerfMetricsSummary | null;
    };
    __canvasStore?: unknown;
  }
}

export {};
