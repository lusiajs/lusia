import type { RuntimeConfig } from "./scope.ts";
import { mergeConfig } from "./merge.ts";

// Set by SCOPE.GLOBAL. Read by resolveConfig, under every component scope.
let layer: RuntimeConfig = {};

export function globalConfig(): RuntimeConfig {
  return layer;
}

export function addGlobalConfig(added: RuntimeConfig): void {
  layer = mergeConfig(layer, added);
}

/** Tests only: drops the global layer. */
export function clearGlobalConfig(): void {
  layer = {};
}
