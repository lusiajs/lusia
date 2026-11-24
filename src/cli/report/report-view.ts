import { ANSI } from "../log/color.ts";
import { styled } from "../log/style.ts";
import type { Stage, SortKey } from "./report-model.ts";
import { reportLayout, type ReportLayout } from "./report-layout.ts";
import { visibleRows } from "./report-rows.ts";
import { renderStageList } from "./report-stages.ts";
import { renderTable } from "./report-table.ts";
import { followScroll, type ReportState } from "./report-state.ts";
import { fitWidth, padRight } from "./report-text.ts";

const TITLE = " lusia build report";
const HELP_KEYS = " ↑↓ move  ←→ stage  s sort  enter expand  esc close";
const HELP = `${HELP_KEYS}  click/wheel`;
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
  const layout = reportLayout(stages, width, height);
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

function renderPanel(
  stages: Stage[],
  state: ReportState,
  layout: ReportLayout,
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
  layout: ReportLayout,
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
