import { describe, expect, test } from "bun:test";
import { formatBuildSteps, formatMs } from "#cli/build/timings.ts";

describe("formatMs", () => {
  test("one decimal below 10 ms, whole milliseconds above", () => {
    expect(formatMs(0.24)).toBe("0.2");
    expect(formatMs(9.96)).toBe("10.0");
    expect(formatMs(232.6)).toBe("233");
  });
});

describe("formatBuildSteps", () => {
  test("a table of the build steps in order", () => {
    const table = formatBuildSteps({
      compile: 12,
      sass: 30,
      bundle: 40,
      write: 2.5,
      copy: 0.4,
      total: 90,
    });
    const lines = table.split("\n");
    expect(lines[0]).toMatch(/^Step\s+Time$/);
    expect(lines.slice(2, -2).map((line) => line.split(/\s+/)[0])).toEqual([
      "compile",
      "sass",
      "bundle",
      "write",
      "copy",
    ]);
    expect(lines.at(-1)).toMatch(/^total\s+90 ms$/);
  });
});
