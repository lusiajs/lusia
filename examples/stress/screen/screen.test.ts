import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { attach, type Instance, SCREEN } from "lusiajs";
import { createTarget } from "../cells.ts";
import Sized from "./Sized.lusia";

const globals = globalThis as unknown as Record<string, unknown>;
const realMatchMedia = globals.matchMedia;
const resizeListeners: Array<() => void> = [];
// Every width from the phone start to past the desktop start, so each screen boundary is crossed.
const WIDTHS = Array.from({ length: 65 }, (_, step) => 320 + step * 20);

beforeAll(() => {
  globals.matchMedia = () => ({
    matches: false,
    addEventListener: (_type: string, listener: () => void) => resizeListeners.push(listener),
  });
});

afterAll(() => {
  globals.matchMedia = realMatchMedia;
});

function resize(width: number): void {
  globals.innerWidth = width;
  for (const listener of resizeListeners) listener();
}

function expectedName(width: number): string {
  if (width < 600) return "phone";
  if (width < 1000) return "tablet";
  return "desktop";
}

function expectedPadding(width: number): string {
  if (width < 600) return "8px";
  if (width < 1000) return "16px";
  return "24px";
}

function flagsOn(): number {
  return [SCREEN.PHONE, SCREEN.TABLET, SCREEN.DESKTOP].filter((flag) => flag.get()).length;
}

describe("SCREEN in markup and <style>", () => {
  let instance: Instance | null = null;
  let target: HTMLElement | null = null;

  afterAll(() => {
    instance?.detach();
    target?.remove();
    resize(1024);
  });

  test("every width from 320 to 1600 shows its screen and applies its padding", () => {
    resize(WIDTHS[0]!);
    target = createTarget("div");
    instance = attach(Sized, target);
    for (const width of WIDTHS) {
      resize(width);
      expect(target.querySelector(".name")?.textContent?.trim()).toBe(expectedName(width));
      expect(getComputedStyle(target.querySelector<HTMLElement>(".card")!).paddingLeft).toBe(
        expectedPadding(width),
      );
      expect(flagsOn()).toBe(1);
    }
  });

  test("the exact boundaries 599, 600, 999 and 1000 pick the right screen", () => {
    for (const width of [599, 600, 999, 1000]) {
      resize(width);
      expect(target?.querySelector(".name")?.textContent?.trim()).toBe(expectedName(width));
    }
  });

  test("detaching removes the markup and the screen keeps working for the next mount", () => {
    instance!.detach();
    instance = null;
    target!.remove();
    target = null;

    const next = createTarget("div");
    const again = attach(Sized, next);
    resize(500);
    expect(next.querySelector(".name")?.textContent?.trim()).toBe("phone");
    again.detach();
    next.remove();
  });
});
