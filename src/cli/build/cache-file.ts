import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { cacheStamp } from "./cache-stamp.ts";

export const CACHE_FOLDER = join(".lusia", "cache");

export function cacheFolder(root: string): string {
  return join(root, CACHE_FOLDER);
}

interface StampedCache<T> {
  stamp: string;
  entries: T[];
}

/** Reads the entries of a cache file. A missing, corrupt or stale file gives no entries. */
export async function readCacheEntries<T>(path: string): Promise<T[]> {
  try {
    const cache = JSON.parse(await readFile(path, "utf8")) as StampedCache<T>;
    const stamp = await cacheStamp();
    return cache.stamp === stamp && Array.isArray(cache.entries) ? cache.entries : [];
  } catch {
    return [];
  }
}

/** Best effort: a folder that cannot be written only loses the speed-up. */
export async function writeCacheEntries<T>(path: string, entries: T[]): Promise<void> {
  try {
    const cache: StampedCache<T> = { stamp: await cacheStamp(), entries };
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(cache));
  } catch {
    return;
  }
}
