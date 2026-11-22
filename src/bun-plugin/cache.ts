import { depsCurrent, forgetStyles, type CompileResult, type StyleDep } from "#compiler/index.ts";
import { existsSync } from "node:fs";

export interface CachedModule {
  source: string;
  dev: boolean;
  key: string;
  deps: StyleDep[];
  code: string;
  css: string;
  id: string;
  scriptAndMarkup: string;
}

// Module scope: Bun.build makes a new plugin per build, so a cache inside setup() would never hit.
const modules = new Map<string, CachedModule>();

/** One key for a compile. It changes when the lazy, animate or screen settings change. */
export function compileKey(lazyKey: string, animateKey: string, screensKey: string): string {
  return JSON.stringify([lazyKey, animateKey, screensKey]);
}

export function toCachedModule(
  source: string,
  dev: boolean,
  result: CompileResult,
  key: string,
): CachedModule {
  return {
    source,
    dev,
    key,
    deps: result.deps,
    code: result.code,
    css: result.css,
    id: result.id,
    scriptAndMarkup: result.scriptAndMarkup,
  };
}

export function cachedModule(
  path: string,
  source: string,
  dev: boolean,
  key: string,
): CachedModule | undefined {
  const entry = modules.get(path);
  if (
    entry &&
    entry.source === source &&
    entry.dev === dev &&
    entry.key === key &&
    depsCurrent(entry.deps)
  )
    return entry;
  return undefined;
}

/** Stores a fresh compile and returns the entry it replaced. */
export function storeModule(path: string, entry: CachedModule): CachedModule | undefined {
  const previous = modules.get(path);
  modules.set(path, entry);
  return previous;
}

export function pruneModules(): void {
  for (const path of modules.keys()) {
    if (existsSync(path)) continue;
    modules.delete(path);
    forgetStyles(path);
  }
}
