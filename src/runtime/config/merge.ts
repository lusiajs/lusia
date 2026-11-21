import type { RuntimeConfig } from "./scope.ts";
import { mergeAnimate } from "./merge-animate.ts";
import { mergeObject } from "./merge-object.ts";

/** Returns base with layer on top. Neither input is changed. */
export function mergeConfig(base: RuntimeConfig, layer: RuntimeConfig): RuntimeConfig {
  const config: RuntimeConfig = {};
  const animate = mergeAnimate(base.animate, layer.animate);
  const lazy = mergeObject(base.lazy, layer.lazy);
  if (animate !== undefined) config.animate = animate;
  if (lazy !== undefined) config.lazy = lazy;
  return config;
}
