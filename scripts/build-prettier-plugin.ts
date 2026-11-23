import { rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PACKAGE_DIR = "packages/prettier-plugin";

export async function buildPrettierPlugin(root: string = ROOT): Promise<void> {
  const distDir = join(root, PACKAGE_DIR, "dist");
  await rm(distDir, { recursive: true, force: true });

  const bundle = await Bun.build({
    entrypoints: [join(root, "src/prettier-plugin/index.ts")],
    outdir: distDir,
    naming: "index.js",
    target: "node",
    format: "esm",
    minify: true,
    external: ["prettier"],
  });
  if (!bundle.success) {
    throw new AggregateError(bundle.logs, "prettier plugin bundle failed");
  }
}

if (import.meta.main) {
  await buildPrettierPlugin();
  console.log(`Built ${PACKAGE_DIR}/dist/index.js`);
}
