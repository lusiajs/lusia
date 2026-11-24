import { afterEach, describe, expect, test } from "bun:test";
import { animate } from "#runtime/animate/bind.ts";
import type { AnimateItem } from "#runtime/animate/animation.ts";
import type { Leave } from "#runtime/dom/component/leave.ts";
import { ON } from "#runtime/animate/modes/trigger.ts";
import { advance, onReset, setReducedMotion, useFakeClock } from "./clock.ts";

useFakeClock();

// happy-dom has no ResizeObserver. The layout watcher only needs observe, unobserve and disconnect.
if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Axis = "width" | "height";

/**
 * Mounts an element with a layout box. Its used size follows the inline width and height the
 * engine writes, and its rect follows that size and the translate, the way the browser draws it.
 */
function mount(
  item: Omit<AnimateItem, "play"> = {},
  box: Box = { x: 100, y: 40, width: 200, height: 50 },
  attach = false,
) {
  const el = document.createElement("div");
  const layout = { ...box };
  if (attach) document.body.appendChild(el);
  Object.defineProperties(el, {
    offsetLeft: { get: () => layout.x, configurable: true },
    offsetTop: { get: () => layout.y, configurable: true },
    offsetWidth: { get: () => Math.round(usedSize(el, layout.width, "width")), configurable: true },
    offsetHeight: {
      get: () => Math.round(usedSize(el, layout.height, "height")),
      configurable: true,
    },
  });
  el.getBoundingClientRect = () => {
    const { tx, ty, sx, sy } = written(el);
    const width = usedSize(el, layout.width, "width");
    const height = usedSize(el, layout.height, "height");
    return {
      left: layout.x + tx + (width / 2) * (1 - sx),
      top: layout.y + ty + (height / 2) * (1 - sy),
      width: width * sx,
      height: height * sy,
    } as DOMRect;
  };
  const cleanups: Array<() => void> = [];
  const leaves: Leave[] = [];
  animate(el, () => ({ on: ON.MOVE, ...item }) as AnimateItem, cleanups, leaves);
  onReset(() => {
    cleanups.forEach((cleanup) => cleanup());
    el.remove();
  });
  return {
    el,
    layout,
    /** Changes the layout, then runs the frames that follow, as a DOM change would. */
    change: (next: Partial<Box>, ms = 16) => {
      Object.assign(layout, next);
      document.dispatchEvent(new Event("scroll"));
      advance(ms || 0.001);
    },
    run: (ms: number) => advance(ms),
    translate: () => written(el),
    scale: () => el.style.getPropertyValue("scale"),
    inline: (axis: Axis) => el.style.getPropertyValue(axis),
    visualLeft: () => el.getBoundingClientRect().left,
    width: () => el.getBoundingClientRect().width,
    height: () => el.getBoundingClientRect().height,
    /** A block child fills the element's content box, then the element's own scale applies to it. */
    childWidth: () => usedSize(el, layout.width, "width"),
    childRenderedWidth: () => usedSize(el, layout.width, "width") * written(el).sx,
  };
}

type View = ReturnType<typeof mount>;

/** Runs the animation `count` frames and returns each frame's sizes and inline scale. */
function sampleFrames(view: View, count: number) {
  const frames: Array<{
    width: number;
    height: number;
    scale: string;
    child: number;
    childRendered: number;
  }> = [];
  for (let i = 0; i < count; i++) {
    view.run(16);
    frames.push({
      width: view.width(),
      height: view.height(),
      scale: view.scale(),
      child: view.childWidth(),
      childRendered: view.childRenderedWidth(),
    });
  }
  return frames;
}

/** The size the element uses, from the inline size the engine wrote. A missing inline size keeps the layout size. */
function usedSize(el: HTMLElement, layoutSize: number, axis: Axis): number {
  const text = el.style.getPropertyValue(axis);
  if (text === "") return layoutSize;
  const value = parseFloat(text);
  return el.style.boxSizing === "border-box" ? value : value + chrome(el, axis);
}

/** The padding and border the inline style adds around the content. */
function chrome(el: HTMLElement, axis: Axis): number {
  const sides =
    axis === "width"
      ? [
          el.style.paddingLeft,
          el.style.paddingRight,
          el.style.borderLeftWidth,
          el.style.borderRightWidth,
        ]
      : [
          el.style.paddingTop,
          el.style.paddingBottom,
          el.style.borderTopWidth,
          el.style.borderBottomWidth,
        ];
  return sides.reduce((sum, side) => sum + (parseFloat(side) || 0), 0);
}

/** The glide's inline transform. An empty value is the identity. */
function written(el: HTMLElement) {
  const [tx, ty] = numbers(el.style.getPropertyValue("translate"), 0);
  const [sx, sy] = numbers(el.style.getPropertyValue("scale"), 1);
  return { tx, ty, sx, sy };
}

