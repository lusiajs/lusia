import { readFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import type { SizedPath } from "./build-report.ts";

const NODE_MODULES = "node_modules/";
const SHIM_SPECIFIER = /lusia-shim:(@[^/]+\/[^/]+|[^/]+)/;
const PACKAGE_FILE = "package.json";

export interface PackageGroup {
  name: string;
  files: number;
  bytes: number;
}

export interface ModuleGroups {
  packages: PackageGroup[];
  app: SizedPath[];
}

const nameByFolder = new Map<string, string | undefined>();

/** Packages are summed, largest first. App files stay one by one, largest first. */
export function groupModules(modules: SizedPath[], root: string): ModuleGroups {
  const packages = new Map<string, PackageGroup>();
  const app: SizedPath[] = [];
  for (const module of modules) {
    const name = packageName(module.path, root);
    if (name === undefined) {
      app.push(module);
      continue;
    }
    const group = packages.get(name) ?? { name, files: 0, bytes: 0 };
    group.files += 1;
    group.bytes += module.bytes;
    packages.set(name, group);
  }
  return {
    packages: [...packages.values()].sort(bySizeDesc),
    app: app.sort(bySizeDesc),
  };
}

/**
 * The package a module belongs to, or undefined for a file of the app itself.
 * A module outside the app folder (a linked package) is named by its package.json.
 */
export function packageName(path: string, root: string): string | undefined {
  const shim = SHIM_SPECIFIER.exec(path);
  if (shim) return shim[1];
  if (path.startsWith(`${root}${sep}`)) return nodeModulesName(path);
  return nearestPackageName(dirname(path)) ?? nodeModulesName(path);
}

/** `lib` for node_modules/lib/x.js, `@scope/lib` for scoped packages. */
function nodeModulesName(path: string): string | undefined {
  const start = path.lastIndexOf(NODE_MODULES);
  if (start === -1) return undefined;
  const parts = path.slice(start + NODE_MODULES.length).split("/");
  if (parts[0]?.startsWith("@")) return `${parts[0]}/${parts[1]}`;
  return parts[0];
}

/** The name in the nearest package.json at or above `folder`. Cached per folder. */
function nearestPackageName(folder: string): string | undefined {
  if (nameByFolder.has(folder)) return nameByFolder.get(folder);
  const name = readPackageName(folder) ?? inheritedName(folder);
  nameByFolder.set(folder, name);
  return name;
}

function inheritedName(folder: string): string | undefined {
  const parent = dirname(folder);
  return parent === folder ? undefined : nearestPackageName(parent);
}

function readPackageName(folder: string): string | undefined {
  try {
    const json = JSON.parse(readFileSync(join(folder, PACKAGE_FILE), "utf8")) as { name?: unknown };
    return typeof json.name === "string" ? json.name : undefined;
  } catch {
    return undefined;
  }
}

function bySizeDesc(a: { bytes: number }, b: { bytes: number }): number {
  return b.bytes - a.bytes;
}
