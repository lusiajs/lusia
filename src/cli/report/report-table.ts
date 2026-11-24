import { formatMs } from "../build/timings.ts";
import { formatSize } from "../log/size.ts";
import { ANSI } from "../log/color.ts";
import { styled } from "../log/style.ts";
import type { Column, ColumnField } from "./report-model.ts";
import type { VisibleRow } from "./report-rows.ts";
import { INVERSE } from "./report-style.ts";
import { fitWidth, padLeft, padRight, truncateLeft } from "./report-text.ts";

export interface TableFrame {
  columns: Column[];
  rows: VisibleRow[];
  scroll: number;
  selected: number;
  bodyHeight: number;
  width: number;
  color: boolean;
}

const LEAD = " ";
const GAP = "  ";
const RIGHT_PAD = " ";
const NAME_MIN_WIDTH = 8;
const NUMBER_FIELDS: ColumnField[] = ["ms", "bytes", "files"];

/** Header, body rows and a bottom-right "selected / total" line. Always `bodyHeight + 2` lines. */
export function renderTable(frame: TableFrame): string[] {
  const widths = columnWidths(frame.columns, frame.rows, frame.width);
  const labels = frame.columns.map((column) => column.label);
  const header = styled(cellsLine(labels, frame, widths), ANSI.bold, frame.color);
  const body = Array.from({ length: frame.bodyHeight }, (_, index) =>
    bodyLine(index, frame, widths),
  );
  return [header, ...body, countLine(frame)];
}

function bodyLine(index: number, frame: TableFrame, widths: number[]): string {
  const position = frame.scroll + index;
  const item = frame.rows[position];
  if (!item) return padLine("", frame.width);
  const text = cellsLine(cellTexts(item, frame.columns), frame, widths);
  return position === frame.selected ? styled(text, INVERSE, frame.color) : text;
}

function countLine(frame: TableFrame): string {
  const position = frame.rows.length === 0 ? 0 : frame.selected + 1;
  const text = `${position} / ${frame.rows.length}`;
  return padLine(padLeft(text, contentWidth(frame.width)), frame.width);
}

function cellsLine(cells: string[], frame: TableFrame, widths: number[]): string {
  const parts = frame.columns.map((column, index) =>
    formatCell(cells[index] ?? "", column, widths[index] ?? 0),
  );
  return padLine(LEAD + parts.join(GAP), frame.width);
}

/** Exactly `width` characters, with one space left before the right border. */
function padLine(text: string, width: number): string {
  if (width <= 0) return "";
  return fitWidth(text, contentWidth(width)) + RIGHT_PAD;
}

function contentWidth(width: number): number {
  return Math.max(0, width - RIGHT_PAD.length);
}

function formatCell(text: string, column: Column, width: number): string {
  if (column.field === "name") return padRight(truncateLeft(text, width), width);
  return NUMBER_FIELDS.includes(column.field) ? padLeft(text, width) : padRight(text, width);
}

function cellTexts(item: VisibleRow, columns: Column[]): string[] {
  return columns.map((column) => cellText(item, column));
}

function cellText(item: VisibleRow, column: Column): string {
  const { row } = item;
  if (column.field === "name") return `${nameIndent(item)}${nameMarker(item)}${row.name}`;
  if (column.field === "state") return row.state ?? "";
  if (column.field === "ms") return row.ms === undefined ? "" : `${formatMs(row.ms)} ms`;
  if (column.field === "bytes") return row.bytes === undefined ? "" : formatSize(row.bytes);
  return row.files === undefined ? "" : String(row.files);
}

function nameIndent(item: VisibleRow): string {
  return "  ".repeat(item.depth);
}

function nameMarker(item: VisibleRow): string {
  if (item.row.children === undefined || item.row.children.length === 0) return "";
  return item.expanded ? "▾ " : "▸ ";
}

export interface ColumnSpan {
  start: number;
  end: number;
}

/** Where each column's text sits on a table line, counted from the table's left edge. */
export function columnSpans(columns: Column[], rows: VisibleRow[], width: number): ColumnSpan[] {
  const spans: ColumnSpan[] = [];
  let start = LEAD.length;
  for (const columnWidth of columnWidths(columns, rows, width)) {
    spans.push({ start, end: start + columnWidth });
    start += columnWidth + GAP.length;
  }
  return spans;
}

function columnWidths(columns: Column[], rows: VisibleRow[], width: number): number[] {
  const widths = columns.map((column, index) => {
    if (index === 0) return 0;
    return Math.max(column.label.length, ...rows.map((item) => cellText(item, column).length));
  });
  const gaps = GAP.length * (columns.length - 1);
  const fixed = widths.reduce((total, columnWidth) => total + columnWidth, 0);
  const nameWidth = contentWidth(width) - LEAD.length - gaps - fixed;
  widths[0] = Math.max(NAME_MIN_WIDTH, nameWidth);
  return widths;
}
