import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";
import { CONFIG_FILES, type LusiaConfig } from "./config-types.ts";
import { optionalAnimateNames, optionalAnimateValues } from "./config-animate.ts";
import {
  asObject,
  bothFilesError,
  checkKeys,
  configError,
  configFileError,
  optionalBoolean,
  optionalString,
  type JsonObject,
} from "./config-values.ts";
import { optionalScreens } from "./config-screens.ts";
import {
  optionalCache,
  optionalDev,
  optionalFormat,
  optionalLazy,
  optionalLint,
} from "./config-sections.ts";
import { checkRouteFiles, optionalRoutes } from "./config-routes.ts";

export type { LusiaConfig };

const ROOT_KEYS = [
  "$schema",
  "outdir",
  "minify",
  "routes",
  "cache",
  "dev",
  "lazy",
  "lint",
  "format",
  "animate",
  "screens",
];
const MISSING_DEFAULT_DETAIL = "export the config as default: export default defineConfig({ ... })";

type AnimateReader = (root: JsonObject) => AnimateConfig | undefined;

export async function readConfig(dir: string): Promise<LusiaConfig> {
  const files = CONFIG_FILES.map((name) => join(dir, name)).filter((file) => existsSync(file));
  if (files.length > 1) throw bothFilesError();
  const file = files[0];
  if (file === undefined) return {};
  try {
    const config = await loadConfigFile(file);
    checkRouteFiles(config.routes, dir);
    return config;
  } catch (error) {
    throw configFileError(basename(file), error);
  }
}

async function loadConfigFile(file: string): Promise<LusiaConfig> {
  if (file.endsWith(".ts")) return readTsConfig(file);
  return parseConfig(readFileSync(file, "utf8"));
}

async function readTsConfig(file: string): Promise<LusiaConfig> {
  const loaded = await import(freshImportPath(file));
  if (loaded.default === undefined) throw configError(MISSING_DEFAULT_DETAIL);
  return checkRoot(loaded.default, optionalAnimateValues);
}

// Bun ignores a query on a file: URL, but a plain path with a query is loaded again.
let tsReadCount = 0;

function freshImportPath(file: string): string {
  tsReadCount++;
  return `${resolve(file)}?read=${tsReadCount}`;
}

export function parseConfig(text: string): LusiaConfig {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw configError(`not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  return checkRoot(value, optionalAnimateNames);
}

function checkRoot(value: unknown, readAnimate: AnimateReader): LusiaConfig {
  const root = asObject(value, "the file must hold a JSON object");
  checkKeys(root, ROOT_KEYS);
  return {
    outdir: optionalString(root, "outdir"),
    minify: optionalBoolean(root, "minify"),
    routes: optionalRoutes(root),
    cache: optionalCache(root),
    dev: optionalDev(root),
    lazy: optionalLazy(root),
    lint: optionalLint(root),
    format: optionalFormat(root),
    animate: readAnimate(root),
    screens: optionalScreens(root),
  };
}
