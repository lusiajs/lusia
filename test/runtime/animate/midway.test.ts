import { describe, expect, test } from "bun:test";
import { animate } from "#runtime/animate/bind.ts";
import type { AnimateItem } from "#runtime/animate/animation.ts";
import type { Keyframes } from "#runtime/animate/options/keyframes.ts";
import { prepareTimeline } from "#runtime/animate/options/keyframes.ts";
import { readMidway, type AnimateMidway } from "#runtime/animate/options/midway-options.ts";
import { MIDWAY, type MidwayMode } from "#runtime/animate/modes/midway-modes.ts";
import { EASE } from "#runtime/animate/modes/modes.ts";
import { readItem } from "#runtime/animate/options/options.ts";
import { Player } from "#runtime/animate/play/player.ts";
import { ON } from "#runtime/animate/modes/trigger.ts";
import { HOVER_AREA } from "#runtime/animate/modes/hover-modes.ts";
import { variable } from "#runtime/variable/variable.ts";
import type { Leave } from "#runtime/dom/component/leave.ts";
import { advance, onReset, useFakeClock } from "./clock.ts";

useFakeClock();

/** Opacity equals progress, so a test reads the progress straight off the element. */
const fade: Keyframes = {
  0: [EASE.STYLE.LINEAR, EASE.IN, { opacity: 0 }],
  1: [EASE.STYLE.LINEAR, EASE.IN, { opacity: 1 }],
};

/** A bare player with a 100 ms play, so each test can drive it by hand. */
function playerWith(midway: AnimateMidway | undefined, duration = 100) {
  const el = document.createElement("div");
  const player = new Player(el.style);
  player.load(prepareTimeline(fade, el), {
    duration,
    delay: 0,
    loop: undefined,
    keep: true,
    midway: readMidway(midway),
  });
  onReset(() => player.cancel());
  return { el, player, opacity: () => Number(el.style.opacity) };
}

