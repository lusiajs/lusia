import { fallbackSource } from "#compiler/index.ts";
import type { BunPlugin } from "bun";
import { dirname, resolve } from "node:path";
import { compileFallbackFile } from "./compile.ts";

type PluginBuild = Parameters<BunPlugin["setup"]>[0];

const QUERY = "?fallback";
const NAMESPACE = "lusia-fallback";

/** `import Card from "./Card.lusia?fallback"` is a module with only the FALLBACK block of Card.lusia, and its styles. */
export function setupFallback(build: PluginBuild, dev: boolean): void {
  build.onResolve({ filter: /\.lusia\?fallback$/ }, ({ path, importer }) => ({
    path: resolve(dirname(importer), path.slice(0, -QUERY.length)),
    namespace: NAMESPACE,
  }));
  build.onLoad({ filter: /.*/, namespace: NAMESPACE }, async ({ path }) => {
    const source = await Bun.file(path).text();
    const result = compileFallbackFile(fallbackSource(source, path), path, dev);
    return { contents: result.code, loader: "ts" };
  });
}
