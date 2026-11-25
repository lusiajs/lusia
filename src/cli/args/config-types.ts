import type { AnimateConfig } from "#runtime/animate/options/config.ts";
import type { LazyMode, LazyPrefetch } from "#compiler/lazy/options.ts";
import type { LintRuleSettings } from "#language/lint/types.ts";

const JSON_CONFIG_FILE = "lusia.config.json";
const TS_CONFIG_FILE = "lusia.config.ts";
export const CONFIG_FILES = [TS_CONFIG_FILE, JSON_CONFIG_FILE];

export interface CacheConfig {
  styles?: boolean;
  modules?: boolean;
  packages?: boolean;
}

export interface LusiaConfig {
  outdir?: string;
  minify?: boolean;
  routes?: Record<string, string>;
  ssr?: boolean;
  cache?: CacheConfig;
  dev?: { port?: number };
  lazy?: { mode?: LazyMode; prefetch?: LazyPrefetch };
  lint?: { rules?: LintRuleSettings };
  format?: { indentScriptAndStyle?: boolean };
  animate?: AnimateConfig;
  screens?: Record<string, number>;
}
