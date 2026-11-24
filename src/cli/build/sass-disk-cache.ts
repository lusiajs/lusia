import {
  cachedStyleEntries,
  depsCurrent,
  primeStyle,
  type CachedStyle,
} from "#compiler/style/sass.ts";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { version } from "../../../package.json" with { type: "json" };

const CACHE_FILE = join("node_modules", ".cache", "lusia", "styles.json");

interface DiskCache {
  version: string;
  entries: CachedStyle[];
}

export function styleCachePath(root: string): string {
  return join(root, CACHE_FILE);
}

/** Primes the Sass cache from disk. Entries whose Sass imports changed are skipped. */
export async function loadStyleCache(root: string): Promise<void> {
  const entries = await readEntries(styleCachePath(root));
  for (const entry of entries) {
    if (depsCurrent(entry.deps)) {
      primeStyle(entry.file, entry.index, entry, entry.screens, entry.css, entry.deps);
    }
  }
}

/** Best effort: a folder that cannot be written only loses the speed-up. */
export async function saveStyleCache(root: string): Promise<void> {
  const path = styleCachePath(root);
  const cache: DiskCache = { version, entries: cachedStyleEntries() };
  try {
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, JSON.stringify(cache));
  } catch {
    return;
  }
}

async function readEntries(path: string): Promise<CachedStyle[]> {
  try {
    const cache = JSON.parse(await readFile(path, "utf8")) as DiskCache;
    return cache.version === version && Array.isArray(cache.entries) ? cache.entries : [];
  } catch {
    return [];
  }
}
