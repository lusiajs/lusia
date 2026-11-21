import type { LazyPrefetch } from "../dom/lazy/lazy.ts";
import { runtimeError } from "../errors.ts";
import type { RuntimeConfig } from "./scope.ts";

type LazyConfig = NonNullable<RuntimeConfig["lazy"]>;

const LAZY_KEYS = ["prefetch"];
const PREFETCH_VALUES: readonly string[] = ["idle", "view", "none"];

/** Checks the lazy section. lazy.mode is build-only, so it is rejected here. */
export function readLazy(lazy: LazyConfig): LazyConfig {
  const checked: LazyConfig = {};
  for (const [key, value] of Object.entries(lazy)) {
    if (value === undefined) continue;
    if (key === "mode") throw runtimeError("L2072", { key: "lazy.mode" });
    if (!LAZY_KEYS.includes(key)) throw runtimeError("L2073", { key, keys: LAZY_KEYS.join(", ") });
    checked.prefetch = readPrefetch(value);
  }
  return checked;
}

function readPrefetch(value: unknown): LazyPrefetch {
  if (typeof value === "string" && PREFETCH_VALUES.includes(value)) return value as LazyPrefetch;
  throw runtimeError("L2074", { value: String(value) });
}
