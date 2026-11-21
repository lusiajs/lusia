import { fileAnimateConfig } from "../animate/options/config-store.ts";
import { globalConfig } from "./global.ts";
import { mergeConfig } from "./merge.ts";
import type { RuntimeConfig, Scope } from "./scope.ts";

/** lusia.config, then setConfig(..., SCOPE.GLOBAL), then the component scope. The nearest wins. */
export function resolveConfig(scope: Scope): RuntimeConfig {
  const file: RuntimeConfig = { animate: fileAnimateConfig() };
  return mergeConfig(mergeConfig(file, globalConfig()), scope.own);
}
