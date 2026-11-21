import { chromium, type Browser, type Page } from "playwright";
import { fileURLToPath } from "node:url";

// An attach that opens its space needs real layout, so the tests run in Chromium.
const launch = await chromium
  .launch({ executablePath: process.env.LUSIA_CHROMIUM || undefined })
  .then((browser) => ({ browser, reason: "" }))
  .catch((error: Error) => ({ browser: null, reason: error.message.split("\n")[0] }));
// Shared by both files, so it is not closed per file: Playwright stops it when the test process exits.
export const browser: Browser | null = launch.browser;

async function bundledRuntime(): Promise<string> {
  const entry = fileURLToPath(new URL("./detach-entry.ts", import.meta.url));
  const build = await Bun.build({ entrypoints: [entry], format: "iife", target: "browser" });
  if (!build.success) throw new Error(build.logs.map(String).join("\n"));
  return await build.outputs[0]!.text();
}

export async function openPage(markup: string): Promise<Page> {
  const page = await browser!.newPage();
  await page.setContent(`<!doctype html><html><body>${markup}</body></html>`);
  await page.addScriptTag({ content: await bundledRuntime() });
  return page;
}

export const ATTACH_LIST = `
  <style>body{margin:0}</style>
  <div id="list" style="display:flex;flex-direction:column;width:200px;row-gap:16px">
    <div id="before" style="height:40px"></div>
    <div id="after" style="height:40px"></div>
  </div>`;

/** Inserts `#gone` before `#after` with an ATTACH animation, and samples `#after`'s top for 700ms. */
export async function attachSamples(
  page: Page,
  extraMore = "{}",
  configText?: string,
): Promise<number[]> {
  return await page.evaluate(
    async ({ moreText, config }: { moreText: string; config: string | null }) => {
      if (config !== null) (window as any).lusiaSetConfig(JSON.parse(config));

      const list = document.getElementById("list")!;
      const after = document.getElementById("after")!;
      const samples: number[] = [];
      const sample = () => samples.push(after.getBoundingClientRect().top);

      sample();
      const gone = document.createElement("div");
      gone.id = "gone";
      gone.style.height = "60px";
      gone.style.margin = "0";
      list.insertBefore(gone, after);

      const value = {
        style: { 0: { opacity: 0 }, 1: { opacity: 1 } },
        when: (window as any).lusiaWhen.ATTACH,
        duration: 400,
        more: JSON.parse(moreText),
      };
      (window as any).lusiaAnimate(gone, () => value, [], []);

      let running = true;
      const loop = () => {
        sample();
        if (running) requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      await new Promise((resolve) => setTimeout(resolve, 700));
      running = false;
      sample();
      return samples;
    },
    { moreText: extraMore, config: configText ?? null },
  );
}
