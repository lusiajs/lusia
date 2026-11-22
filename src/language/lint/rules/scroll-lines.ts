import type { LintContext, LintFinding } from "../types.ts";

// The old forms: a number, a SCROLL_AT member or an { element, window } object.
const OLD_FORM_LINE = /\b(start|end)\s*:\s*(-?\d|SCROLL_AT\b|\{)/g;

export function scrollLines({ source }: LintContext): LintFinding[] {
  if (!source.includes("WHEN.SCROLL")) return [];
  return [...source.matchAll(OLD_FORM_LINE)].map((match) => ({
    offset: match.index,
    code: "scroll-numeric-line",
    message: `${match[1]} must be a pair [element edge, screen edge]. Write ${match[1]}: [EDGE.TOP, EDGE.BOTTOM].`,
    severity: "error",
  }));
}
