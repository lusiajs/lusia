import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { animate } from "#runtime/animate/bind.ts";
import type { AnimateItem } from "#runtime/animate/animation.ts";
import type { Keyframes } from "#runtime/animate/options/keyframes.ts";
import { EASE } from "#runtime/animate/modes/modes.ts";
import { ON } from "#runtime/animate/modes/trigger.ts";
import { HOVER_AREA } from "#runtime/animate/modes/hover-modes.ts";
import { variable } from "#runtime/variable/variable.ts";
import type { Leave } from "#runtime/dom/component/leave.ts";
import { advance, onReset, useFakeClock } from "./clock.ts";

useFakeClock();

const fade: Keyframes = {
  0: [EASE.STYLE.LINEAR, EASE.IN, { opacity: 0 }],
  1: [EASE.STYLE.LINEAR, EASE.IN, { opacity: 1 }],
};

/** Records what the element observes, and lets a test say when it enters or leaves view. */
class FakeIntersectionObserver {
  static current: FakeIntersectionObserver | undefined;
  static unobserved: Element[] = [];
  readonly targets = new Set<Element>();

  constructor(
    private readonly onEntries: (entries: IntersectionObserverEntry[]) => void,
    readonly options: IntersectionObserverInit,
  ) {
    FakeIntersectionObserver.current = this;
  }

  observe(el: Element): void {
    this.targets.add(el);
  }

  unobserve(el: Element): void {
    this.targets.delete(el);
    FakeIntersectionObserver.unobserved.push(el);
  }

  disconnect(): void {
    this.targets.clear();
  }

  report(el: Element, ratio: number): void {
    this.onEntries([
      {
        target: el,
        intersectionRatio: ratio,
        isIntersecting: ratio > 0,
      } as IntersectionObserverEntry,
    ]);
  }
}

const realIntersectionObserver = globalThis.IntersectionObserver;
beforeAll(() => {
  globalThis.IntersectionObserver =
    FakeIntersectionObserver as unknown as typeof IntersectionObserver;
});
afterAll(() => {
  globalThis.IntersectionObserver = realIntersectionObserver;
});

function mount(item: Omit<AnimateItem, "play"> = {}) {
  const el = document.createElement("div");
  const cleanups: Array<() => void> = [];
  const leaves: Leave[] = [];
  animate(el, () => ({ play: fade, duration: 100, ...item }) as AnimateItem, cleanups, leaves);
  onReset(() => cleanups.forEach((cleanup) => cleanup()));
  return { el, cleanups, leaves, opacity: () => Number(el.style.opacity) };
}

function observer(): FakeIntersectionObserver {
  return FakeIntersectionObserver.current!;
}

