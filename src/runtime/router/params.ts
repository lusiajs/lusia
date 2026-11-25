import { runtimeError } from "../errors.ts";
import { compute, type ComputedVariable } from "../variable/compute.ts";
import { variable } from "../variable/variable.ts";
import { findRoute } from "./find.ts";
import { pathState, searchState } from "./location.ts";
import type { Params } from "./pattern.ts";

/** The page keys set by startRoutes. Empty until startRoutes runs. */
export const routeKeys = variable<readonly string[]>([]);

function queryParams(search: string): Params {
  return Object.fromEntries(new URLSearchParams(search));
}

const current = compute<Params>(() => {
  const route = findRoute(routeKeys.get(), pathState.get());
  return { ...queryParams(searchState.get()), ...route?.params };
});

/** The `:name` values of the current page, then the query values. Read-only. */
export const PARAMS: ComputedVariable<Params> = new Proxy(current, {
  set(_target, key) {
    throw runtimeError("L2091", { name: String(key) });
  },
});
