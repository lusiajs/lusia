import { describe, expect, test } from "bun:test";
import { buildStages, type Stage } from "#cli/report/report-model.ts";
import { handleMouse } from "#cli/report/report-mouse.ts";
import { initialState, type ReportState } from "#cli/report/report-state.ts";
import { fakeReport, fakeStartup } from "./fake-report.ts";

const stages = buildStages(fakeReport, fakeStartup);
const PAGE = 2;
const COMPILE_STAGE = 2;

const packageStages: Stage[] = [
  {
    name: "packages",
    columns: [{ label: "package", field: "name" }],
    rows: [
      { name: "a", ms: 5, children: [{ name: "a/x", ms: 1 }] },
      { name: "b", ms: 9 },
    ],
    sorts: ["time", "name"],
  },
];

const longStages: Stage[] = [
  {
    name: "long",
    columns: [{ label: "file", field: "name" }],
    rows: Array.from({ length: 10 }, (_, index) => ({ name: `row ${index}` })),
    sorts: ["name"],
  },
];

function compileState(): ReportState {
  return { ...initialState(stages), stage: COMPILE_STAGE };
}

describe("handleMouse", () => {
  test("a stage click selects that stage and resets the row", () => {
    const start = { ...initialState(stages), row: 1, scroll: 1 };
    const state = handleMouse(start, stages, { area: "stage", index: 2 }, PAGE);
    expect(state.stage).toBe(2);
    expect(state.row).toBe(0);
    expect(state.scroll).toBe(0);
  });

  test("a click on a row without children selects it and expands nothing", () => {
    const state = handleMouse(
      initialState(packageStages),
      packageStages,
      { area: "row", index: 0 },
      PAGE,
    );
    expect(state.row).toBe(0);
    expect(state.expanded.size).toBe(0);
  });

  test("clicking a package row expands it, and clicking it again collapses it", () => {
    const start = initialState(packageStages);
    const first = handleMouse(start, packageStages, { area: "row", index: 1 }, PAGE);
    expect(first.expanded.has("packages/a")).toBe(true);
    const second = handleMouse(first, packageStages, { area: "row", index: 1 }, PAGE);
    expect(second.expanded.size).toBe(0);
  });

  test("clicking a column header sorts by it when the stage supports that sort", () => {
    const sized = handleMouse(compileState(), stages, { area: "header", column: 3 }, PAGE);
    expect(sized.sorts[COMPILE_STAGE]).toBe("size");
    const named = handleMouse(sized, stages, { area: "header", column: 0 }, PAGE);
    expect(named.sorts[COMPILE_STAGE]).toBe("name");
  });

  test("clicking the active sort keeps it", () => {
    const timed = handleMouse(compileState(), stages, { area: "header", column: 2 }, PAGE);
    expect(timed.sorts[COMPILE_STAGE]).toBe("time");
  });

  test("clicking a column the stage cannot sort by changes nothing", () => {
    const state = initialState(stages);
    expect(handleMouse(state, stages, { area: "header", column: 0 }, PAGE)).toBe(state);
  });

  test("the wheel moves the selection three rows and keeps it on screen", () => {
    const start = initialState(longStages);
    const down = handleMouse(start, longStages, { area: "wheel", direction: 1 }, PAGE);
    expect(down.row).toBe(3);
    expect(down.scroll).toBe(2);
    const up = handleMouse(down, longStages, { area: "wheel", direction: -1 }, PAGE);
    expect(up.row).toBe(0);
  });
});
