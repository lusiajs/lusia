import { describe, expect, test } from "bun:test";
import { browser, openPage, ATTACH_LIST, attachSamples } from "../../fixtures/browser-page.ts";

const suite = browser ? describe : describe.skip;

suite("ATTACH with animateSpace slides the siblings", () => {
  test("with animateSpace the sibling slides from its closed place to its open place", async () => {
    const page = await openPage(ATTACH_LIST);
    try {
      const tops = await attachSamples(page, '{"animateSpace":true}');
      const first = tops[0]!;
      const last = tops[tops.length - 1]!;
      expect(Math.abs(last - first - 76)).toBeLessThan(1.5);
      for (let i = 1; i < tops.length; i++)
        expect(tops[i]!).toBeGreaterThanOrEqual(tops[i - 1]! - 0.01);
      const middle = tops.filter((top) => top > first + 1 && top < last - 1);
      expect(middle.length).toBeGreaterThanOrEqual(3);
    } finally {
      await page.close();
    }
  });

  test("with animateSpace false the sibling jumps at once", async () => {
    const page = await openPage(ATTACH_LIST);
    try {
      const tops = await attachSamples(page, '{"animateSpace":false}');
      const first = tops[0]!;
      const last = tops[tops.length - 1]!;
      expect(Math.abs(last - first - 76)).toBeLessThan(1.5);
      const middle = tops.filter((top) => top > first + 1 && top < last - 1);
      expect(middle.length).toBe(0);
    } finally {
      await page.close();
    }
  });

  test("the element is shown at its own place while it appears", async () => {
    const page = await openPage(ATTACH_LIST);
    try {
      await attachSamples(page, '{"animateSpace":true}');
      const gap = await page.evaluate(() => {
        const gone = document.getElementById("gone")!;
        const before = document.getElementById("before")!;
        return gone.getBoundingClientRect().top - before.getBoundingClientRect().bottom;
      });
      expect(gap).toBeGreaterThanOrEqual(15);
    } finally {
      await page.close();
    }
  });
});
