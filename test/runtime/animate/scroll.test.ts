import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { animate } from "#runtime/animate/bind.ts";
import type { AnimateItem } from "#runtime/animate/animation.ts";
import type { Keyframes } from "#runtime/animate/options/keyframes.ts";
import { EASE } from "#runtime/animate/modes/modes.ts";
import { readMore as readWith } from "#runtime/animate/options/trigger-options.ts";

const readBase = { duration: 300 };
const readMore = (when: Parameters<typeof readWith>[0], more: Parameters<typeof readWith>[1]) =>
  readWith(when, more, readBase);
import { WHEN } from "#runtime/animate/modes/trigger.ts";
import { EDGE } from "#runtime/animate/modes/edge.ts";
import type { ScrollPoint } from "#runtime/animate/scroll/scroll-touch.ts";
import { variable } from "#runtime/variable/variable.ts";
import type { Leave } from "#runtime/dom/component/leave.ts";
import { advance, onReset, setReducedMotion, useFakeClock } from "./clock.ts";

useFakeClock();

const VIEWPORT_HEIGHT = 1000;
const ELEMENT_HEIGHT = 100;
const fade: Keyframes = {
  0: [EASE.STYLE.LINEAR, EASE.IN, { opacity: 0 }],
  1: [EASE.STYLE.LINEAR, EASE.IN, { opacity: 1 }],
};

beforeEach(() => {
  Object.defineProperty(window, "innerHeight", { value: VIEWPORT_HEIGHT, configurable: true });
});
afterEach(() => setReducedMotion(false));

/** Mounts a scroll item on an element whose top edge sits at `top` px from the viewport top. */
function mount(item: Omit<AnimateItem, "style"> = {}, top = VIEWPORT_HEIGHT) {
  const el = pageElement();
  let position = top;
  el.getBoundingClientRect = () => ({ top: position, height: ELEMENT_HEIGHT }) as DOMRect;
  const cleanups: Array<() => void> = [];
  const leaves: Leave[] = [];
  animate(el, () => ({ style: fade, when: WHEN.SCROLL, ...item }) as AnimateItem, cleanups, leaves);
  onReset(() => cleanups.forEach((cleanup) => cleanup()));
  return {
    el,
    cleanups,
    opacity: () => Number(el.style.opacity),
    /** Moves the element and scrolls, then runs the frame that follows. */
    scrollTo: (next: number) => {
      position = next;
      document.dispatchEvent(new Event("scroll"));
      advance(16);
    },
  };
}

describe("WHEN.SCROLL progress", () => {
  test("defaults [TOP, BOTTOM] to [BOTTOM, TOP]: 0 when the top meets the screen bottom, 1 when the bottom meets the screen top", () => {
    const { opacity, scrollTo } = mount();
    expect(opacity()).toBe(0);
    scrollTo(450);
    expect(opacity()).toBeCloseTo(0.5);
    scrollTo(-100);
    expect(opacity()).toBe(1);
  });

  test("an item watched before it joins the page shows its progress once attached, without a scroll", () => {
    const el = document.createElement("div");
    el.getBoundingClientRect = () => ({ top: 450, height: ELEMENT_HEIGHT }) as DOMRect;
    const cleanups: Array<() => void> = [];
    animate(el, () => ({ style: fade, when: WHEN.SCROLL }) as AnimateItem, cleanups, []);
    onReset(() => cleanups.forEach((cleanup) => cleanup()));
    advance(16);
    document.body.appendChild(el);
    onReset(() => el.remove());
    advance(16);
    expect(Number(el.style.opacity)).toBeCloseTo(0.5);
  });

  test("clamps below 0 and above 1", () => {
    const { opacity, scrollTo } = mount({}, 1200);
    expect(opacity()).toBe(0);
    scrollTo(-300);
    expect(opacity()).toBe(1);
  });

  test("custom screen lines map the progress", () => {
    const start: ScrollPoint = [EDGE.TOP, 0.8];
    const end: ScrollPoint = [EDGE.TOP, 0.2];
    const { opacity, scrollTo } = mount({ more: { start, end } }, 900);
    expect(opacity()).toBe(0);
    scrollTo(800);
    expect(opacity()).toBe(0);
    scrollTo(500);
    expect(opacity()).toBeCloseTo(0.5);
    scrollTo(200);
    expect(opacity()).toBe(1);
  });

  test("ignores time: no frames are needed beyond the scroll", () => {
    const { opacity, scrollTo } = mount();
    scrollTo(-100);
    expect(opacity()).toBe(1);
    scrollTo(1000);
    expect(opacity()).toBe(0);
  });
});

