import { afterEach, describe, expect, test } from "bun:test";
import { animate } from "#runtime/animate/bind.ts";
import type { AnimateItem } from "#runtime/animate/animation.ts";
import { controller } from "#runtime/animate/play/controller.ts";
import type { Keyframes } from "#runtime/animate/options/keyframes.ts";
import { EASE } from "#runtime/animate/modes/modes.ts";
import { WHEN } from "#runtime/animate/modes/trigger.ts";
import { advance, onReset, useFakeClock } from "./clock.ts";

useFakeClock();

const fade: Keyframes = {
  0: [EASE.STYLE.LINEAR, EASE.IN, { opacity: 0 }],
  1: [EASE.STYLE.LINEAR, EASE.IN, { opacity: 1 }],
};

function mount(item: AnimateItem) {
  const el = document.createElement("div");
  const cleanups: Array<() => void> = [];
  animate(el, () => item, cleanups, []);
  onReset(() => cleanups.forEach((cleanup) => cleanup()));
  return { el, opacity: () => Number(el.style.opacity) };
}

describe("controller", () => {
  test("play runs a MANUAL item forward and resolves when it ends", async () => {
    const ctl = controller();
    const { opacity } = mount({ style: fade, when: WHEN.MANUAL, control: ctl, duration: 100 });
    expect(opacity()).toBe(0);
    const playing = ctl.play();
    advance(100);
    await playing;
    expect(opacity()).toBe(1);
  });

  test("reverse runs the item back to 0", async () => {
    const ctl = controller();
    const { opacity } = mount({ style: fade, when: WHEN.MANUAL, control: ctl, duration: 100 });
    const forward = ctl.play();
    advance(100);
    await forward;
    const back = ctl.reverse();
    advance(100);
    await back;
    expect(opacity()).toBe(0);
  });

  test("stop freezes the item where it is", () => {
    const ctl = controller();
    const { opacity } = mount({ style: fade, when: WHEN.MANUAL, control: ctl, duration: 100 });
    void ctl.play();
    advance(40);
    ctl.stop();
    const stopped = opacity();
    advance(200);
    expect(opacity()).toBe(stopped);
  });

  test("seek sets the progress without playing", () => {
    const ctl = controller();
    const { opacity } = mount({ style: fade, when: WHEN.MANUAL, control: ctl, duration: 100 });
    ctl.seek(0.75);
    expect(opacity()).toBeCloseTo(0.75, 5);
    advance(100);
    expect(opacity()).toBeCloseTo(0.75, 5);
  });

  test("one controller drives items on several elements", async () => {
    const ctl = controller();
    const a = mount({ style: fade, when: WHEN.MANUAL, control: ctl, duration: 100 });
    const b = mount({ style: fade, when: WHEN.MANUAL, control: ctl, duration: 100 });
    const playing = ctl.play();
    advance(100);
    await playing;
    expect(a.opacity()).toBe(1);
    expect(b.opacity()).toBe(1);
  });

  test("a controlled IN item plays on attach and can also be driven by the controller", async () => {
    const ctl = controller();
    const { opacity } = mount({ style: fade, control: ctl, duration: 100 });
    advance(100);
    expect(opacity()).toBe(1);
    const back = ctl.reverse();
    advance(100);
    await back;
    expect(opacity()).toBe(0);
  });

  test("cleanup removes the item from the controller", async () => {
    const ctl = controller();
    const el = document.createElement("div");
    const cleanups: Array<() => void> = [];
    animate(
      el,
      () => ({ style: fade, when: WHEN.MANUAL, control: ctl, duration: 100 }),
      cleanups,
      [],
    );
    for (const cleanup of cleanups) cleanup();
    await ctl.play();
    expect(el.style.opacity).toBe("0");
  });
});
