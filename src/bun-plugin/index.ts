import { toCachedModule, storeModule, cachedModule, pruneModules, compileKey } from "./cache.ts";
import { compileFile } from "./compile.ts";
import { lazyKeyFor, lazyOptionsFor, type LazySettings } from "./children.ts";
import { animateNamesJson, animatePrelude } from "./animate-prelude.ts";
import { screensKey, screenPrelude } from "./screen-prelude.ts";
import { setupFallback } from "./fallback.ts";
import { now, addStep, type Steps } from "#cli/build/timings.ts";
import { recordCompile, type BuildReport } from "#cli/build/build-report.ts";
import type { BunPlugin } from "bun";
import { statSync } from "node:fs";
import { moduleUpdate, type ModuleUpdate } from "./update.ts";
import { setupRaw } from "./raw.ts";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";
import type { Screens } from "#runtime/screen/screens.ts";

export interface LusiaPluginOptions {
  /** Dev builds keep runtime error locations. Default false. */
  dev?: boolean;
  /** Receives the time spent in the compiler (`compile`) and in Sass (`sass`). */
  steps?: Steps;
  /** Receives each .lusia file whose output was updated since the last build. */
  onUpdate?: (update: ModuleUpdate) => void;
  /** Splits imported .lusia files into their own chunks. Default: off. */
  lazy?: LazySettings;
  /** Static animate defaults, set in every compiled module. Default: none. */
  animate?: AnimateConfig;
  /** Screen sizes from lusia.config. Default: PHONE, TABLET and DESKTOP. */
  screens?: Screens;
  /** Receives the files compiled and the styles compiled in this build. */
  report?: BuildReport;
}

export function lusia({
  dev = false,
  steps = {},
  onUpdate,
  lazy,
  animate = {},
  screens,
  report,
}: LusiaPluginOptions = {}): BunPlugin {
  return {
    name: "lusia",
    setup(build) {
      pruneModules();
      const prelude = animatePrelude(animate) + screenPrelude(screens);
      const animateKey = animateNamesJson(animate);
      const screenKey = screensKey(screens);
      build.onLoad({ filter: /\.lusia$/ }, async ({ path }) => {
        // Stat before reading: a write in between must look stale, not current.
        const lastModified = statSync(path).mtimeMs;
        const source = await Bun.file(path).text();
        const key = compileKey(lazyKeyFor(path, source, lazy), animateKey, screenKey);
        const bytes = Buffer.byteLength(source);
        const cached = cachedModule(path, source, dev, key);
        if (cached) {
          if (report) recordCompile(report, { file: path, ms: 0, bytes, cached: true }, []);
          return { contents: cached.code, loader: "ts" };
        }

        const start = now();
        const result = compileFile(source, path, dev, lazy && lazyOptionsFor(path, lazy), screens);
        const read = { path, lastModified, source, dev, key };
        const next = toCachedModule(read, { ...result, code: prelude + result.code });
        const update = moduleUpdate(path, storeModule(path, next), next);
        if (update) onUpdate?.(update);
        const compileMs = now() - start - result.sassMs;
        addStep(steps, "sass", result.sassMs);
        addStep(steps, "compile", compileMs);
        if (report) {
          const timing = { file: path, ms: compileMs, bytes, cached: false };
          recordCompile(report, timing, result.styleBlocks);
        }
        return { contents: next.code, loader: "ts" };
      });
      setupFallback(build, dev);
      setupRaw(build);
    },
  };
}

export default lusia;
