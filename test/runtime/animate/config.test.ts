import { afterEach, describe, expect, test } from "bun:test";
import { readItem } from "#runtime/animate/options/options.ts";
import { readMore } from "#runtime/animate/options/trigger-options.ts";
import { readScroll } from "#runtime/animate/options/scroll-options.ts";
import { readAnimateConfig, setAnimateConfig } from "#runtime/animate/options/config.ts";
import {
  animateDefault,
  clearAnimateDefault,
  setAnimateDefault,
} from "#runtime/animate/options/defaults.ts";
import { EASE } from "#runtime/animate/modes/modes.ts";
import { MIDWAY, TURN } from "#runtime/animate/modes/midway-modes.ts";
import { SCROLL_AT } from "#runtime/animate/modes/scroll-modes.ts";
import { WHEN } from "#runtime/animate/modes/trigger.ts";

const fade = { 0: { opacity: 0 }, 1: { opacity: 1 } };
const base = { duration: 300 };

afterEach(() => {
  setAnimateConfig({});
  clearAnimateDefault();
});

function thrown(read: () => unknown): { code?: string; message: string; hint?: string } {
  try {
    read();
  } catch (error) {
    return error as { code?: string; message: string; hint?: string };
  }
  throw new Error("expected an error");
}

describe("config sets the defaults", () => {
  test("duration and delay", () => {
    setAnimateConfig({ duration: 500, delay: 40 });
    const timing = readItem({ style: fade }).timing;
    expect(timing.duration).toBe(500);
    expect(timing.delay).toBe(40);
  });

  test("keep", () => {
    setAnimateConfig({ keep: false });
    expect(readItem({ style: fade }).timing.keep).toBe(false);
  });

  test("ease, in parts", () => {
    setAnimateConfig({ ease: [EASE.STYLE.CUBIC] });
    expect(animateDefault().easeStyle).toBe(EASE.STYLE.CUBIC);
    expect(animateDefault().ease).toBe(EASE.INOUT);
  });

  test("view amount and margin", () => {
    setAnimateConfig({ view: { amount: 0.5, margin: 80 } });
    expect(readMore(WHEN.VIEW, undefined, base).view).toEqual({ rootMargin: "-80px", amount: 0.5 });
  });

  test("view reverse", () => {
    setAnimateConfig({ view: { reverse: true } });
    expect(readMore(WHEN.VIEW, undefined, base).reverse).toBe(true);
  });

  test("hover delays and outDuration", () => {
    setAnimateConfig({ hover: { inDelay: 10, outDelay: 20, outDuration: 90 } });
    const hover = readMore(WHEN.HOVER, undefined, base).hover;
    expect(hover.inDelay).toBe(10);
    expect(hover.outDelay).toBe(20);
    expect(hover.out).toBeUndefined();
  });

  test("hover outDuration applies to an out play, and the item's outDuration wins", () => {
    setAnimateConfig({ hover: { outDuration: 90 } });
    const out = { 0: { opacity: 1 }, 1: { opacity: 0 } };
    expect(readMore(WHEN.HOVER, { out }, base).hover.out?.duration).toBe(90);
    expect(readMore(WHEN.HOVER, { out, outDuration: 50 }, base).hover.out?.duration).toBe(50);
  });

  test("scroll start, end and part", () => {
    setAnimateConfig({
      scroll: { start: SCROLL_AT.CENTER, end: SCROLL_AT.LEAVE, part: [0.2, 0.8] },
    });
    const scroll = readScroll({});
    expect(scroll.range.start).toEqual({ element: 0.5, window: 0.5 });
    expect(scroll.part).toEqual([0.2, 0.8]);
  });

  test("attach default animateSpace is false", () => {
    expect(readItem({ style: fade, when: WHEN.ATTACH }).space).toBeUndefined();
  });

  test("detach default animateSpace is true", () => {
    expect(readItem({ style: fade, when: WHEN.DETACH }).space).toBeDefined();
  });

  test("attach animateSpace true turns attach space on", () => {
    setAnimateConfig({ attach: { animateSpace: true } });
    expect(readItem({ style: fade, when: WHEN.ATTACH }).space).toBeDefined();
  });

  test("detach animateSpace false turns detach space off", () => {
    setAnimateConfig({ detach: { animateSpace: false } });
    expect(readItem({ style: fade, when: WHEN.DETACH }).space).toBeUndefined();
  });

  test("attach config does not change detach", () => {
    setAnimateConfig({ attach: { animateSpace: true } });
    expect(readItem({ style: fade, when: WHEN.DETACH }).space).toBeDefined();
    setAnimateConfig({ attach: { animateSpace: false } });
    expect(readItem({ style: fade, when: WHEN.DETACH }).space).toBeDefined();
  });

  test("item more animateSpace overrides the attach config", () => {
    setAnimateConfig({ attach: { animateSpace: false } });
    const attach = (more: unknown) => ({ style: fade, when: WHEN.ATTACH, more }) as never;
    expect(readItem(attach({ animateSpace: true })).space).toBeDefined();
    setAnimateConfig({ attach: { animateSpace: true } });
    expect(readItem(attach({ animateSpace: false })).space).toBeUndefined();
  });

  test("midway play and turn", () => {
    setAnimateConfig({ midway: { play: MIDWAY.FINISH, turn: TURN.SMOOTH } });
    const midway = readItem({ style: fade }).timing.midway;
    expect(midway.play).toBe(MIDWAY.FINISH);
    expect(midway.turn).toBe(TURN.SMOOTH);
  });
});

