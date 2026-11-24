import { describe, expect, test } from "bun:test";
import { areaOf, slowestReport, timeByArea } from "../../scripts/check-report.ts";

describe("areaOf", () => {
  test("groups a test file by its first two folders under test/", () => {
    expect(areaOf("test/runtime/animate/animate.test.ts")).toBe("runtime/animate");
  });

  test("keeps one folder when the file has only one", () => {
    expect(areaOf("test/cli/args.test.ts")).toBe("cli");
  });

  test("uses test for a file directly under test/", () => {
    expect(areaOf("test/setup.test.ts")).toBe("test");
  });

  test("puts every examples file in one area", () => {
    expect(areaOf("examples/stress/animate/animate.test.ts")).toBe("examples");
  });

  test("ignores a leading ./", () => {
    expect(areaOf("./test/cli/dev/dev.test.ts")).toBe("cli/dev");
  });
});

describe("timeByArea", () => {
  test("sums file times and counts files per area, slowest area first", () => {
    const areas = timeByArea([
      { label: "test/cli/dev/a.test.ts", ms: 1000 },
      { label: "test/cli/dev/b.test.ts", ms: 500 },
      { label: "test/runtime/animate/c.test.ts", ms: 4000 },
      { label: "examples/stress/d.test.ts", ms: 2000 },
    ]);
    expect(areas).toEqual([
      { area: "runtime/animate", ms: 4000, files: 1 },
      { area: "examples", ms: 2000, files: 1 },
      { area: "cli/dev", ms: 1500, files: 2 },
    ]);
  });

  test("returns no areas for no files", () => {
    expect(timeByArea([])).toEqual([]);
  });
});

describe("slowestReport", () => {
  test("prints the area table before the slowest files and tests", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="bun test" tests="2" time="5">
  <testsuite name="test/runtime/animate/a.test.ts" file="test/runtime/animate/a.test.ts" tests="1" time="4">
    <testcase name="fast path" classname="x" time="3.5" file="test/runtime/animate/a.test.ts" />
  </testsuite>
  <testsuite name="test/cli/dev/b.test.ts" file="test/cli/dev/b.test.ts" tests="1" time="1">
    <testcase name="builds" classname="x" time="0.5" file="test/cli/dev/b.test.ts" />
  </testsuite>
</testsuites>`;
    expect(slowestReport(xml)).toBe(`time by area
  runtime/animate     4.0s  1 file
  cli/dev             1.0s  1 file

slowest test files
  4.0s  test/runtime/animate/a.test.ts
  1.0s  test/cli/dev/b.test.ts

slowest tests
  3.5s  a.test.ts > fast path
  0.5s  b.test.ts > builds`);
  });

  test("returns an empty report without file suites", () => {
    expect(slowestReport("<testsuites></testsuites>")).toBe("");
  });
});
