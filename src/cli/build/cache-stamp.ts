import { stat, readdir } from "node:fs/promises";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { version } from "../../../package.json" with { type: "json" };

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const COMPILER_FOLDERS = ["src/compiler", "src/bun-plugin", "src/runtime"];

let stamp: Promise<string> | undefined;

/** Identifies the compiler that wrote a disk cache. A cache with another stamp is dropped. */
export function cacheStamp(): Promise<string> {
  stamp ??= computeStamp();
  return stamp;
}

export function isSourceInstall(packageRoot: string): boolean {
  return !packageRoot.split(sep).includes("node_modules");
}

export function buildStamp(appVersion: string, sourceMtime: number | undefined): string {
  return sourceMtime === undefined ? appVersion : `${appVersion}+${sourceMtime}`;
}

/** The newest modification time of a file or folder, including everything under a folder. */
export async function newestMtime(path: string): Promise<number> {
  const info = await stat(path);
  if (!info.isDirectory()) return info.mtimeMs;
  const names = await readdir(path);
  const children = await Promise.all(names.map((name) => newestMtime(join(path, name))));
  return Math.max(info.mtimeMs, ...children);
}

async function computeStamp(): Promise<string> {
  const sourceMtime = isSourceInstall(PACKAGE_ROOT) ? await sourceMtimeOrUndefined() : undefined;
  return buildStamp(version, sourceMtime);
}

async function sourceMtimeOrUndefined(): Promise<number | undefined> {
  try {
    const folders = COMPILER_FOLDERS.map((folder) => join(PACKAGE_ROOT, folder));
    const mtimes = await Promise.all(folders.map(newestMtime));
    return Math.max(...mtimes);
  } catch {
    return undefined;
  }
}
