import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { animate } from "#runtime/animate/bind.ts";
import type { AnimateItem } from "#runtime/animate/animation.ts";
import type { Keyframes } from "#runtime/animate/options/keyframes.ts";
import { readItem } from "#runtime/animate/options/options.ts";
import { EASE } from "#runtime/animate/modes/modes.ts";
import { WHEN } from "#runtime/animate/modes/trigger.ts";
import { readMore as readWith } from "#runtime/animate/options/trigger-options.ts";
import { watchView } from "#runtime/animate/scroll/view.ts";

const readBase = { duration: 300 };
const readMore = (when: Parameters<typeof readWith>[0], more: Parameters<typeof readWith>[1]) =>
  readWith(when, more, readBase);
import type { Leave } from "#runtime/dom/component/leave.ts";
import { variable } from "#runtime/variable/variable.ts";
import { advance, onReset, useFakeClock } from "./clock.ts";

useFakeClock();

const fade: Keyframes = {
  0: [EASE.STYLE.LINEAR, EASE.IN, { opacity: 0 }],
  1: [EASE.STYLE.LINEAR, EASE.IN, { opacity: 1 }],
};

/** Records every observer, its options and the elements it watches. */
class FakeIntersectionObserver {
  static created: FakeIntersectionObserver[] = [];
  readonly targets = new Set<Element>();
  disconnected = false;

  constructor(
    private readonly onEntries: (entries: IntersectionObserverEntry[]) => void,
    readonly options: IntersectionObserverInit,
  ) {
    FakeIntersectionObserver.created.push(this);
  }

  observe(el: Element): void {
    this.targets.add(el);
  }

  unobserve(el: Element): void {
    this.targets.delete(el);
  }

  disconnect(): void {
    this.disconnected = true;
    this.targets.clear();
  }

  /** Reports the share of the screen the element covers, the way the browser would measure it. */
  report(el: Element, share: number): void {
    const { target, root } = geometryOf(el);
    const visibleHeight = share * Math.min(target, root);
    this.onEntries([
      {
        target: el,
        isIntersecting: share > 0,
        intersectionRatio: visibleHeight / target,
        intersectionRect: { width: 100, height: visibleHeight },
        boundingClientRect: { width: 100, height: target },
        rootBounds: { width: 100, height: root },
      } as unknown as IntersectionObserverEntry,
    ]);
  }

