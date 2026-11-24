import { cachedModuleEntries, primeModule, type CachedModule } from "#bun-plugin/cache.ts";
import { depsCurrent } from "#compiler/index.ts";
import { isFileUnchanged } from "#compiler/utils/file-stamp.ts";
import { join } from "node:path";
import { cacheFolder, readCacheEntries, writeCacheEntries } from "./cache-file.ts";

interface CachedPath {
  path: string;
  entry: CachedModule;
}

export function compileCachePath(root: string): string {
  return join(cacheFolder(root), "modules.json");
}

/** Primes the compile cache from disk. Entries whose file or imports changed are skipped. */
export async function loadCompileCache(root: string): Promise<void> {
  const entries = await readCacheEntries<CachedPath>(compileCachePath(root));
  entries.forEach(primeIfCurrent);
}

// A malformed entry throws here and is skipped.
function primeIfCurrent(cached: CachedPath): void {
  try {
    if (isCurrent(cached.entry)) primeModule(cached.path, cached.entry);
  } catch {
    return;
  }
}

export async function saveCompileCache(root: string): Promise<void> {
  await writeCacheEntries(compileCachePath(root), cachedModuleEntries());
}

function isCurrent(entry: CachedModule): boolean {
  return isFileUnchanged(entry.stamp) && depsCurrent(entry.deps);
}
