import { afterAll, describe, expect, test } from "bun:test";
import { chromium, type Browser } from "playwright";
import { fileURLToPath } from "node:url";

// Named and hsl() colors are resolved by the browser, so this runs in Chromium.
const launch = await chromium
  .launch({ executablePath: process.env.LUSIA_CHROMIUM || undefined })
  .then((browser) => ({ browser, reason: "" }))
  .catch((error: Error) => ({ browser: null, reason: error.message.split("\n")[0] }));
const browser: Browser | null = launch.browser;
afterAll(() => browser?.close());

const suite = browser ? describe : describe.skip;
const SKIP_HINT = `set LUSIA_CHROMIUM or run \`bunx playwright install chromium\` (${launch.reason})`;

async function bundledRuntime(): Promise<string> {
  const entry = fileURLToPath(new URL("../fixtures/browser-entry.ts", import.meta.url));
  const build = await Bun.build({ entrypoints: [entry], format: "iife", target: "browser" });
  if (!build.success) throw new Error(build.logs.map(String).join("\n"));
  return await build.outputs[0]!.text();
}

async function interpolateInPage(from: string, to: string, t: number): Promise<unknown> {
  const page = await browser!.newPage();
  try {
    await page.setContent("<!doctype html><html><body></body></html>");
    await page.addScriptTag({ content: await bundledRuntime() });
    return await page.evaluate(
      ([a, b, p]) => (window as any).lusiaInterpolate(a, b)(p),
      [from, to, t],
    );
  } finally {
    await page.close();
  }
}

suite(
  browser
    ? "named and hsl colors in Chromium"
    : `named and hsl colors in Chromium (skipped: ${SKIP_HINT})`,
  () => {
    test("named colors resolve to rgba", async () => {
      expect(await interpolateInPage("red", "blue", 0)).toBe("rgba(255, 0, 0, 1)");
      expect(await interpolateInPage("red", "blue", 1)).toBe("rgba(0, 0, 255, 1)");
    });

    test("hsl colors resolve to rgba", async () => {
      expect(await interpolateInPage("hsl(0 100% 50%)", "hsl(120 100% 50%)", 0)).toBe(
        "rgba(255, 0, 0, 1)",
      );
      expect(await interpolateInPage("hsl(0 100% 50%)", "hsl(120 100% 50%)", 1)).toBe(
        "rgba(0, 255, 0, 1)",
      );
    });

    test("a word that is not a color stays text", async () => {
      expect(await interpolateInPage("solid", "dashed", 0.2)).toBe("solid");
    });
  },
);

suite(browser ? "var() resolves on the element" : "var() resolves on the element (skipped)", () => {
  test("a scoped custom property is read from the animated element", async () => {
    const page = await browser!.newPage();
    try {
      await page.setContent(
        '<!doctype html><html><body><div style="--c: red"><span id="e"></span></div></body></html>',
      );
      await page.addScriptTag({ content: await bundledRuntime() });
      const value = await page.evaluate(() => {
        const el = document.getElementById("e")!;
        return (window as any).lusiaInterpolate("var(--c)", "blue", el)(0);
      });
      expect(value).toBe("rgba(255, 0, 0, 1)");
    } finally {
      await page.close();
    }
  });
});
