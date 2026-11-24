import type { LazySettings } from "#bun-plugin/children.ts";
import type { ModuleUpdate } from "#bun-plugin/update.ts";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";
import type { Screens } from "#runtime/screen/screens.ts";
import { formatBuildFailure } from "./build-errors.ts";
import { assetKey, bundleApp } from "./bundle.ts";
import type { BuildCache } from "./build-cache.ts";
import { colorEnabled } from "../log/color.ts";
import { withReloadClient } from "../dev/reload-client.ts";
import { RUNTIME_PATH, runtimeModule } from "./runtime-module.ts";
import { RUNTIME_SPECIFIER } from "./runtime-shim.ts";
import { addBundleStep, now, type Steps } from "./timings.ts";
import { emptyReport, recordBundle, recordPackages, type BuildReport } from "./build-report.ts";

export type Assets = Map<string, Blob>;

export type DevBuild =
  | {
      ok: true;
      assets: Assets;
      changes: ModuleUpdate[];
      steps: Steps;
      report: BuildReport;
      /** The packages were bundled again, so the page must reload to share the new copies. */
      packagesBundled: boolean;
    }
  | { ok: false; messages: string[] };

interface DevApp {
  dir: string;
  cache: BuildCache;
  lazy: LazySettings;
  animate?: AnimateConfig;
  screens?: Screens;
  steps: Steps;
  changes: ModuleUpdate[];
  report: BuildReport;
}

export async function buildDev(
  dir: string,
  cache: BuildCache,
  lazy: LazySettings,
  animate?: AnimateConfig,
  screens?: Screens,
): Promise<DevBuild> {
  const steps: Steps = {};
  const changes: ModuleUpdate[] = [];
  const report = emptyReport(dir);
  const start = now();
  const app: DevApp = { dir, cache, lazy, animate, screens, steps, changes, report };
  let result = await bundleDevApp(app);
  const packagesBundled = result.success && (await cache.bundleMissing(result));
  if (packagesBundled) result = await bundleDevApp({ ...app, report: emptyReport(dir) });
  addBundleStep(steps, now() - start);
  if (!result.success)
    return { ok: false, messages: [formatBuildFailure(result.logs, colorEnabled(), dir)] };
  recordBundle(report, result);
  const packages = cache.record();
  if (packages) recordPackages(report, packages);
  const toPageEntry = toEntry(importMapTag(cache.importMap()));
  const entries = await Promise.all(result.outputs.map(toPageEntry));
  const runtime = [assetKey(RUNTIME_PATH), await runtimeModule()] as const;
  return {
    ok: true,
    assets: new Map([...entries, runtime, ...cache.assets()]),
    changes,
    steps,
    report,
    packagesBundled,
  };
}

function bundleDevApp(app: DevApp): Promise<Bun.BuildOutput> {
  return bundleApp({
    dir: app.dir,
    cache: app.cache,
    minify: false,
    dev: true,
    steps: app.steps,
    lazy: app.lazy,
    animate: app.animate,
    screens: app.screens,
    report: app.report,
    onUpdate: (update) => app.changes.push(update),
  });
}

function toEntry(importMap: string): (output: Blob & { path: string }) => Promise<[string, Blob]> {
  return async (output) => {
    const key = assetKey(output.path);
    if (!output.path.endsWith(".html")) return [key, output];
    const html = withReloadClient(withImportMap(await output.text(), importMap));
    return [key, new Blob([html], { type: output.type })];
  };
}

/** Maps the runtime and each bundled package to its URL. Must come before the app's script tags. */
function importMapTag(packageUrls: Record<string, string>): string {
  const imports = { [RUNTIME_SPECIFIER]: RUNTIME_PATH, ...packageUrls };
  return `<script type="importmap">${JSON.stringify({ imports })}</script>`;
}

function withImportMap(html: string, importMap: string): string {
  const head = /<head[^>]*>/i.exec(html);
  if (!head) return importMap + html;
  const end = head.index + head[0].length;
  return html.slice(0, end) + importMap + html.slice(end);
}
