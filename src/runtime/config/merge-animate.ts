import type { AnimateConfig } from "../animate/options/config.ts";
import { readDefault, type DefaultEasing, type PartialEasing } from "../animate/options/keyform.ts";
import { mergeObject } from "./merge-object.ts";

const NESTED_KEYS = ["attach", "detach", "view", "hover", "scroll", "midway"] as const;

export function mergeAnimate(
  base: AnimateConfig | undefined,
  layer: AnimateConfig | undefined,
): AnimateConfig | undefined {
  if (base === undefined) return layer;
  if (layer === undefined) return base;
  const merged: Record<string, unknown> = { ...mergeObject(base, layer) };
  for (const key of NESTED_KEYS) {
    merged[key] = mergeObject(base[key], layer[key]);
  }
  merged.ease = mergeEase(base.ease, layer.ease);
  return merged as AnimateConfig;
}

/** Each part (style, ease) merges on its own, so a layer with only one part keeps the other. */
export function mergeEase(
  base: DefaultEasing | undefined,
  layer: DefaultEasing | undefined,
): DefaultEasing | undefined {
  if (base === undefined) return layer;
  if (layer === undefined) return base;
  return toDefaultEasing({ ...readDefault(base), ...readDefault(layer) });
}

function toDefaultEasing(parts: PartialEasing): DefaultEasing | undefined {
  if (parts.easeStyle !== undefined && parts.ease !== undefined) {
    return [parts.easeStyle, parts.ease];
  }
  if (parts.easeStyle !== undefined) return [parts.easeStyle];
  if (parts.ease !== undefined) return [parts.ease];
  return undefined;
}
