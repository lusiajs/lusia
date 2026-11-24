import { describe, expect, test } from "bun:test";
import { animate } from "#runtime/animate/bind.ts";
import type { AnimateItem } from "#runtime/animate/animation.ts";
import type { Leave } from "#runtime/dom/component/leave.ts";
import { variable } from "#runtime/variable/variable.ts";
import { advance, onReset, useFakeClock } from "../clock.ts";

useFakeClock();

const BASE = { left: 100, top: 40, width: 200, height: 50 };
const TARGET = { left: 300, top: 120, width: 100, height: 40 };

/** Mounts a box whose rect follows its translate and inline size, the way the browser draws it. */
function mountBox(base: typeof BASE): HTMLElement {
  const el = document.createElement("div");
  el.getBoundingClientRect = () => {
    const translate = el.style.getPropertyValue("translate") || "0px 0px";
    const [x = 0, y = 0] = translate.split(" ").map(parseFloat);
    return {
      left: base.left + x,
      top: base.top + y,
      width: parseFloat(el.style.width) || base.width,
      height: parseFloat(el.style.height) || base.height,
    } as DOMRect;
  };
  return el;
}

function mountGlide(item: Partial<AnimateItem> & { glide: unknown }) {
  const el = mountBox(BASE);
  const target = document.createElement("div");
  target.getBoundingClientRect = () => TARGET as DOMRect;
  const cleanups: Array<() => void> = [];
  const leaves: Leave[] = [];
  animate(el, () => ({ duration: 100, ...item }) as AnimateItem, cleanups, leaves);
  onReset(() => cleanups.forEach((cleanup) => cleanup()));
  return { el, target, rect: () => el.getBoundingClientRect() };
}

describe("glide item", () => {
  test("a null value does nothing", () => {
    const glide = variable<Element | null>(null);
    const { el } = mountGlide({ glide });
    glide.value = null;
    advance(200);
    expect(el.style.getPropertyValue("translate")).toBe("");
    expect(el.style.width).toBe("");
  });

  test("the first value is not a change, so the element does not glide on attach", () => {
    const { el } = mountGlide({ glide: variable<Element | null>(target0()) });
    advance(200);
    expect(el.style.getPropertyValue("translate")).toBe("");
  });

  test("a new element glides the box to its place and size, and holds it there", () => {
    const glide = variable<Element | null>(null);
    const { el, target, rect } = mountGlide({ glide });
    glide.value = target;
    advance(50);
    expect(rect().left).toBeGreaterThan(BASE.left);
    expect(rect().left).toBeLessThan(TARGET.left);
    advance(200);
    expect(rect().left).toBeCloseTo(TARGET.left, 0);
    expect(rect().top).toBeCloseTo(TARGET.top, 0);
    expect(rect().width).toBeCloseTo(TARGET.width, 0);
    expect(rect().height).toBeCloseTo(TARGET.height, 0);
    expect(el.style.width).toBe(`${TARGET.width}px`);
  });

  test("a null after a glide keeps the element where it is", () => {
    const glide = variable<Element | null>(null);
    const { rect, target } = mountGlide({ glide });
    glide.value = target;
    advance(200);
    glide.value = null;
    advance(200);
    expect(rect().left).toBeCloseTo(TARGET.left, 0);
  });

  test("glide with play is an error", () => {
    expect(() =>
      mountGlide({ glide: variable<Element | null>(null), play: { 0: {}, 1: {} } } as never),
    ).toThrow("glide cannot be used with play or on");
  });

  test("glide with on is an error", () => {
    expect(() =>
      mountGlide({ glide: variable<Element | null>(null), on: undefined } as never),
    ).toThrow("glide cannot be used with play or on");
  });

  test("glide that is not a variable is an error", () => {
    expect(() => mountGlide({ glide: document.createElement("div") })).toThrow(
      "glide needs a variable that holds an element or null",
    );
  });
});

function target0(): Element {
  const target = document.createElement("div");
  target.getBoundingClientRect = () => TARGET as DOMRect;
  return target;
}
