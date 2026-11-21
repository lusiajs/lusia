import { resolveConfig } from "../../config/resolve.ts";
import { APP_SCOPE, type Scope } from "../../config/scope.ts";
import type { LazyPrefetch } from "./lazy.ts";

/** A scope's lazy.prefetch wins over the value compiled into the import. */
export function placementPrefetch(scope: Scope | undefined, compiled: LazyPrefetch): LazyPrefetch {
  return resolveConfig(scope ?? APP_SCOPE).lazy?.prefetch ?? compiled;
}
