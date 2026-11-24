import { describe, expect, test } from "bun:test";
import { buildStages } from "#cli/report/report-model.ts";
import { fakeReport, fakeStartup } from "./fake-report.ts";

describe("buildStages", () => {
  const stages = buildStages(fakeReport, fakeStartup);

  test("lists the six stages in order", () => {
    expect(stages.map((stage) => stage.name)).toEqual([
      "boot",
      "styles",
      "compile",
      "bundle",
      "outputs",
      "server",
    ]);
  });

  test("sums the time of styles and compile, and keeps the bundle time from startup", () => {
    const byName = Object.fromEntries(stages.map((stage) => [stage.name, stage.ms]));
    expect(byName).toEqual({
      boot: 24,
      styles: 10.5,
      compile: 15.1,
      bundle: 148,
      outputs: undefined,
      server: 10,
    });
  });

  test("boot has start and config rows", () => {
    const boot = stages[0];
    expect(boot?.rows.map((row) => row.name)).toEqual(["start", "config"]);
  });

  test("styles show the relative file, the cache state and the time", () => {
    const styles = stages[1];
    expect(styles?.rows[0]).toEqual({ name: "src/A.lusia:0", state: "cached", ms: 1 });
    expect(styles?.rows[1]?.state).toBe("compiled");
  });

  test("compile rows carry time and size, relative to the root", () => {
    expect(stages[2]?.rows[0]).toEqual({
      name: "src/A.lusia",
      state: "compiled",
      ms: 3.1,
      bytes: 1200,
    });
  });

  test("bundle has one row per package with its files as children, then the app files", () => {
    const bundle = stages[3];
    expect(bundle?.rows).toEqual([
      {
        name: "lib",
        files: 2,
        bytes: 6000,
        children: [
          { name: "node_modules/lib/index.js", bytes: 5000 },
          { name: "node_modules/lib/util.js", bytes: 1000 },
        ],
      },
      { name: "src/A.lusia", bytes: 2000 },
    ]);
  });

  test("outputs are relative to the root and carry their size", () => {
    expect(stages[4]?.rows).toEqual([{ name: "dist/app.js", bytes: 9000 }]);
  });

  test("each stage lists its sort keys, the first one being the default", () => {
    expect(stages.map((stage) => stage.sorts)).toEqual([
      ["time"],
      ["time", "name"],
      ["time", "size", "name"],
      ["size", "name"],
      ["size", "name"],
      ["time"],
    ]);
  });
});
