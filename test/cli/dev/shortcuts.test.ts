import { describe, expect, test } from "bun:test";
import { formatShortcutGrid, formatShortcuts, SHORTCUTS } from "#cli/dev/shortcuts.ts";

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
    expect(text).toContain("| d       open the build report");
    expect(text).toContain("| h       list these shortcuts");
    expect(text).toContain("` ctrl+c  stop");
  });
});

describe("formatShortcutGrid", () => {
  test("lays the keys out in three columns at 100 columns, ctrl+c last", () => {
    expect(formatShortcutGrid(100, false)).toBe(
      [
        "  d  build report          r  rebuild and reload    o  open in browser",
        "  u  show URLs             c  clear terminal        h  show these keys",
        "  ctrl+c  stop",
      ].join("\n"),
    );
  });

  test("drops to one column on a narrow terminal", () => {
    expect(formatShortcutGrid(40, false)).toBe(
      [
        "  d  build report",
        "  r  rebuild and reload",
        "  o  open in browser",
        "  u  show URLs",
        "  c  clear terminal",
        "  h  show these keys",
        "  ctrl+c  stop",
      ].join("\n"),
    );
  });

  test("keeps the same text with color on", () => {
    const colored = formatShortcutGrid(100, true);
    expect(colored).toContain("\x1b[1md\x1b[0m");
    expect(colored).toContain("\x1b[90mbuild report\x1b[0m");
    expect(colored.replace(/\x1b\[[0-9;]*m/g, "")).toBe(formatShortcutGrid(100, false));
  });
});
