import { skipNonCode } from "#compiler/hot/group.ts";

const REGEX_AFTER = new Set(["(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "<", ">", "~", "^"]);
const REGEX_KEYWORD = /\b(?:return|typeof|case|in|of|delete|void|throw|new)$/;
const FLAG = /[\w$]/;

function blank(text: string): string {
  return text.replace(/[^\n]/g, " ");
}

export function maskNonCode(text: string): string {
  let out = "";
  for (let pos = 0; pos < text.length; ) {
    const next = skipCode(text, pos);
    if (next === pos) {
      out += text.charAt(pos);
      pos++;
    } else {
      out += blank(text.slice(pos, next));
      pos = next;
    }
  }
  return out;
}

export function blankRange(text: string, start: number, end: number): string {
  return text.slice(0, start) + blank(text.slice(start, end)) + text.slice(end);
}

/** If a string, comment or regex literal starts at `pos`, the index just past it. Otherwise `pos` itself. */
export function skipCode(text: string, pos: number): number {
  const next = skipNonCode(text, pos);
  return next === pos ? skipRegex(text, pos) : next;
}

/** If a regex literal starts at `pos` (a `/` where a value may begin), the index just past it and its flags. */
export function skipRegex(text: string, pos: number): number {
  if (text.charAt(pos) !== "/" || !startsRegex(text, pos)) return pos;
  let inClass = false;
  for (let index = pos + 1; index < text.length; index++) {
    const ch = text.charAt(index);
    if (ch === "\\") index++;
    else if (ch === "[") inClass = true;
    else if (ch === "]") inClass = false;
    else if (ch === "\n") return index;
    else if (ch === "/" && !inClass) return flagsEnd(text, index + 1);
  }
  return text.length;
}

function flagsEnd(text: string, pos: number): number {
  let index = pos;
  while (FLAG.test(text.charAt(index))) index++;
  return index;
}

function startsRegex(text: string, pos: number): boolean {
  const index = lastSignificant(text, pos);
  if (index < 0 || REGEX_AFTER.has(text.charAt(index))) return true;
  return REGEX_KEYWORD.test(text.slice(Math.max(0, index - 10), index + 1));
}

/** Index of the last non-space character before `pos`, or -1. */
export function lastSignificant(text: string, pos: number): number {
  let index = pos - 1;
  while (index >= 0 && /\s/.test(text.charAt(index))) index--;
  return index;
}

/** Index of the first non-space character at or after `pos`. */
export function nextSignificant(text: string, pos: number): number {
  let index = pos;
  while (index < text.length && /\s/.test(text.charAt(index))) index++;
  return index;
}
