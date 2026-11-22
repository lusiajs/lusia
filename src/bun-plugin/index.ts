import { toCachedModule, storeModule, cachedModule, pruneModules, compileKey } from "./cache.ts";
import { compileFile } from "./compile.ts";
import { lazyKeyFor, lazyOptionsFor, type LazySettings } from "./children.ts";
import { animateNamesJson, animatePrelude } from "./animate-prelude.ts";
import { screensKey, screenPrelude } from "./screen-prelude.ts";
import { setupFallback } from "./fallback.ts";
import { now, addStep, type Steps } from "#cli/build/timings.ts";
import type { BunPlugin } from "bun";
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
}

export function lusia({
  dev = false,
  steps = {},
  onUpdate,
  lazy,
  animate = {},
  screens,
}: LusiaPluginOptions = {}): BunPlugin {
  return {
    name: "lusia",
    setup(build) {
      pruneModules();
      const prelude = animatePrelude(animate) + screenPrelude(screens);
      const animateKey = animateNamesJson(animate);
      const screenKey = screensKey(screens);
      build.onLoad({ filter: /\.lusia$/ }, async ({ path }) => {
        const source = await Bun.file(path).text();
        const key = compileKey(lazyKeyFor(path, source, lazy), animateKey, screenKey);
        const cached = cachedModule(path, source, dev, key);
        if (cached) return { contents: cached.code, loader: "ts" };

        const start = now();
        const result = compileFile(
          source,
          path,
          dev,
          lazy && lazyOptionsFor(path, lazy),
          screens,
        );
        const next = toCachedModule(source, dev, { ...result, code: prelude + result.code }, key);
        const update = moduleUpdate(path, storeModule(path, next), next);
        if (update) onUpdate?.(update);
        addStep(steps, "sass", result.sassMs);
        addStep(steps, "compile", now() - start - result.sassMs);
        return { contents: next.code, loader: "ts" };
      });
      setupFallback(build, dev);
      setupRaw(build);
    },
  };
}

export default lusia;
