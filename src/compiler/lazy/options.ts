export const LAZY_MODES = ["smart", "all", "off"] as const;
export const LAZY_PREFETCH = ["idle", "view", "none"] as const;

export type LazyMode = (typeof LAZY_MODES)[number];
export type LazyPrefetch = (typeof LAZY_PREFETCH)[number];

export interface ChildInfo {
  /** The file has <NO_LAZY />, so it is never split. */
  nolazy: boolean;
  /** The file has a <FALLBACK> block. */
  fallback: boolean;
  /** The specifier points back at the importing file, as in a recursive component. */
  self?: boolean;
}

export interface LazyOptions {
  mode: LazyMode;
  prefetch: LazyPrefetch;
  /** Reads the child file that a specifier points to, as the importer sees it. */
  childOf: (specifier: string) => ChildInfo;
}
