import type { BunPlugin } from "bun";
import { join } from "node:path";
import type { PackageReport, SizedPath } from "./build-report.ts";
import { assetKey } from "./bundle.ts";
import { bundlePackages } from "./package-bundle.ts";
import { collectPackageImports, resolvedPackages } from "./package-imports.ts";
import {
  missingPackages,
  PACKAGE_DIR,
  PACKAGE_URL_PREFIX,
  packageKey,
  readPackageManifest,
  type PackageManifest,
} from "./package-manifest.ts";

export interface PackageRecord {
  modules: SizedPath[];
  files: SizedPath[];
  report: PackageReport;
}

export interface PackageCache {
  plugins(): BunPlugin[];
  externals(): string[];
  importMap(): Record<string, string>;
  assets(): [string, Blob][];
  record(): PackageRecord | undefined;
  /**
   * Bundles the packages the build found that the saved bundle lacks. Takes the build's output,
   * which holds the file each package resolves to. True when it bundled.
   */
  bundleMissing(build: Bun.BuildOutput): Promise<boolean>;
}

const NO_PACKAGES: PackageCache = {
  plugins: () => [],
  externals: () => [],
  importMap: () => ({}),
  assets: () => [],
  record: () => undefined,
  bundleMissing: async () => false,
};

/** Without `enabled`, or without a lockfile, the packages are bundled with the app. */
export async function openPackageCache(root: string, enabled: boolean): Promise<PackageCache> {
  if (!enabled) return NO_PACKAGES;
  const key = await packageKey(root);
  if (key === undefined) return NO_PACKAGES;
  return createPackageCache(root, key, await readPackageManifest(root, key));
}

function createPackageCache(
  root: string,
  key: string,
  initial: PackageManifest | undefined,
): PackageCache {
  const found = new Map<string, string>();
  const collector = collectPackageImports(found);
  let manifest = initial;
  let bundledNow = false;

  function externals(): string[] {
    return Object.keys(manifest?.entries ?? {});
  }

  return {
    plugins: () => [collector],
    externals,
    importMap: () => packageUrls(manifest),
    assets: () => packageAssets(root, manifest),
    record: () => packageRecord(manifest, bundledNow, externals().length),
    async bundleMissing(build) {
      bundledNow = false;
      const missing = missingPackages(found, manifest);
      if (missing.length === 0) return false;
      const packages = packageFiles(root, manifest, found, missing, build);
      const next = await bundlePackages(root, packages, key);
      if (!next) return false;
      manifest = next;
      bundledNow = true;
      return true;
    },
  };
}

/** The file of every package to bundle: the saved ones, and the new ones the build resolved. */
function packageFiles(
  root: string,
  manifest: PackageManifest | undefined,
  found: Map<string, string>,
  missing: string[],
  build: Bun.BuildOutput,
): Map<string, string> {
  const newFound = new Map(missing.map((specifier) => [specifier, found.get(specifier)!]));
  const known = Object.entries(manifest?.entries ?? {}).map(
    ([specifier, entry]) => [specifier, entry.file] as const,
  );
  const resolved = resolvedPackages(newFound, build.metafile?.inputs ?? {}, root);
  return new Map([...known, ...resolved]);
}

function packageUrls(manifest: PackageManifest | undefined): Record<string, string> {
  return Object.fromEntries(
    Object.entries(manifest?.entries ?? {}).map(([specifier, entry]) => [
      specifier,
      `${PACKAGE_URL_PREFIX}${entry.name}`,
    ]),
  );
}

function packageAssets(root: string, manifest: PackageManifest | undefined): [string, Blob][] {
  return (manifest?.files ?? []).map((file) => [
    assetKey(`${PACKAGE_URL_PREFIX}${file.name}`),
    Bun.file(join(root, PACKAGE_DIR, file.name)),
  ]);
}

function packageRecord(
  manifest: PackageManifest | undefined,
  bundled: boolean,
  count: number,
): PackageRecord | undefined {
  if (!manifest) return undefined;
  const status = bundled ? "bundled" : "cached";
  return {
    modules: manifest.modules,
    files: manifest.files.map((file) => ({
      path: `${PACKAGE_URL_PREFIX}${file.name}`,
      bytes: file.bytes,
    })),
    report: { status, count },
  };
}
