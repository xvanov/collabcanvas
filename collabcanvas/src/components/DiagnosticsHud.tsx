import { useEffect, useMemo, useState } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { perfMetrics } from '../utils/harness';

interface DiagnosticsHudProps {
  fps: number;
  visible: boolean;
}

interface AggregatedMetrics {
  medianFps: number;
  fpsSamples: number;
  shapeLatencyP95: number;
  cursorLatencyP95: number;
  shapeSamples: number;
  cursorSamples: number;
  eventCounts: Record<string, number>;
}

const DEFAULT_METRICS: AggregatedMetrics = {
  medianFps: 0,
  fpsSamples: 0,
  shapeLatencyP95: 0,
  cursorLatencyP95: 0,
  shapeSamples: 0,
  cursorSamples: 0,
  eventCounts: {},
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function percentile(values: number[], pct: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((pct / 100) * (sorted.length - 1))));
  return sorted[index];
}

export function DiagnosticsHud({ fps, visible }: DiagnosticsHudProps) {
  const shapeCount = useCanvasStore((state) => state.shapes.size);
  const lockCount = useCanvasStore((state) => state.locks.size);
  const queuedUpdatesCount = useCanvasStore((state) => state.queuedUpdatesCount);
  const connectionState = useCanvasStore((state) => state.connectionState);
  const [metrics, setMetrics] = useState<AggregatedMetrics>(DEFAULT_METRICS);

  useEffect(() => {
    if (!visible) return undefined;

    const updateMetrics = () => {
      const summary = perfMetrics.exportSummary();
      console.log('Diagnostics HUD - PerfMetrics Summary:', summary);
      if (!summary) {
        console.log('Diagnostics HUD - No summary available, using default metrics');
        setMetrics(DEFAULT_METRICS);
        return;
      }

      const nextMetrics: AggregatedMetrics = {
        medianFps: median(summary.fpsSamples),
        fpsSamples: summary.fpsSamples.length,
        shapeLatencyP95: percentile(summary.shapeLatencySamples, 95),
        cursorLatencyP95: percentile(summary.cursorLatencySamples, 95),
        shapeSamples: summary.shapeLatencySamples.length,
        cursorSamples: summary.cursorLatencySamples.length,
        eventCounts: summary.metadata.eventCounts,
      };

      console.log('Diagnostics HUD - Raw latency samples:', {
        shapeLatencySamples: summary.shapeLatencySamples.slice(0, 10), // First 10 samples
        cursorLatencySamples: summary.cursorLatencySamples.slice(0, 10), // First 10 samples
        shapeP95: percentile(summary.shapeLatencySamples, 95),
        cursorP95: percentile(summary.cursorLatencySamples, 95),
      });
      setMetrics(nextMetrics);
    };

    updateMetrics();
    const interval = window.setInterval(updateMetrics, 1000);
    return () => window.clearInterval(interval);
  }, [visible]);

  const statusColor = useMemo(() => {
    if (!visible) return 'bg-slate-700/80';
    const fpsOk = metrics.medianFps >= 60;
    const shapeOk = metrics.shapeLatencyP95 <= 100;
    const cursorOk = metrics.cursorLatencyP95 <= 50;
    const allGood = fpsOk && shapeOk && cursorOk;
    return allGood ? 'bg-emerald-700/90' : 'bg-orange-700/90';
  }, [metrics, visible]);

  if (!visible) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 w-72 rounded-xl px-4 py-3 text-white shadow-xl backdrop-blur ${statusColor}`}>
      <header className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-white/70">
        <span>Diagnostics HUD</span>
        <span>{connectionState?.isOnline ? 'Online' : 'Offline'}</span>
      </header>
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between">
          <dt>Live FPS</dt>
          <dd className="font-semibold">{fps.toFixed(0)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Median FPS</dt>
          <dd>{metrics.medianFps.toFixed(1)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>P95 Shape Latency</dt>
          <dd>{metrics.shapeLatencyP95 < 1 ? '<1.0' : metrics.shapeLatencyP95.toFixed(1)} ms</dd>
        </div>
        <div className="flex justify-between">
          <dt>P95 Cursor Latency</dt>
          <dd>
            {metrics.cursorSamples === 0 
              ? 'N/A (single user)' 
              : metrics.cursorLatencyP95 < 1 
                ? '<1.0' 
                : metrics.cursorLatencyP95.toFixed(1)
            } ms
            {metrics.cursorSamples === 0 && metrics.eventCounts?.cursorUpdateLocal > 0 && (
              <span className="text-xs text-yellow-400 ml-1">(RTDB disabled)</span>
            )}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Shapes</dt>
          <dd>{shapeCount}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Locked</dt>
          <dd>{lockCount}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Queued Updates</dt>
          <dd>{queuedUpdatesCount}</dd>
        </div>
      </dl>
      {Object.keys(metrics.eventCounts).length > 0 && (
        <div className="mt-2 border-t border-white/10 pt-2 text-[11px] leading-snug text-white/70">
          {Object.entries(metrics.eventCounts).map(([event, count]) => (
            <div key={event} className="flex justify-between">
              <span>{event}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
