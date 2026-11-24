import { describe, expect, test } from "bun:test";
import { buildStages } from "#cli/report/report-model.ts";
import { hitTest, mouseAction, reportLayout } from "#cli/report/report-layout.ts";
import { initialState, type ReportState } from "#cli/report/report-state.ts";
import type { MouseEvent } from "#cli/report/terminal-mouse.ts";
import { fakeReport, fakeStartup } from "./fake-report.ts";

const stages = buildStages(fakeReport, fakeStartup);
const WIDTH = 80;
const HEIGHT = 20;
const { tableLeft, rightWidth } = reportLayout(stages, WIDTH, HEIGHT);
const ROW_TOP = 3;
const HEADER_Y = 2;
const LAST_SCREEN_LINE = HEIGHT - 1;

function hit(x: number, y: number, state: ReportState = initialState(stages)) {
  return hitTest(x, y, WIDTH, HEIGHT, stages, state);
}

describe("hitTest at 80x20", () => {
  test("a stage line picks that stage", () => {
    expect(hit(1, HEADER_Y)).toEqual({ area: "stage", index: 0 });
    expect(hit(1, HEADER_Y + 5)).toEqual({ area: "stage", index: 5 });
  });

  test("a stage line below the last stage picks nothing", () => {
    expect(hit(1, HEADER_Y + stages.length)).toBeUndefined();
  });

  test("the left border and the gap between the panels pick nothing", () => {
    expect(hit(0, HEADER_Y)).toBeUndefined();
    expect(hit(tableLeft - 1, HEADER_Y)).toBeUndefined();
  });

  test("the table header picks the column under the pointer", () => {
    expect(hit(tableLeft + 1, HEADER_Y)).toEqual({ area: "header", column: 0 });
    expect(hit(tableLeft + rightWidth - 2, HEADER_Y)).toEqual({ area: "header", column: 1 });
  });

  test("the space before the first column picks nothing", () => {
    expect(hit(tableLeft, HEADER_Y)).toBeUndefined();
  });

  test("a body line picks the row on that line", () => {
    expect(hit(tableLeft + 1, ROW_TOP)).toEqual({ area: "row", index: 0 });
    expect(hit(tableLeft + 1, ROW_TOP + 1)).toEqual({ area: "row", index: 1 });
  });

  test("a body line with no row picks nothing", () => {
    expect(hit(tableLeft + 1, ROW_TOP + 2)).toBeUndefined();
  });

  test("the count line, the title and the help line pick nothing", () => {
    expect(hit(tableLeft + 1, ROW_TOP + 14)).toBeUndefined();
    expect(hit(5, 0)).toBeUndefined();
    expect(hit(5, LAST_SCREEN_LINE)).toBeUndefined();
  });
});

describe("mouseAction", () => {
  const state = initialState(stages);

  function act(kind: MouseEvent["kind"], x = 1, y = HEADER_Y) {
    return mouseAction({ kind, x, y }, WIDTH, HEIGHT, stages, state);
  }

  test("wheel turns become wheel actions", () => {
    expect(act("wheel-up")).toEqual({ area: "wheel", direction: -1 });
    expect(act("wheel-down")).toEqual({ area: "wheel", direction: 1 });
  });

  test("a left press acts on what it hits", () => {
    expect(act("press")).toEqual({ area: "stage", index: 0 });
  });

  test("releases do nothing", () => {
    expect(act("release")).toBeUndefined();
  });
});
