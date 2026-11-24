import { describe, expect, test } from "bun:test";
import { EASE } from "#runtime/animate/modes/modes.ts";

const { QUART } = EASE.STYLE;
const { IN, OUT, INOUT } = EASE;

const BUILT_INS = EASE.STYLE;

describe("built-in easings", () => {
  for (const [name, ease] of Object.entries(BUILT_INS)) {
    test(`${name} starts at 0 and ends at 1`, () => {
      expect(ease(0)).toBeCloseTo(0, 9);
      expect(ease(1)).toBeCloseTo(1, 9);
    });
  }

  test("QUART is the ease-in power curve", () => {
    expect(QUART(0.5)).toBeCloseTo(0.0625, 10);
  });
});

describe("modes", () => {
  const ease = QUART;

  test("IN plays the curve as it is", () => {
    expect(IN(ease, 0.5)).toBe(ease(0.5));
  });

  test("OUT mirrors the curve", () => {
    expect(OUT(ease, 0.25)).toBeCloseTo(1 - ease(0.75), 10);
  });

  test("INOUT is ease-in in the first half and ease-out in the second", () => {
    expect(INOUT(ease, 0)).toBe(0);
    expect(INOUT(ease, 1)).toBe(1);
    expect(INOUT(ease, 0.25)).toBeCloseTo(ease(0.5) / 2, 10);
    expect(INOUT(ease, 0.75)).toBeCloseTo(1 - ease(0.5) / 2, 10);
  });
});
