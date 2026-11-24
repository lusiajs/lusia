import type { Stage } from "./report-model.ts";
import { visibleRows, type VisibleRow } from "./report-rows.ts";
import { followScroll, type ReportState } from "./report-state.ts";
import { stageListLayout } from "./report-stages.ts";
import { columnSpans, type ColumnSpan } from "./report-table.ts";
import type { MouseEvent } from "./terminal-mouse.ts";

const TITLE_LINES = 1;
const FOOTER_LINES = 1;
const BORDER_LINES = 1;
const BORDER_COLUMNS = 1;
const BOX_CHROME_LINES = 4;
const BOX_CHROME_COLUMNS = 3;
const TABLE_EXTRA_LINES = 2;
const HEADER_LINE = 0;

export interface ReportLayout {
  contentTop: number;
  bodyHeight: number;
  innerHeight: number;
  stageLeft: number;
  leftWidth: number;
  tableLeft: number;
  rightWidth: number;
}

export type ReportHit =
  | { area: "stage"; index: number }
  | { area: "row"; index: number }
  | { area: "header"; column: number };

export type MouseAction = ReportHit | { area: "wheel"; direction: -1 | 1 };

/** Table rows that fit on a screen of `height` lines. */
export function reportBodyHeight(height: number): number {
  return Math.max(1, height - TITLE_LINES - FOOTER_LINES - BOX_CHROME_LINES);
}

export function reportLayout(stages: Stage[], width: number, height: number): ReportLayout {
  const bodyHeight = reportBodyHeight(height);
  const leftWidth = Math.min(
    stageListLayout(stages).width,
    Math.max(0, width - BOX_CHROME_COLUMNS),
  );
  return {
    contentTop: TITLE_LINES + BORDER_LINES,
    bodyHeight,
    innerHeight: bodyHeight + TABLE_EXTRA_LINES,
    stageLeft: BORDER_COLUMNS,
    leftWidth,
    tableLeft: BORDER_COLUMNS + leftWidth + BORDER_COLUMNS,
    rightWidth: Math.max(0, width - BOX_CHROME_COLUMNS - leftWidth),
  };
}

/** What a mouse event points at on a screen of `width` x `height`, or undefined for empty space. */
export function hitTest(
  x: number,
  y: number,
  width: number,
  height: number,
  stages: Stage[],
  state: ReportState,
): ReportHit | undefined {
  const layout = reportLayout(stages, width, height);
  const line = y - layout.contentTop;
  if (line < 0 || line >= layout.innerHeight) return undefined;
  if (isWithin(x, layout.stageLeft, layout.leftWidth)) return stageHit(line, stages.length);
  if (isWithin(x, layout.tableLeft, layout.rightWidth)) {
    return tableHit(x - layout.tableLeft, line, layout, stages, state);
  }
  return undefined;
}

/** A mouse event as a report action. Only left presses and wheel turns act. */
export function mouseAction(
  event: MouseEvent,
  width: number,
  height: number,
  stages: Stage[],
  state: ReportState,
): MouseAction | undefined {
  if (event.kind === "wheel-up") return { area: "wheel", direction: -1 };
  if (event.kind === "wheel-down") return { area: "wheel", direction: 1 };
  if (event.kind !== "press") return undefined;
  return hitTest(event.x, event.y, width, height, stages, state);
}

function isWithin(x: number, start: number, length: number): boolean {
  return x >= start && x < start + length;
}

function stageHit(line: number, stageCount: number): ReportHit | undefined {
  return line < stageCount ? { area: "stage", index: line } : undefined;
}

function tableHit(
  localX: number,
  line: number,
  layout: ReportLayout,
  stages: Stage[],
  state: ReportState,
): ReportHit | undefined {
  const stage = stages[state.stage];
  if (!stage) return undefined;
  const rows = visibleRows(stage, state);
  if (line === HEADER_LINE) return headerHit(localX, stage, rows, layout.rightWidth);
  return rowHit(line - HEADER_LINE - 1, layout, rows, state);
}

function headerHit(
  localX: number,
  stage: Stage,
  rows: VisibleRow[],
  width: number,
): ReportHit | undefined {
  const column = columnAt(columnSpans(stage.columns, rows, width), localX);
  return column === -1 ? undefined : { area: "header", column };
}

function columnAt(spans: ColumnSpan[], localX: number): number {
  return spans.findIndex((span) => isWithin(localX, span.start, span.end - span.start));
}

function rowHit(
  bodyIndex: number,
  layout: ReportLayout,
  rows: VisibleRow[],
  state: ReportState,
): ReportHit | undefined {
  if (bodyIndex >= layout.bodyHeight) return undefined;
  const index = followScroll(state.scroll, state.row, layout.bodyHeight) + bodyIndex;
  return index < rows.length ? { area: "row", index } : undefined;
}
