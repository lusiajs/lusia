import { saveCompileCache } from "../build/compile-disk-cache.ts";

const SAVE_DELAY_MS = 500;

export interface CompileCacheSaver {
  schedule(): void;
}

/** Saves the compile cache once builds have paused, so a burst of rebuilds writes it once. */
export function createCompileCacheSaver(root: string): CompileCacheSaver {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    schedule() {
      clearTimeout(timer);
      timer = setTimeout(() => void saveCompileCache(root), SAVE_DELAY_MS);
    },
  };
}
