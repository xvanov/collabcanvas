import { test, expect } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const CLIENT_COUNT = Number.parseInt(process.env.PERF_CLIENT_COUNT ?? '5', 10);
const SHAPE_TARGET = Number.parseInt(process.env.PERF_SHAPE_TARGET ?? '500', 10);
const MOVE_ITERATIONS = Number.parseInt(process.env.PERF_MOVE_ITERATIONS ?? '60', 10);
const MOVE_AMPLITUDE = Number.parseInt(process.env.PERF_MOVE_AMPLITUDE ?? '120', 10);
const CREATE_BATCH_SIZE = Math.max(1, Number.parseInt(process.env.PERF_CREATE_BATCH ?? '10', 10));

type PerfSummary = {
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
};

interface AggregatedMetrics {
  medianFps: number;
  fpsSampleCount: number;
  shapeLatencyP95: number;
  shapeSampleCount: number;
  cursorLatencyP95: number;
  cursorSampleCount: number;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function percentile(values: number[], percentileValue: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((percentileValue / 100) * (sorted.length - 1))));
  return sorted[index];
}

function aggregateSummaries(summaries: PerfSummary[]): AggregatedMetrics {
  const fps = summaries.flatMap((summary) => summary.fpsSamples);
  const shapeLatencies = summaries.flatMap((summary) => summary.shapeLatencySamples);
  const cursorLatencies = summaries.flatMap((summary) => summary.cursorLatencySamples);

  return {
    medianFps: median(fps),
    fpsSampleCount: fps.length,
    shapeLatencyP95: percentile(shapeLatencies, 95),
    shapeSampleCount: shapeLatencies.length,
    cursorLatencyP95: percentile(cursorLatencies, 95),
    cursorSampleCount: cursorLatencies.length,
  };
}

test.describe.configure({ mode: 'serial' });

test('collabcanvas sustains PRD performance targets under load', async ({ browser, baseURL }, testInfo) => {
  expect(baseURL).toBeTruthy();

  const contexts = [] as import('@playwright/test').BrowserContext[];
  const pages = [] as import('@playwright/test').Page[];

  for (let i = 0; i < CLIENT_COUNT; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${baseURL}/?perfHarness=1&hUser=harness-${testInfo.project.name}-${i}`);
    await page.waitForSelector('text=Create Rectangle', { timeout: 30_000 });
    await page.evaluate(() => {
      window.__perfMetrics?.reset();
    });
    contexts.push(context);
    pages.push(page);
  }

  const leader = pages[0];

  await leader.waitForFunction(() => Boolean(window.__perfHarness?.apis?.shapes), { timeout: 20_000 });

  await leader.evaluate(
    async ({ shapeTarget, batchSize }) => {
      const harness = window.__perfHarness;
      if (!harness?.apis?.shapes) {
        throw new Error('Harness shapes API unavailable');
      }
      const api = harness.apis.shapes as {
        createShape: (shape: unknown) => Promise<void>;
      };
      const actor = harness.user ?? { uid: 'harness', name: 'Harness' };

      let created = 0;
      while (created < shapeTarget) {
        const operations: Array<Promise<void>> = [];
        const batchLimit = Math.min(batchSize, shapeTarget - created);

        for (let i = 0; i < batchLimit; i++) {
          const index = created + i;
          const id = `perf-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
          operations.push(
            api.createShape({
              id,
              type: 'rect',
              x: (index % 25) * 120,
              y: Math.floor(index / 25) * 120,
              w: 100,
              h: 100,
              color: '#3B82F6',
              createdAt: Date.now(),
              createdBy: actor.uid,
              updatedAt: Date.now(),
              updatedBy: actor.uid,
            })
          );
        }

        await Promise.all(operations);
        created += batchLimit;

        await new Promise<void>((resolve) => {
          if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => resolve());
          } else {
            setTimeout(() => resolve(), 16);
          }
        });
      }
    },
    { shapeTarget: SHAPE_TARGET, batchSize: CREATE_BATCH_SIZE }
  );

  await Promise.all(pages.map((page) => page.waitForTimeout(2_000)));

  await Promise.all(
    pages.map((page) =>
      page.evaluate(
        async ({ iterations, amplitude }) => {
          const harness = window.__perfHarness;
          const api = harness?.apis?.shapes as {
            updateShapePosition: (id: string, x: number, y: number) => Promise<void>;
          } | undefined;
          if (!api) {
            throw new Error('Harness shapes update API unavailable');
          }
          const store = window.__canvasStore as undefined | { getState: () => { shapes: Map<string, { id: string; x: number; y: number }> } };
          if (!store) {
            throw new Error('Canvas store not exposed to harness');
          }

          for (let i = 0; i < iterations; i++) {
            const state = store.getState();
            const shapes = Array.from(state.shapes.values());
            if (!shapes.length) break;
            const shape = shapes[(i + Math.floor(Math.random() * shapes.length)) % shapes.length];
            const offsetX = (Math.random() - 0.5) * amplitude;
            const offsetY = (Math.random() - 0.5) * amplitude;
            await api.updateShapePosition(shape.id, shape.x + offsetX, shape.y + offsetY);
            await new Promise((resolve) => setTimeout(resolve, 16));
          }
        },
        { iterations: MOVE_ITERATIONS, amplitude: MOVE_AMPLITUDE }
      )
    )
  );

  await Promise.all(pages.map((page) => page.waitForTimeout(2_000)));

  const summaries = await Promise.all(
    pages.map((page) => page.evaluate(() => window.__perfMetrics?.exportSummary?.() ?? null))
  );

  await Promise.all(contexts.map((context) => context.close()));

  const validSummaries = summaries.filter((summary): summary is PerfSummary => Boolean(summary));
  expect(validSummaries.length).toBeGreaterThan(0);

  const aggregated = aggregateSummaries(validSummaries);

  const output = {
    aggregated,
    perClient: validSummaries,
  };

  const outputPath = testInfo.outputPath(path.join('perf', `perf-summary-${testInfo.project.name}.json`));
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8');

  expect(aggregated.fpsSampleCount).toBeGreaterThan(0);
  expect(aggregated.shapeSampleCount).toBeGreaterThan(0);
  expect(aggregated.cursorSampleCount).toBeGreaterThan(0);

  expect(aggregated.medianFps).toBeGreaterThanOrEqual(60);
  expect(aggregated.shapeLatencyP95).toBeLessThanOrEqual(100);
  expect(aggregated.cursorLatencyP95).toBeLessThanOrEqual(50);
});
