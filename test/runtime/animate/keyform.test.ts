import { describe, expect, test } from "bun:test";
import { readDefault, readKey, type PartialEasing } from "#runtime/animate/options/keyform.ts";
import { prepareTimeline, type Keyframes } from "#runtime/animate/options/keyframes.ts";
import { EASE } from "#runtime/animate/modes/modes.ts";
import { writeProgress } from "#runtime/animate/play/timeline.ts";

const { QUAD, CUBIC, LINEAR, QUART } = EASE.STYLE;
const ENGINE = { easeStyle: QUART, ease: EASE.INOUT, duration: 300 };
const NO_DEFAULT: PartialEasing = {};

/** The opacity written at `progress` for keys 0 and 1, where key 1 is `end` and the keyframes default is `keyframesDefault`. */
function opacityAt(
  end: Keyframes[number],
  progress: number,
  keyframesDefault?: Keyframes["default"],
): string {
  const style = document.createElement("div").style;
  const keyframes: Keyframes = { 0: { opacity: 0 }, 1: end };
  if (keyframesDefault) keyframes.default = keyframesDefault;
  writeProgress(style, prepareTimeline(keyframes), progress);
  return style.opacity;
}

describe("precedence per part: key, then keyframes default, then engine default", () => {
  test("a bare style with no default uses the engine default style and ease (QUART + INOUT)", () => {
    // INOUT of QUART at the middle is 0.5
    expect(readKey({ opacity: 1 }, NO_DEFAULT, ENGINE)).toEqual([
      QUART,
      EASE.INOUT,
      { opacity: 1 },
    ]);
    expect(opacityAt({ opacity: 1 }, 0.5)).toBe("0.5");
  });

  test("a bare style takes both parts from the keyframes default", () => {
    // IN of QUAD at the middle is 0.25
    expect(readKey({ opacity: 1 }, { easeStyle: QUAD, ease: EASE.IN }, ENGINE)).toEqual([
      QUAD,
      EASE.IN,
      { opacity: 1 },
    ]);
    expect(opacityAt({ opacity: 1 }, 0.5, [QUAD, EASE.IN])).toBe("0.25");
  });

  test("[ease, style] replaces only the ease, and the style comes from the default", () => {
    expect(readKey([EASE.OUT, { opacity: 1 }], { easeStyle: QUAD, ease: EASE.IN }, ENGINE)).toEqual(
      [QUAD, EASE.OUT, { opacity: 1 }],
    );
  });

  test("[style, style] replaces only the style, and the ease comes from the default", () => {
    expect(readKey([LINEAR, { opacity: 1 }], { ease: EASE.IN }, ENGINE)).toEqual([
      LINEAR,
      EASE.IN,
      { opacity: 1 },
    ]);
  });

  test("[style, ease, style] wins over both defaults", () => {
    expect(
      readKey([LINEAR, EASE.IN, { opacity: 1 }], { easeStyle: QUAD, ease: EASE.OUT }, ENGINE),
    ).toEqual([LINEAR, EASE.IN, { opacity: 1 }]);
  });

  test("a default that sets only the style leaves the ease to the engine", () => {
    expect(readKey({ opacity: 1 }, { easeStyle: CUBIC }, ENGINE)).toEqual([
      CUBIC,
      EASE.INOUT,
      { opacity: 1 },
    ]);
  });

  test("a custom function works as a style in the default and in a key", () => {
    const wave = (t: number) => t * t * 0.5;
    expect(readKey({ opacity: 1 }, { easeStyle: wave }, ENGINE)[0]).toBe(wave);
    expect(readKey([wave, { opacity: 1 }], NO_DEFAULT, ENGINE)[0]).toBe(wave);
  });
});

describe("readDefault", () => {
  test("accepts [style, ease], [style] and [ease]", () => {
    expect(readDefault([QUAD, EASE.IN])).toEqual({ easeStyle: QUAD, ease: EASE.IN });
    expect(readDefault([QUAD])).toEqual({ easeStyle: QUAD });
    expect(readDefault([EASE.OUT])).toEqual({ ease: EASE.OUT });
    expect(readDefault(undefined)).toEqual({});
  });

  test("rejects an empty list, a long list and a wrong order", () => {
    expect(() => readDefault([] as never)).toThrow("animate default must be");
    expect(() => readDefault([QUAD, EASE.IN, EASE.OUT] as never)).toThrow(
      "animate default must be",
    );
    expect(() => readDefault([EASE.IN, EASE.OUT] as never)).toThrow("animate default must be");
    expect(() => readDefault([QUAD, QUAD] as never)).toThrow(
      "animate ease must be EASE.IN, EASE.OUT or EASE.INOUT",
    );
  });

  test("rejects a value that is neither a style nor an ease", () => {
    expect(() => readDefault(["quart" as never])).toThrow(
      "animate easing style must be a function of t",
    );
  });
});

describe("key form errors", () => {
  test("a key with one array item is an error", () => {
    expect(() => readKey([QUAD] as never, NO_DEFAULT, ENGINE)).toThrow(
      "animate key must be a style object",
    );
  });

  test("a key that is not a style object is an error", () => {
    expect(() => readKey("opacity" as never, NO_DEFAULT, ENGINE)).toThrow(
      "animate key must be a style object",
    );
  });

  test("an easing style in the ease slot is an error", () => {
    expect(() => readKey([QUAD, LINEAR, {}] as never, NO_DEFAULT, ENGINE)).toThrow(
      "animate ease must be",
    );
  });

  test("an ease in the style slot of a three-part key is an error", () => {
    expect(() => readKey([EASE.IN, EASE.OUT, {}] as never, NO_DEFAULT, ENGINE)).toThrow(
      "animate easing style must be",
    );
  });
});
