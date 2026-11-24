import { describe, expect, test } from "bun:test";
import { formatHeader } from "#cli/log/dev-header.ts";
import { stripAnsi } from "#cli/log/color.ts";

const HEADER = {
  urls: [{ label: "Local", url: "http://localhost:3000/" }],
  version: "v0.1.1-beta",
  startup: { boot: 180, types: 5, sass: 830, compile: 170, bundle: 270, server: 40, total: 1495 },
  quiet: false,
  watching: "src/",
  width: 80,
};

describe("formatHeader", () => {
  test("a box in plain ASCII when color is off", () => {
    expect(formatHeader({ ...HEADER, color: false })).toBe(
      [
        "+- lusia dev -------------- v0.1.1-beta -+",
        "|                                        |",
        "|   ➜  Local    http://localhost:3000/   |",
        "|                                        |",
        "|   watching src/                        |",
        "|                                        |",
        "|   boot        180 ms                   |",
        "|   types         5 ms                   |",
        "|   styles      830 ms                   |",
        "|   compile     170 ms                   |",
        "|   bundle      270 ms                   |",
        "|   server       40 ms                   |",
        "|   ------------------                   |",
        "|   total      1495 ms                   |",
        "+----------------------------------------+",
      ].join("\n"),
    );
  });

  test("quiet shows only the total row", () => {
    const text = formatHeader({ ...HEADER, quiet: true, color: false });
    expect(text).not.toContain("boot");
    expect(text).not.toContain("|   ---");
    expect(text).toContain("|   total      1495 ms                   |");
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
