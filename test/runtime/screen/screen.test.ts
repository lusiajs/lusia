import { beforeAll, describe, expect, test } from "bun:test";
import { SCREEN } from "#runtime/index.ts";

const globals = globalThis as unknown as Record<string, unknown>;
const listeners: Array<() => void> = [];

beforeAll(() => {
  globals.innerWidth = 1200;
  globals.matchMedia = () => ({
    matches: false,
    addEventListener: (_type: string, listener: () => void) => listeners.push(listener),
  });
});

describe("SCREEN", () => {
  test("each screen is a read-only flag that is on for the window size", () => {
    expect(SCREEN.DESKTOP.get()).toBe(true);
    expect(SCREEN.PHONE.get()).toBe(false);
    expect(SCREEN.TABLET.get()).toBe(false);
  });

  test("a resize moves the flags", () => {
    globals.innerWidth = 500;
    for (const listener of listeners) listener();
    expect(SCREEN.PHONE.get()).toBe(true);
    expect(SCREEN.DESKTOP.get()).toBe(false);
  });

  test("REDUCED_MOTION is a flag", () => {
    expect(SCREEN.REDUCED_MOTION.get()).toBe(false);
  });

  test("an unknown name is undefined", () => {
    expect((SCREEN as Record<string, unknown>).NOPE).toBeUndefined();
  });

  test("a flag cannot be set", () => {
    expect(() => {
      (SCREEN as Record<string, unknown>).PHONE = true;
    }).toThrow("SCREEN.PHONE cannot be set");
  });
});
