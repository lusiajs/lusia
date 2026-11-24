import type { CacheSettings } from "../args/settings.ts";
import { loadCompileCache, saveCompileCache } from "./compile-disk-cache.ts";
import { openPackageCache, type PackageCache } from "./package-cache.ts";
import { loadStyleCache, saveStyleCache } from "./sass-disk-cache.ts";

/** `development` is `lusia dev`. `production` is `lusia build`. */
export type BuildMode = "development" | "production";

export type BuildCache = PackageCache & {
  /** Saves the enabled disk caches. Best effort: a failed save only loses the speed-up. */
  save(): Promise<void>;
};

/** Loads and saves only the enabled caches. Packages are kept apart in development only. */
export async function openBuildCache(
  root: string,
  mode: BuildMode,
  cache: CacheSettings,
): Promise<BuildCache> {
  if (cache.styles) await loadStyleCache(root);
  if (cache.modules) await loadCompileCache(root);
  const cachePackages = mode === "development" && cache.packages;
  const packageCache = await openPackageCache(root, cachePackages);
  return createBuildCache(packageCache, diskSavers(root, cache));
}

function diskSavers(root: string, cache: CacheSettings): (() => Promise<void>)[] {
  const savers: (() => Promise<void>)[] = [];
  if (cache.styles) savers.push(() => saveStyleCache(root));
  if (cache.modules) savers.push(() => saveCompileCache(root));
  return savers;
}

/** Adds the save step to a package cache. Each save runs in parallel. */
export function createBuildCache(
  packageCache: PackageCache,
  savers: (() => Promise<void>)[],
): BuildCache {
  return {
    ...packageCache,
    async save() {
      await Promise.all(savers.map((saver) => saver()));
    },
  };
}
