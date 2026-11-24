import {
  cachedStyleEntries,
  depsCurrent,
  primeStyle,
  type CachedStyle,
} from "#compiler/style/sass.ts";
import { join } from "node:path";
import { cacheFolder, readCacheEntries, writeCacheEntries } from "./cache-file.ts";

export function styleCachePath(root: string): string {
  return join(cacheFolder(root), "styles.json");
}

/** Primes the Sass cache from disk. Entries whose Sass imports changed are skipped. */
export async function loadStyleCache(root: string): Promise<void> {
  const entries = await readCacheEntries<CachedStyle>(styleCachePath(root));
  for (const entry of entries) {
    if (isStyleEntry(entry) && depsCurrent(entry.deps)) {
      primeStyle(entry.file, entry.index, entry, entry.screens, entry.css, entry.deps);
    }
  }
}

// An entry saved by an older cache shape is skipped, not used.
function isStyleEntry(entry: CachedStyle): boolean {
  return (
    typeof entry.file === "string" &&
    typeof entry.index === "number" &&
    typeof entry.css === "string" &&
    Array.isArray(entry.deps)
  );
}

export async function saveStyleCache(root: string): Promise<void> {
  await writeCacheEntries(styleCachePath(root), cachedStyleEntries());
}
