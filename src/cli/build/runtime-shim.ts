import * as publicApi from "#runtime/index.ts";
import * as internalApi from "#runtime/internal.ts";
import type { BunPlugin } from "bun";

/** The bare name the page's import map points at the runtime module (see `RUNTIME_PATH`). */
export const RUNTIME_SPECIFIER = "lusia-runtime";

const SHIM_NAMESPACE = "lusia-shim";

export function isShimInput(input: string): boolean {
  return input.startsWith(`${SHIM_NAMESPACE}:`);
}

// Dev builds keep `lusiajs` external; the shim still lists its names so Bun reports missing ones.
export function runtimeShim(): BunPlugin {
  return {
    name: "lusia-runtime-shim",
    setup(build) {
      build.onResolve({ filter: /^lusiajs$/ }, () => ({
        path: "lusiajs",
        namespace: SHIM_NAMESPACE,
      }));
      build.onResolve({ filter: /^lusiajs\/internal$/ }, () => ({
        path: "lusiajs/internal",
        namespace: SHIM_NAMESPACE,
      }));
      build.onLoad({ filter: /.*/, namespace: SHIM_NAMESPACE }, ({ path }) => ({
        contents: reexport(path === "lusiajs" ? publicApi : internalApi),
        loader: "js",
      }));
    },
  };
}

function reexport(namespace: object): string {
  const names = Object.keys(namespace).join(", ");
  return `export { ${names} } from "${RUNTIME_SPECIFIER}";`;
}
