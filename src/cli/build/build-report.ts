import { resolve } from "node:path";
import type { StyleBlockTiming } from "#compiler/pipeline.ts";

export interface StyleTiming extends StyleBlockTiming {
  file: string;
}

export interface CompileTiming {
  file: string;
  ms: number;
  bytes: number;
  /** True when the file came from the compile cache and was not compiled. */
  cached: boolean;
}

export interface SizedPath {
  path: string;
  bytes: number;
}

export type PackageStatus = "cached" | "bundled";

export interface PackageReport {
  status: PackageStatus;
  count: number;
}

export interface BuildReport {
  root: string;
  styles: StyleTiming[];
  compiles: CompileTiming[];
  modules: SizedPath[];
  outputs: SizedPath[];
  /** Set in dev when the packages are served from their own bundle. */
  packages?: PackageReport;
}

export function emptyReport(root: string): BuildReport {
  return { root, styles: [], compiles: [], modules: [], outputs: [] };
}

/** Adds the packages served from their bundle, which the app bundle no longer contains. */
export function recordPackages(
  report: BuildReport,
  packages: { modules: SizedPath[]; files: SizedPath[]; report: PackageReport },
): void {
  report.modules.push(...packages.modules);
  report.outputs.push(...packages.files);
  report.packages = packages.report;
}

export function recordCompile(
  report: BuildReport,
  compile: CompileTiming,
  styleBlocks: StyleBlockTiming[],
): void {
  report.compiles.push(compile);
  for (const block of styleBlocks) report.styles.push({ ...block, file: compile.file });
}

/** Bun reports module paths relative to the working folder, so they are made absolute here. */
export function recordBundle(report: BuildReport, result: Bun.BuildOutput): void {
  report.modules = Object.entries(result.metafile?.inputs ?? {}).map(([path, input]) => ({
    path: modulePath(path),
    bytes: input.bytes,
  }));
  report.outputs = result.outputs.map((output) => ({ path: output.path, bytes: output.size }));
}

const PLUGIN_NAMESPACE = /^[a-z-]+:(?=\/)/;

// A plugin module such as `lusia-raw:/abs/File.lusia?raw` keeps its file path, so it shows relative to the app.
function modulePath(path: string): string {
  if (PLUGIN_NAMESPACE.test(path)) return path.replace(PLUGIN_NAMESPACE, "");
  return resolve(path);
}
