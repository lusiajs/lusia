import type { BuildCache } from "../build/build-cache.ts";

const SAVE_DELAY_MS = 500;

export interface CacheSaver {
  schedule(): void;
}

/** Saves the caches once builds have paused, so a burst of rebuilds writes them once. */
export function createCacheSaver(cache: BuildCache): CacheSaver {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    schedule() {
      clearTimeout(timer);
      timer = setTimeout(() => void cache.save(), SAVE_DELAY_MS);
    },
  };
}