function numbers(text: string, fallback: number): [number, number] {
  const parts = text.split(" ").map((part) => parseFloat(part));
  return [parts[0] ?? fallback, parts[1] ?? fallback].map((n) =>
    Number.isNaN(n) ? fallback : n,
  ) as [number, number];
}

afterEach(() => setReducedMotion(false));

describe("ON.MOVE", () => {
  test("glides from the old place to the new one", () => {
    const view = mount({ on: ON.MOVE });
    view.change({ x: 300 }, 0);
    expect(view.translate().tx).toBeCloseTo(-200);
    view.run(150);
    const mid = view.translate().tx;
    expect(mid).toBeLessThan(0);
    expect(mid).toBeGreaterThan(-200);
    view.run(400);
    expect(view.el.style.getPropertyValue("translate")).toBe("");
    expect(view.visualLeft()).toBe(300);
  });

  test("ignores a size change", () => {
    const view = mount({ on: ON.MOVE });
    view.change({ width: 400 });
    expect(view.el.style.getPropertyValue("translate")).toBe("");
    expect(view.el.style.getPropertyValue("scale")).toBe("");
    expect(view.el.style.getPropertyValue("width")).toBe("");
  });

  test("never touches the size on a move", () => {
    const view = mount({ on: ON.MOVE });
    view.change({ x: 300 }, 0);
    view.run(150);
    expect(view.el.style.getPropertyValue("width")).toBe("");
    expect(view.el.style.getPropertyValue("height")).toBe("");
    expect(view.el.style.getPropertyValue("scale")).toBe("");
  });
});

describe("ON.RESIZE", () => {
  test("glides the real width, never a scale", () => {
    const view = mount({ on: ON.RESIZE });
    view.change({ width: 400 }, 0);
    expect(view.width()).toBeCloseTo(200);

    const frames = sampleFrames(view, 8);
    for (const frame of frames) {
      expect(frame.scale).toBe("");
      expect(frame.width).toBeGreaterThan(200);
      expect(frame.width).toBeLessThan(400);
    }
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i]!.width).toBeGreaterThan(frames[i - 1]!.width);
    }

    view.run(400);
    expect(view.inline("width")).toBe("");
    expect(view.el.style.getPropertyValue("scale")).toBe("");
    expect(view.width()).toBeCloseTo(400, 5);
  });

  test("the size it writes is not read back as a new change", () => {
    const view = mount({ on: ON.RESIZE });
    view.change({ width: 400 }, 0);
    view.run(150);
    expect(view.width()).toBeGreaterThan(200);
    expect(view.inline("width")).not.toBe("");
    view.run(300);
    expect(view.inline("width")).toBe("");
    expect(view.width()).toBeCloseTo(400, 5);
  });

  test("a new size during a glide starts from the width it shows now", () => {
    const view = mount({ on: ON.RESIZE });
    view.change({ width: 400 }, 0);
    view.run(150);
    const before = view.width();
    expect(before).toBeGreaterThan(200);
    expect(before).toBeLessThan(400);
    view.change({ width: 600 }, 0);
    expect(view.width()).toBeCloseTo(before, 1);
    view.run(400);
    expect(view.width()).toBeCloseTo(600, 5);
    expect(view.inline("width")).toBe("");
  });

  test("ignores a place change", () => {
    const view = mount({ on: ON.RESIZE });
    view.change({ x: 300 });
    expect(view.el.style.getPropertyValue("translate")).toBe("");
    expect(view.el.style.getPropertyValue("width")).toBe("");
  });

  test("a child keeps its shape: its rendered width stays its layout width", () => {
    const view = mount({ on: ON.RESIZE });
    view.change({ width: 400 }, 0);
    for (const frame of sampleFrames(view, 8)) {
      expect(frame.scale).toBe("");
      expect(frame.childRendered).toBeCloseTo(frame.child, 5);
      expect(frame.child).toBeGreaterThan(200);
      expect(frame.child).toBeLessThan(400);
      expect(frame.childRendered).toBeCloseTo(frame.width, 5);
    }
  });

  test("the last frame matches the layout box, so dropping the inline size does not jump", () => {
    const view = mount({ on: ON.RESIZE });
    view.change({ width: 400 }, 0);
    view.run(287);
    const nearEnd = view.width();
    expect(view.inline("width")).not.toBe("");
    view.run(32);
    expect(view.inline("width")).toBe("");
    expect(Math.abs(view.width() - nearEnd)).toBeLessThan(1);
    expect(view.width()).toBeCloseTo(400, 5);
  });

  test("a fractional layout size lands exactly on its box", () => {
    const view = mount({ on: ON.RESIZE });
    view.change({ width: 400.5 }, 0);
    view.run(400);
    expect(view.inline("width")).toBe("");
    expect(view.width()).toBeCloseTo(400.5, 5);
  });

  test("a content-box element writes its content width", () => {
    const view = mount({ on: ON.RESIZE }, undefined, true);
    view.el.style.paddingLeft = "10px";
    view.el.style.paddingRight = "10px";
    view.el.style.paddingTop = "4px";
    view.el.style.paddingBottom = "4px";
    view.change({ width: 400, height: 100 }, 0);
    view.run(150);
    expect(parseFloat(view.inline("width"))).toBeCloseTo(view.width() - 20, 5);
    expect(parseFloat(view.inline("height"))).toBeCloseTo(view.height() - 8, 5);
    view.run(400);
    expect(view.inline("width")).toBe("");
    expect(view.width()).toBeCloseTo(400, 5);
  });

  test("a border-box element writes the full width", () => {
    const view = mount({ on: ON.RESIZE }, undefined, true);
    view.el.style.boxSizing = "border-box";
    view.el.style.paddingLeft = "10px";
    view.el.style.paddingRight = "10px";
    view.change({ width: 400 }, 0);
    view.run(150);
    expect(parseFloat(view.inline("width"))).toBeCloseTo(view.width(), 5);
  });

  test("reduced motion jumps to the new size", () => {
    setReducedMotion(true);
    const view = mount({ on: ON.RESIZE });
    view.change({ width: 400 });
    expect(view.inline("width")).toBe("");
    expect(view.el.style.getPropertyValue("scale")).toBe("");
    expect(view.width()).toBe(400);
  });

  test("once glides only the first size change", () => {
    const view = mount({ on: ON.RESIZE, once: true });
    view.change({ width: 400 });
    view.run(400);
    view.change({ width: 200 }, 0);
    expect(view.inline("width")).toBe("");
    expect(view.width()).toBeCloseTo(200);
  });
});

