import type { LazySettings } from "#bun-plugin/children.ts";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";
import type { Screens } from "#runtime/screen/screens.ts";
import { LusiaError } from "#compiler/errors/error.ts";
import { basename } from "node:path";
import { readConfig } from "../args/config.ts";
import { CONFIG_FILES } from "../args/config-types.ts";
import { lazyOf } from "../args/settings.ts";
import { colorEnabled } from "../log/color.ts";
import { formatError } from "../format/format-error.ts";

export interface DevConfig {
  lazy: LazySettings;
  animate: AnimateConfig;
  screens?: Screens;
  routes?: Record<string, string>;
}

type DevConfigResult = { ok: true; config: DevConfig } | { ok: false; messages: string[] };

export function isConfigFile(file: string): boolean {
  return CONFIG_FILES.includes(basename(file));
}

export async function readDevConfig(root: string): Promise<DevConfigResult> {
  try {
    const config = await readConfig(root);
    return {
      ok: true,
      config: {
        lazy: lazyOf(config),
        animate: config.animate ?? {},
        screens: config.screens,
        routes: config.routes ?? {},
      },
    };
  } catch (error) {
    return { ok: false, messages: [errorMessage(error)] };
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof LusiaError) return formatError(error, undefined, colorEnabled());
  return error instanceof Error ? error.message : String(error);
}
