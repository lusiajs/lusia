import { describe, expect, test } from "bun:test";
import { animate } from "#runtime/animate/bind.ts";
import type { AnimateItem } from "#runtime/animate/animation.ts";
import type { Keyframes } from "#runtime/animate/options/keyframes.ts";
import { readOptions as readWith } from "#runtime/animate/options/trigger-options.ts";
import { EASE } from "#runtime/animate/modes/modes.ts";
import { ON } from "#runtime/animate/modes/trigger.ts";
import { HOVER_AREA } from "#runtime/animate/modes/hover-modes.ts";
import { HOVER_KEYS } from "#runtime/animate/options/keys.ts";
import type { Leave } from "#runtime/dom/component/leave.ts";
import { advance, onReset, useFakeClock } from "../clock.ts";

useFakeClock();

const readBase = { duration: 300 };
const readOptions = (on: Parameters<typeof readWith>[0], options: Parameters<typeof readWith>[1]) =>
  readWith(on, options, readBase);

const fade: Keyframes = {
  0: [EASE.STYLE.LINEAR, EASE.IN, { opacity: 0 }],
  1: [EASE.STYLE.LINEAR, EASE.IN, { opacity: 1 }],
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function mount(item: Omit<AnimateItem, "play"> = {}) {
  const el = document.createElement("div");
  const cleanups: Array<() => void> = [];
  const leaves: Leave[] = [];
  animate(
    el,
    () =>
      ({
        play: fade,
        duration: 100,
        on: ON.HOVER,
        ...item,
        options: { area: HOVER_AREA.ELEMENT, ...item.options },
      }) as AnimateItem,
    cleanups,
    leaves,
  );
  onReset(() => cleanups.forEach((cleanup) => cleanup()));
  return { el, cleanups, opacity: () => Number(el.style.opacity) };
}

describe("ON.HOVER more outDelay", () => {
  test("waits outDelay after pointer leave before it plays back", async () => {
    const { el, opacity } = mount({ options: { outDelay: 50 } });
    el.dispatchEvent(new Event("pointerenter"));
    advance(100);
    expect(opacity()).toBe(1);
    el.dispatchEvent(new Event("pointerleave"));
    advance(100);
    expect(opacity()).toBe(1);
    await wait(80);
    advance(100);
    expect(opacity()).toBe(0);
  });

  test("entering again inside the delay cancels the play back", async () => {
    const { el, opacity } = mount({ options: { outDelay: 50 } });
    el.dispatchEvent(new Event("pointerenter"));
    advance(100);
    el.dispatchEvent(new Event("pointerleave"));
    el.dispatchEvent(new Event("pointerenter"));
    await wait(80);
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("cleanup cancels a pending play back", async () => {
    const { el, cleanups, opacity } = mount({ options: { outDelay: 50 } });
    el.dispatchEvent(new Event("pointerenter"));
    advance(100);
    el.dispatchEvent(new Event("pointerleave"));
    for (const cleanup of cleanups) cleanup();
    await wait(80);
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("default 0 plays back at once", () => {
    const { el, opacity } = mount();
    el.dispatchEvent(new Event("pointerenter"));
    advance(100);
    el.dispatchEvent(new Event("pointerleave"));
    advance(100);
    expect(opacity()).toBe(0);
  });

  test("rejects a negative or non-number outDelay", () => {
    expect(() => readOptions(ON.HOVER, { outDelay: -1 })).toThrow(
      "animate options outDelay must be a time in ms, got -1",
    );
    expect(() => readOptions(ON.HOVER, { outDelay: Number.NaN })).toThrow(
      "outDelay must be a time in ms",
    );
  });

  test("more on HOVER only accepts its own keys", () => {
    expect(() => readOptions(ON.HOVER, { margin: 10 } as never)).toThrow(
      'options has an unknown key "margin", use area, inDelay, outDelay, out or outDuration',
    );
  });
});

/** Touch input: pointer events carry pointerType "touch". */
function touch(type: string, target: EventTarget = document.body): void {
  target.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), { pointerType: "touch" }));
}

describe("ON.HOVER more inDelay", () => {
  test("waits inDelay after pointer enter before it plays in", async () => {
    const { el, opacity } = mount({ options: { inDelay: 50 } });
    el.dispatchEvent(new Event("pointerenter"));
    advance(100);
    expect(opacity()).toBe(0);
    await wait(80);
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("leaving during the wait cancels the play in", async () => {
    const { el, opacity } = mount({ options: { inDelay: 50 } });
    el.dispatchEvent(new Event("pointerenter"));
    el.dispatchEvent(new Event("pointerleave"));
    await wait(80);
    advance(100);
    expect(opacity()).toBe(0);
  });
});

describe("ON.HOVER more out", () => {
  const out: Keyframes = {
    0: [EASE.STYLE.LINEAR, EASE.IN, { opacity: 1 }],
    1: [EASE.STYLE.LINEAR, EASE.IN, { opacity: 0.5 }],
  };

  test("leaving plays out keyframes, not the in backward", () => {
    const { el, opacity } = mount({ options: { out } });
    el.dispatchEvent(new Event("pointerenter"));
    advance(100);
    el.dispatchEvent(new Event("pointerleave"));
    advance(100);
    expect(opacity()).toBe(0.5);
  });

  test("outDuration sets the length of the way out", () => {
    const linearOut: Keyframes = {
      0: [EASE.STYLE.LINEAR, EASE.IN, { opacity: 1 }],
      1: [EASE.STYLE.LINEAR, EASE.IN, { opacity: 0 }],
    };
    const { el, opacity } = mount({ options: { out: linearOut, outDuration: 200 } });
    el.dispatchEvent(new Event("pointerenter"));
    advance(100);
    el.dispatchEvent(new Event("pointerleave"));
    advance(100);
    expect(opacity()).toBeCloseTo(0.5, 1);
    advance(100);
    expect(opacity()).toBeCloseTo(0, 6);
  });

  test("switching mid-way does not jump: the first out frame equals the last in frame", () => {
    const { el, opacity } = mount({ options: { out: { 0: { opacity: 1 }, 1: { opacity: 0 } } } });
    el.dispatchEvent(new Event("pointerenter"));
    advance(50);
    const before = opacity();
    expect(before).toBeCloseTo(0.5, 1);
    el.dispatchEvent(new Event("pointerleave"));
    expect(opacity()).toBe(before);
    advance(16);
    expect(opacity()).toBeLessThan(before);
  });

  test("entering mid-way of the out plays in from the current look", () => {
    const { el, opacity } = mount({ options: { out: { 0: { opacity: 1 }, 1: { opacity: 0 } } } });
    el.dispatchEvent(new Event("pointerenter"));
    advance(100);
    el.dispatchEvent(new Event("pointerleave"));
    advance(50);
    const before = opacity();
    el.dispatchEvent(new Event("pointerenter"));
    expect(opacity()).toBe(before);
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("leaving without an enter plays nothing", () => {
    const { el, opacity } = mount({ options: { out: { 0: { opacity: 1 }, 1: { opacity: 0 } } } });
    el.dispatchEvent(new Event("pointerleave"));
    advance(100);
    expect(opacity()).toBe(0);
  });

  test("once: leaving after the first enter does nothing", () => {
    const { el, opacity } = mount({
      once: true,
      options: { out: { 0: { opacity: 1 }, 1: { opacity: 0 } } },
    });
    el.dispatchEvent(new Event("pointerenter"));
    advance(100);
    el.dispatchEvent(new Event("pointerleave"));
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("cleanup cancels a pending out", async () => {
    const { el, cleanups, opacity } = mount({
      options: { outDelay: 50, out: { 0: { opacity: 1 }, 1: { opacity: 0 } } },
    });
    el.dispatchEvent(new Event("pointerenter"));
    advance(100);
    el.dispatchEvent(new Event("pointerleave"));
    for (const cleanup of cleanups) cleanup();
    await wait(80);
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("out keys are validated when the item is read", () => {
    expect(() => readOptions(ON.HOVER, { out: "fade" } as never)).toThrow(
      "animate options out must be keyframes",
    );
    expect(() => readOptions(ON.HOVER, { out: [] } as never)).toThrow(
      "animate options out must be keyframes",
    );
  });

  test("outDuration needs out", () => {
    expect(() => readOptions(ON.HOVER, { outDuration: 200 })).toThrow(
      "animate options outDuration needs out",
    );
  });
});

describe("ON.HOVER touch and keyboard", () => {
  test("a tap toggles in and out, and a touch pointer enter does nothing", () => {
    const { el, opacity } = mount();
    touch("pointerenter", el);
    advance(100);
    expect(opacity()).toBe(0);
    touch("pointerdown", el);
    advance(100);
    expect(opacity()).toBe(1);
    touch("pointerdown", el);
    advance(100);
    expect(opacity()).toBe(0);
  });

  test("a tap outside the element plays out", () => {
    const { el, opacity } = mount();
    touch("pointerdown", el);
    advance(100);
    expect(opacity()).toBe(1);
    touch("pointerdown", document.body);
    advance(100);
    expect(opacity()).toBe(0);
  });

  test("focus enters and blurring leaves", () => {
    const { el, opacity } = mount();
    el.dispatchEvent(new Event("focusin"));
    advance(100);
    expect(opacity()).toBe(1);
    el.dispatchEvent(new Event("focusout"));
    advance(100);
    expect(opacity()).toBe(0);
  });
});

describe("ON.HOVER more area", () => {
  test("defaults to HOVER_AREA.FINAL", () => {
    expect(readOptions(ON.HOVER, undefined).hover.area).toBe(HOVER_AREA.FINAL);
    expect(readOptions(ON.HOVER, {}).hover.area).toBe(HOVER_AREA.FINAL);
  });

  test("accepts HOVER_AREA.ELEMENT", () => {
    expect(readOptions(ON.HOVER, { area: HOVER_AREA.ELEMENT }).hover.area).toBe(HOVER_AREA.ELEMENT);
  });

  test("rejects a string such as 'final'", () => {
    expect(() => readOptions(ON.HOVER, { area: "final" } as never)).toThrow(
      "animate options area must be HOVER_AREA.FINAL or HOVER_AREA.ELEMENT",
    );
  });

  test("HOVER_KEYS includes area", () => {
    expect(HOVER_KEYS).toContain("area");
  });
});