describe("ON.MOVE_OR_RESIZE", () => {
  test("glides on a move", () => {
    const view = mount({ on: ON.MOVE_OR_RESIZE });
    view.change({ y: 200 }, 0);
    expect(view.translate().ty).toBeCloseTo(-160);
  });

  test("glides the real height on a resize", () => {
    const view = mount({ on: ON.MOVE_OR_RESIZE });
    view.change({ height: 100 }, 0);
    expect(view.height()).toBeCloseTo(50);
    view.run(150);
    expect(view.height()).toBeGreaterThan(50);
    expect(view.height()).toBeLessThan(100);
    expect(view.el.style.getPropertyValue("scale")).toBe("");
    view.run(400);
    expect(view.height()).toBeCloseTo(100, 5);
    expect(view.inline("height")).toBe("");
  });

  test("keeps a running place glide when the size changes mid-glide", () => {
    const view = mount({ on: ON.MOVE_OR_RESIZE });
    view.change({ x: 300, width: 400 }, 0);
    view.run(150);
    const before = view.visualLeft();
    view.change({ x: 0 }, 0);
    expect(view.visualLeft()).toBeCloseTo(before, 1);
  });
});

describe("layout glide details", () => {
  test("a change during a glide starts from the current visual box, without a jump", () => {
    const view = mount({ on: ON.MOVE });
    view.change({ x: 300 }, 0);
    view.run(100);
    const before = view.visualLeft();
    view.change({ x: 0 }, 0);
    expect(view.visualLeft()).toBeCloseTo(before, 5);
  });

  test("reduced motion jumps without a glide", () => {
    setReducedMotion(true);
    const view = mount({ on: ON.MOVE });
    view.change({ x: 300 });
    expect(view.el.style.getPropertyValue("translate")).toBe("");
    expect(view.visualLeft()).toBe(300);
  });

  test("once glides only for the first change", () => {
    const view = mount({ on: ON.MOVE, once: true });
    view.change({ x: 300 });
    view.run(400);
    view.change({ x: 0 }, 0);
    expect(view.el.style.getPropertyValue("translate")).toBe("");
  });

  test("works without style", () => {
    const view = mount({ on: ON.MOVE });
    expect(view.el.style.getPropertyValue("translate")).toBe("");
  });
});

describe("layout errors", () => {
  const run = (item: Record<string, unknown>) =>
    animate(document.createElement("div"), () => item as unknown as AnimateItem, [], []);

  test("loop is an error", () => {
    expect(() => run({ on: ON.MOVE, loop: true })).toThrow(
      "loop does not work with ON.MOVE, RESIZE or MOVE_OR_RESIZE",
    );
  });

  test("translate and scale in style are an error", () => {
    const style = { 0: { translate: "0px 0px" }, 1: { translate: "0px 0px" } };
    expect(() => run({ on: ON.RESIZE, play: style })).toThrow(
      "translate is set by the glide and cannot be in play",
    );
  });
});
