export interface Summary {
  median: number;
  min: number;
  max: number;
  spread: number;
}

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

export function summarize(values: readonly number[]): Summary {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const middle = median(values);
  const spread = middle === 0 ? 0 : (max - min) / middle;
  return { median: middle, min, max, spread };
}
