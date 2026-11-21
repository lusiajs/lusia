import type { Browser, CDPSession } from "playwright";
import type { BuiltApp } from "./app.ts";
import { median } from "./stats.ts";

export const VIEWPORT = { width: 1280, height: 800 };
export const TOGGLE_COUNT = 10;
export const IDLE_MS = 200;

export interface RunSample {
  initialCdpMs: number;
  initialWallMs: number;
  initialRecalcCount: number;
  toggleCdpMs: number;
}

interface RecalcTotals {
  seconds: number;
  count: number;
}

interface MetricEntry {
  name: string;
  value: number;
}

function metricValue(metrics: MetricEntry[], name: string): number {
  return metrics.find((metric) => metric.name === name)?.value ?? 0;
}

async function readRecalc(session: CDPSession): Promise<RecalcTotals> {
  const { metrics } = (await session.send("Performance.getMetrics")) as { metrics: MetricEntry[] };
  return {
    seconds: metricValue(metrics, "RecalcStyleDuration"),
    count: metricValue(metrics, "RecalcStyleCount"),
  };
}

function shellHtml(css: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body></body></html>`;
}

// Page-side functions are serialized by Playwright, so each one is self-contained.
function insertMarkup(markup: string): number {
  const start = performance.now();
  document.body.innerHTML = markup;
  getComputedStyle(document.body).color;
  document.body.offsetHeight;
  return performance.now() - start;
}

function toggleActiveEveryThird(): void {
  document.querySelectorAll("*").forEach((node, index) => {
    if (index % 3 === 0) node.classList.toggle("active");
  });
  getComputedStyle(document.body).color;
  document.body.offsetHeight;
}

function settleEmptyBody(): void {
  getComputedStyle(document.body).color;
  document.body.offsetHeight;
}

function recalcDeltaMs(before: RecalcTotals, after: RecalcTotals): number {
  return (after.seconds - before.seconds) * 1000;
}

export async function runSample(browser: Browser, app: BuiltApp): Promise<RunSample> {
  const context = await browser.newContext({ viewport: VIEWPORT });
  try {
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await session.send("Performance.enable");
    await page.setContent(shellHtml(app.css));
    await page.evaluate(settleEmptyBody);

    const beforeInitial = await readRecalc(session);
    const initialWallMs = await page.evaluate(insertMarkup, app.markup);
    const afterInitial = await readRecalc(session);

    const toggleDeltas: number[] = [];
    for (let toggle = 0; toggle < TOGGLE_COUNT; toggle++) {
      const before = await readRecalc(session);
      await page.evaluate(toggleActiveEveryThird);
      const after = await readRecalc(session);
      toggleDeltas.push(recalcDeltaMs(before, after));
    }

    return {
      initialCdpMs: recalcDeltaMs(beforeInitial, afterInitial),
      initialWallMs,
      initialRecalcCount: afterInitial.count - beforeInitial.count,
      toggleCdpMs: median(toggleDeltas),
    };
  } finally {
    await context.close();
  }
}

export function idle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, IDLE_MS));
}
