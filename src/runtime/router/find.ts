import { isParamSegment, matchPattern, normalizePath, type Params } from "./pattern.ts";

export interface Route {
  key: string;
  params: Params;
}

function isExactKey(key: string): boolean {
  return key !== "*" && !normalizePath(key).split("/").some(isParamSegment);
}

function isParamKey(key: string): boolean {
  return key !== "*" && normalizePath(key).split("/").some(isParamSegment);
}

function firstMatch(keys: readonly string[], path: string): Route | undefined {
  for (const key of keys) {
    const params = matchPattern(key, path);
    if (params !== undefined) return { key, params };
  }
  return undefined;
}

/** Exact keys first, then `:name` patterns in order, then "*". Undefined when nothing matches. */
export function findRoute(keys: readonly string[], path: string): Route | undefined {
  return (
    firstMatch(keys.filter(isExactKey), path) ??
    firstMatch(keys.filter(isParamKey), path) ??
    firstMatch(keys.filter((key) => key === "*"), path)
  );
}
