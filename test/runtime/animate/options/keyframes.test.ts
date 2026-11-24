import { describe, expect, test } from "bun:test";
import { prepareTimeline, type Keyframes } from "#runtime/animate/options/keyframes.ts";
import { EASE } from "#runtime/animate/modes/modes.ts";
import { writeProgress } from "#runtime/animate/play/timeline.ts";

const { LINEAR } = EASE.STYLE;
const { IN } = EASE;

function prepare(frames: Keyframes) {
  return prepareTimeline(frames);
}

function styleAt(frames: Keyframes, progress: number): Record<string, string> {
  const style = document.createElement("div").style;
  writeProgress(style, prepare(frames), progress);
  const out: Record<string, string> = {};
  for (let i = 0; i < style.length; i++) out[style[i]!] = style.getPropertyValue(style[i]!);
  return out;
}

describe("prepareTimeline", () => {
  test("camelCase names become kebab-case and custom properties stay as they are", () => {
    const frames: Keyframes = {
      0: [LINEAR, IN, { transformOrigin: "0 0", "--gap": "2px" }],
      1: [LINEAR, IN, { transformOrigin: "10px 10px", "--gap": "4px" }],
    };
    expect(styleAt(frames, 0)).toEqual({ "transform-origin": "0px 0px", "--gap": "2px" });
  });

  test("numbers are written as strings", () => {
    const frames: Keyframes = { 0: [LINEAR, IN, { opacity: 0 }], 1: [LINEAR, IN, { opacity: 1 }] };
    expect(styleAt(frames, 0.5)).toEqual({ opacity: "0.5" });
  });

  test("a segment uses the easing of the key it ends at", () => {
    const square = (t: number) => t * t;
    const frames: Keyframes = {
      0: [LINEAR, IN, { opacity: 0 }],
      0.5: [square, IN, { opacity: 1 }],
      1: [LINEAR, IN, { opacity: 0 }],
    };
    // Progress 0.25 is halfway through the first segment, so the square curve gives 0.25.
    expect(styleAt(frames, 0.25)).toEqual({ opacity: "0.25" });
  });

  test("multi-key segments interpolate between their own keys", () => {
    const frames: Keyframes = {
      0: [LINEAR, IN, { opacity: 0 }],
      0.5: [LINEAR, IN, { opacity: 1 }],
      1: [LINEAR, IN, { opacity: 0.5 }],
    };
    expect(styleAt(frames, 0.25)).toEqual({ opacity: "0.5" });
    expect(styleAt(frames, 0.75)).toEqual({ opacity: "0.75" });
    expect(styleAt(frames, 1)).toEqual({ opacity: "0.5" });
  });

  test("a property missing from a key takes the value of the nearest key that sets it", () => {
    const frames: Keyframes = {
      0: [LINEAR, IN, { opacity: 0, color: "#000" }],
      0.3: [LINEAR, IN, { opacity: 0.3 }],
      1: [LINEAR, IN, { opacity: 1, color: "#fff" }],
    };
    expect(styleAt(frames, 0.3)).toEqual({ opacity: "0.3", color: "#000" });
  });

  test("keys must include 0 and 1", () => {
    expect(() => prepare({ 0: [LINEAR, IN, {}], 0.5: [LINEAR, IN, {}] } as never)).toThrow(
      "animate keyframes must include the keys 0 and 1",
    );
  });

  test("keys outside 0..1 are an error", () => {
    expect(() =>
      prepare({ 0: [LINEAR, IN, {}], 1.5: [LINEAR, IN, {}], 1: [LINEAR, IN, {}] }),
    ).toThrow("animate keyframe 1.5 is outside 0..1");
  });

  test("a key listed twice is an error", () => {
    expect(() =>
      prepare({ 0: [LINEAR, IN, {}], "0.0": [LINEAR, IN, {}], 1: [LINEAR, IN, {}] } as Keyframes),
    ).toThrow("is listed twice");
  });
});
