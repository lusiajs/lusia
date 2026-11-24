import type { LusiaConfig } from "#cli/args/config-types.ts";

export type LusiaConfigInput = LusiaConfig;

export function defineConfig(config: LusiaConfigInput): LusiaConfigInput {
  return config;
}
