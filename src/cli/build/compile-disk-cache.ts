import { cachedModuleEntries, primeModule, type CachedModule } from "#bun-plugin/cache.ts";
import { depsCurrent } from "#compiler/index.ts";
import { readFile } from "node:fs/promises";
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
  await Promise.all(entries.map(primeIfCurrent));
}

async function primeIfCurrent(cached: CachedPath): Promise<void> {
  try {
    if (await isCurrent(cached.path, cached.entry)) primeModule(cached.path, cached.entry);
  } catch {
    return;
  }
}

export async function saveCompileCache(root: string): Promise<void> {
  await writeCacheEntries(compileCachePath(root), cachedModuleEntries());
}

async function isCurrent(path: string, entry: CachedModule): Promise<boolean> {
  return (await fileText(path)) === entry.source && depsCurrent(entry.deps);
}

async function fileText(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}
