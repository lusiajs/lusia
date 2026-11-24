import type { LazySettings } from "#bun-plugin/children.ts";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";
import { DEFAULT_SCREENS, type Screens } from "#runtime/screen/screens.ts";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { formatBuildFailure } from "./build-errors.ts";
import { assetKey, bundleApp, entryPath } from "./bundle.ts";
import { colorEnabled } from "../log/color.ts";
import { createLogger } from "../log/log.ts";
import { copyPublic } from "./public.ts";
import { writeRouteIndexes } from "./routes.ts";
import { writeScreenTypes } from "../types/screen-types.ts";
import { fileRows, formatReport } from "./report.ts";
import { addBundleStep, addStep, formatBuildSteps, now, type Steps } from "./timings.ts";
import { prepareStyles } from "./sass-warm.ts";
import { saveStyleCache } from "./sass-disk-cache.ts";
import { loadCompileCache, saveCompileCache } from "./compile-disk-cache.ts";

export interface BuildOptions {
  dir: string;
  /** Absolute, or relative to the current folder. */
  outdir: string;
  minify: boolean;
  routes?: string[];
  quiet?: boolean;
  lazy: LazySettings;
  animate?: AnimateConfig;
  screens?: Screens;
}

export async function runBuild(options: BuildOptions): Promise<number> {
  const log = createLogger("build");
  const dir = resolve(options.dir);
  const outdir = resolve(options.outdir);
  entryPath(dir);
  if (outdir === dir) {
    log.error(`the output folder must be different from the app folder: ${outdir}`);
    return 1;
  }
  if (isInside(dir, outdir)) {
    log.error(`the output folder must not contain the app folder: ${outdir}`);
    return 1;
  }
  await writeScreenTypes(dir, options.screens);

  const steps: Steps = {};
  const started = now();
  await rm(outdir, { recursive: true, force: true });
  const bundleStart = now();
  const styles = await prepareStyles(dir, options.screens ?? DEFAULT_SCREENS);
  addStep(steps, "sass", styles.ms);
  await loadCompileCache(dir);
  const result = await bundleApp({
    dir,
    minify: options.minify,
    dev: false,
    steps,
    lazy: options.lazy,
    animate: options.animate,
    screens: options.screens,
  });
  addBundleStep(steps, now() - bundleStart);
  if (!result.success) {
    process.stderr.write(`${formatBuildFailure(result.logs, colorEnabled(), dir)}\n`);
    return 1;
  }
  await saveStyleCache(dir);
  await saveCompileCache(dir);

  const writeStart = now();
  await writeOutputs(outdir, result.outputs);
  await writeRouteIndexes(outdir, options.routes ?? []);
  addStep(steps, "write", now() - writeStart);

  const copyStart = now();
  await copyPublic(dir, outdir);
  addStep(steps, "copy", now() - copyStart);
  steps.total = now() - started;

  const rows = await fileRows(outdir);
  if (!options.quiet) process.stdout.write(`${formatBuildSteps(steps)}\n\n`);
  process.stdout.write(`${formatReport(rows)}\n`);
  log.info(`built ${rows.length} files into ${relative(process.cwd(), outdir) || "."}`);
  return 0;
}

async function writeOutputs(outdir: string, outputs: Bun.BuildArtifact[]): Promise<void> {
  await Promise.all(
    outputs.map(async (output) => {
      const target = join(outdir, assetKey(output.path));
      await mkdir(dirname(target), { recursive: true });
      await Bun.write(target, output);
    }),
  );
}

function isInside(path: string, folder: string): boolean {
  return path === folder || path.startsWith(`${folder}${sep}`);
}
