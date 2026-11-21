import type { Browser } from "playwright";
import { buildApp, type BuiltApp } from "./app.ts";
import { idle, runSample, type RunSample } from "./measure.ts";
import { summarize, type Summary } from "./stats.ts";
import type { Variant } from "./variants.ts";

export const RUNS = Number(process.env.BENCH_RUNS ?? 15);
export const NOISY_RUNS = Number(process.env.BENCH_NOISY_RUNS ?? 30);
export const NOISE_LIMIT = 0.3;

export interface VariantResult {
  variant: Variant;
  app: Omit<BuiltApp, "css" | "markup">;
  repetitions: number;
  repeated: boolean;
  initialCdp: Summary;
  initialWall: Summary;
  toggleCdp: Summary;
  recalcCount: Summary;
}

// The first page load is a warm-up and is dropped.
async function collectSamples(browser: Browser, app: BuiltApp, runs: number): Promise<RunSample[]> {
  await runSample(browser, app);
  const samples: RunSample[] = [];
  for (let run = 0; run < runs; run++) {
    await idle();
    samples.push(await runSample(browser, app));
  }
  return samples;
}

function summarizeSamples(variant: Variant, app: BuiltApp, samples: RunSample[], repeated: boolean): VariantResult {
  const { css: _css, markup: _markup, ...sizes } = app;
  return {
    variant,
    app: sizes,
    repetitions: samples.length,
    repeated,
    initialCdp: summarize(samples.map((sample) => sample.initialCdpMs)),
    initialWall: summarize(samples.map((sample) => sample.initialWallMs)),
    toggleCdp: summarize(samples.map((sample) => sample.toggleCdpMs)),
    recalcCount: summarize(samples.map((sample) => sample.initialRecalcCount)),
  };
}

export async function benchVariant(browser: Browser, variant: Variant): Promise<VariantResult> {
  const app = buildApp(variant);
  const first = await collectSamples(browser, app, RUNS);
  const noisy = Math.max(
    summarize(first.map((sample) => sample.initialCdpMs)).spread,
    summarize(first.map((sample) => sample.toggleCdpMs)).spread,
  );
  if (noisy <= NOISE_LIMIT) return summarizeSamples(variant, app, first, false);
  const repeated = await collectSamples(browser, app, NOISY_RUNS);
  return summarizeSamples(variant, app, repeated, true);
}
