import { describe, expect, test } from "bun:test";
import { PRESET } from "#runtime/animate/options/presets.ts";
import { prepareTimeline, type Keyframes } from "#runtime/animate/options/keyframes.ts";
import { ownTimelines } from "#runtime/animate/play/timeline.ts";

const presets = Object.entries(PRESET) as [string, Keyframes][];

const IN_OUT_PAIRS = [
  ["FADE_IN", "FADE_OUT"],
  ["POP_IN", "POP_OUT"],
  ["ZOOM_IN", "ZOOM_OUT"],
  ["FLIP_IN", "FLIP_OUT"],
  ["BLUR_IN", "BLUR_OUT"],
] as const;

const NAMES_WITHOUT_OUT = [
  "DROP_IN",
  "BOUNCE_IN",
  "SHAKE",
  "PULSE",
  "SPIN",
  "WOBBLE",
  "HEARTBEAT",
  "TADA",
];

/** The key styles of a preset, without its `ease`. */
const keyStyles = (keyframes: Keyframes) =>
  Object.entries(keyframes)
    .filter(([key]) => key !== "ease")
    .map(([, style]) => style);

describe("PRESET", () => {
  test("is frozen", () => {
    expect(Object.isFrozen(PRESET)).toBe(true);
  });

  test.each(presets)("%s has keys 0 and 1 and prepares", (_name, keyframes) => {
    expect(() => prepareTimeline(keyframes)).not.toThrow();
  });

  test.each(presets)(
    "%s uses style keys only, so the keys can take the default",
    (_name, keyframes) => {
      for (const style of keyStyles(keyframes)) {
        expect(Array.isArray(style)).toBe(false);
      }
    },
  );

  test.each(presets)("%s uses individual properties, not transform", (_name, keyframes) => {
    for (const style of keyStyles(keyframes)) {
      expect("transform" in (style as object)).toBe(false);
    }
  });

  test.each([
    ["SLIDE_UP", "0px 24px"],
    ["SLIDE_DOWN", "0px -24px"],
    ["SLIDE_LEFT", "-24px 0px"],
    ["SLIDE_RIGHT", "24px 0px"],
  ] as const)("%s starts at %s, so it comes from that side", (name, start) => {
    expect(PRESET[name][0]).toMatchObject({ translate: start });
  });

  test.each(IN_OUT_PAIRS)("%s pairs with %s", (inName, outName) => {
    expect(PRESET[inName]).toBeDefined();
    expect(PRESET[outName]).toBeDefined();
  });

  test("every IN preset has a matching OUT preset", () => {
    const names = Object.keys(PRESET);
    const inNames = names.filter(
      (name) => name.endsWith("_IN") && !NAMES_WITHOUT_OUT.includes(name),
    );
    for (const name of inNames) {
      expect(names).toContain(name.replace("_IN", "_OUT"));
    }
  });

  test("presets that move different properties keep all of them", () => {
    const timelines = ownTimelines([
      { timeline: prepareTimeline(PRESET.SLIDE_UP), detach: false },
      { timeline: prepareTimeline(PRESET.ZOOM_IN), detach: false },
    ]);
    expect(timelines.map((timeline) => timeline.props)).toEqual([
      ["translate", "opacity"],
      ["scale"],
    ]);
  });

  test("a DETACH item does not take the properties of an enter item", () => {
    const timelines = ownTimelines([
      { timeline: prepareTimeline(PRESET.SLIDE_UP), detach: false },
      { timeline: prepareTimeline(PRESET.FADE_IN), detach: true },
    ]);
    expect(timelines.map((timeline) => timeline.props)).toEqual([
      ["translate", "opacity"],
      ["opacity"],
    ]);
  });
});
