import { afterEach, describe, expect, test } from "bun:test";
import { readItem } from "#runtime/animate/options/options.ts";
import { setAnimateConfig } from "#runtime/animate/options/config.ts";
import { PRESET } from "#runtime/animate/options/presets.ts";
import { ON } from "#runtime/animate/modes/trigger.ts";

const fade = { 0: { opacity: 0 }, 1: { opacity: 1 } };

afterEach(() => setAnimateConfig({}));

/** An item with a trigger and no play, the case the preset fallback covers. */
function readPlayless(on: unknown) {
  return readItem({ on } as never);
}

function thrownCode(read: () => unknown): string | undefined {
  try {
    read();
  } catch (error) {
    return (error as { code?: string }).code;
  }
  throw new Error("expected an error");
}

describe("preset fallback for an item with no play", () => {
  test("an ATTACH item uses the config in preset", () => {
    setAnimateConfig({ in: "FADE_IN" });
    expect(readPlayless(ON.ATTACH).keyframes).toBe(PRESET.FADE_IN);
  });

  test("a VIEW item uses the config in preset", () => {
    setAnimateConfig({ in: "SLIDE_UP" });
    expect(readPlayless(ON.VIEW).keyframes).toBe(PRESET.SLIDE_UP);
  });

  test("a DETACH item uses the config out preset, not in", () => {
    setAnimateConfig({ in: "FADE_IN", out: "FADE_OUT" });
    expect(readPlayless(ON.DETACH).keyframes).toBe(PRESET.FADE_OUT);
  });

  test("a DETACH item with only in set has no preset and fails", () => {
    setAnimateConfig({ in: "FADE_IN" });
    expect(thrownCode(() => readPlayless(ON.DETACH))).toBe("L2001");
  });

  test("an item's own play wins over the config preset", () => {
    setAnimateConfig({ in: "FADE_IN" });
    expect(readItem({ play: fade }).keyframes).toBe(fade);
  });

  test("without a config preset a missing style is still an error", () => {
    expect(thrownCode(() => readPlayless(ON.ATTACH))).toBe("L2001");
  });

  test("a layout trigger with no style is unchanged", () => {
    setAnimateConfig({ in: "FADE_IN" });
    expect(() => readPlayless(ON.MOVE)).not.toThrow();
    expect(readPlayless(ON.MOVE).keyframes).not.toBe(PRESET.FADE_IN);
  });
});
