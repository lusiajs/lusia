import {
  cachedStyleEntries,
  depsCurrent,
  primeStyle,
  type CachedStyle,
} from "#compiler/style/sass.ts";
import { join } from "node:path";
import { readCacheEntries, writeCacheEntries } from "./cache-file.ts";

const CACHE_FILE = join("node_modules", ".cache", "lusia", "styles.json");

export function styleCachePath(root: string): string {
  return join(root, CACHE_FILE);
}

/** Primes the Sass cache from disk. Entries whose Sass imports changed are skipped. */
export async function loadStyleCache(root: string): Promise<void> {
  const entries = await readCacheEntries<CachedStyle>(styleCachePath(root));
  for (const entry of entries) {
    if (depsCurrent(entry.deps)) {
      primeStyle(entry.file, entry.index, entry, entry.screens, entry.css, entry.deps);
    }
  }
}

export async function saveStyleCache(root: string): Promise<void> {
  await writeCacheEntries(styleCachePath(root), cachedStyleEntries());
}
