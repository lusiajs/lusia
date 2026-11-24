import { describe, expect, test } from "bun:test";
import {
  animateConfigFromNames,
  animateConfigToNames,
} from "#runtime/animate/options/config-names.ts";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";
import type { Keyframes } from "#runtime/animate/options/keyframes.ts";
import { EASE } from "#runtime/animate/modes/modes.ts";
import { MIDWAY } from "#runtime/animate/modes/midway-modes.ts";

function thrown(read: () => unknown): { code?: string; message: string } {
  try {
    read();
  } catch (error) {
    return error as { code?: string; message: string };
  }
  throw new Error("expected an error");
}

const NAMED = {
  duration: 500,
  ease: ["CUBIC", "INOUT"],
  keep: false,
  midway: {
    mode: "WAIT",
    duration: 120,
    ease: ["QUAD", "OUT"],
  },
  scroll: { start: [0.5, 0.5], end: [0, 1], part: [0.1, 0.9] },
  in: "FADE_IN",
  out: "FADE_OUT",
};

const VALUES: AnimateConfig = {
  duration: 500,
  ease: [EASE.STYLE.CUBIC, EASE.INOUT],
  keep: false,
  midway: {
    mode: MIDWAY.WAIT,
    duration: 120,
    ease: [EASE.STYLE.QUAD, EASE.OUT],
  },
  scroll: {
    start: [0.5, 0.5],
    end: [0, 1],
    part: [0.1, 0.9],
  },
  in: "FADE_IN",
  out: "FADE_OUT",
};

describe("names to values", () => {
  test("every name becomes its runtime value", () => {
    const config = animateConfigFromNames(NAMED);
    expect(config.ease).toEqual([EASE.STYLE.CUBIC, EASE.INOUT]);
    expect(config.midway?.mode).toBe(MIDWAY.WAIT);
    expect(config.midway?.duration).toBe(120);
    expect(config.midway?.ease).toEqual([EASE.STYLE.QUAD, EASE.OUT]);
    expect(config.scroll?.start).toEqual([0.5, 0.5]);
    expect(config.scroll?.end).toEqual([0, 1]);
  });

  test("an unknown name names the field and the value", () => {
    const error = thrown(() => animateConfigFromNames({ midway: { mode: "NOPE" } }));
    expect(error.code).toBe("L2067");
    expect(error.message).toBe("animate midway.mode has an unknown name NOPE");
  });

  test("an unknown ease name is rejected", () => {
    expect(thrown(() => animateConfigFromNames({ ease: ["WAVY"] })).message).toBe(
      "animate ease has an unknown name WAVY",
    );
  });

  test("an unknown preset name is rejected", () => {
    const error = thrown(() => animateConfigFromNames({ in: "FADE" }));
    expect(error.code).toBe("L2068");
    expect(error.message).toBe("animate in must be a preset name or a keyframes object, got FADE");
  });

  test("a bad value is rejected with the usual error", () => {
    const error = thrown(() => animateConfigFromNames({ duration: "fast" }));
    expect(error.code).toBe("L2003");
    expect(error.message).toBe("animate duration must be a time in ms, got fast");
  });
});

describe("values to names", () => {
  test("enum values become names", () => {
    expect(animateConfigToNames(VALUES)).toEqual(NAMED);
  });

  test("an unknown value is rejected", () => {
    const error = thrown(() => animateConfigToNames({ midway: { mode: 5 as never } }));
    expect(error.code).toBe("L2067");
  });
});

describe("round trip", () => {
  test("values survive names and back", () => {
    expect(animateConfigFromNames(animateConfigToNames(VALUES))).toEqual(VALUES);
  });

  test("the names survive values and back", () => {
    expect(animateConfigToNames(animateConfigFromNames(NAMED))).toEqual(NAMED);
  });

  test("a partial ease keeps its length", () => {
    const config = { ease: [EASE.OUT] as AnimateConfig["ease"] };
    expect(animateConfigToNames(config)).toEqual({ ease: ["OUT"] });
    expect(animateConfigFromNames({ ease: ["OUT"] })).toEqual(config);
  });
});

describe("a keyframes object as an in or out preset", () => {
  const custom: Keyframes = {
    ease: [EASE.STYLE.QUART, EASE.OUT],
    0: { opacity: 0 },
    1: { opacity: 1 },
  };

  test("survives the JSON form, with easing written as names", () => {
    const named = animateConfigToNames({ in: custom });
    expect(JSON.parse(JSON.stringify(named))).toEqual({
      in: { ease: ["QUART", "OUT"], 0: { opacity: 0 }, 1: { opacity: 1 } },
    });
    expect(animateConfigFromNames(JSON.parse(JSON.stringify(named)))).toEqual({
      in: custom,
    });
  });
});
