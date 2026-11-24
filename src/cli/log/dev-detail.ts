import { basename } from "node:path";
import type { BuildReport, CompileTiming, SizedPath, StyleTiming } from "../build/build-report.ts";
import { packageName } from "../build/package-groups.ts";
import type { StartupSteps } from "../build/timings.ts";
import type { StartupDetails } from "./dev-timing.ts";
import { formatSize } from "./size.ts";

const SOURCE_MAP_SUFFIX = ".map";

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** One short line per startup part, for the header. Parts with nothing to say get no line. */
export function startupDetails(report: BuildReport, startup: StartupSteps): StartupDetails {
  return {
    boot: startup.configMs === undefined ? [] : [`config ${Math.round(startup.configMs)} ms`],
    styles: styleLines(report.styles),
    compile: compileLines(report.compiles),
    bundle: bundleLines(report),
  };
}

function styleLines(styles: StyleTiming[]): string[] {
  if (styles.length === 0) return [];
  const cached = styles.filter((style) => style.cached).length;
  const compiled = styles.length - cached;
  return [`${plural(styles.length, "block")}: ${cached} cached, ${compiled} compiled`];
}

function compileLines(compiles: CompileTiming[]): string[] {
  if (compiles.length === 0) return [];
  const slowest = compiles.reduce((next, compile) => (compile.ms > next.ms ? compile : next));
  const name = basename(slowest.file);
  return [`${plural(compiles.length, "file")}, slowest ${name} ${Math.round(slowest.ms)} ms`];
}

function bundleLines(report: BuildReport): string[] {
  if (report.modules.length === 0) return [];
  const fromPackages = report.modules.filter(
    (module) => packageName(module.path, report.root) !== undefined,
  ).length;
  const size = formatSize(shippedBytes(report.outputs));
  return [`${plural(report.modules.length, "module")} (${fromPackages} from packages), ${size}`];
}

function shippedBytes(outputs: SizedPath[]): number {
  return outputs
    .filter((output) => !output.path.endsWith(SOURCE_MAP_SUFFIX))
    .reduce((sum, output) => sum + output.bytes, 0);
}
