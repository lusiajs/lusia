import { ANSI } from "../log/color.ts";
import { styled } from "../log/style.ts";
import type { Stage, SortKey } from "./report-model.ts";
import { visibleRows } from "./report-rows.ts";
import { renderStageList, stageListLayout } from "./report-stages.ts";
import { renderTable } from "./report-table.ts";
import { followScroll, type ReportState } from "./report-state.ts";
import { fitWidth, padRight } from "./report-text.ts";

const TITLE = " lusia build report";
const HELP = " ↑↓ move  ←→ / tab switch stage  s sort  enter expand package  esc close";
const TITLE_LINES = 1;
const FOOTER_LINES = 1;
const BOX_CHROME_LINES = 4;
const BOX_CHROME_COLUMNS = 3;
const SORT_ARROWS: Record<SortKey, string> = { time: "▼", size: "▼", name: "▲" };

interface BoxChars {
  horizontal: string;
  vertical: string;
  topLeft: string;
  topJoin: string;
  topRight: string;
  bottomLeft: string;
  bottomJoin: string;
  bottomRight: string;
}

const UNICODE_BOX: BoxChars = {
  horizontal: "─",
  vertical: "│",
  topLeft: "┌",
  topJoin: "┬",
  topRight: "┐",
  bottomLeft: "└",
  bottomJoin: "┴",
  bottomRight: "┘",
};

const PLAIN_BOX: BoxChars = {
  horizontal: "-",
  vertical: "|",
  topLeft: "+",
  topJoin: "+",
  topRight: "+",
  bottomLeft: "+",
  bottomJoin: "+",
  bottomRight: "+",
};

/** Exactly `height` lines, each at most `width` characters. */
export function renderReport(
  stages: Stage[],
  state: ReportState,
  width: number,
  height: number,
  color: boolean,
): string[] {
  const layout = renderLayout(stages, state, width, height);
  const box = color ? UNICODE_BOX : PLAIN_BOX;
  const stageLines = renderStageList(
    stages,
    state.stage,
    layout.innerHeight,
    layout.leftWidth,
    color,
  );
  const tableLines = renderPanel(stages, state, layout, color);
  const boxLines = stageLines.map((stageLine, index) =>
    [box.vertical, stageLine, box.vertical, tableLines[index] ?? "", box.vertical].join(""),
  );
  const lines = [
    titleLine(state, width, color),
    horizontalLine(box, layout, box.topLeft, box.topJoin, box.topRight),
    ...boxLines,
    horizontalLine(box, layout, box.bottomLeft, box.bottomJoin, box.bottomRight),
    styled(fitWidth(HELP, width), ANSI.dim, color),
  ];
  return fitLines(lines, height, width);
}

interface Layout {
  bodyHeight: number;
  innerHeight: number;
  leftWidth: number;
  rightWidth: number;
}

/** Table rows that fit on a screen of `height` lines. */
export function reportBodyHeight(height: number): number {
  return Math.max(1, height - TITLE_LINES - FOOTER_LINES - BOX_CHROME_LINES);
}

function renderLayout(stages: Stage[], state: ReportState, width: number, height: number): Layout {
  const bodyHeight = reportBodyHeight(height);
  const leftWidth = Math.min(
    stageListLayout(stages).width,
    Math.max(0, width - BOX_CHROME_COLUMNS),
  );
  return {
    bodyHeight,
    innerHeight: bodyHeight + 2,
    leftWidth,
    rightWidth: Math.max(0, width - BOX_CHROME_COLUMNS - leftWidth),
  };
}

function renderPanel(
  stages: Stage[],
  state: ReportState,
  layout: Layout,
  color: boolean,
): string[] {
  const stage = stages[state.stage];
  if (!stage) return [];
  const rows = visibleRows(stage, state);
  return renderTable({
    columns: stage.columns,
    rows,
    scroll: followScroll(state.scroll, state.row, layout.bodyHeight),
    selected: state.row,
    bodyHeight: layout.bodyHeight,
    width: layout.rightWidth,
    color,
  });
}

function horizontalLine(
  box: BoxChars,
  layout: Layout,
  left: string,
  join: string,
  right: string,
): string {
  return [
    left,
    box.horizontal.repeat(layout.leftWidth),
    join,
    box.horizontal.repeat(layout.rightWidth),
    right,
  ].join("");
}

function titleLine(state: ReportState, width: number, color: boolean): string {
  const sort = state.sorts[state.stage] ?? "name";
  const sortLabel = `sort: ${sort} ${SORT_ARROWS[sort]}   (s)`;
  const gap = padRight(TITLE, Math.max(TITLE.length, width - sortLabel.length));
  return styled(fitWidth(gap + sortLabel, width), ANSI.bold, color);
}

function fitLines(lines: string[], height: number, width: number): string[] {
  const blank = fitWidth("", width);
  return Array.from({ length: height }, (_, index) => lines[index] ?? blank);
}
