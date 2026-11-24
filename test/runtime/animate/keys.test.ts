import { describe, expect, test } from "bun:test";
import { prepareTimeline, type Keyframes } from "#runtime/animate/options/keyframes.ts";
import { readItem } from "#runtime/animate/options/options.ts";
import { withWhere } from "#runtime/errors.ts";
import { EASE } from "#runtime/animate/modes/modes.ts";
import { ON } from "#runtime/animate/modes/trigger.ts";

const { QUART } = EASE.STYLE;
const frames = { 0: { opacity: 0 }, 1: { opacity: 1 } };

function thrown(read: () => unknown): { code?: string; hint?: string; message: string } {
  try {
    read();
  } catch (error) {
    return error as { code?: string; hint?: string; message: string };
  }
  throw new Error("expected an error");
}

describe("unknown keyframes keys", () => {
  test("a typo of ease names the key and suggests ease", () => {
    const bad = { eas: [QUART, EASE.OUT], ...frames } as unknown as Keyframes;
    const error = thrown(() => prepareTimeline(bad));
    expect(error.code).toBe("L2054");
    expect(error.message).toBe(
      "unknown keyframes key 'eas'. Keys are numbers from 0 to 1 or 'ease'",
    );
    expect(error.hint).toBe("did you mean 'ease'?");
  });

  test("the old default key throws L2083 and names ease", () => {
    const old = { default: [QUART, EASE.OUT], ...frames } as unknown as Keyframes;
    const error = thrown(() => prepareTimeline(old));
    expect(error.code).toBe("L2083");
    expect(error.message).toBe("keyframes default was renamed to ease");
  });

  test("a key far from every name gives the plain hint", () => {
    const bad = { banana: 1, ...frames } as unknown as Keyframes;
    expect(thrown(() => prepareTimeline(bad)).hint).toBe("Use a number from 0 to 1, or 'ease'.");
  });

  test("a dev location for the key is used instead of the attribute's", () => {
    const bad = { eas: 1, ...frames } as unknown as Keyframes;
    const keys = { eas: "src/Card.lusia:3:9" };
    const error = withWhere("src/Card.lusia:12:4", () => thrown(() => prepareTimeline(bad)), keys);
    expect(error).toMatchObject({ file: "src/Card.lusia", line: 3, column: 9 });
  });
});

describe("unknown animate item keys", () => {
  test("a typo of an item key suggests the right key", () => {
    const error = thrown(() => readItem({ play: frames, durtion: 400 } as never));
    expect(error.code).toBe("L2055");
    expect(error.message).toBe("unknown animate key 'durtion'");
    expect(error.hint).toBe("did you mean 'duration'?");
  });

  test("a valid item gives no error", () => {
    expect(() => readItem({ play: frames, duration: 400 })).not.toThrow();
  });
});

describe("ON.DETACH options animateSpace", () => {
  const detach = (options: unknown) => ({ play: frames, on: ON.DETACH, options }) as never;

  test("animateSpace must be true or false", () => {
    const error = thrown(() => readItem(detach({ animateSpace: "yes" })));
    expect(error.code).toBe("L2056");
    expect(error.message).toBe("animate options animateSpace must be true or false, got yes");
  });

  test("a misspelled animateSpace names the right key", () => {
    expect(thrown(() => readItem(detach({ animateSpce: true }))).hint).toBe(
      "did you mean 'animateSpace'?",
    );
  });

  test("animateSpace defaults to false, so a DETACH item has no space spec", () => {
    expect(readItem(detach(undefined)).space).toBeUndefined();
  });

  test("animateSpace: false gives a DETACH item no space spec", () => {
    expect(readItem(detach({ animateSpace: false })).space).toBeUndefined();
  });

  test("animateSpace: true gives a DETACH item a space spec", () => {
    expect(readItem(detach({ animateSpace: true })).space).toEqual({
      duration: 300,
      delay: 0,
      keyframes: frames,
    });
    expect(readItem(detach({ animateSpace: true })).options.space).toEqual({ animateSpace: true });
  });
});
