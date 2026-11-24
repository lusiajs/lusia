import { describe, expect, test } from "bun:test";
import { readItem } from "#runtime/animate/options/options.ts";
import { ON } from "#runtime/animate/modes/trigger.ts";

const play = { 0: { opacity: 0 }, 1: { opacity: 1 } };

describe("removed on values", () => {
  test("an on key with no value is an old name and throws L2044", () => {
    const old = { play, on: (ON as Record<string, unknown>).IN as undefined };
    expect(() => readItem(old as never)).toThrow("were renamed");
  });

  test("a missing on key still defaults to ON.ATTACH", () => {
    expect(readItem({ play }).on).toBe(ON.ATTACH);
  });
});
