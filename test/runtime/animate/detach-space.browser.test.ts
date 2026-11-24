import { afterAll, describe, expect, test } from "bun:test";
import { chromium, type Browser, type Page } from "playwright";
import { fileURLToPath } from "node:url";

// A leave that closes its space needs real layout, so this runs in Chromium.
const launch = await chromium
  .launch({ executablePath: process.env.LUSIA_CHROMIUM || undefined })
  .then((browser) => ({ browser, reason: "" }))
  .catch((error: Error) => ({ browser: null, reason: error.message.split("\n")[0] }));
const browser: Browser | null = launch.browser;
afterAll(() => browser?.close());

const suite = browser ? describe : describe.skip;
const SKIP_HINT = `set LUSIA_CHROMIUM or run \`bunx playwright install chromium\` (${launch.reason})`;

async function bundledRuntime(): Promise<string> {
  const entry = fileURLToPath(new URL("./fixtures/detach-entry.ts", import.meta.url));
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

/** Removes `#gone` with its DETACH animation, and samples the `axis` position of `#after` each frame until the removal. */
async function sampleLeave(
  page: Page,
  more: string,
  axis: "top" | "left",
  config = "",
): Promise<number[]> {
  return await page.evaluate(
    async ([moreText, edge, configText]) => {
      if (configText !== "") (window as any).lusiaSetConfig(JSON.parse(configText));
      const gone = document.getElementById("gone")!;
      const after = document.getElementById("after")!;
      const more = moreText === "" ? undefined : JSON.parse(moreText);
      const value = {
        play: { 0: { opacity: 1 }, 1: { opacity: 0 } },
        on: (window as any).lusiaOn.DETACH,
        duration: 400,
        ...(more ? { options: more } : {}),
      };
      const cleanups: Array<() => void> = [];
      const leaves: Array<() => Promise<void>> = [];
      (window as any).lusiaAnimate(gone, () => value, cleanups, leaves);
      const tops: number[] = [];
      const sampling = setInterval(() => tops.push(after.getBoundingClientRect()[edge]), 16);
      const done = (window as any).lusiaLeaveThen(leaves, () => gone.remove());
      await done;
      clearInterval(sampling);
      tops.push(after.getBoundingClientRect()[edge]);
      return tops;
    },
    [more, axis, config] as const,
  );
}

const LIST = `
  <div id="list" style="display:flex;flex-direction:column;width:200px">
    <div id="before" style="height:40px"></div>
    <div id="gone" style="height:60px;margin:10px 0"></div>
    <div id="after" style="height:40px"></div>
  </div>`;

suite("DETACH with animateSpace slides the siblings", () => {
  test("the sibling after a leaving row moves gradually, not in one jump", async () => {
    const page = await openPage(LIST);
    try {
      const tops = await sampleLeave(page, '{"animateSpace":true}', "top");
      const first = tops[0]!;
      const last = tops[tops.length - 1]!;
      expect(first - last).toBeCloseTo(80, 0);
      const middle = tops.filter((top) => top > last + 1 && top < first - 1);
      expect(middle.length).toBeGreaterThan(3);
    } finally {
      await page.close();
    }
  });

  test("with no option and no config the sibling jumps at once", async () => {
    const page = await openPage(LIST);
    try {
      const tops = await sampleLeave(page, "", "top");
      const first = tops[0]!;
      const last = tops[tops.length - 1]!;
      expect(first - last).toBeCloseTo(80, 0);
      const middle = tops.filter((top) => top > last + 1 && top < first - 1);
      expect(middle.length).toBe(0);
    } finally {
      await page.close();
    }
  });

  test("config detach animateSpace true makes the sibling slide with no per-item option", async () => {
    const page = await openPage(LIST);
    try {
      const tops = await sampleLeave(page, "", "top", '{"detach":{"animateSpace":true}}');
      const first = tops[0]!;
      const last = tops[tops.length - 1]!;
      expect(first - last).toBeCloseTo(80, 0);
      const middle = tops.filter((top) => top > last + 1 && top < first - 1);
      expect(middle.length).toBeGreaterThan(3);
    } finally {
      await page.close();
    }
  });

  test("with animateSpace false the sibling jumps once, when the row is removed", async () => {
    const page = await openPage(LIST);
    try {
      const tops = await sampleLeave(page, '{"animateSpace":false}', "top");
      const first = tops[0]!;
      const last = tops[tops.length - 1]!;
      expect(first - last).toBeCloseTo(80, 0);
      const middle = tops.filter((top) => top > last + 1 && top < first - 1);
      expect(middle.length).toBe(0);
    } finally {
      await page.close();
    }
  });

  test("a row in a horizontal flex list closes its width", async () => {
    const page = await openPage(`
      <div id="list" style="display:flex;flex-direction:row;align-items:flex-start">
        <div id="gone" style="width:100px;height:30px;margin-right:20px"></div>
        <div id="after" style="width:50px;height:30px"></div>
      </div>`);
    try {
      const lefts = await sampleLeave(page, '{"animateSpace":true}', "left");
      const first = lefts[0]!;
      const last = lefts[lefts.length - 1]!;
      expect(first - last).toBeCloseTo(120, 0);
      expect(lefts.filter((left) => left > last + 1 && left < first - 1).length).toBeGreaterThan(3);
    } finally {
      await page.close();
    }
  });
});

const GAP_LIST = `
  <div id="list" style="display:flex;flex-direction:column;gap:16px;width:200px">
    <div id="before" style="height:40px"></div>
    <div id="gone" style="width:100px;height:60px;margin:10px 0"></div>
    <div id="after" style="height:40px"></div>
  </div>`;

/** Starts the `#gone` leave and samples `#after`'s edge on every frame until the leave ends. */
async function frameSamples(
  page: Page,
  edge: "top" | "left",
  extra = { options: { animateSpace: true } },
): Promise<number[]> {
  return await page.evaluate(
    async ([extraText, edgeName]) => {
      const gone = document.getElementById("gone")!;
      const after = document.getElementById("after")!;
      const leaves: Array<() => Promise<void>> = [];
      const value = {
        play: { 0: { opacity: 1 }, 1: { opacity: 0 } },
        on: (window as any).lusiaOn.DETACH,
        duration: 400,
        ...JSON.parse(extraText),
      };
      (window as any).lusiaAnimate(gone, () => value, [], leaves);
      const samples: number[] = [];
      let running = true;
      const sample = () => {
        samples.push(after.getBoundingClientRect()[edgeName as "top" | "left"]);
        if (running) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
      await (window as any).lusiaLeaveThen(leaves, () => gone.remove());
      running = false;
      samples.push(after.getBoundingClientRect()[edgeName as "top" | "left"]);
      return samples;
    },
    [JSON.stringify(extra), edge] as const,
  );
}

/** Reads the `a` value from a computed `matrix(a, b, c, d, e, f)` transform. */
function matrixScaleX(transform: string): number {
  return Number(transform.replace(/^matrix\(/, "").split(",")[0]);
}

suite("DETACH lifts the element out of flow", () => {
  test("a sibling in a gapped flex column moves every frame with no final jump", async () => {
    const page = await openPage(GAP_LIST);
    try {
      const tops = await frameSamples(page, "top", { options: { animateSpace: true } });
      const first = tops[0]!;
      const last = tops[tops.length - 1]!;
      expect(first - last).toBeCloseTo(96, 0);
      for (let i = 1; i < tops.length; i++)
        expect(tops[i]!).toBeLessThanOrEqual(tops[i - 1]! + 0.01);
      expect(tops[tops.length - 2]! - last).toBeLessThan(2);
    } finally {
      await page.close();
    }
  });

  test("a sibling in a gapped grid moves every frame with no final jump", async () => {
    const page = await openPage(`
      <div id="list" style="display:grid;gap:16px;width:200px">
        <div id="before" style="height:40px"></div>
        <div id="gone" style="width:100px;height:60px;margin:10px 0"></div>
        <div id="after" style="height:40px"></div>
      </div>`);
    try {
      const tops = await frameSamples(page, "top", { options: { animateSpace: true } });
      const first = tops[0]!;
      const last = tops[tops.length - 1]!;
      expect(first - last).toBeCloseTo(96, 0);
      for (let i = 1; i < tops.length; i++)
        expect(tops[i]!).toBeLessThanOrEqual(tops[i - 1]! + 0.01);
      expect(tops[tops.length - 2]! - last).toBeLessThan(2);
    } finally {
      await page.close();
    }
  });

  test("the leaving element keeps its size and rotation mid-leave", async () => {
    const page = await openPage(GAP_LIST);
    try {
      const mid = await page.evaluate(async () => {
        const gone = document.getElementById("gone")!;
        const leaves: Array<() => Promise<void>> = [];
        (window as any).lusiaAnimate(
          gone,
          () => ({
            play: { 0: { rotate: "0deg" }, 1: { rotate: "180deg" } },
            on: (window as any).lusiaOn.DETACH,
            duration: 400,
            options: { animateSpace: true },
          }),
          [],
          leaves,
        );
        const done = (window as any).lusiaLeaveThen(leaves, () => gone.remove());
        await new Promise((resolve) => setTimeout(resolve, 200));
        const snapshot = {
          width: gone.offsetWidth,
          height: gone.offsetHeight,
          rotate: parseFloat(getComputedStyle(gone).rotate),
          placeholders: document.querySelectorAll("#list > [aria-hidden]").length,
        };
        await done;
        return snapshot;
      });
      expect(mid.width).toBe(100);
      expect(mid.height).toBe(60);
      expect(mid.rotate).toBeGreaterThan(0);
      expect(mid.rotate).toBeLessThan(180);
      expect(mid.placeholders).toBe(0);
    } finally {
      await page.close();
    }
  });

  test("the placeholder and the lift are gone once the leave ends", async () => {
    const page = await openPage(GAP_LIST);
    try {
      await frameSamples(page, "top");
      expect(await page.locator("#list > [aria-hidden]").count()).toBe(0);
    } finally {
      await page.close();
    }
  });

  test("a grid row shared with other items does not move while the item leaves", async () => {
    const page = await openPage(`
      <div id="list" style="display:grid;grid-template-columns:100px 100px;gap:16px">
        <div id="before" style="grid-row:1;grid-column:1;height:40px"></div>
        <div id="gone" style="grid-row:1;grid-column:2;height:40px"></div>
        <div id="after" style="grid-row:2;grid-column:1;height:40px"></div>
      </div>`);
    try {
      const tops = await frameSamples(page, "top");
      expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(0.5);
    } finally {
      await page.close();
    }
  });

  test("a cancelled leave reopens the space, with no jump at the cancel", async () => {
    const page = await openPage(GAP_LIST);
    try {
      const result = await page.evaluate(async () => {
        const gone = document.getElementById("gone")!;
        const after = document.getElementById("after")!;
        const cleanups: Array<() => void> = [];
        const leaves: Array<() => Promise<void>> = [];
        const initial = after.getBoundingClientRect().top;
        (window as any).lusiaAnimate(
          gone,
          () => ({
            play: { 0: { opacity: 1 }, 1: { opacity: 0 } },
            on: (window as any).lusiaOn.DETACH,
            duration: 400,
            options: { animateSpace: true },
          }),
          cleanups,
          leaves,
        );
        const leaving = Promise.all(leaves.map((leave) => leave()));
        await new Promise((resolve) => setTimeout(resolve, 150));
        const beforeCancel = after.getBoundingClientRect().top;
        cleanups.forEach((cleanup) => cleanup());
        const atCancel = after.getBoundingClientRect().top;
        await leaving;
        return {
          initial,
          beforeCancel,
          atCancel,
          afterReopen: after.getBoundingClientRect().top,
          inFlow: gone.style.position === "",
          placeholders: document.querySelectorAll("#list > [aria-hidden]").length,
          width: gone.offsetWidth,
        };
      });
      expect(Math.abs(result.atCancel - result.beforeCancel)).toBeLessThan(0.5);
      expect(result.afterReopen).toBeCloseTo(result.initial, 0);
      expect(result.inFlow).toBe(true);
      expect(result.placeholders).toBe(0);
      expect(result.width).toBe(100);
    } finally {
      await page.close();
    }
  });

  test("a sibling keeps its own inline transform after the leave", async () => {
    const page = await openPage(`
      <div id="list" style="display:flex;flex-direction:column;gap:16px;width:200px">
        <div id="before" style="height:40px"></div>
        <div id="gone" style="width:100px;height:60px;margin:10px 0"></div>
        <div id="after" style="height:40px;transform:translateX(7px)"></div>
      </div>`);
    try {
      const transform = await page.evaluate(async () => {
        const gone = document.getElementById("gone")!;
        const leaves: Array<() => Promise<void>> = [];
        (window as any).lusiaAnimate(
          gone,
          () => ({
            play: { 0: { opacity: 1 }, 1: { opacity: 0 } },
            on: (window as any).lusiaOn.DETACH,
            duration: 400,
            options: { animateSpace: true },
          }),
          [],
          leaves,
        );
        await (window as any).lusiaLeaveThen(leaves, () => gone.remove());
        return document.getElementById("after")!.style.transform;
      });
      expect(transform).toBe("translateX(7px)");
    } finally {
      await page.close();
    }
  });

  test("a sibling keeps its stylesheet transform during the leave", async () => {
    const page = await openPage(`
      <style>.tilt{transform:rotate(10deg)}</style>
      <div id="list" style="display:flex;flex-direction:column;gap:16px;width:200px">
        <div id="before" style="height:40px"></div>
        <div id="gone" style="width:100px;height:60px;margin:10px 0"></div>
        <div id="after" class="tilt" style="height:40px"></div>
      </div>`);
    try {
      const result = await page.evaluate(async () => {
        const gone = document.getElementById("gone")!;
        const after = document.getElementById("after")!;
        const leaves: Array<() => Promise<void>> = [];
        (window as any).lusiaAnimate(
          gone,
          () => ({
            play: { 0: { opacity: 1 }, 1: { opacity: 0 } },
            on: (window as any).lusiaOn.DETACH,
            duration: 400,
            options: { animateSpace: true },
          }),
          [],
          leaves,
        );
        const done = (window as any).lusiaLeaveThen(leaves, () => gone.remove());
        await new Promise((resolve) => setTimeout(resolve, 200));
        const during = getComputedStyle(after).transform;
        await done;
        return { during, after: getComputedStyle(after).transform };
      });
      const cosTen = Math.cos((10 * Math.PI) / 180);
      expect(result.during).not.toBe("none");
      expect(Math.abs(matrixScaleX(result.during) - cosTen)).toBeLessThan(0.01);
      expect(result.after).toMatch(/^matrix\(/);
      expect(Math.abs(matrixScaleX(result.after) - cosTen)).toBeLessThan(0.01);
    } finally {
      await page.close();
    }
  });
});
