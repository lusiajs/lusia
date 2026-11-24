import { formatMs, type Steps } from "../build/timings.ts";
import { ANSI } from "./color.ts";
import { styled } from "./style.ts";
import { treeChars } from "./dev-tree.ts";

export type TimingName = "wait" | "styles" | "compile" | "bundle" | "browser";

export interface TimingPart {
  name: TimingName;
  ms: number;
}

const WAIT_MIN_MS = 50;

const PART_CODES: Record<TimingName, string> = {
  wait: ANSI.dim,
  styles: ANSI.magenta,
  compile: ANSI.blue,
  bundle: ANSI.cyan,
  browser: ANSI.green,
};

/** `total 294 ms │ compile 14 │ bundle 205 │ browser 75`. Zero parts are hidden. */
export function formatTiming(steps: Steps, browserMs: number | undefined, color: boolean): string {
  const parts = timingParts(steps, browserMs);
  const slowest = slowestName(parts);
  const total = styled(`total ${formatMs(steps.total ?? 0)} ms`, ANSI.bold + ANSI.white, color);
  const separator = styled(` ${treeChars(color).pipe} `, ANSI.dim, color);
  const rendered = parts.map((part) => formatPart(part, part.name === slowest, color));
  return [total, ...rendered].join(separator);
}

function timingParts(steps: Steps, browserMs: number | undefined): TimingPart[] {
  const parts: TimingPart[] = [
    { name: "wait", ms: steps.wait ?? 0 },
    { name: "styles", ms: steps.sass ?? 0 },
    { name: "compile", ms: steps.compile ?? 0 },
    { name: "bundle", ms: steps.bundle ?? 0 },
    { name: "browser", ms: browserMs ?? 0 },
  ];
  return parts.filter(isShown);
}

function isShown(part: TimingPart): boolean {
  if (part.name === "wait") return part.ms > WAIT_MIN_MS;
  return Math.round(part.ms) > 0;
}

function slowestName(parts: TimingPart[]): TimingName | undefined {
  let slowest: TimingPart | undefined;
  for (const part of parts) {
    if (!slowest || part.ms > slowest.ms) slowest = part;
  }
  return slowest?.name;
}

function formatPart(part: TimingPart, isSlowest: boolean, color: boolean): string {
  const code = isSlowest ? ANSI.bold + PART_CODES[part.name] : PART_CODES[part.name];
  return styled(`${part.name} ${Math.round(part.ms)}`, code, color);
}
