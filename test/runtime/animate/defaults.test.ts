import { afterEach, describe, expect, test } from "bun:test";
import { animate } from "#runtime/animate/bind.ts";
import { clearAnimateDefault, setAnimateDefault } from "#runtime/animate/options/defaults.ts";
import { readItem } from "#runtime/animate/options/options.ts";
import { EASE } from "#runtime/animate/modes/modes.ts";
import { WHEN } from "#runtime/animate/modes/trigger.ts";
import type { Leave } from "#runtime/dom/component/leave.ts";
import { advance, onReset, useFakeClock } from "./clock.ts";

useFakeClock();

/** Every test changes the engine default, so each one clears the runtime layer back to the library default. */
afterEach(() => clearAnimateDefault());

const fade = { 0: { opacity: 0 }, 1: { opacity: 1 } };

function mount(extra: Record<string, unknown> = {}) {
  const el = document.createElement("div");
  const cleanups: Array<() => void> = [];
  const leaves: Leave[] = [];
  animate(el, () => ({ style: fade, when: WHEN.ATTACH, ...extra }) as never, cleanups, leaves);
  onReset(() => cleanups.forEach((cleanup) => cleanup()));
  return { el, opacity: () => Number(el.style.opacity) };
}

describe("setAnimateDefault ease", () => {
  test("a style-only change keeps the engine ease", () => {
    setAnimateDefault({ ease: [EASE.STYLE.CUBIC] });
    // INOUT of CUBIC at the middle is 0.5; INOUT of QUART is also 0.5, so check at a quarter instead.
    // INOUT of CUBIC at t = 0.25 is 4 * 0.25^3 = 0.0625.
    const { opacity } = mount();
    advance(75);
    expect(opacity()).toBeCloseTo(0.0625, 3);
  });

  test("an ease-only change keeps the engine style", () => {
    setAnimateDefault({ ease: [EASE.OUT] });
    // OUT of QUART at t = 0.25 is 1 - (0.75)^4 = 0.6836.
    const { opacity } = mount();
    advance(75);
    expect(opacity()).toBeCloseTo(0.6836, 3);
  });

  test("[style, ease] replaces both parts", () => {
    setAnimateDefault({ ease: [EASE.STYLE.QUAD, EASE.IN] });
    // IN of QUAD at t = 0.5 is 0.25.
    const { opacity } = mount();
    advance(150);
    expect(opacity()).toBeCloseTo(0.25, 3);
  });

  test("a play already running keeps the default it started with", () => {
    const { opacity } = mount();
    setAnimateDefault({ ease: [EASE.STYLE.QUAD, EASE.IN] });
    advance(150);
    // The play was prepared before the change, so it still uses QUART + INOUT (0.5 at the middle).
    expect(opacity()).toBeGreaterThan(0.25);
  });
});

describe("setAnimateDefault duration", () => {
  test("replaces the 300 ms default", () => {
    setAnimateDefault({ duration: 400 });
    const { opacity } = mount();
    advance(300);
    expect(opacity()).toBeLessThan(1);
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("an item's own duration still wins", () => {
    setAnimateDefault({ duration: 400 });
    const { opacity } = mount({ duration: 100 });
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("readItem uses the engine duration when the item has none", () => {
    setAnimateDefault({ duration: 500 });
    expect(readItem({ style: fade }).timing.duration).toBe(500);
  });
});

describe("setAnimateDefault validation", () => {
  test("an unknown key names the allowed keys", () => {
    expect(() => setAnimateDefault({ speed: 2 } as never)).toThrow(
      'setAnimateDefault has an unknown key "speed", use ease or duration',
    );
  });

  test("duration must be a non-negative number", () => {
    expect(() => setAnimateDefault({ duration: -1 })).toThrow(
      "setAnimateDefault duration must be a time in ms, got -1",
    );
    expect(() => setAnimateDefault({ duration: Number.NaN })).toThrow(
      "setAnimateDefault duration must be a time in ms",
    );
  });

  test("ease takes the default forms", () => {
    expect(() => setAnimateDefault({ ease: [EASE.IN, EASE.OUT] } as never)).toThrow(
      "animate default must be",
    );
    expect(() => setAnimateDefault({ ease: "quart" } as never)).toThrow("animate default must be");
  });

  test("a failed call leaves the engine default unchanged", () => {
    expect(() => setAnimateDefault({ duration: 900, speed: 1 } as never)).toThrow();
    expect(readItem({ style: fade }).timing.duration).toBe(300);
  });
});
