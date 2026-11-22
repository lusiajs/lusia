import { afterEach, describe, expect, test } from "bun:test";
import { attach, type Instance } from "lusiajs";
import { createTarget } from "../cells.ts";
import { CARD_COUNT, counts, keptStops } from "./cards.ts";
import { CYCLES } from "./main.ts";
import { spyOnListeners, type ListenerSpy } from "./listener-spy.ts";
import Watcher from "./Watcher.lusia";

// Fewer cycles than the stress page, so the test stays quick.
const TEST_CYCLES = 5;

let spy: ListenerSpy | null = null;
let instance: Instance | null = null;
let target: HTMLElement | null = null;

afterEach(() => {
  instance?.detach();
  target?.remove();
  keptStops.splice(0).forEach((stop) => stop());
  spy?.restore();
  instance = null;
  target = null;
  spy = null;
});

describe("listen on many elements", () => {
  test(`mounting ${CARD_COUNT} cards share one pair of document listeners, detaching removes it`, () => {
    spy = spyOnListeners();
    const baseline = spy.documentListeners();
    for (let cycle = 0; cycle < TEST_CYCLES; cycle++) {
      target = createTarget("div");
      instance = attach(Watcher, target);
      // Every click-outside shares one pointerdown and one keydown listener.
      expect(spy.documentListeners() - baseline).toBe(2);
      expect(spy.observedElements()).toBe(CARD_COUNT);

      instance.detach();
      instance = null;
      target.remove();
      target = null;
      expect(spy.documentListeners() - baseline).toBe(0);
      expect(spy.observedElements()).toBe(0);
    }
  });

  test(`${CYCLES} mount and detach cycles leave no listeners behind`, () => {
    spy = spyOnListeners();
    const baseline = spy.documentListeners();
    for (let cycle = 0; cycle < CYCLES; cycle++) {
      target = createTarget("div");
      instance = attach(Watcher, target);
      instance.detach();
      instance = null;
      target.remove();
      target = null;
    }
    expect(spy.documentListeners() - baseline).toBe(0);
    expect(spy.observedElements()).toBe(0);
  });

  test("one press outside calls the click-outside handler of every card", () => {
    target = createTarget("div");
    instance = attach(Watcher, target);
    const before = counts.outsidePresses;
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(counts.outsidePresses).toBe(before + CARD_COUNT);
  });

  test("a keepRunning listener survives detach until its stop is called", () => {
    target = createTarget("div");
    instance = attach(Watcher, target);
    const log = target.querySelector<HTMLElement>(".log")!;
    instance.detach();
    instance = null;
    target.remove();
    target = null;

    counts.logClicks = 0;
    log.click();
    expect(counts.logClicks).toBe(1);

    keptStops.splice(0).forEach((stop) => stop());
    log.click();
    expect(counts.logClicks).toBe(1);
  });
});
