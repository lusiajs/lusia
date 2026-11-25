import { groupEnd } from "#compiler/hot/group.ts";
import { lastSignificant, nextSignificant, skipCode } from "./mask.ts";

const NAME_START = /[A-Za-z_$]/;
const OPENERS = "([{<";
const CLOSERS = ")]}>";

/** If an `interface` or `type` declaration starts at `pos`, the index just past it. Otherwise -1. */
export function typeDeclarationEnd(code: string, pos: number, word: string): number {
  if (word !== "interface" && word !== "type") return -1;
  if (!startsStatement(code, pos)) return -1;
  const name = nextSignificant(code, pos + word.length);
  if (!NAME_START.test(code.charAt(name))) return -1;
  if (word === "interface") {
    const open = code.indexOf("{", name);
    return open === -1 ? -1 : groupEnd(code, open);
  }
  return aliasEnd(code, name);
}

function startsStatement(code: string, pos: number): boolean {
  const index = lastSignificant(code, pos);
  if (index < 0 || ";{}".includes(code.charAt(index))) return true;
  return /\b(?:export|declare)$/.test(code.slice(Math.max(0, index - 6), index + 1));
}

/** The end of a type alias: a `;`, or a line end that does not continue into a union or intersection. */
function aliasEnd(code: string, start: number): number {
  let depth = 0;
  for (let pos = start; pos < code.length; ) {
    const next = skipCode(code, pos);
    if (next !== pos) {
      pos = next;
      continue;
    }
    const ch = code.charAt(pos);
    if (depth === 0 && ch === ";") return pos + 1;
    if (depth === 0 && ch === "\n" && !continuesType(code, pos)) return pos;
    if (OPENERS.includes(ch) && code.charAt(pos - 1) !== "=") depth++;
    if (CLOSERS.includes(ch) && code.charAt(pos - 1) !== "=") depth--;
    pos++;
  }
  return code.length;
}

function continuesType(code: string, newline: number): boolean {
  return "|&".includes(code.charAt(nextSignificant(code, newline)));
}
