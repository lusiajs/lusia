import type { RenderedStyle } from "./types.ts";

/** One style per component id, in first-seen order. Every route renders the same components. */
export function sharedStyles(lists: RenderedStyle[][]): RenderedStyle[] {
  const byId = new Map<string, RenderedStyle>();
  for (const style of lists.flat()) if (!byId.has(style.id)) byId.set(style.id, style);
  return [...byId.values()];
}

export function styleSheet(styles: RenderedStyle[]): string {
  return styles.map((style) => `/* lusia:${style.id} */\n${style.css}`).join("\n");
}

export function styleFileName(sheet: string): string {
  return `lusia-${Bun.hash(sheet).toString(36).slice(0, 8)}.css`;
}
