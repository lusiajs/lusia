import { ANSI, stripAnsi } from "../log/color.ts";
import { renderTree } from "../log/dev-tree.ts";
import { styled } from "../log/style.ts";

export type KeyAction = "report" | "reload" | "open" | "urls" | "clear" | "help";

export interface Shortcut {
  key: string;
  action: KeyAction;
  label: string;
  /** Short label for the grid on start. */
  short: string;
}

export const SHORTCUTS: Shortcut[] = [
  { key: "d", action: "report", label: "open the build report", short: "build report" },
  { key: "r", action: "reload", label: "rebuild and reload the page", short: "rebuild and reload" },
  {
    key: "o",
    action: "open",
    label: "open the Local URL in the browser",
    short: "open in browser",
  },
  { key: "u", action: "urls", label: "show the URLs again", short: "show URLs" },
  { key: "c", action: "clear", label: "clear the terminal", short: "clear terminal" },
  { key: "h", action: "help", label: "list these shortcuts", short: "show these keys" },
];

const STOP_LABEL = { key: "ctrl+c", label: "stop" };
const KEY_WIDTH = 8;
const GRID_INDENT = "  ";
const GRID_GAP = "    ";
const GRID_MAX_COLUMNS = 3;
const KEY_SEPARATOR = "  ";
const CELL_WIDTH =
  1 + KEY_SEPARATOR.length + Math.max(...SHORTCUTS.map((item) => item.short.length));

export function formatShortcuts(color: boolean): string {
  const rows = [...SHORTCUTS, STOP_LABEL].map(
    ({ key, label }) => `${key.padEnd(KEY_WIDTH)}${label}`,
  );
  return renderTree(styled("keys", ANSI.bold, color), rows, color);
}

export function formatShortcutGrid(width: number, color: boolean): string {
  const columns = gridColumns(width);
  const cells = SHORTCUTS.map((item) => formatCell(item, color));
  const lines: string[] = [];
  for (let start = 0; start < cells.length; start += columns) {
    lines.push(gridLine(cells.slice(start, start + columns)));
  }
  lines.push(formatStopLine(color));
  return lines.join("\n");
}

function formatStopLine(color: boolean): string {
  return `${GRID_INDENT}${styled(STOP_LABEL.key, ANSI.bold, color)}${KEY_SEPARATOR}${styled(STOP_LABEL.label, ANSI.dim, color)}`;
}

function gridColumns(width: number): number {
  const fitting = Math.floor(
    (width - GRID_INDENT.length + GRID_GAP.length) / (CELL_WIDTH + GRID_GAP.length),
  );
  return Math.max(1, Math.min(GRID_MAX_COLUMNS, fitting));
}

function formatCell({ key, short }: Shortcut, color: boolean): string {
  return `${styled(key, ANSI.bold, color)}${KEY_SEPARATOR}${styled(short, ANSI.dim, color)}`;
}

function gridLine(cells: string[]): string {
  const last = cells.length - 1;
  const padded = cells.map((cell, index) => (index === last ? cell : padVisible(cell, CELL_WIDTH)));
  return `${GRID_INDENT}${padded.join(GRID_GAP)}`;
}

function padVisible(text: string, width: number): string {
  return `${text}${" ".repeat(Math.max(0, width - stripAnsi(text).length))}`;
}
