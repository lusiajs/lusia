import type { AnimateConfig } from "#runtime/animate/options/config.ts";
import { animateConfigToNames } from "#runtime/animate/options/config-names.ts";

const IMPORT_LINE = 'import { animateConfigFromNames, setAnimateConfig } from "lusiajs/internal";';
const NO_KEYS = "{}";

/** The named form of the config as JSON. Changes whenever a key is set, changed or removed. */
export function animateNamesJson(config: AnimateConfig): string {
  return JSON.stringify(animateConfigToNames(config));
}

/** The code that gives a compiled module the build's animate config. Empty when the config sets no key. */
export function animatePrelude(config: AnimateConfig): string {
  const names = animateNamesJson(config);
  if (names === NO_KEYS) return "";
  return `${IMPORT_LINE}\nsetAnimateConfig(animateConfigFromNames(${names}));\n`;
}
