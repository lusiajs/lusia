import { describe, expect, test } from "bun:test";
import { startupRows } from "#cli/log/dev-timing.ts";
import { stripAnsi } from "#cli/log/color.ts";

const STEPS = {
  boot: 180,
  types: 5,
  sass: 830,
  compile: 170,
  bundle: 270,
  server: 40,
  total: 1495,
};

describe("startupRows", () => {
  test("detail lines follow their part, with the last one marked as the end", () => {
    expect(startupRows(STEPS, false, { compile: ["3 files", "x"] })).toEqual([
      "boot        180 ms",
      "types         5 ms",
      "styles      830 ms",
      "compile     170 ms",
      "  | 3 files",
      "  ` x",
      "bundle      270 ms",
      "server       40 ms",
      "------------------",
      "total      1495 ms",
    ]);
  });

  test("lists the parts in startup order, then a rule and the total", () => {
    expect(startupRows(STEPS, false)).toEqual([
      "boot        180 ms",
      "types         5 ms",
      "styles      830 ms",
      "compile     170 ms",
      "bundle      270 ms",
      "server       40 ms",
      "------------------",
      "total      1495 ms",
    ]);
  });

  test("shows the cache row after types", () => {
    expect(startupRows({ ...STEPS, cache: 12 }, false).slice(0, 3)).toEqual([
      "boot        180 ms",
      "types         5 ms",
      "cache        12 ms",
    ]);
  });

  test("hides parts that round to zero", () => {
    const rows = startupRows({ ...STEPS, types: 0.4, server: 0 }, false);
    expect(rows.some((row) => row.startsWith("types"))).toBe(false);
    expect(rows.some((row) => row.startsWith("server"))).toBe(false);
  });

  test("a part with no time still shows its detail, such as a compile that was all cached", () => {
    const rows = startupRows({ total: 9, compile: 0 }, false, {
      compile: ["2 files: 2 cached, 0 compiled"],
    });
    expect(rows).toEqual([
      "compile       0 ms",
      "  ` 2 files: 2 cached, 0 compiled",
      "-".repeat(18),
      "total         9 ms",
    ]);
  });

  test("shows only the total when no part has time", () => {
    expect(startupRows({ total: 12 }, false)).toEqual(["total        12 ms"]);
  });

  test("uses a box rule and keeps the text when color is on", () => {
    const rows = startupRows(STEPS, true);
    expect(rows.some((row) => row.includes("\x1b["))).toBe(true);
    expect(stripAnsi(rows.at(-2) ?? "")).toBe("─".repeat(18));
    expect(stripAnsi(rows.at(-1) ?? "")).toBe("total      1495 ms");
  });
});
