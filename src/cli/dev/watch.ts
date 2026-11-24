import { watch } from "node:fs";
import { sep } from "node:path";
import { now } from "../build/timings.ts";

const DEBOUNCE_MS = 15;

export interface Watcher {
  close(): void;
}

/** Calls onChange with the changed files once they settle. waitMs counts from the first change. */
export function watchFolder(
  dir: string,
  onChange: (files: string[], waitMs: number) => void,
): Watcher {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let firstAt = 0;
  const files = new Set<string>();

  function flush(): void {
    const batch = [...files];
    const waitMs = now() - firstAt;
    files.clear();
    onChange(batch, waitMs);
  }

  const watcher = watch(dir, { recursive: true }, (_event, file) => {
    if (!file || isIgnored(file)) return;
    if (files.size === 0) firstAt = now();
    files.add(file);
    clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  });
  return {
    close() {
      clearTimeout(timer);
      watcher.close();
    },
  };
}

function isIgnored(file: string): boolean {
  return file.split(sep).some((part) => part === "node_modules" || part.startsWith("."));
}