describe("MIDWAY on a player", () => {
  test("SWITCH (default) switches at once from the current progress", () => {
    const { player, opacity } = playerWith(undefined);
    void player.forward();
    advance(50);
    void player.backward();
    expect(opacity()).toBeCloseTo(0.5, 6);
    advance(25);
    expect(opacity()).toBeCloseTo(0.25, 6);
  });

  test("WAIT lets the play end, then runs the newest request", async () => {
    const { player, opacity } = playerWith({ mode: MIDWAY.WAIT });
    void player.forward();
    advance(50);
    const back = player.backward();
    advance(50);
    expect(opacity()).toBe(1);
    advance(50);
    expect(opacity()).toBeCloseTo(0.5, 6);
    advance(50);
    await back;
    expect(opacity()).toBeCloseTo(0, 6);
  });

  test("WAIT collapses many requests: only the last one runs", () => {
    const { player, opacity } = playerWith({ mode: MIDWAY.WAIT });
    void player.forward();
    advance(50);
    void player.backward();
    void player.forward();
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("RESTART starts the new play from its own beginning", () => {
    const { player, opacity } = playerWith({ mode: MIDWAY.RESTART });
    void player.forward();
    advance(50);
    void player.backward();
    expect(opacity()).toBe(1);
    advance(50);
    expect(opacity()).toBeCloseTo(0.5, 6);
  });

  test("JUMP_TO_END jumps the running play to its end, then runs the new one", () => {
    const { player, opacity } = playerWith({ mode: MIDWAY.JUMP_TO_END });
    void player.forward();
    advance(50);
    void player.backward();
    expect(opacity()).toBe(1);
    advance(50);
    expect(opacity()).toBeCloseTo(0.5, 6);
  });

  test("KEEP_CURRENT drops requests while busy", () => {
    const { player, opacity } = playerWith({ mode: MIDWAY.KEEP_CURRENT });
    void player.forward();
    advance(50);
    void player.backward();
    advance(50);
    expect(opacity()).toBe(1);
  });
});

/** The same request at 50 ms, read at 75 ms and 125 ms, for every mode. */
const EXPECTED: Record<string, [number, number]> = {
  SWITCH: [0.25, 0],
  WAIT: [0.75, 0.75],
  RESTART: [0.75, 0.25],
  JUMP_TO_END: [0.75, 0.25],
  KEEP_CURRENT: [0.75, 1],
};

const MODES: ReadonlyArray<readonly [string, MidwayMode]> = [
  ["SWITCH", MIDWAY.SWITCH],
  ["WAIT", MIDWAY.WAIT],
  ["RESTART", MIDWAY.RESTART],
  ["JUMP_TO_END", MIDWAY.JUMP_TO_END],
  ["KEEP_CURRENT", MIDWAY.KEEP_CURRENT],
];

function mountItem(item: Omit<AnimateItem, "play">) {
  const el = document.createElement("div");
  const cleanups: Array<() => void> = [];
  const leaves: Leave[] = [];
  animate(el, () => ({ play: fade, duration: 100, ...item }) as AnimateItem, cleanups, leaves);
  onReset(() => cleanups.forEach((cleanup) => cleanup()));
  return { el, opacity: () => Number(el.style.opacity) };
}

describe("MIDWAY with the HOVER trigger", () => {
  test.each(MODES)("%s", (name, mode: MidwayMode) => {
    const midway: AnimateMidway = { mode };
    const { el, opacity } = mountItem({
      on: ON.HOVER,
      midway,
      options: { area: HOVER_AREA.ELEMENT },
    });
    el.dispatchEvent(new Event("pointerenter"));
    advance(50);
    el.dispatchEvent(new Event("pointerleave"));
    advance(25);
    expect(opacity()).toBeCloseTo(EXPECTED[name]![0], 6);
    advance(50);
    expect(opacity()).toBeCloseTo(EXPECTED[name]![1], 6);
  });
});

describe("MIDWAY with a variable trigger", () => {
  test.each(MODES)("%s", (name, mode) => {
    const on = variable(false);
    const { opacity } = mountItem({ on, midway: { mode } });
    on.value = true;
    advance(50);
    on.value = false;
    advance(25);
    expect(opacity()).toBeCloseTo(EXPECTED[name]![0], 6);
    advance(50);
    expect(opacity()).toBeCloseTo(EXPECTED[name]![1], 6);
  });
});

describe("SWITCH modes", () => {
  /** Opacity sampled every 1 ms around a switch at 50 ms, with a backward request. */
  function sampleSwitch(midway: AnimateMidway) {
    const { player, opacity } = playerWith(midway, 100);
    void player.forward();
    advance(50);
    const before = opacity();
    const beforeSpeed = 1 / 100;
    void player.backward();
    const after: number[] = [opacity()];
    for (let i = 0; i < 20; i++) {
      advance(1, 1);
      after.push(opacity());
    }
    return { before, after, beforeSpeed, opacity };
  }

  test("SWITCH starts the new play at the current progress", () => {
    const { before, after } = sampleSwitch({ mode: MIDWAY.SWITCH });
    expect(after[0]).toBeCloseTo(before, 6);
    expect(after[1]! - after[0]!).toBeCloseTo(-0.01, 6);
  });

  test("SWITCH_SMOOTH keeps the position and the velocity at the switch", () => {
    const { before, after, beforeSpeed } = sampleSwitch({
      mode: MIDWAY.SWITCH_SMOOTH,
      duration: 200,
    });
    expect(after[0]).toBeCloseTo(before, 6);
    const velocityAtSwitch = after[1]! - after[0]!;
    expect(Math.abs(velocityAtSwitch - beforeSpeed)).toBeLessThan(0.002);
  });

  test("SWITCH_SMOOTH ends on the new play", () => {
    const { player, opacity } = playerWith({ mode: MIDWAY.SWITCH_SMOOTH, duration: 200 }, 100);
    void player.forward();
    advance(50);
    void player.backward();
    advance(400);
    expect(opacity()).toBeCloseTo(0, 6);
  });

  test("SWITCH_STOP slows to rest before the new play starts", () => {
    const { player, opacity } = playerWith({ mode: MIDWAY.SWITCH_STOP, duration: 200 }, 100);
    void player.forward();
    advance(30);
    void player.backward();
    advance(98);
    const nearRest = opacity();
    advance(1, 1);
    expect(Math.abs(opacity() - nearRest)).toBeLessThan(0.0005);
    advance(200);
    expect(opacity()).toBeCloseTo(0, 6);
  });

  test("a custom mode function is called and its value is shown during the change", () => {
    const calls: number[][] = [];
    const custom = (from: number, to: number, t: number, speed: number) => {
      calls.push([from, to, t, speed]);
      return 0.5;
    };
    const { player, opacity } = playerWith({ mode: custom, duration: 100 }, 100);
    void player.forward();
    advance(50);
    void player.backward();
    advance(20);
    expect(opacity()).toBe(0.5);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]![0]).toBeCloseTo(0.5, 6);
    advance(100);
    expect(opacity()).toBeCloseTo(0, 6);
  });
});