describe("WHEN.SCROLL start and end pairs", () => {
  test("CENTER pair: 0 when the element's centre meets the screen centre", () => {
    const { opacity, scrollTo } = mount(
      { more: { start: [EDGE.CENTER, EDGE.CENTER], end: [EDGE.BOTTOM, EDGE.TOP] } },
      450,
    );
    expect(opacity()).toBe(0);
    scrollTo(175);
    expect(opacity()).toBeCloseTo(0.5);
    scrollTo(-100);
    expect(opacity()).toBe(1);
  });

  test("a pair takes its points from EDGE", () => {
    const start: ScrollPoint = [EDGE.TOP, EDGE.CENTER];
    const { opacity, scrollTo } = mount({ more: { start, end: [EDGE.BOTTOM, EDGE.TOP] } }, 500);
    expect(opacity()).toBe(0);
    scrollTo(200);
    expect(opacity()).toBeCloseTo(0.5);
  });

  test("start and end cannot be the same point", () => {
    expect(() =>
      readMore(WHEN.SCROLL, { start: [EDGE.TOP, EDGE.BOTTOM], end: [EDGE.TOP, EDGE.BOTTOM] }),
    ).toThrow("start and end must be different moments");
  });

  test("a number is rejected with the pair form", () => {
    expect(() => readMore(WHEN.SCROLL, { start: 0.2 } as never)).toThrow(
      "start must be a pair [element edge, screen edge]",
    );
  });

  test("the old object form is rejected with the pair form", () => {
    expect(() =>
      readMore(WHEN.SCROLL, { start: { element: EDGE.TOP, window: EDGE.BOTTOM } } as never),
    ).toThrow("start must be a pair [element edge, screen edge]");
  });

  test("a pair with one edge is rejected", () => {
    expect(() => readMore(WHEN.SCROLL, { end: [EDGE.TOP] } as never)).toThrow(
      "end must be a pair [element edge, screen edge]",
    );
  });

  test("an edge outside 0 to 1 is rejected", () => {
    expect(() => readMore(WHEN.SCROLL, { start: [1.5, 0] } as never)).toThrow(
      "start[0] must be EDGE.TOP",
    );
  });
});

describe("WHEN.SCROLL shared listener", () => {
  test("two items share one scroll listener, removed when the last one stops", () => {
    const add = spyOn(document, "addEventListener");
    const remove = spyOn(document, "removeEventListener");
    try {
      const a = mount();
      const b = mount();
      const scrollAdds = add.mock.calls.filter(([type]) => type === "scroll");
      expect(scrollAdds.length).toBe(1);
      for (const cleanup of a.cleanups) cleanup();
      expect(remove.mock.calls.some(([type]) => type === "scroll")).toBe(false);
      for (const cleanup of b.cleanups) cleanup();
      expect(remove.mock.calls.some(([type]) => type === "scroll")).toBe(true);
    } finally {
      add.mockRestore();
      remove.mockRestore();
    }
  });
});

describe("WHEN.SCROLL cleanup and reduced motion", () => {
  test("after cleanup, scrolling no longer moves the item", () => {
    const { cleanups, opacity, scrollTo } = mount();
    scrollTo(-100);
    expect(opacity()).toBe(1);
    for (const cleanup of cleanups) cleanup();
    scrollTo(1000);
    expect(opacity()).toBe(1);
  });

  test("reduced motion shows the end state at once and does not listen", () => {
    setReducedMotion(true);
    const add = spyOn(document, "addEventListener");
    try {
      const { opacity } = mount({}, VIEWPORT_HEIGHT);
      expect(opacity()).toBe(1);
      expect(add.mock.calls.some(([type]) => type === "scroll")).toBe(false);
    } finally {
      add.mockRestore();
    }
  });
});

describe("WHEN.SCROLL errors", () => {
  test("loop is rejected", () => {
    const el = document.createElement("div");
    expect(() =>
      animate(el, () => ({ style: fade, when: WHEN.SCROLL, loop: true }), [], []),
    ).toThrow("loop does not work with WHEN.SCROLL");
  });

  test("keys other than start and end are rejected", () => {
    expect(() => readMore(WHEN.SCROLL, { outDelay: 10 } as never)).toThrow(
      'more has an unknown key "outDelay", use start, end, follow or part',
    );
  });
});

/** A tall or short element whose rect a test can move. */
function box(top: number, height: number) {
  const state = { top, height };
  const el = pageElement();
  el.getBoundingClientRect = () => ({ top: state.top, height: state.height }) as DOMRect;
  return { el, state };
}

/** Mounts a follow item. The item's own element is not used for progress. */
function mountFollow(more: { part?: [number, number]; start?: ScrollPoint; end?: ScrollPoint } = {}) {
  const el = pageElement();
  const follow = variable<Element | null>(null);
  const cleanups: Array<() => void> = [];
  const leaves: Leave[] = [];
  animate(
    el,
    () => ({ style: fade, when: WHEN.SCROLL, more: { follow, ...more } }) as AnimateItem,
    cleanups,
    leaves,
  );
  onReset(() => cleanups.forEach((cleanup) => cleanup()));
  return { el, follow, cleanups, opacity: () => Number(el.style.opacity) };
}