  static watching(el: Element): FakeIntersectionObserver | undefined {
    return FakeIntersectionObserver.created.find(
      (observer) => !observer.disconnected && observer.targets.has(el),
    );
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
beforeEach(() => {
  FakeIntersectionObserver.created = [];
});

function mount(item: Omit<AnimateItem, "style"> = {}) {
  const el = document.createElement("div");
  const cleanups: Array<() => void> = [];
  const leaves: Leave[] = [];
  animate(
    el,
    () => ({ style: fade, duration: 100, when: WHEN.VIEW, ...item }) as AnimateItem,
    cleanups,
    leaves,
  );
  onReset(() => cleanups.forEach((cleanup) => cleanup()));
  return { el, cleanups, leaves, opacity: () => Number(el.style.opacity) };
}

/** Heights in px of the element and of the screen after the margin. Both default to 100. */
const sizes = new WeakMap<Element, { target: number; root: number }>();

function geometryOf(el: Element): { target: number; root: number } {
  return sizes.get(el) ?? { target: 100, root: 100 };
}

function setSizes(el: Element, target: number, root: number): void {
  sizes.set(el, { target, root });
}

function reportView(el: Element, share: number): void {
  const observer = FakeIntersectionObserver.watching(el);
  if (!observer) throw new Error("element is not watched");
  observer.report(el, share);
}

function optionsOf(el: Element): IntersectionObserverInit | undefined {
  return FakeIntersectionObserver.watching(el)?.options;
}

describe("more margin", () => {
  const rootMarginOf = (margin: number | string) => readMore(WHEN.VIEW, { margin }).view.rootMargin;

  test("a number is px, and the root margin is the negated value", () => {
    expect(rootMarginOf(80)).toBe("-80px");
    expect(rootMarginOf(0)).toBe("0px");
    expect(rootMarginOf(-20)).toBe("20px");
  });

  test("a string is a CSS length or percentage, negated", () => {
    expect(rootMarginOf("10%")).toBe("-10%");
    expect(rootMarginOf("-5px")).toBe("5px");
    expect(rootMarginOf("12rem")).toBe("-12rem");
    expect(rootMarginOf("0")).toBe("0px");
  });

  test("the observer gets the root margin", () => {
    const { el } = mount({ more: { margin: "10%" } });
    expect(optionsOf(el)?.rootMargin).toBe("-10%");
  });

  test("rejects a bad margin with a clear error", () => {
    expect(() => rootMarginOf("10")).toThrow(
      'animate more margin must be a number of px or a CSS length such as "10%"',
    );
    expect(() => rootMarginOf("abc")).toThrow("animate more margin");
    expect(() => rootMarginOf(Number.NaN)).toThrow("animate more margin");
    expect(() => rootMarginOf(Number.POSITIVE_INFINITY)).toThrow("animate more margin");
  });
});

describe("more amount", () => {
  test("defaults to 0.15", () => {
    expect(readMore(WHEN.VIEW, undefined).view.amount).toBe(0.15);
    expect(readMore(WHEN.VIEW, {}).view).toEqual({ rootMargin: "0px", amount: 0.15 });
    const { el, opacity } = mount();
    reportView(el, 0.14);
    advance(100);
    expect(opacity()).toBe(0);
    reportView(el, 0.15);
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("sets how much of the element must be visible", () => {
    const { el, opacity } = mount({ more: { amount: 0.5 } });
    reportView(el, 0.4);
    advance(100);
    expect(opacity()).toBe(0);
    reportView(el, 0.5);
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("0 and 1 are allowed", () => {
    expect(readMore(WHEN.VIEW, { amount: 0 }).view.amount).toBe(0);
    expect(readMore(WHEN.VIEW, { amount: 1 }).view.amount).toBe(1);
  });

  test("rejects values outside 0 to 1", () => {
    expect(() => readMore(WHEN.VIEW, { amount: 1.5 })).toThrow(
      "animate more amount must be a number from 0 to 1, got 1.5",
    );
    expect(() => readMore(WHEN.VIEW, { amount: -0.1 })).toThrow("from 0 to 1");
    expect(() => readMore(WHEN.VIEW, { amount: Number.NaN })).toThrow("from 0 to 1");
  });
});

describe("more errors", () => {
  test("more on a non-VIEW item names the when", () => {
    expect(() => readItem({ style: fade, more: { margin: 10 } } as never)).toThrow(
      'more has an unknown key "margin", use animateSpace',
    );
    expect(() =>
      readItem({ style: fade, when: WHEN.HOVER, more: { amount: 0.5 } } as AnimateItem),
    ).toThrow('more has an unknown key "amount", use area, inDelay, outDelay, out or outDuration');
  });

  test("more on a variable when names it as a variable", () => {
    const source = variable(true);
    expect(() => readItem({ style: fade, when: source, more: {} } as never)).toThrow(
      "more is not used with a variable",
    );
  });

  test("an unknown key names the allowed keys", () => {
    expect(() => readMore(WHEN.VIEW, { marginn: 10 } as never)).toThrow(
      'more has an unknown key "marginn", use margin, amount or reverse',
    );
  });

  test("reverse at the top level points to more", () => {
    expect(() => readItem({ style: fade, when: WHEN.VIEW, reverse: true } as AnimateItem)).toThrow(
      "reverse moved into more: { reverse: true }",
    );
  });

  test("reverse inside more must be a boolean", () => {
    expect(() => readMore(WHEN.VIEW, { reverse: "yes" } as never)).toThrow(
      "more reverse must be true or false",
    );
  });
});

describe("observer sharing", () => {
  test("two items with the same settings share one observer", () => {
    const a = mount({ more: { margin: 80 } });
    const b = mount({ more: { margin: 80 } });
    expect(FakeIntersectionObserver.created.length).toBe(1);
    expect(FakeIntersectionObserver.watching(a.el)).toBe(FakeIntersectionObserver.watching(b.el));
  });

  test("items with different settings get separate observers", () => {
    mount({ more: { margin: 80 } });
    mount({ more: { margin: 40 } });
    mount({ more: { amount: 0.5 } });
    expect(FakeIntersectionObserver.created.length).toBe(3);
  });

  test("the last stop drops the observer, so a new item makes a new one", () => {
    const first = mount({ more: { margin: 80 } });
    for (const cleanup of first.cleanups) cleanup();
    expect(FakeIntersectionObserver.created[0]!.disconnected).toBe(true);
    mount({ more: { margin: 80 } });
    expect(FakeIntersectionObserver.created.length).toBe(2);
  });

  test("the shared observer stays while one of its items remains", () => {
    const a = mount({ more: { margin: 80 } });
    mount({ more: { margin: 80 } });
    for (const cleanup of a.cleanups) cleanup();
    expect(FakeIntersectionObserver.created.length).toBe(1);
    expect(FakeIntersectionObserver.created[0]!.disconnected).toBe(false);
  });
});

describe("more reverse with view settings", () => {
  test("replays on re-entry when the root margin is set", () => {
    const { el, opacity } = mount({ more: { margin: "10%", reverse: true } });
    reportView(el, 0.5);
    advance(100);
    reportView(el, 0);
    advance(100);
    expect(opacity()).toBe(0);
    reportView(el, 0.5);
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("without reverse, a margin item plays once and stops watching", () => {
    const { el, opacity } = mount({ more: { margin: 80 } });
    reportView(el, 0.5);
    advance(100);
    expect(opacity()).toBe(1);
    expect(FakeIntersectionObserver.watching(el)).toBeUndefined();
  });
});

describe("a tall element", () => {
  // A 10000 px section under an 840 px screen (1000 px with an 80 px margin).
  test("plays once the screen is covered by the amount, not the whole element", () => {
    const { el, opacity } = mount({ more: { margin: 80, amount: 0.1 } });
    setSizes(el, 10000, 840);
    reportView(el, 0.09);
    advance(100);
    expect(opacity()).toBe(0);
    reportView(el, 0.1);
    advance(100);
    expect(opacity()).toBe(1);
  });

  test("a full screen of the element counts as fully visible", () => {
    const { el, opacity } = mount({ more: { margin: 80, amount: 1 } });
    setSizes(el, 10000, 840);
    reportView(el, 0.99);
    advance(100);
    expect(opacity()).toBe(0);
    reportView(el, 1);
    advance(100);
    expect(opacity()).toBe(1);
  });
});

describe("in view changes", () => {
  test("a steady share does not call the change again", () => {
    const calls: boolean[] = [];
    const el = document.createElement("div");
    const cleanups: Array<() => void> = [];
    const stop = watchView(el, { rootMargin: "0px", amount: 0.5 }, (inView) => calls.push(inView));
    cleanups.push(stop);
    onReset(() => cleanups.forEach((cleanup) => cleanup()));
    reportView(el, 0.6);
    reportView(el, 0.7);
    reportView(el, 0.8);
    reportView(el, 0.2);
    reportView(el, 0.1);
    expect(calls).toEqual([true, false]);
  });
});
