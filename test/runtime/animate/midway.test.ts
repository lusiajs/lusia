import { describe, expect, test } from "bun:test";
import { animate } from "#runtime/animate/bind.ts";
import type { AnimateItem } from "#runtime/animate/animation.ts";
import type { Keyframes } from "#runtime/animate/options/keyframes.ts";
import { prepareTimeline } from "#runtime/animate/options/keyframes.ts";
import { readMidway, type AnimateMidway } from "#runtime/animate/options/midway-options.ts";
import { MIDWAY, TURN } from "#runtime/animate/modes/midway-modes.ts";
import { EASE } from "#runtime/animate/modes/modes.ts";
import { readItem } from "#runtime/animate/options/options.ts";
import { Player } from "#runtime/animate/play/player.ts";
import { WHEN } from "#runtime/animate/modes/trigger.ts";
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
  test("TURN (default) switches at once from the current progress", () => {
    const { player, opacity } = playerWith(undefined);
    void player.forward();
    advance(50);
    void player.backward();
    expect(opacity()).toBeCloseTo(0.5, 6);
    advance(25);
    expect(opacity()).toBeCloseTo(0.25, 6);
  });

  test("FINISH lets the play end, then runs the newest request", async () => {
    const { player, opacity } = playerWith(MIDWAY.FINISH);
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

  test("FINISH collapses many requests: only the last one runs", () => {
    const { player, opacity } = playerWith(MIDWAY.FINISH);
    void player.forward();
    advance(50);
    void player.backward();
    void player.forward();
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("RESTART starts the new play from its own beginning", () => {
    const { player, opacity } = playerWith(MIDWAY.RESTART);
    void player.forward();
    advance(50);
    void player.backward();
    expect(opacity()).toBe(1);
    advance(50);
    expect(opacity()).toBeCloseTo(0.5, 6);
  });

  test("SKIP jumps the running play to its end, then runs the new one", () => {
    const { player, opacity } = playerWith(MIDWAY.SKIP);
    void player.forward();
    advance(50);
    void player.backward();
    expect(opacity()).toBe(1);
    advance(50);
    expect(opacity()).toBeCloseTo(0.5, 6);
  });

  test("IGNORE drops requests while busy", () => {
    const { player, opacity } = playerWith(MIDWAY.IGNORE);
    void player.forward();
    advance(50);
    void player.backward();
    advance(50);
    expect(opacity()).toBe(1);
  });
});

/** The same request at 50 ms, read at 75 ms and 125 ms, for every member. */
const EXPECTED: Record<string, [number, number]> = {
  TURN: [0.25, 0],
  FINISH: [0.75, 0.75],
  RESTART: [0.75, 0.25],
  SKIP: [0.75, 0.25],
  IGNORE: [0.75, 1],
};

const MEMBERS = [
  ["TURN", MIDWAY.TURN],
  ["FINISH", MIDWAY.FINISH],
  ["RESTART", MIDWAY.RESTART],
  ["SKIP", MIDWAY.SKIP],
  ["IGNORE", MIDWAY.IGNORE],
] as const;

function mountItem(item: Omit<AnimateItem, "style">) {
  const el = document.createElement("div");
  const cleanups: Array<() => void> = [];
  const leaves: Leave[] = [];
  animate(el, () => ({ style: fade, duration: 100, ...item }) as AnimateItem, cleanups, leaves);
  onReset(() => cleanups.forEach((cleanup) => cleanup()));
  return { el, opacity: () => Number(el.style.opacity) };
}

describe("MIDWAY with the HOVER trigger", () => {
  test.each(MEMBERS)("%s", (name, midway) => {
    const { el, opacity } = mountItem({ when: WHEN.HOVER, midway, more: { area: HOVER_AREA.ELEMENT } });
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
  test.each(MEMBERS)("%s", (name, midway) => {
    const on = variable(false);
    const { opacity } = mountItem({ when: on, midway });
    on.value = true;
    advance(50);
    on.value = false;
    advance(25);
    expect(opacity()).toBeCloseTo(EXPECTED[name]![0], 6);
    advance(50);
    expect(opacity()).toBeCloseTo(EXPECTED[name]![1], 6);
  });
});

describe("TURN modes", () => {
  /** Opacity sampled every 1 ms around a switch at 50 ms, with a backward request. */
  function sampleSwitch(turn: AnimateMidway) {
    const { player, opacity } = playerWith(turn, 100);
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

  test("SUDDEN starts the new play at the current progress", () => {
    const { before, after } = sampleSwitch({ turn: TURN.SUDDEN });
    expect(after[0]).toBeCloseTo(before, 6);
    expect(after[1]! - after[0]!).toBeCloseTo(-0.01, 6);
  });

  test("SMOOTH keeps the position and the velocity at the switch", () => {
    const { before, after, beforeSpeed } = sampleSwitch({ turn: TURN.SMOOTH, turnDuration: 200 });
    expect(after[0]).toBeCloseTo(before, 6);
    const velocityAtSwitch = after[1]! - after[0]!;
    expect(Math.abs(velocityAtSwitch - beforeSpeed)).toBeLessThan(0.002);
  });

  test("SMOOTH ends on the new play", () => {
    const { player, opacity } = playerWith({ turn: TURN.SMOOTH, turnDuration: 200 }, 100);
    void player.forward();
    advance(50);
    void player.backward();
    advance(400);
    expect(opacity()).toBeCloseTo(0, 6);
  });

  test("STOP slows to rest before the new play starts", () => {
    const { player, opacity } = playerWith({ turn: TURN.STOP, turnDuration: 200 }, 100);
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

  test("a custom turn function is called and its value is shown during the turn", () => {
    const calls: number[][] = [];
    const custom = (from: number, to: number, t: number, speed: number) => {
      calls.push([from, to, t, speed]);
      return 0.5;
    };
    const { player, opacity } = playerWith({ turn: custom, turnDuration: 100 }, 100);
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
  test("an item with curve or transition throws: they moved into the keyframes", () => {
    expect(() => readItem({ style: fade, transition: EASE.STYLE.QUART } as never)).toThrow(
      "curve/transition moved into the keyframes: default: [EASE.STYLE.X, EASE.Y]",
    );
    expect(() => readItem({ style: fade, curve: EASE.STYLE.QUART } as never)).toThrow(
      "curve/transition moved into the keyframes",
    );
  });

  test("an item with ease throws: it moved into the keyframes", () => {
    expect(() => readItem({ style: fade, ease: EASE.IN } as never)).toThrow(
      "ease moved into the keyframes: default: [...]",
    );
  });
});

describe("midway validation", () => {
  test("an unknown key names the allowed keys", () => {
    expect(() => readMidway({ speed: 1 } as never)).toThrow(
      'midway has an unknown key "speed", use play, turn, turnDuration, turnStyle or turnEase',
    );
  });

  test("play must be a MIDWAY member", () => {
    expect(() => readMidway({ play: "FINISH" } as never)).toThrow(
      "midway.play must be a MIDWAY member",
    );
  });

  test("turn must be a TURN member or a function", () => {
    expect(() => readMidway({ turn: "SMOOTH" } as never)).toThrow(
      "midway.turn must be a TURN member",
    );
  });

  test("turnDuration must be a non-negative number of ms", () => {
    expect(() => readMidway({ turnDuration: -1 })).toThrow(
      "midway.turnDuration must be a time in ms, got -1",
    );
  });

  test("turnStyle must be an EASE.STYLE member", () => {
    expect(() => readMidway({ turnStyle: "QUART" } as never)).toThrow(
      "midway.turnStyle must be an EASE.STYLE member",
    );
  });

  test("turnEase must be an EASE member", () => {
    expect(() => readMidway({ turnEase: EASE.STYLE.QUART } as never)).toThrow(
      "midway.turnEase must be an EASE member",
    );
  });

  test("a bare value that is not a MIDWAY member is rejected", () => {
    expect(() => readMidway(3 as never)).toThrow("animate midway must be a MIDWAY member");
  });
});