describe("WHEN.SCROLL follow", () => {
  test("a tall element: 0 when its top reaches the screen top, 1 when its bottom reaches the screen bottom", () => {
    const section = box(0, 2000);
    const { follow, opacity } = mountFollow();
    follow.value = section.el;
    advance(16);
    expect(opacity()).toBe(0);
    section.state.top = -500;
    document.dispatchEvent(new Event("scroll"));
    advance(16);
    expect(opacity()).toBeCloseTo(0.5);
    section.state.top = -1000;
    document.dispatchEvent(new Event("scroll"));
    advance(16);
    expect(opacity()).toBe(1);
  });

  test("an element shorter than the screen is 1 once its top has passed the screen top", () => {
    const short = box(100, 500);
    const { follow, opacity } = mountFollow();
    follow.value = short.el;
    advance(16);
    expect(opacity()).toBe(0);
    short.state.top = 0;
    document.dispatchEvent(new Event("scroll"));
    advance(16);
    expect(opacity()).toBe(1);
  });

  test("null means progress 0, and setting the variable later moves the item", () => {
    const section = box(-1000, 2000);
    const { follow, opacity } = mountFollow();
    advance(16);
    expect(opacity()).toBe(0);
    follow.value = section.el;
    advance(16);
    expect(opacity()).toBe(1);
  });

  test("part slices the section progress and clamps outside it", () => {
    const section = box(0, 2000);
    const { follow, opacity } = mountFollow({ part: [0.5, 1] });
    follow.value = section.el;
    advance(16);
    section.state.top = -500;
    document.dispatchEvent(new Event("scroll"));
    advance(16);
    expect(opacity()).toBe(0);
    section.state.top = -750;
    document.dispatchEvent(new Event("scroll"));
    advance(16);
    expect(opacity()).toBeCloseTo(0.5);
    section.state.top = -1000;
    document.dispatchEvent(new Event("scroll"));
    advance(16);
    expect(opacity()).toBe(1);
  });

  test("items sharing one followed element measure it once per frame", () => {
    const section = box(0, 2000);
    let calls = 0;
    const measure = section.el.getBoundingClientRect;
    section.el.getBoundingClientRect = () => {
      calls++;
      return measure.call(section.el);
    };
    const a = mountFollow();
    const b = mountFollow();
    a.follow.value = section.el;
    b.follow.value = section.el;
    advance(16);
    calls = 0;
    section.state.top = -500;
    document.dispatchEvent(new Event("scroll"));
    advance(16);
    expect(calls).toBe(1);
    expect(a.opacity()).toBeCloseTo(0.5);
    expect(b.opacity()).toBeCloseTo(0.5);
  });

  test("reduced motion shows progress 1", () => {
    setReducedMotion(true);
    const { opacity } = mountFollow();
    expect(opacity()).toBe(1);
  });

  test("start and end with follow measure the followed box like the item's own box", () => {
    const short = box(1100, 300);
    const end: ScrollPoint = [EDGE.TOP, 0.33];
    const { follow, opacity } = mountFollow({ start: [EDGE.TOP, EDGE.BOTTOM], end });
    follow.value = short.el;
    advance(16);
    expect(opacity()).toBe(0);
    short.state.top = 665;
    document.dispatchEvent(new Event("scroll"));
    advance(16);
    expect(opacity()).toBeCloseTo(0.5);
    short.state.top = 330;
    document.dispatchEvent(new Event("scroll"));
    advance(16);
    expect(opacity()).toBe(1);
  });

  test("part with start and end on follow is an error", () => {
    expect(() => mountFollow({ start: [EDGE.TOP, EDGE.BOTTOM], part: [0, 0.5] })).toThrow(
      "part cannot be used with start and end",
    );
  });

  test("follow must be a variable", () => {
    expect(() => readMore(WHEN.SCROLL, { follow: { value: null } } as never)).toThrow(
      "follow must be a variable",
    );
  });
});

describe("WHEN.SCROLL part errors", () => {
  test.each([[[0.5, 0.2]], [[-0.1, 0.5]], [[0.2, 1.5]], [[0.5, 0.5]], [[0.1, 0.2, 0.3]]])(
    "%j is rejected",
    (part) => {
      expect(() => readMore(WHEN.SCROLL, { part } as never)).toThrow(
        "part must be [from, to] with 0 <= from < to <= 1",
      );
    },
  );

  test("part must be an array", () => {
    expect(() => readMore(WHEN.SCROLL, { part: "abc" } as never)).toThrow(
      "part must be [from, to]",
    );
  });
});

/** Real scroll items sit in the page; detached ones wait for the next frame instead of being measured. */
function pageElement(): HTMLDivElement {
  const el = document.body.appendChild(document.createElement("div"));
  onReset(() => el.remove());
  return el;
}
