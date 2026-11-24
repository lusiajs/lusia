import { formatTable } from "./report.ts";

export type Step =
  "boot" | "types" | "wait" | "compile" | "sass" | "bundle" | "write" | "copy" | "server" | "total";
export type Steps = Partial<Record<Step, number>>;

const BUILD_STEPS: [Step, string][] = [
  ["compile", "compile"],
  ["sass", "sass"],
  ["bundle", "bundle"],
  ["write", "write"],
  ["copy", "copy public"],
  ["total", "total"],
];

export type StartupSteps = Steps & { configMs?: number };

export function now(): number {
  return performance.now();
}

export function addStep(steps: Steps, step: Step, ms: number): void {
  steps[step] = (steps[step] ?? 0) + ms;
}

export function formatMs(ms: number): string {
  return ms < 10 ? ms.toFixed(1) : Math.round(ms).toString();
}

export function formatBuildSteps(steps: Steps): string {
  const rows = [
    ["Step", "Time"],
    ...BUILD_STEPS.map(([step, label]) => [label, `${formatMs(steps[step] ?? 0)} ms`]),
  ];
  return formatTable(rows);
}

/** Bundle time is the bundler's own work: the whole build minus the plugin's compile and Sass time. */
export function addBundleStep(steps: Steps, buildMs: number): void {
  addStep(steps, "bundle", buildMs - (steps.compile ?? 0) - (steps.sass ?? 0));
}
