import { afterAll, describe, expect, test } from "bun:test";
import { chromium, type Browser, type Page } from "playwright";
import { fileURLToPath } from "node:url";

// A RESIZE glide writes the real width, so the element this test checks needs real layout.
const launch = await chromium
  .launch({ executablePath: process.env.LUSIA_CHROMIUM || undefined })
  .then((browser) => ({ browser, reason: "" }))
  .catch((error: Error) => ({ browser: null, reason: error.message.split("\n")[0] }));
const browser: Browser | null = launch.browser;
afterAll(() => browser?.close());

const suite = browser ? describe : describe.skip;

async function bundledRuntime(): Promise<string> {
  const entry = fileURLToPath(new URL("../fixtures/layout-entry.ts", import.meta.url));
  const build = await Bun.build({ entrypoints: [entry], format: "iife", target: "browser" });
  if (!build.success) throw new Error(build.logs.map(String).join("\n"));
  return await build.outputs[0]!.text();
}

async function openPage(markup: string): Promise<Page> {
  const page = await browser!.newPage();
  await page.setContent(`<!doctype html><html><body>${markup}</body></html>`);
  await page.addScriptTag({ content: await bundledRuntime() });
  return page;
}

interface Sample {
  inlineWidth: string;
  scale: string;
  computedScale: string;
  width: number;
  childWidth: number;
  childLayout: number;
}

interface CenteredSample {
  x: number;
  width: number;
  inlineWidth: string;
  scale: string;
  docWidth: number;
}

const PANEL = `
  <style>
    body { margin: 0; }
    #panel { width: 200px; height: 60px; padding: 8px; border: 2px solid #000; overflow: hidden; }
    #panel.wide { width: 400px; height: 100px; }
    #child { width: 100%; height: 20px; background: #888; }
  </style>
  <div id="wrap"><div id="panel"><div id="child"></div></div></div>`;

/** Resizes `#panel` with a RESIZE glide and samples it on every frame until the glide has ended. */
async function sampleResize(page: Page): Promise<Sample[]> {
  return await page.evaluate(async () => {
    const panel = document.getElementById("panel")!;
    const child = document.getElementById("child")!;
    const value = { on: (window as any).lusiaOn.RESIZE, duration: 400 };
    const cleanups: Array<() => void> = [];
    (window as any).lusiaAnimate(panel, () => value, cleanups, []);

    const sample = (): Sample => {
      const rect = panel.getBoundingClientRect();
      return {
        inlineWidth: panel.style.width,
        scale: panel.style.scale,
        computedScale: getComputedStyle(panel).scale,
        width: rect.width,
        childWidth: child.getBoundingClientRect().width,
        childLayout: child.offsetWidth,
      };
    };

    const samples: Sample[] = [];
    let running = true;
    const tick = () => {
      samples.push(sample());
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    panel.classList.add("wide");
    await new Promise((resolve) => setTimeout(resolve, 700));
    running = false;
    samples.push(sample());
    cleanups.forEach((cleanup) => cleanup());
    return samples;
  });
}

// A centred box whose layout place moves with the inline width the glide writes.
const CENTERED = `
  <style>
    body { margin: 0; }
    #wrap { position: relative; width: 600px; height: 60px; }
    #box { position: absolute; top: 10px; left: 0; right: 0; width: 100px; height: 30px; margin: 0 auto; }
    #box.open { width: 300px; height: 34px; }
  </style>
  <div id="wrap"><div id="box"></div></div>`;

/** Opens the centred box with a MOVE_OR_RESIZE glide and samples its visual box every frame. */
async function sampleCentered(page: Page): Promise<CenteredSample[]> {
  return await page.evaluate(async () => {
    const box = document.getElementById("box")!;
    const value = { on: (window as any).lusiaOn.MOVE_OR_RESIZE, duration: 300 };
    const cleanups: Array<() => void> = [];
    (window as any).lusiaAnimate(box, () => value, cleanups, []);

    const sample = (): CenteredSample => {
      const rect = box.getBoundingClientRect();
      return {
        x: rect.x,
        width: rect.width,
        inlineWidth: box.style.width,
        scale: box.style.scale,
        docWidth: document.documentElement.scrollWidth,
      };
    };

    const samples: CenteredSample[] = [sample()];
    let running = true;
    const tick = () => {
      samples.push(sample());
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    box.classList.add("open");
    await new Promise((resolve) => setTimeout(resolve, 500));
    running = false;
    samples.push(sample());
    cleanups.forEach((cleanup) => cleanup());
    return samples;
  });
}

suite("MOVE_OR_RESIZE keeps a centred box on its path", () => {
  test("writing the size does not jump the box or stretch the page", async () => {
    const page = await openPage(CENTERED);
    try {
      const samples = await sampleCentered(page);
      const closed = samples[0]!;
      expect(closed.x).toBeCloseTo(250, 0);
      expect(closed.width).toBeCloseTo(100, 0);

      const active = samples.filter((sample) => sample.inlineWidth !== "");
      expect(active.length).toBeGreaterThan(3);
      for (const sample of active) {
        expect(sample.scale).toBe("");
        expect(sample.x).toBeLessThanOrEqual(closed.x + 1);
        expect(sample.x).toBeGreaterThanOrEqual(149);
        expect(sample.docWidth).toBe(closed.docWidth);
      }
      for (let i = 1; i < active.length; i++) {
        expect(active[i]!.x).toBeLessThanOrEqual(active[i - 1]!.x + 1);
      }
      expect(active[active.length - 1]!.x).toBeLessThan(active[0]!.x - 50);

      const settled = samples[samples.length - 1]!;
      expect(settled.inlineWidth).toBe("");
      expect(settled.x).toBeCloseTo(150, 0);
      expect(settled.width).toBeCloseTo(300, 0);
    } finally {
      await page.close();
    }
  });
});

suite("RESIZE glides the real size", () => {
  test("the width grows frame by frame with no scale, and the child never stretches", async () => {
    const page = await openPage(PANEL);
    try {
      const samples = await sampleResize(page);
      const active = samples.filter((sample) => sample.inlineWidth !== "");
      expect(active.length).toBeGreaterThan(5);

      for (const sample of active) {
        expect(sample.scale).toBe("");
        expect(sample.computedScale).toBe("none");
        expect(sample.width).toBeGreaterThan(219);
        expect(sample.width).toBeLessThan(421);
        expect(Math.abs(sample.childWidth - sample.childLayout)).toBeLessThan(1);
      }

      const grows = active.filter((sample) => sample.width > 240 && sample.width < 400);
      expect(grows.length).toBeGreaterThan(3);
      for (let i = 1; i < active.length; i++) {
        expect(active[i]!.width).toBeGreaterThan(active[i - 1]!.width - 0.5);
      }
      expect(samples[samples.length - 1]!.width).toBeCloseTo(420, 0);
    } finally {
      await page.close();
    }
  });

  test("the written width leaves out the padding and border, so removing it does not jump", async () => {
    const page = await openPage(PANEL);
    try {
      const samples = await sampleResize(page);
      const active = samples.filter((sample) => sample.inlineWidth !== "");
      for (const sample of active) {
        expect(parseFloat(sample.inlineWidth)).toBeCloseTo(sample.width - 20, 0);
      }

      const lastActive = active[active.length - 1]!;
      const settled = samples[samples.length - 1]!;
      expect(settled.inlineWidth).toBe("");
      expect(settled.width).toBeCloseTo(420, 0);
      expect(Math.abs(settled.width - lastActive.width)).toBeLessThan(2);
    } finally {
      await page.close();
    }
  });
});
