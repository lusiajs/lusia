import type { AnimateConfig } from "../animate/options/config.ts";
import { readEase, type EaseValue, type PartialEasing } from "../animate/options/keyform.ts";
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

/** Each part (easeStyle, ease) merges on its own, so a layer with only one part keeps the other. */
export function mergeEase(
  base: EaseValue | undefined,
  layer: EaseValue | undefined,
): EaseValue | undefined {
  if (base === undefined) return layer;
  if (layer === undefined) return base;
  return toEaseValue({ ...readEase(base), ...readEase(layer) });
}

function toEaseValue(parts: PartialEasing): EaseValue | undefined {
  if (parts.easeStyle !== undefined && parts.ease !== undefined) {
    return [parts.easeStyle, parts.ease];
  }
  if (parts.easeStyle !== undefined) return [parts.easeStyle];
  if (parts.ease !== undefined) return [parts.ease];
  return undefined;
}
