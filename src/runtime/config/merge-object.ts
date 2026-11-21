/** Merges two objects key by key. A key the layer sets (not undefined) replaces the base's. */
export function mergeObject<T extends object>(
  base: T | undefined,
  layer: T | undefined,
): T | undefined {
  if (base === undefined) return layer;
  if (layer === undefined) return base;
  const merged = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(layer)) {
    if (value !== undefined) merged[key] = value;
  }
  return merged as T;
}
