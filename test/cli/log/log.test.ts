import { describe, expect, test } from "bun:test";
import { categoryCode, categoryHue, pastelForHue } from "#cli/log/color.ts";
import { createLogger, defaultLogOptions, type LogOptions } from "#cli/log/log.ts";

const ANSI = /\x1b\[[0-9;]*m/g;
const NOW = new Date(2026, 0, 2, 3, 4, 5);

function capture(color: boolean) {
  const lines: string[] = [];
  const options: LogOptions = { color, write: (line) => lines.push(line), now: () => NOW };
  return { lines, logger: createLogger("build", options) };
}

describe("logger", () => {
  test("writes time, level and category without color", () => {
    const { lines, logger } = capture(false);
    logger.warn("disk is slow");
    expect(lines).toEqual(["03:04:05 WARN  [build] disk is slow"]);
  });

  test("adds color codes when color is on, and the text stays the same", () => {
    const { lines, logger } = capture(true);
    logger.error("boom");
    expect(lines[0]).toContain("\x1b[");
    expect(lines[0]!.replace(ANSI, "")).toBe("03:04:05 ERROR [build] boom");
  });

  test("uses the same category color every time", () => {
    expect(categoryHue("build")).toBe(categoryHue("build"));
    const { lines, logger } = capture(true);
    logger.info("one");
    logger.info("two");
    const tag = categoryCode("build");
    expect(lines[0]).toContain(`${tag}[build]`);
    expect(lines[1]).toContain(`${tag}[build]`);
  });

  test("category colors are pastel: every channel is high", () => {
    for (let hue = 0; hue < 360; hue += 30) {
      expect(Math.min(...pastelForHue(hue))).toBeGreaterThanOrEqual(150);
    }
  });

  test("NO_COLOR and a non-terminal turn color off", () => {
    expect(defaultLogOptions({}, true).color).toBe(true);
    expect(defaultLogOptions({ NO_COLOR: "1" }, true).color).toBe(false);
    expect(defaultLogOptions({}, false).color).toBe(false);
    expect(defaultLogOptions({ NO_COLOR: "" }, true).color).toBe(true);
  });
});
