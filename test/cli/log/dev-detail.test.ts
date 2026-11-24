import { describe, expect, test } from "bun:test";
import { emptyReport } from "#cli/build/build-report.ts";
import { startupDetails } from "#cli/log/dev-detail.ts";

const STARTUP = { boot: 180, configMs: 9.4, total: 314 };

describe("startupDetails", () => {
  test("summarises styles, compiles and the bundle in one line each", () => {
    const report = {
      ...emptyReport("/app"),
      styles: [
        { file: "/app/a.lusia", index: 0, cached: true, ms: 0 },
        { file: "/app/b.lusia", index: 0, cached: false, ms: 4 },
      ],
      compiles: [
        { file: "/app/a.lusia", ms: 2, bytes: 300, cached: false },
        { file: "/app/Features.lusia", ms: 9, bytes: 1200, cached: false },
      ],
      modules: [
        { path: "/app/node_modules/lib/index.js", bytes: 100 },
        { path: "/app/src/Card.lusia", bytes: 100 },
      ],
      outputs: [
        { path: "./index.js", bytes: 2_411_724 },
        { path: "./index.js.map", bytes: 9_000_000 },
      ],
    };
    expect(startupDetails(report, STARTUP)).toEqual({
      boot: ["config 9 ms"],
      styles: ["2 blocks: 1 cached, 1 compiled"],
      compile: ["2 files: 0 cached, 2 compiled, slowest Features.lusia 9 ms"],
      bundle: ["2 modules (1 from packages), 2.3 MB"],
    });
  });

  test("cached files count apart, and the slowest is picked among compiled files only", () => {
    const report = {
      ...emptyReport("/app"),
      compiles: [
        { file: "/app/a.lusia", ms: 0, bytes: 1, cached: true },
        { file: "/app/b.lusia", ms: 0, bytes: 1, cached: true },
        { file: "/app/c.lusia", ms: 5, bytes: 1, cached: false },
      ],
    };
    expect(startupDetails(report, STARTUP).compile).toEqual([
      "3 files: 2 cached, 1 compiled, slowest c.lusia 5 ms",
    ]);
  });

  test("no slowest file is shown when every file came from the cache", () => {
    const report = {
      ...emptyReport("/app"),
      compiles: [{ file: "/app/a.lusia", ms: 0, bytes: 1, cached: true }],
    };
    expect(startupDetails(report, STARTUP).compile).toEqual(["1 file: 1 cached, 0 compiled"]);
  });

  test("a single block, file or module is not pluralised", () => {
    const report = {
      ...emptyReport("/app"),
      styles: [{ file: "/app/a.lusia", index: 0, cached: true, ms: 0 }],
      compiles: [{ file: "/app/a.lusia", ms: 2, bytes: 300, cached: false }],
      modules: [{ path: "/app/src/a.lusia", bytes: 1 }],
      outputs: [{ path: "./index.js", bytes: 1 }],
    };
    const details = startupDetails(report, STARTUP);
    expect(details.styles).toEqual(["1 block: 1 cached, 0 compiled"]);
    expect(details.compile).toEqual(["1 file: 0 cached, 1 compiled, slowest a.lusia 2 ms"]);
    expect(details.bundle).toEqual(["1 module (0 from packages), 1 B"]);
  });

  test("parts with nothing to say get no lines, and no config line without a config time", () => {
    const details = startupDetails(emptyReport("/app"), { total: 1 });
    expect(details).toEqual({ boot: [], styles: [], compile: [], bundle: [] });
  });
});
