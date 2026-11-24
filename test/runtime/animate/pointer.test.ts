import { describe, expect, test } from "bun:test";
import { animate } from "#runtime/animate/bind.ts";
import type { AnimateItem } from "#runtime/animate/animation.ts";
import type { PointerPosition } from "#runtime/animate/options/pointer-item.ts";
import type { Leave } from "#runtime/dom/component/leave.ts";
import { ON } from "#runtime/animate/modes/trigger.ts";
import { advance, onReset, useFakeClock } from "./clock.ts";

useFakeClock();

const BOX = { left: 100, top: 50, width: 200, height: 100 };

function mount(item: Partial<AnimateItem> = {}) {
  const el = document.createElement("div");
  el.getBoundingClientRect = () => BOX as DOMRect;
  el.style.opacity = "1";
  const cleanups: Array<() => void> = [];
  const leaves: Leave[] = [];
  const play = item.play ?? ((pointer: PointerPosition) => ({ opacity: pointer.x }));
  animate(
    el,
    () => ({ on: ON.MOUSE_MOVE, duration: 100, ...item, play }) as AnimateItem,
    cleanups,
    leaves,
  );
  onReset(() => cleanups.forEach((cleanup) => cleanup()));
  return { el, cleanups, opacity: () => el.style.opacity };
}

function move(el: HTMLElement, clientX: number, clientY: number): void {
  const event = new Event("pointermove") as Event & { clientX: number; clientY: number };
  event.clientX = clientX;
  event.clientY = clientY;
  el.dispatchEvent(event);
}

describe("ON.MOUSE_MOVE", () => {
  test("the play gets the pointer position inside the box, from 0 to 1", () => {
    const { el, opacity } = mount();
    move(el, 150, 100);
    advance(16);
    expect(opacity()).toBe("0.25");
  });

  test("the position is clamped to 0 and 1 outside the box", () => {
    const { el, opacity } = mount();
    move(el, 1000, 100);
    advance(16);
    expect(opacity()).toBe("1");
    move(el, -50, 100);
    advance(16);
    expect(opacity()).toBe("0");
  });

  test("many moves in one frame call the play once", () => {
    const calls: number[] = [];
    const { el } = mount({
      play: (pointer: PointerPosition) => {
        calls.push(pointer.x);
        return { opacity: pointer.x };
      },
    });
    move(el, 110, 100);
    move(el, 120, 100);
    move(el, 130, 100);
    advance(16);
    expect(calls).toEqual([0.15]);
  });

  test("the pointer leaves: the styles ease back to the base style", () => {
    const { el, opacity } = mount({ duration: 100 });
    move(el, 100, 100);
    advance(16);
    expect(opacity()).toBe("0");
    el.dispatchEvent(new Event("pointerleave"));
    advance(50);
    const middle = Number(opacity());
    expect(middle).toBeGreaterThan(0);
    expect(middle).toBeLessThan(1);
    advance(100);
    expect(opacity()).toBe("1");
  });

  test("after cleanup, moves no longer write the style", () => {
    const { el, cleanups, opacity } = mount();
    cleanups.forEach((cleanup) => cleanup());
    move(el, 150, 100);
    advance(16);
    expect(opacity()).toBe("1");
  });

  test("a function play with another ON is an error", () => {
    expect(() => mount({ on: ON.HOVER, play: () => ({ opacity: 0 }) } as never)).toThrow(
      "play as a function works only with ON.MOUSE_MOVE",
    );
  });

  test("ON.MOUSE_MOVE with keyframes is an error", () => {
    expect(() =>
      mount({ play: { 0: { opacity: 0 }, 1: { opacity: 1 } } } as unknown as AnimateItem),
    ).toThrow("ON.MOUSE_MOVE needs play as a function");
  });
});
