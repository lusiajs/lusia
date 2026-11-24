import { formatMs, type Step, type Steps } from "../build/timings.ts";
import { ANSI } from "./color.ts";
import { styled } from "./style.ts";
import { treeChars } from "./dev-tree.ts";

export type TimingName =
  "boot" | "types" | "cache" | "wait" | "styles" | "compile" | "bundle" | "server" | "browser";

export interface TimingPart {
  name: TimingName;
  ms: number;
}

const WAIT_MIN_MS = 50;

const PART_CODES: Record<TimingName, string> = {
  boot: ANSI.dim,
  types: ANSI.dim,
  cache: ANSI.dim,
  wait: ANSI.dim,
  styles: ANSI.magenta,
  compile: ANSI.blue,
  bundle: ANSI.cyan,
  server: ANSI.dim,
  browser: ANSI.green,
};

const STARTUP_PARTS: [TimingName, Step][] = [
  ["boot", "boot"],
  ["types", "types"],
  ["cache", "cache"],
  ["styles", "sass"],
  ["compile", "compile"],
  ["bundle", "bundle"],
  ["server", "server"],
];
const STARTUP_LABEL_WIDTH = 8;
const STARTUP_VALUE_WIDTH = 7;
const STARTUP_RULE_WIDTH = STARTUP_LABEL_WIDTH + STARTUP_VALUE_WIDTH + " ms".length;

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

/** Detail lines shown under a startup part, such as "3 files, slowest a.lusia 9 ms". */
export type StartupDetails = Partial<Record<TimingName, string[]>>;

/**
 * Startup breakdown for the header, one row per part, then a rule and the bold total.
 * Zero parts are hidden. With no parts, only the total row shows.
 */
export function startupRows(steps: Steps, color: boolean, details: StartupDetails = {}): string[] {
  const parts = startupParts(steps, details);
  const totalRow = startupRow("total", Math.round(steps.total ?? 0), ANSI.bold, color);
  if (parts.length === 0) return [totalRow];
  const partRows = parts.flatMap((part) => [
    startupRow(part.name, part.ms, PART_CODES[part.name], color),
    ...detailRows(details[part.name] ?? [], color),
  ]);
  return [...partRows, startupRule(color), totalRow];
}

function detailRows(lines: string[], color: boolean): string[] {
  const tree = treeChars(color);
  return lines.map((line, index) => {
    const isLast = index === lines.length - 1;
    return styled(`  ${isLast ? tree.end : tree.branch} ${line}`, ANSI.dim, color);
  });
}

function startupParts(steps: Steps, details: StartupDetails): TimingPart[] {
  return STARTUP_PARTS.map(([name, step]) => ({ name, ms: Math.round(steps[step] ?? 0) })).filter(
    (part) => part.ms > 0 || hasDetails(details[part.name]),
  );
}

// A part with nothing to time still shows its detail, such as a compile that was all cached.
function hasDetails(lines: string[] | undefined): boolean {
  return lines !== undefined && lines.length > 0;
}

function startupRow(label: string, ms: number, code: string, color: boolean): string {
  const text = `${label.padEnd(STARTUP_LABEL_WIDTH)}${String(ms).padStart(STARTUP_VALUE_WIDTH)} ms`;
  return styled(text, code, color);
}

function startupRule(color: boolean): string {
  const line = color ? "─" : "-";
  return styled(line.repeat(STARTUP_RULE_WIDTH), ANSI.dim, color);
}
