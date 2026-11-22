import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateDtsBundle } from "dts-bundle-generator";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PACKAGE_DIR = "packages/language-tools";
const VSCODE_ENTRY = "vscode";

interface PackageJson {
  version?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

async function readPackageJson(path: string): Promise<PackageJson> {
  return JSON.parse(await readFile(path, "utf8")) as PackageJson;
}

function externalNames(toolsPackage: PackageJson): string[] {
  return [
    ...Object.keys(toolsPackage.dependencies ?? {}),
    ...Object.keys(toolsPackage.peerDependencies ?? {}),
  ];
}

async function bundleEntry(root: string, distDir: string, version: string, external: string[]) {
  const bundle = await Bun.build({
    entrypoints: [join(root, "src/editor/host.ts")],
    outdir: distDir,
    naming: `${VSCODE_ENTRY}.js`,
    target: "node",
    format: "esm",
    minify: true,
    external,
    define: { __LUSIA_VERSION__: JSON.stringify(version) },
  });
  if (!bundle.success) {
    throw new AggregateError(bundle.logs, "editor bundle failed");
  }
}

// Bundles the types from the source, so every `#alias` import is resolved into one file.
async function bundleTypes(root: string, distDir: string): Promise<void> {
  const declarations = generateDtsBundle(
    [{ filePath: join(root, "src/editor/host.ts"), output: { noBanner: true } }],
    { preferredConfigPath: join(root, "tsconfig.editor.json") },
  );
  await writeFile(join(distDir, `${VSCODE_ENTRY}.d.ts`), declarations.join(""));
}

export async function buildEditor(root: string = ROOT): Promise<void> {
  const rootPackage = await readPackageJson(join(root, "package.json"));
  const toolsDir = join(root, PACKAGE_DIR);
  const toolsPackage = await readPackageJson(join(toolsDir, "package.json"));
  const distDir = join(toolsDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await bundleEntry(root, distDir, rootPackage.version ?? "", externalNames(toolsPackage));
  await bundleTypes(root, distDir);
}

if (import.meta.main) {
  await buildEditor();
  console.log(`Built ${PACKAGE_DIR}/dist/${VSCODE_ENTRY}.js and .d.ts`);
}