describe("precedence", () => {
  test("an item value beats the config", () => {
    setAnimateConfig({ duration: 500 });
    expect(readItem({ style: fade, duration: 200 }).timing.duration).toBe(200);
  });

  test("an item midway beats the config midway", () => {
    setAnimateConfig({ midway: { play: MIDWAY.FINISH } });
    expect(readItem({ style: fade, midway: MIDWAY.SKIP }).timing.midway.play).toBe(MIDWAY.SKIP);
  });

  test("setAnimateDefault beats the config for the same field", () => {
    setAnimateConfig({ duration: 500, ease: [EASE.STYLE.CUBIC, EASE.OUT] });
    setAnimateDefault({ duration: 400, ease: [EASE.STYLE.QUAD] });
    expect(animateDefault().duration).toBe(400);
    expect(animateDefault().easeStyle).toBe(EASE.STYLE.QUAD);
    expect(animateDefault().ease).toBe(EASE.OUT);
  });

  test("setAnimateConfig again with the same value changes nothing", () => {
    setAnimateConfig({ duration: 500 });
    setAnimateConfig({ duration: 500 });
    expect(readItem({ style: fade }).timing.duration).toBe(500);
  });
});

describe("config validation", () => {
  test("an unknown key names the allowed keys and suggests the close one", () => {
    const error = thrown(() => readAnimateConfig({ duraton: 500 }));
    expect(error.code).toBe("L2066");
    expect(error.message).toBe(
      'animate config has an unknown key "duraton", use duration, delay, ease, keep, midway, view, hover, scroll, attach, detach, in or out',
    );
    expect(error.hint).toBe("did you mean 'duration'?");
  });

  test("the config must be an object", () => {
    expect(thrown(() => readAnimateConfig([])).code).toBe("L2065");
    expect(thrown(() => readAnimateConfig(null)).message).toBe(
      "animate config must be an object, got null",
    );
  });

  test("a section must be an object", () => {
    expect(thrown(() => readAnimateConfig({ view: 5 })).message).toBe(
      "animate view must be an object, got 5",
    );
  });

  test("a bad duration fails at config time", () => {
    const error = thrown(() => readAnimateConfig({ duration: -1 }));
    expect(error.code).toBe("L2003");
    expect(error.message).toBe("animate duration must be a time in ms, got -1");
  });

  test("keep must be a boolean", () => {
    const error = thrown(() => readAnimateConfig({ keep: "yes" }));
    expect(error.code).toBe("L2069");
    expect(error.message).toBe("animate keep must be true or false, got yes");
  });

  test("a midway turn function is not allowed in config", () => {
    expect(thrown(() => readAnimateConfig({ midway: { turn: () => 0 } })).code).toBe("L2026");
  });

  test("a bad view amount fails at config time", () => {
    expect(thrown(() => readAnimateConfig({ view: { amount: 2 } })).code).toBe("L2022");
  });

  test("a bad hover delay fails at config time", () => {
    expect(thrown(() => readAnimateConfig({ hover: { inDelay: -5 } })).message).toBe(
      "animate hover.inDelay must be a time in ms, got -5",
    );
  });

  test("a start equal to the end fails at config time", () => {
    expect(
      thrown(() =>
        readAnimateConfig({ scroll: { start: SCROLL_AT.CENTER, end: SCROLL_AT.CENTER } }),
      ).code,
    ).toBe("L2018");
  });

  test("a valid config is returned unchanged", () => {
    const config = { duration: 500, view: { amount: 0.5 }, in: "FADE_IN" as const };
    expect(readAnimateConfig(config)).toEqual(config);
  });
});
