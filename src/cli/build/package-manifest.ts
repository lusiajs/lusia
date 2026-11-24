import type { SizedPath } from "./build-report.ts";
import { cacheStamp } from "./cache-stamp.ts";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const PACKAGE_DIR = join("node_modules", ".cache", "lusia", "packages");
export const PACKAGE_URL_PREFIX = "/__lusia/packages/";
const MANIFEST_FILE = "manifest.json";
const LOCKFILES = ["bun.lock", "bun.lockb", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"];

export interface PackageFile {
  name: string;
  bytes: number;
}

export interface PackageEntry {
  /** The file in the packages folder that serves the package. */
  name: string;
  /** The package file the app resolves to, so a rebundle can include it again. */
  file: string;
}

export interface PackageManifest {
  /** The lockfile hash and cache stamp the bundle was built for. */
  key: string;
  /** Package specifier (as the app imports it) to its entry. */
  entries: Record<string, PackageEntry>;
  files: PackageFile[];
  modules: SizedPath[];
}

/** The packages the app imports that the saved bundle does not hold. */
export function missingPackages(
  found: Map<string, string>,
  manifest: PackageManifest | undefined,
): string[] {
  const entries = manifest?.entries ?? {};
  return [...found.keys()].filter((specifier) => !Object.hasOwn(entries, specifier));
}

/** Changes when the lockfile or the lusia compiler changes. Undefined when there is no lockfile. */
export async function packageKey(root: string): Promise<string | undefined> {
  const lockfile = await firstLockfile(root);
  if (lockfile === undefined) return undefined;
  const hash = Bun.hash(await Bun.file(lockfile).bytes()).toString(16);
  return `${hash}:${await cacheStamp()}`;
}

async function firstLockfile(root: string): Promise<string | undefined> {
  for (const name of LOCKFILES) {
    const path = join(root, name);
    if (await Bun.file(path).exists()) return path;
  }
  return undefined;
}

function manifestPath(root: string): string {
  return join(root, PACKAGE_DIR, MANIFEST_FILE);
}

/** The saved bundle, if it was built for this key and every file is still there. */
export async function readPackageManifest(
  root: string,
  key: string,
): Promise<PackageManifest | undefined> {
  try {
    const manifest = JSON.parse(await readFile(manifestPath(root), "utf8")) as PackageManifest;
    if (manifest.key !== key) return undefined;
    const present = await Promise.all(
      manifest.files.map((file) => Bun.file(join(root, PACKAGE_DIR, file.name)).exists()),
    );
    return present.every(Boolean) ? manifest : undefined;
  } catch {
    return undefined;
  }
}

/** Best effort: a folder that cannot be written only loses the reuse. */
export async function writePackageManifest(root: string, manifest: PackageManifest): Promise<void> {
  try {
    await mkdir(join(root, PACKAGE_DIR), { recursive: true });
    await writeFile(manifestPath(root), JSON.stringify(manifest));
  } catch {
    return;
  }
}
