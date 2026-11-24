import { describe, expect, test } from "bun:test";
import { buildStages } from "#cli/report/report-model.ts";
import { visibleRows } from "#cli/report/report-rows.ts";
import {
  followScroll,
  handleKey,
  initialState,
  type ReportState,
} from "#cli/report/report-state.ts";
import { fakeReport, fakeStartup } from "./fake-report.ts";

const stages = buildStages(fakeReport, fakeStartup);
const PAGE = 2;

function press(state: ReportState, key: Parameters<typeof handleKey>[2]): ReportState {
  const next = handleKey(state, stages, key, PAGE);
  if (next === "close") throw new Error("closed");
  return next;
}

function pressRight(times: number): ReportState {
  let state = initialState(stages);
  for (let index = 0; index < times; index += 1) state = press(state, "right");
  return state;
}

describe("initialState", () => {
  test("starts on the first stage, first row, default sorts and nothing expanded", () => {
    const state = initialState(stages);
    expect(state).toEqual({
      stage: 0,
      row: 0,
      scroll: 0,
      sorts: ["time", "time", "time", "size", "size", "time"],
      expanded: new Set(),
    });
  });
});

describe("stage keys", () => {
  test("right and tab move to the next stage, and wrap at the end", () => {
    let state = initialState(stages);
    state = press(state, "right");
    expect(state.stage).toBe(1);
    state = press(state, "tab");
    expect(state.stage).toBe(2);
    for (let index = 0; index < 4; index += 1) state = press(state, "tab");
    expect(state.stage).toBe(0);
  });

  test("left and shift-tab move back, and wrap at the start", () => {
    const state = press(initialState(stages), "left");
    expect(state.stage).toBe(5);
    expect(press(state, "shift-tab").stage).toBe(4);
  });

  test("changing stage resets the row and scroll", () => {
    const state = press({ ...initialState(stages), row: 1, scroll: 1 }, "right");
    expect(state.row).toBe(0);
    expect(state.scroll).toBe(0);
  });
});

describe("row keys", () => {
  const longStages = [
    {
      name: "long",
      columns: [{ label: "file", field: "name" as const }],
      rows: Array.from({ length: 10 }, (_, index) => ({ name: `row ${index}`, ms: 10 - index })),
      sorts: ["time" as const],
    },
  ];

  function move(state: ReportState, key: Parameters<typeof handleKey>[2]): ReportState {
    const next = handleKey(state, longStages, key, PAGE);
    if (next === "close") throw new Error("closed");
    return next;
  }

  test("up and down move one row and stop at the ends", () => {
    let state = initialState(longStages);
    state = move(state, "up");
    expect(state.row).toBe(0);
    state = move(state, "j");
    state = move(state, "down");
    expect(state.row).toBe(2);
    state = move(state, "k");
    expect(state.row).toBe(1);
  });

  test("page keys move by the page height and stay in range", () => {
    let state = move(initialState(longStages), "pagedown");
    expect(state.row).toBe(PAGE);
    state = move(state, "pagedown");
    state = move(state, "pagedown");
    state = move(state, "pagedown");
    state = move(state, "pagedown");
    expect(state.row).toBe(9);
    state = move(state, "pageup");
    expect(state.row).toBe(7);
  });

  test("scroll follows the selected row", () => {
    const state = move(move(initialState(longStages), "pagedown"), "pagedown");
    expect(state.scroll).toBe(3);
  });

  test("a short stage clamps the page move to its last row", () => {
    expect(press(initialState(stages), "pagedown").row).toBe(1);
  });
});

describe("followScroll", () => {
  test("keeps the row inside the window", () => {
    expect(followScroll(0, 5, 3)).toBe(3);
    expect(followScroll(4, 1, 3)).toBe(1);
    expect(followScroll(2, 3, 3)).toBe(2);
  });
});

describe("sort key", () => {
  test("s cycles the sorts of the current stage only", () => {
    let state = press(initialState(stages), "right");
    state = press(state, "right");
    expect(state.sorts[2]).toBe("time");
    state = press(state, "s");
    expect(state.sorts[2]).toBe("size");
    state = press(state, "s");
    expect(state.sorts[2]).toBe("name");
    state = press(state, "s");
    expect(state.sorts[2]).toBe("time");
    expect(state.sorts[0]).toBe("time");
  });

  test("s on the styles stage cycles time and name", () => {
    const styles = press(initialState(stages), "right");
    expect(press(styles, "s").sorts[1]).toBe("name");
    expect(press(press(styles, "s"), "s").sorts[1]).toBe("time");
  });

  test("s on the bundle stage changes the order of the rows", () => {
    const bundle = pressRight(3);
    expect(bundle.sorts[3]).toBe("size");
    const sorted = press(bundle, "s");
    expect(sorted.sorts[3]).toBe("name");
    expect(visibleRows(stages[3]!, sorted)[0]?.row.name).toBe("lib");
  });
});

describe("expand", () => {
  function bundleState(): ReportState {
    return pressRight(3);
  }

  test("enter opens a package and shows its files indented under it", () => {
    const state = press(bundleState(), "enter");
    const rows = visibleRows(stages[3]!, state);
    expect(rows.map((item) => [item.row.name, item.depth])).toEqual([
      ["lib", 0],
      ["node_modules/lib/index.js", 1],
      ["node_modules/lib/util.js", 1],
      ["src/A.lusia", 0],
    ]);
  });

  test("enter again closes the package", () => {
    const state = press(press(bundleState(), "enter"), "enter");
    expect(visibleRows(stages[3]!, state)).toHaveLength(2);
  });

  test("enter on a row without children does nothing", () => {
    const state = bundleState();
    expect(press(state, "down")).toEqual({ ...state, row: 1, scroll: 0 });
    expect(press(press(state, "down"), "enter").expanded.size).toBe(0);
  });
});

describe("close", () => {
  test("escape and d close the report", () => {
    expect(handleKey(initialState(stages), stages, "escape", PAGE)).toBe("close");
    expect(handleKey(initialState(stages), stages, "d", PAGE)).toBe("close");
  });
});
