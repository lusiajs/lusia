import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { BunPlugin } from "bun";
import type { SizedPath } from "./build-report.ts";
import { assetKey } from "./bundle.ts";
import {
  PACKAGE_DIR,
  type PackageEntry,
  type PackageFile,
  type PackageManifest,
  writePackageManifest,
} from "./package-manifest.ts";

const VIRTUAL = "lusia-package:";
const NAMESPACE = "lusia-package";

/** A package specifier and the file it resolves to. */
type Target = [specifier: string, file: string];

/** `@codemirror/lang-css` gives `codemirror__lang-css.js`. */
export function packageFileName(specifier: string): string {
  return `${specifier.replace(/^@/, "").replaceAll("/", "__")}.js`;
}

/** Re-exports every named export and gives the default export too, so any import form works. */
export function packageEntrySource(file: string): string {
  return [
    `import * as namespace from ${JSON.stringify(file)};`,
    `export * from ${JSON.stringify(file)};`,
    "export default namespace.default;",
    "",
  ].join("\n");
}

/**
 * One virtual entry per target, named by its index: a scoped name such as `@scope/pkg` cannot be
 * an entry name, since Bun reads it as a path.
 */
function virtualEntries(targets: Target[]): BunPlugin {
  return {
    name: "lusia-package-entries",
    setup(build) {
      build.onResolve({ filter: /^lusia-package:/ }, ({ path }) => ({
        path: path.slice(VIRTUAL.length),
        namespace: NAMESPACE,
      }));
      build.onLoad({ filter: /.*/, namespace: NAMESPACE }, ({ path }) => ({
        contents: packageEntrySource(targets[Number(path)]![1]),
        loader: "js",
      }));
    },
  };
}

/** Bundles each package into its own file. Shared code goes into chunks, so each package exists once. */
export async function bundlePackages(
  root: string,
  packages: Map<string, string>,
  key: string,
): Promise<PackageManifest | undefined> {
  const targets = [...packages].sort(bySpecifier);
  const result = await buildPackages(targets).catch(() => undefined);
  if (!result?.success || !result.metafile) return undefined;
  const names = outputNames(targets, result.metafile.outputs, result.outputs);
  const manifest: PackageManifest = {
    key,
    entries: entriesOf(targets),
    files: await writeFiles(root, result.outputs, names),
    modules: moduleSizes(result.metafile.inputs),
  };
  await writePackageManifest(root, manifest);
  return manifest;
}

function bySpecifier([a]: Target, [b]: Target): number {
  return a.localeCompare(b);
}

function entriesOf(targets: Target[]): Record<string, PackageEntry> {
  return Object.fromEntries(
    targets.map(([specifier, file]) => [specifier, { name: packageFileName(specifier), file }]),
  );
}

function buildPackages(targets: Target[]): Promise<Bun.BuildOutput> {
  return Bun.build({
    entrypoints: targets.map((_, index) => `${VIRTUAL}${index}`),
    format: "esm",
    splitting: true,
    metafile: true,
    throw: false,
    naming: { entry: "[name].[ext]", chunk: "chunk-[hash].[ext]" },
    plugins: [virtualEntries(targets)],
  });
}

/** Output path to file name: entries use their specifier, chunks keep their own name. */
function outputNames(
  targets: Target[],
  outputs: Record<string, { entryPoint?: string }>,
  artifacts: Bun.BuildArtifact[],
): Map<string, string> {
  return new Map(
    artifacts.map((artifact) => {
      const entry = outputs[artifact.path]?.entryPoint;
      const name = entry?.startsWith(VIRTUAL)
        ? packageFileName(targets[Number(entry.slice(VIRTUAL.length))]![0])
        : assetKey(artifact.path);
      return [artifact.path, name];
    }),
  );
}

async function writeFiles(
  root: string,
  artifacts: Bun.BuildArtifact[],
  names: Map<string, string>,
): Promise<PackageFile[]> {
  const folder = join(root, PACKAGE_DIR);
  await rm(folder, { recursive: true, force: true });
  await mkdir(folder, { recursive: true });
  return Promise.all(
    artifacts.map(async (artifact) => {
      const name = names.get(artifact.path)!;
      await writeFile(join(folder, name), new Uint8Array(await artifact.arrayBuffer()));
      return { name, bytes: artifact.size };
    }),
  );
}

function moduleSizes(inputs: Record<string, { bytes: number }>): SizedPath[] {
  return Object.entries(inputs)
    .filter(([path]) => !path.startsWith(VIRTUAL))
    .map(([path, input]) => ({ path: resolve(path), bytes: input.bytes }));
}
