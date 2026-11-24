import { describe, expect, test } from "bun:test";
import { formatHeader } from "#cli/log/dev-header.ts";
import { stripAnsi } from "#cli/log/color.ts";

const HEADER = {
  urls: [{ label: "Local", url: "http://localhost:3000/" }],
  version: "v0.1.1-beta",
  startup: { boot: 180, types: 5, sass: 830, compile: 170, bundle: 270, server: 40, total: 1495 },
  details: {},
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
        "|                                        |",
        "|   press h for shortcuts                |",
        "+----------------------------------------+",
      ].join("\n"),
    );
  });

  test("quiet shows only the total row and no hint", () => {
    const text = formatHeader({ ...HEADER, quiet: true, color: false });
    expect(text).not.toContain("boot");
    expect(text).not.toContain("|   ---");
    expect(text).not.toContain("press h");
    expect(text).toContain("|   total      1495 ms                   |");
  });

  test("a part's details sit under it, with tree pipes, in plain ASCII", () => {
    const text = formatHeader({
      ...HEADER,
      details: {
        boot: ["config 9 ms"],
        styles: ["145 blocks: 145 cached, 0 compiled"],
        bundle: ["412 modules (388 from packages), 2.3 MB", "last line"],
      },
      color: false,
    });
    expect(text).toContain("|   boot        180 ms");
    expect(text).toContain("|   | ` config 9 ms");
    expect(text).toContain("|   | ` 145 blocks: 145 cached, 0 compiled");
    expect(text).toContain("|   | | 412 modules (388 from packages), 2.3 MB");
    expect(text).toContain("|   | ` last line");
  });

  test("a single detail uses the box-drawing end mark when color is on", () => {
    const text = stripAnsi(
      formatHeader({ ...HEADER, details: { boot: ["config 9 ms"] }, color: true }),
    );
    expect(text).toContain("│   │ └ config 9 ms");
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
