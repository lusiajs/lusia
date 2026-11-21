import type { Browser } from "playwright";
import type { BuiltApp } from "./app.ts";
import { VIEWPORT } from "./measure.ts";

export interface Equivalence {
  name: string;
  elements: number;
  differing: number;
}

function shellHtml(css: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body></body></html>`;
}

function styleSignatures(markup: string): string[] {
  document.body.innerHTML = markup;
  return [...document.querySelectorAll("*")].map((element) => {
    const style = getComputedStyle(element);
    return [
      style.color,
      style.backgroundColor,
      style.paddingTop,
      style.marginTop,
      style.opacity,
      style.borderTopColor,
    ].join("|");
  });
}

async function signaturesOf(browser: Browser, app: BuiltApp): Promise<string[]> {
  const context = await browser.newContext({ viewport: VIEWPORT });
  try {
    const page = await context.newPage();
    await page.setContent(shellHtml(app.css));
    return await page.evaluate(styleSignatures, app.markup);
  } finally {
    await context.close();
  }
}

function countDifferences(left: string[], right: string[]): number {
  let differing = Math.abs(left.length - right.length);
  const shared = Math.min(left.length, right.length);
  for (let index = 0; index < shared; index++) if (left[index] !== right[index]) differing++;
  return differing;
}

export async function compareWithReference(
  browser: Browser,
  reference: { name: string; app: BuiltApp },
  others: Array<{ name: string; app: BuiltApp }>,
): Promise<Equivalence[]> {
  const expected = await signaturesOf(browser, reference.app);
  const results: Equivalence[] = [];
  for (const other of others) {
    const actual = await signaturesOf(browser, other.app);
    results.push({
      name: `${other.name} vs ${reference.name}`,
      elements: expected.length,
      differing: countDifferences(expected, actual),
    });
  }
  return results;
}
