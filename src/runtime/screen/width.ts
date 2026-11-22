import type { ScreenRange } from "./screens.ts";

export type WidthSpan = Pick<ScreenRange, "min" | "until">;

/** Neighbouring screens merge into one span, so PHONE and TABLET give one max-width query. */
export function joinedSpans(chosen: ScreenRange[]): WidthSpan[] {
  const spans: WidthSpan[] = [];
  for (const range of chosen) {
    const last = spans.at(-1);
    if (last && last.until === range.min) last.until = range.until;
    else spans.push({ min: range.min, until: range.until });
  }
  return spans;
}

// 0.02px below the next start avoids overlap at fractional widths, as Bootstrap does.
export function widthParts(span: WidthSpan): string[] {
  const parts: string[] = [];
  if (span.min > 0) parts.push(`(min-width: ${span.min}px)`);
  if (span.until !== Infinity) parts.push(`(max-width: ${span.until - 0.02}px)`);
  return parts;
}

/** A media query for one span. A span with no limits matches every width: "all". */
export function widthQuery(span: WidthSpan): string {
  return widthParts(span).join(" and ") || "all";
}
