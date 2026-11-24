import { describe, expect, test } from "bun:test";
import type { Page } from "playwright";
import { browser, openPage, ATTACH_LIST, attachSamples } from "../../fixtures/browser-page.ts";

const suite = browser ? describe : describe.skip;

async function resetConfig(page: Page): Promise<void> {
  await page.evaluate(() => (window as any).lusiaSetConfig({}));
}

function expectJump(tops: number[]): void {
  const first = tops[0]!;
  const last = tops[tops.length - 1]!;
  expect(Math.abs(last - first - 76)).toBeLessThan(1.5);
  expect(tops.filter((top) => top > first + 1 && top < last - 1)).toHaveLength(0);
}

function expectSlide(tops: number[]): void {
  const first = tops[0]!;
  const last = tops[tops.length - 1]!;
  expect(Math.abs(last - first - 76)).toBeLessThan(1.5);
  for (let i = 1; i < tops.length; i++)
    expect(tops[i]!).toBeGreaterThanOrEqual(tops[i - 1]! - 0.01);
  const middle = tops.filter((top) => top > first + 1 && top < last - 1);
  expect(middle.length).toBeGreaterThanOrEqual(3);
}

suite("ATTACH reads animateSpace from the global config", () => {
  test("config animateSpace false makes the sibling jump with no per-item option", async () => {
    const page = await openPage(ATTACH_LIST);
    try {
      await resetConfig(page);
      expectJump(await attachSamples(page, "{}", '{"attach":{"animateSpace":false}}'));
    } finally {
      await page.close();
    }
  });

  test("config animateSpace true makes the sibling slide", async () => {
    const page = await openPage(ATTACH_LIST);
    try {
      await resetConfig(page);
      expectSlide(await attachSamples(page, "{}", '{"attach":{"animateSpace":true}}'));
    } finally {
      await page.close();
    }
  });

  test("per-item animateSpace true wins over config animateSpace false", async () => {
    const page = await openPage(ATTACH_LIST);
    try {
      await resetConfig(page);
      const tops = await attachSamples(
        page,
        '{"animateSpace":true}',
        '{"attach":{"animateSpace":false}}',
      );
      expectSlide(tops);
    } finally {
      await page.close();
    }
  });

  test("no config and no per-item option makes the sibling jump (library default)", async () => {
    const page = await openPage(ATTACH_LIST);
    try {
      await resetConfig(page);
      expectJump(await attachSamples(page));
    } finally {
      await page.close();
    }
  });
});
