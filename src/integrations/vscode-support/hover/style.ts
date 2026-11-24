import { findApiById } from "../api-lookup.ts";
import type { HoverResult } from "../hover.ts";

const STYLE_TOKENS: Array<[string, string]> = [
  ["@scoped", "scoped"],
  ["@global", "global"],
  [":global(", "inline-global"],
];

export function styleHover(text: string, offset: number): HoverResult | undefined {
  const id = styleTokenAt(text, offset);
  const entry = id ? findApiById(id) : undefined;
  return entry ? { kind: "api", entry } : undefined;
}

/** The api id of a style token (`@scoped`, `@global`, `:global(`) under the cursor, if any. */
function styleTokenAt(text: string, offset: number): string | undefined {
  const lineStart = offset > 0 ? text.lastIndexOf("\n", offset - 1) + 1 : 0;
  const lineEndIndex = text.indexOf("\n", offset);
  const line = text.slice(lineStart, lineEndIndex === -1 ? text.length : lineEndIndex);
  for (const [token, id] of STYLE_TOKENS) {
    if (tokenCovers(line, token, offset - lineStart)) return id;
  }
  return undefined;
}

function tokenCovers(line: string, token: string, column: number): boolean {
  let at = line.indexOf(token);
  while (at !== -1) {
    if (column >= at && column <= at + token.length) return true;
    at = line.indexOf(token, at + 1);
  }
  return false;
}
