import { lastSignificant, nextSignificant } from "./mask.ts";

/** A name that labels a member or a case, such as `id:` or `id?:`, rather than reading a prop. */
export function isKeyName(code: string, pos: number, word: string): boolean {
  const after = nextSignificant(code, pos + word.length);
  const colon = code.charAt(after) === "?" ? nextSignificant(code, after + 1) : after;
  if (code.charAt(colon) !== ":") return false;
  return !followsTernary(code, pos) && !followsCase(code, pos);
}

function followsTernary(code: string, pos: number): boolean {
  return code.charAt(lastSignificant(code, pos)) === "?";
}

function followsCase(code: string, pos: number): boolean {
  const index = lastSignificant(code, pos);
  return /\bcase$/.test(code.slice(Math.max(0, index - 4), index + 1));
}
