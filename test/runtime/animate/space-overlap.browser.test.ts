import { describe, expect, test } from "bun:test";
import type { Page } from "playwright";
import { browser, openPage } from "./fixtures/browser-page.ts";

const suite = browser ? describe : describe.skip;

const LIST = `
  <style>body{margin:0}</style>
  <div id="list" style="display:flex;flex-direction:column;width:200px;row-gap:0">
    <div id="a" style="height:40px;margin:0"></div>
    <div id="b" style="height:40px;margin:0"></div>
    <div id="c" style="height:40px;margin:0"></div>
  </div>`;

type Measure = { transforms: Record<string, string>; tops: Record<string, number>; bottoms: Record<string, number> };

/** Inserts three 30px ATTACH slides before `#b` in one tick, waits for all of them, then measures. */
async function insertThreeSlides(page: Page, delays: [number, number, number]): Promise<Measure> {
  return await page.evaluate(async (delayList: number[]) => {
    const list = document.getElementById("list")!;
    const before = document.getElementById("b")!;
    ["n1", "n2", "n3"].forEach((id, index) => {
      const element = document.createElement("div");
      element.id = id;
      element.style.height = "30px";
      element.style.margin = "0";
      list.insertBefore(element, before);
      const value = {
        style: { 0: { opacity: 0 }, 1: { opacity: 1 } },
        when: (window as any).lusiaWhen.ATTACH,
        duration: 400,
        delay: delayList[index],
        more: { animateSpace: true },
      };
      (window as any).lusiaAnimate(element, () => value, [], []);
    });
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const measure: Measure = { transforms: {}, tops: {}, bottoms: {} };
    for (const id of ["a", "b", "c"]) {
      const element = document.getElementById(id)!;
      const rect = element.getBoundingClientRect();
      measure.transforms[id] = element.style.transform;
      measure.tops[id] = rect.top;
      measure.bottoms[id] = rect.bottom;
    }
    return measure;
  }, delays);
}

suite("ATTACH slides with animateSpace leave no stale transform", () => {
  test("three overlapping slides in order 0 / 120 / 240 restore the siblings", async () => {
    const page = await openPage(LIST);
    try {
      const measure = await insertThreeSlides(page, [0, 120, 240]);
      expect(measure.transforms.a).toBe("");
      expect(measure.transforms.b).toBe("");
      expect(measure.transforms.c).toBe("");
      expect(Math.abs(measure.tops.b! - (measure.bottoms.a! + 90))).toBeLessThan(1);
      expect(Math.abs(measure.tops.c! - measure.bottoms.b!)).toBeLessThan(1);
    } finally {
      await page.close();
    }
  });

  test("three overlapping slides in order 240 / 0 / 120 restore the siblings", async () => {
    const page = await openPage(LIST);
    try {
      const measure = await insertThreeSlides(page, [240, 0, 120]);
      expect(measure.transforms.a).toBe("");
      expect(measure.transforms.b).toBe("");
      expect(measure.transforms.c).toBe("");
      expect(Math.abs(measure.tops.b! - (measure.bottoms.a! + 90))).toBeLessThan(1);
      expect(Math.abs(measure.tops.c! - measure.bottoms.b!)).toBeLessThan(1);
    } finally {
      await page.close();
    }
  });
});
