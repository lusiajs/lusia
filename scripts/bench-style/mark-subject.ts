import { splitTopLevel, subjectStart } from "../../src/compiler/style/selector.ts";

// The first pseudo class or pseudo element of the subject ends the compound, so the marker goes before it.
function firstPseudoIndex(selector: string, start: number): number | undefined {
  let depth = 0;
  for (let i = start; i < selector.length; i++) {
    const ch = selector[i]!;
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    else if (depth === 0 && ch === ":") return i;
  }
  return undefined;
}

export function markSubject(selector: string, marker: string): string {
  const start = subjectStart(selector);
  const point = firstPseudoIndex(selector, start) ?? selector.length;
  return `${selector.slice(0, point)}${marker}${selector.slice(point)}`;
}

export function markSelectorList(list: string, marker: string): string {
  return splitTopLevel(list, ",")
    .map((selector) => markSubject(selector, marker))
    .join(", ");
}