describe("ON.VIEW", () => {
  test("starts at key 0 and plays forward when it scrolls into view", () => {
    const { el, opacity } = mount({ on: ON.VIEW });
    expect(opacity()).toBe(0);
    observer().report(el, 0.5);
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("plays once by default: leaving view does not play back", () => {
    const { el, opacity } = mount({ on: ON.VIEW });
    observer().report(el, 0.5);
    advance(100);
    observer().report(el, 0);
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("reverse plays back when it leaves view and again on re-entry", () => {
    const { el, opacity } = mount({ on: ON.VIEW, options: { reverse: true } });
    observer().report(el, 0.5);
    advance(100);
    observer().report(el, 0);
    advance(100);
    expect(opacity()).toBe(0);
    observer().report(el, 0.5);
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("ratios below the threshold do not count as in view", () => {
    const { el, opacity } = mount({ on: ON.VIEW });
    observer().report(el, 0.1);
    advance(100);
    expect(opacity()).toBe(0);
  });

  test("once: false with reverse off still plays back on leave", () => {
    const { el, opacity } = mount({ on: ON.VIEW, once: false });
    observer().report(el, 0.5);
    advance(100);
    observer().report(el, 0);
    advance(100);
    expect(opacity()).toBe(0);
  });

  test("once stops observing after the first play", () => {
    const { el } = mount({ on: ON.VIEW });
    observer().report(el, 0.5);
    expect(FakeIntersectionObserver.unobserved).toContain(el);
  });

  test("does not add a leave, so detach does not wait for it", () => {
    const { leaves } = mount({ on: ON.VIEW, options: { reverse: true } });
    expect(leaves).toEqual([]);
  });

  test("cleanup stops observing", () => {
    const { el, cleanups } = mount({ on: ON.VIEW, options: { reverse: true } });
    for (const cleanup of cleanups) cleanup();
    expect(observer().targets.has(el)).toBe(false);
  });
});

describe("ON.HOVER", () => {
  test("pointer enter plays forward and pointer leave reverses", () => {
    const { el, opacity } = mount({ on: ON.HOVER, options: { area: HOVER_AREA.ELEMENT } });
    el.dispatchEvent(new Event("pointerenter"));
    advance(100);
    expect(opacity()).toBe(1);
    el.dispatchEvent(new Event("pointerleave"));
    advance(100);
    expect(opacity()).toBe(0);
  });

  test("once ignores the pointer after the first forward play", () => {
    const { el, opacity } = mount({
      on: ON.HOVER,
      once: true,
      options: { area: HOVER_AREA.ELEMENT },
    });
    el.dispatchEvent(new Event("pointerenter"));
    advance(100);
    el.dispatchEvent(new Event("pointerleave"));
    advance(100);
    expect(opacity()).toBe(1);
    el.dispatchEvent(new Event("pointerenter"));
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("cleanup removes the listeners", () => {
    const { el, cleanups, opacity } = mount({ on: ON.HOVER });
    for (const cleanup of cleanups) cleanup();
    el.dispatchEvent(new Event("pointerenter"));
    advance(100);
    expect(opacity()).toBe(0);
  });

  test("does not add a leave, so detach does not wait for it", () => {
    const { leaves } = mount({ on: ON.HOVER });
    expect(leaves).toEqual([]);
  });
});

describe("ON.ATTACH", () => {
  test("is the default: plays on attach and adds no leave", () => {
    const { leaves, opacity } = mount();
    advance(100);
    expect(opacity()).toBe(1);
    expect(leaves).toEqual([]);
  });
});

describe("an ATTACH item and a DETACH item on the same property", () => {
  test("the enter item plays from its start, and the leave item does not overwrite it", () => {
    const fadeOut: Keyframes = {
      0: [EASE.STYLE.LINEAR, EASE.IN, { opacity: 1 }],
      1: [EASE.STYLE.LINEAR, EASE.IN, { opacity: 0 }],
    };
    const el = document.createElement("div");
    const cleanups: Array<() => void> = [];
    const leaves: Leave[] = [];
    const items = [
      { play: fade, on: ON.ATTACH, duration: 100 },
      { play: fadeOut, on: ON.DETACH, duration: 100 },
    ] as AnimateItem[];
    animate(el, () => items, cleanups, leaves);
    onReset(() => cleanups.forEach((cleanup) => cleanup()));
    expect(Number(el.style.opacity)).toBe(0);
    advance(100);
    expect(Number(el.style.opacity)).toBe(1);
  });
});

describe("ON.MANUAL", () => {
  test("does not play by itself and adds no leave", () => {
    const { leaves, opacity } = mount({ on: ON.MANUAL });
    advance(200);
    expect(opacity()).toBe(0);
    expect(leaves).toEqual([]);
  });
});

describe("a variable or variable.compute value as when", () => {
  test("the first value is applied without animating", () => {
    const on = variable(true);
    const { opacity } = mount({ on: on });
    expect(opacity()).toBe(1);
  });

  test("a later truthy value plays forward and a falsy value plays back from the current progress", () => {
    const on = variable(false);
    const { opacity } = mount({ on: on });
    expect(opacity()).toBe(0);
    on.value = true;
    advance(50);
    expect(opacity()).toBeCloseTo(0.5, 1);
    on.value = false;
    advance(25);
    expect(opacity()).toBeCloseTo(0.25, 1);
  });

  test("a variable.compute value works the same way", () => {
    const count = variable(0);
    const big = variable.compute(() => count.value > 5);
    const { opacity } = mount({ on: big });
    count.value = 9;
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("once plays forward only the first time a truthy value arrives", () => {
    const on = variable(false);
    const { opacity } = mount({ on: on, once: true });
    on.value = true;
    advance(100);
    on.value = false;
    advance(100);
    expect(opacity()).toBe(1);
  });
});

describe("looping items off screen", () => {
  test("a loop stops writing while its element is out of view, and resumes on return", () => {
    const { el, opacity } = mount({ loop: true });
    advance(30);
    observer().report(el, 0);
    advance(10);
    const frozen = opacity();
    advance(200);
    expect(opacity()).toBe(frozen);
    observer().report(el, 1);
    advance(20);
    expect(opacity()).not.toBe(frozen);
  });

  test("a one-off play finishes while its element is out of view", () => {
    const { el, opacity } = mount({});
    observer().report(el, 0);
    advance(150);
    expect(opacity()).toBe(1);
  });
});
