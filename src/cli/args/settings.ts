import { resolve } from "node:path";
import type { LazySettings } from "#bun-plugin/children.ts";
import type { LusiaConfig } from "./config-types.ts";

export const DEFAULT_PORT = 3000;
export const DEFAULT_OUTDIR = "dist";
const DEFAULT_LAZY_MODE = "smart";
const DEFAULT_LAZY_PREFETCH = "idle";

/** The flag follows the current folder; the file and the default follow the app folder. */
export function outdirOf(dir: string, flag: string | undefined, config: LusiaConfig): string {
  if (flag !== undefined) return resolve(flag);
  return resolve(dir, config.outdir ?? DEFAULT_OUTDIR);
}

export function lazyOf(config: LusiaConfig): LazySettings {
  return {
    mode: config.lazy?.mode ?? DEFAULT_LAZY_MODE,
    prefetch: config.lazy?.prefetch ?? DEFAULT_LAZY_PREFETCH,
  };
}
