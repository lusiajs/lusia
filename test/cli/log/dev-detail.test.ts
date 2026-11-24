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
        { file: "/app/a.lusia", ms: 2, bytes: 300 },
        { file: "/app/Features.lusia", ms: 9, bytes: 1200 },
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
      compile: ["2 files, slowest Features.lusia 9 ms"],
      bundle: ["2 modules (1 from packages), 2.3 MB"],
    });
  });

  test("a single block, file or module is not pluralised", () => {
    const report = {
      ...emptyReport("/app"),
      styles: [{ file: "/app/a.lusia", index: 0, cached: true, ms: 0 }],
      compiles: [{ file: "/app/a.lusia", ms: 2, bytes: 300 }],
      modules: [{ path: "/app/src/a.lusia", bytes: 1 }],
      outputs: [{ path: "./index.js", bytes: 1 }],
    };
    const details = startupDetails(report, STARTUP);
    expect(details.styles).toEqual(["1 block: 1 cached, 0 compiled"]);
    expect(details.compile).toEqual(["1 file, slowest a.lusia 2 ms"]);
    expect(details.bundle).toEqual(["1 module (0 from packages), 1 B"]);
  });

  test("parts with nothing to say get no lines, and no config line without a config time", () => {
    const details = startupDetails(emptyReport("/app"), { total: 1 });
    expect(details).toEqual({ boot: [], styles: [], compile: [], bundle: [] });
  });
});
