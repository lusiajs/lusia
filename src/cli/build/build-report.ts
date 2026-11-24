import { resolve } from "node:path";
import type { StyleBlockTiming } from "#compiler/pipeline.ts";

export interface StyleTiming extends StyleBlockTiming {
  file: string;
}

export interface CompileTiming {
  file: string;
  ms: number;
}

export interface SizedPath {
  path: string;
  bytes: number;
}

export interface BuildReport {
  root: string;
  styles: StyleTiming[];
  compiles: CompileTiming[];
  modules: SizedPath[];
  outputs: SizedPath[];
}

export function emptyReport(root: string): BuildReport {
  return { root, styles: [], compiles: [], modules: [], outputs: [] };
}

export function recordCompile(
  report: BuildReport,
  file: string,
  ms: number,
  styleBlocks: StyleBlockTiming[],
): void {
  report.compiles.push({ file, ms });
  for (const block of styleBlocks) report.styles.push({ ...block, file });
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
