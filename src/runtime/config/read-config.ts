import { readAnimateConfig } from "../animate/options/config.ts";
import { runtimeError } from "../errors.ts";
import { readLazy } from "./read-lazy.ts";
import type { RuntimeConfig } from "./scope.ts";

const SECTION_KEYS = ["animate", "lazy"];
const BUILD_ONLY_KEYS = ["outdir", "minify", "routes", "dev", "lint", "format"];

/** Checks every section of a setConfig value and returns a copy that holds only accepted values. */
export function readConfig(config: RuntimeConfig): RuntimeConfig {
  const checked: RuntimeConfig = {};
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined) continue;
    if (BUILD_ONLY_KEYS.includes(key)) throw runtimeError("L2072", { key });
    if (!SECTION_KEYS.includes(key)) {
      throw runtimeError("L2071", { key, keys: SECTION_KEYS.join(" or ") });
    }
    if (key === "animate") checked.animate = readAnimateConfig(value);
    if (key === "lazy") checked.lazy = readLazy(value);
  }
  return checked;
}