describe("renamed names", () => {
  test("an item with style throws: it is play now", () => {
    expect(() => readItem({ style: fade } as never)).toThrow("style was renamed to play");
  });

  test("an item with when throws: it is on now", () => {
    expect(() => readItem({ play: fade, when: ON.VIEW } as never)).toThrow(
      "when was renamed to on",
    );
  });

  test("an item with more throws: it is options now", () => {
    expect(() => readItem({ play: fade, more: {} } as never)).toThrow(
      "more was renamed to options",
    );
  });

  test("an item with curve or transition throws: they moved into the keyframes", () => {
    expect(() => readItem({ play: fade, transition: EASE.STYLE.QUART } as never)).toThrow(
      "curve/transition moved into the keyframes: ease: [EASE.STYLE.X, EASE.Y]",
    );
    expect(() => readItem({ play: fade, curve: EASE.STYLE.QUART } as never)).toThrow(
      "curve/transition moved into the keyframes",
    );
  });

  test("an item with ease throws: it is not an item key", () => {
    expect(() => readItem({ play: fade, ease: EASE.IN } as never)).toThrow(
      "ease is not an item key",
    );
  });

  test("a midway member as midway throws: midway is an object now", () => {
    expect(() => readItem({ play: fade, midway: MIDWAY.WAIT } as never)).toThrow(
      "midway is an object now. Write midway: { mode: MIDWAY.X }.",
    );
  });

  test("midway: undefined (an old member such as MIDWAY.FINISH) throws the same error", () => {
    expect(() => readItem({ play: fade, midway: undefined } as never)).toThrow(
      "midway is an object now",
    );
  });

  test("a midway mode that is undefined names the new modes", () => {
    expect(() => readItem({ play: fade, midway: { mode: undefined } } as never)).toThrow(
      "midway.mode must be a MIDWAY member: SWITCH, SWITCH_SMOOTH, SWITCH_STOP, WAIT, RESTART, JUMP_TO_END or KEEP_CURRENT",
    );
  });

  test("a removed ON member with no value throws L2044", () => {
    expect(() => readItem({ play: fade, on: undefined } as never)).toThrow("were renamed");
  });

  test("keyframes with default throw: it is ease now", () => {
    const old = { default: [EASE.STYLE.QUART], 0: {}, 1: {} } as never;
    expect(() => prepareTimeline(old)).toThrow("keyframes default was renamed to ease");
  });
});

describe("midway validation", () => {
  test("an unknown key names the allowed keys", () => {
    expect(() => readMidway({ speed: 1 } as never)).toThrow(
      'midway has an unknown key "speed", use mode, duration or ease',
    );
  });

  test.each([
    ["play", "mode"],
    ["turn", "mode"],
    ["turnDuration", "duration"],
    ["turnStyle", "ease"],
    ["turnEase", "ease"],
  ])("the old key %s throws and names %s", (key, to) => {
    expect(() => readMidway({ [key]: 1 } as never)).toThrow(`midway ${key} was renamed to ${to}`);
  });

  test("mode must be a MIDWAY member or a function", () => {
    expect(() => readMidway({ mode: "WAIT" } as never)).toThrow(
      "midway.mode must be a MIDWAY member",
    );
  });

  test("duration must be a non-negative number of ms", () => {
    expect(() => readMidway({ duration: -1 })).toThrow(
      "midway.duration must be a time in ms, got -1",
    );
  });

  test("ease must use the ease forms", () => {
    expect(() => readMidway({ ease: EASE.STYLE.QUART } as never)).toThrow(
      "animate ease must be [EASE.STYLE.x, EASE.y]",
    );
  });

  test("a bare value that is not an object is rejected", () => {
    expect(() => readMidway(3 as never)).toThrow("animate midway must be an object");
  });
});
