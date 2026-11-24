import { describe, expect, test } from "bun:test";
import { formatShortcuts, SHORTCUTS } from "#cli/dev/shortcuts.ts";

describe("SHORTCUTS", () => {
  test("each key is used once", () => {
    const keys = SHORTCUTS.map((shortcut) => shortcut.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("formatShortcuts", () => {
  test("lists each key with its label, and ctrl+c last, as a tree block", () => {
    const text = formatShortcuts(false);
    expect(text.startsWith("keys\n")).toBe(true);
    expect(text).toContain("| d       deep report of the last build");
    expect(text).toContain("| h       list these shortcuts");
    expect(text).toContain("` ctrl+c  stop");
  });
});
