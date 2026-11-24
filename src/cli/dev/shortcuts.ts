import { ANSI } from "../log/color.ts";
import { renderTree } from "../log/dev-tree.ts";
import { styled } from "../log/style.ts";

export type KeyAction = "report" | "reload" | "open" | "urls" | "clear" | "help";

export interface Shortcut {
  key: string;
  action: KeyAction;
  label: string;
}

export const SHORTCUTS: Shortcut[] = [
  { key: "d", action: "report", label: "open the build report" },
  { key: "r", action: "reload", label: "rebuild and reload the page" },
  { key: "o", action: "open", label: "open the Local URL in the browser" },
  { key: "u", action: "urls", label: "show the URLs again" },
  { key: "c", action: "clear", label: "clear the terminal" },
  { key: "h", action: "help", label: "list these shortcuts" },
];

const STOP_LABEL = { key: "ctrl+c", label: "stop" };
const KEY_WIDTH = 8;

export function formatShortcuts(color: boolean): string {
  const rows = [...SHORTCUTS, STOP_LABEL].map(
    ({ key, label }) => `${key.padEnd(KEY_WIDTH)}${label}`,
  );
  return renderTree(styled("keys", ANSI.bold, color), rows, color);
}
