import { lusiaError } from "../errors/create.ts";
import type { StyleBranch } from "../parse/style-branches.ts";
import {
  REDUCED_MOTION,
  screenRanges,
  type ScreenRange,
  type Screens,
} from "#runtime/screen/screens.ts";

const SCREEN_TEST = /^SCREEN\.([A-Z][A-Z0-9_]*)$/;

type Motion = "any" | "reduce" | "no-preference" | "never";

/** Where a style applies: a set of screen names, and the motion setting. */
interface Where {
  sizes: Set<string>;
  motion: Motion;
}

/**
 * The media query for a style inside IF branches. Undefined when the style always applies.
 * An empty string means it never applies.
 */
export function screenMedia(branches: StyleBranch[], screens: Screens): string | undefined {
  if (branches.length === 0) return undefined;
  const ranges = screenRanges(screens);
  const where: Where = { sizes: new Set(ranges.map((range) => range.name)), motion: "any" };
  for (const branch of branches) narrow(where, branch, ranges);
  return mediaText(where, ranges);
}

function narrow(where: Where, branch: StyleBranch, ranges: ScreenRange[]): void {
  for (const earlier of branch.earlier) exclude(where, screenName(earlier, ranges));
  if (branch.test !== undefined) include(where, screenName(branch.test, ranges));
}

function screenName(test: string, ranges: ScreenRange[]): string {
  const name = SCREEN_TEST.exec(test)?.[1];
  if (name === undefined) throw lusiaError("L1048", { test });
  if (name === REDUCED_MOTION || ranges.some((range) => range.name === name)) return name;
  const names = [...ranges.map((range) => range.name), REDUCED_MOTION].join(", ");
  throw lusiaError("L1049", { name, names });
}

function include(where: Where, name: string): void {
  if (name === REDUCED_MOTION) {
    where.motion = where.motion === "no-preference" ? "never" : "reduce";
    return;
  }
  for (const size of [...where.sizes]) if (size !== name) where.sizes.delete(size);
}

function exclude(where: Where, name: string): void {
  if (name === REDUCED_MOTION) {
    where.motion = where.motion === "reduce" ? "never" : "no-preference";
    return;
  }
  where.sizes.delete(name);
}

function mediaText(where: Where, ranges: ScreenRange[]): string | undefined {
  if (where.sizes.size === 0 || where.motion === "never") return "";
  if (where.sizes.size === ranges.length && where.motion === "any") return undefined;
  const motion = where.motion === "any" ? [] : [`(prefers-reduced-motion: ${where.motion})`];
  const spans = joinedSpans(ranges.filter((range) => where.sizes.has(range.name)));
  return spans.map((span) => [...widthParts(span), ...motion].join(" and ")).join(", ");
}

/** Neighbouring screens merge into one span, so PHONE and TABLET give one max-width query. */
function joinedSpans(chosen: ScreenRange[]): Array<{ min: number; until: number }> {
  const spans: Array<{ min: number; until: number }> = [];
  for (const range of chosen) {
    const last = spans.at(-1);
    if (last && last.until === range.min) last.until = range.until;
    else spans.push({ min: range.min, until: range.until });
  }
  return spans;
}

// 0.02px below the next start avoids overlap at fractional widths, as Bootstrap does.
function widthParts(span: { min: number; until: number }): string[] {
  const parts: string[] = [];
  if (span.min > 0) parts.push(`(min-width: ${span.min}px)`);
  if (span.until !== Infinity) parts.push(`(max-width: ${span.until - 0.02}px)`);
  return parts;
}
