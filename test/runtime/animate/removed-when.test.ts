import { describe, expect, test } from "bun:test";
import { readItem } from "#runtime/animate/options/options.ts";
import { WHEN } from "#runtime/animate/modes/trigger.ts";

const style = { 0: { opacity: 0 }, 1: { opacity: 1 } };

describe("removed when values", () => {
  test("a when key with no value is an old name and throws L2044", () => {
    const old = { style, when: (WHEN as Record<string, unknown>).IN as undefined };
    expect(() => readItem(old as never)).toThrow("were renamed");
  });

  test("a missing when key still defaults to WHEN.ATTACH", () => {
    expect(readItem({ style }).when).toBe(WHEN.ATTACH);
  });
});
