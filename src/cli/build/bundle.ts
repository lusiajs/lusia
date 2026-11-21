import { lusia, type LusiaPluginOptions } from "#bun-plugin/index.ts";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { RUNTIME_SPECIFIER, runtimeShim } from "./runtime-shim.ts";

export const ENTRY_FILE = "index.html";
const INDEX_KEY = "index.html";

export function entryPath(dir: string): string {
  const path = join(dir, ENTRY_FILE);
  if (!existsSync(path)) throw new Error(`no ${ENTRY_FILE} in ${dir}`);
  return path;
}

/** The key an output path or URL path is stored under: "./a.js" and "/a.js" both give "a.js". */
export function assetKey(path: string): string {
  const key = path.replace(/^\.?\//, "");
  return key || INDEX_KEY;
}

export interface BundleOptions extends LusiaPluginOptions {
  dir: string;
  minify: boolean;
}

/** Bundles in memory. The caller writes the outputs, so the write time can be measured. */
export async function bundleApp({
  dir,
  minify,
  ...plugin
}: BundleOptions): Promise<Bun.BuildOutput> {
  return Bun.build({
    entrypoints: [entryPath(dir)],
    minify,
    splitting: true,
    sourcemap: "linked",
    throw: false,
    external: plugin.dev ? [RUNTIME_SPECIFIER] : [],
    plugins: plugin.dev ? [lusia(plugin), runtimeShim()] : [lusia(plugin)],
  });
}
