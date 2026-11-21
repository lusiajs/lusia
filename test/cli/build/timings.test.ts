import { describe, expect, test } from "bun:test";
import { formatBrowserReady, formatBuildSteps, formatMs, formatRebuild } from "#cli/build/timings.ts";

const STEPS = { wait: 15.2, sass: 3.1, compile: 1.4, bundle: 8.3, send: 0.2, total: 232.6 };

describe("formatMs", () => {
  test("one decimal below 10 ms, whole milliseconds above", () => {
    expect(formatMs(0.24)).toBe("0.2");
    expect(formatMs(9.96)).toBe("10.0");
    expect(formatMs(232.6)).toBe("233");
  });
});

describe("formatRebuild", () => {
  test("one compact line with the steps and the update kind", () => {
    expect(formatRebuild(STEPS, "css swap", false)).toBe(
      "rebuilt in 233 ms  wait 15 · sass 3.1 · compile 1.4 · bundle 8.3 · send 0.2  (css swap)",
    );
  });

  test("colors only when asked, and keeps the same text", () => {
    const colored = formatRebuild(STEPS, "reload", true);
    expect(colored).toContain("\x1b[");
    expect(colored.replace(/\x1b\[[0-9;]*m/g, "")).toBe(formatRebuild(STEPS, "reload", false));
  });
});

describe("formatBrowserReady", () => {
  test("reports the time from the rebuild to the page's ready report", () => {
    expect(formatBrowserReady(180.4, false)).toBe("browser ready in 180 ms");
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
