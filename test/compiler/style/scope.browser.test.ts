import { afterAll, describe, expect, test } from "bun:test";
import { chromium, type Browser } from "playwright";
import { scopeCss, type StyleMode } from "#compiler/style/modes.ts";
import { ID } from "./fixtures.ts";

// Classes as the runtime sets them: `l-p` on p's own elements, `t-p` on p's elements and everything inside them.
const DOM = `<div class="t-g"><h1 class="t l-p t-p" id="top"></h1><div class="card l-p t-p"><h1 class="t l-p t-p" id="own"></h1><a id="link" class="l-p t-p"></a><div class="t-c"><h1 class="t t-p t-c" id="child"></h1></div></div></div><h1 class="t" id="outside"></h1>`;
const PAGE = `<!doctype html><html><body class="dark">${DOM}</body></html>`;

// Launched once per file. Top-level await, because bun cannot skip a test after it is registered.
const launch = await chromium
  .launch({ executablePath: process.env.LUSIA_CHROMIUM || undefined })
  .then((browser) => ({ browser, reason: "" }))
  .catch((error: Error) => ({ browser: null, reason: error.message.split("\n")[0] }));
const browser: Browser | null = launch.browser;
afterAll(() => browser?.close());

const suite = browser ? describe : describe.skip;
const SKIP_HINT = `set LUSIA_CHROMIUM or run \`bunx playwright install chromium\` (${launch.reason})`;

function selectorOf(rule: string, mode: StyleMode): string {
  const out = scopeCss(`${rule} { color: red; }`, ID, mode);
  return out.slice(0, out.indexOf(" {"));
}

async function matchedIds(selector: string): Promise<string[]> {
  const page = await browser!.newPage();
  try {
    await page.setContent(PAGE);
    return await page.evaluate(
      (sel) => [...document.querySelectorAll(sel)].map((el) => el.id),
      selector,
    );
  } finally {
    await page.close();
  }
}

suite(
  browser ? "scoped selectors in Chromium" : `scoped selectors in Chromium (skipped: ${SKIP_HINT})`,
  () => {
    test("tree .t matches the component's own tree", async () => {
      expect(await matchedIds(selectorOf(".t", "tree"))).toEqual(["top", "own", "child"]);
    });

    test("scoped .t stops at child components", async () => {
      expect(await matchedIds(selectorOf(".t", "scoped"))).toEqual(["top", "own"]);
    });

    test(":global(.dark) .t keeps the ancestor global", async () => {
      expect(await matchedIds(selectorOf(":global(.dark) .t", "tree"))).toEqual([
        "top",
        "own",
        "child",
      ]);
    });

    test(".card :global(a) scopes .card and leaves a global", async () => {
      expect(await matchedIds(selectorOf(".card :global(a)", "tree"))).toEqual(["link"]);
    });
  },
);
