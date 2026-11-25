import { lusia, type LusiaPluginOptions } from "#bun-plugin/index.ts";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { BuildCache } from "./build-cache.ts";
import { RUNTIME_SPECIFIER, runtimeShim } from "./runtime-shim.ts";
import { routePages } from "./route-pages.ts";

const ENTRY_FILE = "index.html";
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

export interface BundleOptions extends Omit<LusiaPluginOptions, "routes"> {
  dir: string;
  minify: boolean;
  cache: BuildCache;
  /** Route path to page file, relative to the app folder. */
  routes?: Record<string, string>;
}

/** Bundles in memory. The caller writes the outputs, so the write time can be measured. */
export async function bundleApp({
  dir,
  minify,
  cache,
  routes,
  ...plugin
}: BundleOptions): Promise<Bun.BuildOutput> {
  const external = cache.externals();
  const hasRoutes = Object.keys(routes ?? {}).length > 0;
  return Bun.build({
    // Route pages live in sub folders, so asset links must start at the site root.
    ...(hasRoutes ? { publicPath: "/" } : {}),
    entrypoints: [entryPath(dir)],
    minify,
    metafile: true,
    splitting: true,
    sourcemap: "linked",
    throw: false,
    external: plugin.dev ? [RUNTIME_SPECIFIER, ...external] : external,
    plugins: [
      lusia({ ...plugin, routes: routePages(dir, routes ?? {}) }),
      ...(plugin.dev ? [runtimeShim()] : []),
      ...cache.plugins(),
    ],
  });
}
