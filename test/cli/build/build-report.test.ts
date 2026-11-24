import { describe, expect, test } from "bun:test";
import { emptyReport, recordBundle, recordCompile } from "#cli/build/build-report.ts";

describe("recordCompile", () => {
  test("adds the file's compile time and each Sass block with its file", () => {
    const report = emptyReport("/app");
    recordCompile(report, "/app/Card.lusia", 4, 120, [{ index: 0, cached: true, ms: 0 }]);
    expect(report.compiles).toEqual([{ file: "/app/Card.lusia", ms: 4, bytes: 120 }]);
    expect(report.styles).toEqual([{ file: "/app/Card.lusia", index: 0, cached: true, ms: 0 }]);
  });
});

describe("recordBundle", () => {
  test("makes module paths absolute and keeps output sizes", () => {
    const report = emptyReport("/app");
    const result = {
      metafile: { inputs: { "src/Card.lusia": { bytes: 10 } } },
      outputs: [{ path: "./index.js", size: 20 }],
    } as unknown as Bun.BuildOutput;
    recordBundle(report, result);
    expect(report.modules).toEqual([{ path: `${process.cwd()}/src/Card.lusia`, bytes: 10 }]);
    expect(report.outputs).toEqual([{ path: "./index.js", bytes: 20 }]);
  });
});
