import { describe, expect, test } from "bun:test";
import { formatHeader } from "#cli/log/dev-header.ts";
import { stripAnsi } from "#cli/log/color.ts";

const HEADER = {
  urls: [{ label: "Local", url: "http://localhost:3000/" }],
  version: "v0.1.1-beta",
  readyMs: 622.4,
  watching: "src/",
  width: 80,
};

describe("formatHeader", () => {
  test("a box in plain ASCII when color is off", () => {
    expect(formatHeader({ ...HEADER, color: false })).toBe(
      [
        "+- lusia dev --------------- v0.1.1-beta -+",
        "|                                         |",
        "|   ➜  Local    http://localhost:3000/    |",
        "|                                         |",
        "|   ready in 622 ms   ·   watching src/   |",
        "+-----------------------------------------+",
      ].join("\n"),
    );
  });

  test("every line has the same width", () => {
    const lines = formatHeader({ ...HEADER, color: false }).split("\n");
    expect(new Set(lines.map((line) => line.length)).size).toBe(1);
  });

  test("color adds codes and keeps the text", () => {
    const colored = formatHeader({ ...HEADER, color: true });
    expect(colored).toContain("\x1b[");
    expect(stripAnsi(colored)).toContain("➜  Local    http://localhost:3000/");
  });
});
