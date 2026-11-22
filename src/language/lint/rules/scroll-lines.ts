import type { LintContext, LintFinding } from "../types.ts";

// Flags every old WHEN.SCROLL start or end form: a number, SCROLL_AT or { element, window }.
const OLD_FORM_LINE = /\b(start|end)\s*:\s*(-?\d|SCROLL_AT\b|\{)/g;

export function scrollLines({ source }: LintContext): LintFinding[] {
  if (!source.includes("WHEN.SCROLL")) return [];
  return [...source.matchAll(OLD_FORM_LINE)].map((match) => ({
    offset: match.index,
    code: "scroll-old-form",
    message: `${match[1]} must be a pair [element edge, screen edge]. Write ${match[1]}: [EDGE.TOP, EDGE.BOTTOM].`,
    severity: "error",
  }));
}
