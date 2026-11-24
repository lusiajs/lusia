import { describe, expect, test } from "bun:test";
import type { BuildReport } from "#cli/build/build-report.ts";
import { formatReport } from "#cli/log/dev-report.ts";
import { stripAnsi } from "#cli/log/color.ts";

const REPORT: BuildReport = {
  root: "/app",
  styles: [
    { file: "/app/src/Card.lusia", index: 0, cached: true, ms: 0 },
    { file: "/app/src/Nav.lusia", index: 0, cached: false, ms: 12.4 },
  ],
  compiles: [
    { file: "/app/src/Card.lusia", ms: 3, bytes: 800, cached: false },
    { file: "/app/src/Nav.lusia", ms: 9, bytes: 2400, cached: false },
  ],
  modules: [
    { path: "/app/node_modules/@codemirror/view/index.js", bytes: 600_000 },
    { path: "/app/node_modules/@codemirror/view/style.js", bytes: 10_000 },
    { path: "/app/src/Card.lusia", bytes: 2_048 },
  ],
  outputs: [
    { path: "./index.html", bytes: 900 },
    { path: "./index.js", bytes: 2_400_000 },
  ],
};

const STARTUP = { boot: 180, configMs: 9, server: 11, total: 314 };

/** Plain text with runs of spaces squeezed, so the checks do not depend on padding. */
function squeezed(text: string): string {
  return stripAnsi(text).replace(/ {2,}/g, " ");
}

describe("formatReport", () => {
  test("lists each section as a tree block with plain tree marks", () => {
    const text = squeezed(formatReport(REPORT, STARTUP, false));
    expect(text).toContain("boot\n | start 180 ms\n ` config 9.0 ms");
    expect(text).toContain(
      "styles\n | src/Card.lusia:0 cached 0.0 ms\n ` src/Nav.lusia:0 compiled 12 ms",
    );
    expect(text).toContain("server\n | server 11 ms\n ` total 314 ms");
  });

  test("compile lists the slowest file first", () => {
    const text = squeezed(formatReport(REPORT, STARTUP, false));
    expect(text).toContain("compile\n | src/Nav.lusia 9.0 ms\n ` src/Card.lusia 3.0 ms");
  });

  test("bundle groups packages and lists app files one by one", () => {
    const text = squeezed(formatReport(REPORT, STARTUP, false));
    expect(text).toContain("@codemirror/view 2 files 595.7 KB");
    expect(text).toContain("src/Card.lusia 2.0 KB");
  });

  test("outputs list each file with its size, largest first", () => {
    const text = squeezed(formatReport(REPORT, STARTUP, false));
    expect(text).toContain("outputs\n | ./index.js 2.3 MB\n ` ./index.html 900 B");
  });

  test("outputs list the largest file first", () => {
    const report = {
      ...REPORT,
      outputs: [
        { path: "./small.css", bytes: 900 },
        { path: "./index.js", bytes: 2_400_000 },
        { path: "./map.json", bytes: 40_000 },
      ],
    };
    const text = squeezed(formatReport(report, STARTUP, false));
    expect(text).toContain(
      "outputs\n | ./index.js 2.3 MB\n | ./map.json 39.1 KB\n ` ./small.css 900 B",
    );
  });

  test("an empty section says none", () => {
    const text = squeezed(formatReport({ ...REPORT, styles: [] }, STARTUP, false));
    expect(text).toContain("styles\n ` none");
  });

  test("the config row shows only when the config time is known", () => {
    const text = formatReport(REPORT, { ...STARTUP, configMs: undefined }, false);
    expect(text).not.toContain("config");
  });

  test("color adds codes and keeps the text", () => {
    const colored = formatReport(REPORT, STARTUP, true);
    expect(colored).toContain("\x1b[");
    expect(stripAnsi(colored)).toContain("│ start 180 ms\n          └ config 9.0 ms");
  });
});
