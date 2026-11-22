import type { LazySettings } from "#bun-plugin/children.ts";
import type { ModuleUpdate } from "#bun-plugin/update.ts";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";
import { formatBuildFailure } from "./build-errors.ts";
import { assetKey, bundleApp } from "./bundle.ts";
import { colorEnabled } from "../log/color.ts";
import { withReloadClient } from "../dev/reload-client.ts";
import { RUNTIME_PATH, runtimeModule } from "./runtime-module.ts";
import { RUNTIME_SPECIFIER } from "./runtime-shim.ts";
import { addBundleStep, now, type Steps } from "./timings.ts";

const IMPORT_MAP = `<script type="importmap">${JSON.stringify({
  imports: { [RUNTIME_SPECIFIER]: RUNTIME_PATH },
})}</script>`;

export type Assets = Map<string, Blob>;

export type DevBuild =
  | { ok: true; assets: Assets; changes: ModuleUpdate[]; steps: Steps }
  | { ok: false; messages: string[] };

export async function buildDev(
  dir: string,
  lazy: LazySettings,
  animate?: AnimateConfig,
): Promise<DevBuild> {
  const steps: Steps = {};
  const changes: ModuleUpdate[] = [];
  const start = now();
  const result = await bundleApp({
    dir,
    minify: false,
    dev: true,
    steps,
    lazy,
    animate,
    onUpdate: (update) => changes.push(update),
  });
  addBundleStep(steps, now() - start);
  if (!result.success)
    return { ok: false, messages: [formatBuildFailure(result.logs, colorEnabled(), dir)] };
  const entries = await Promise.all(result.outputs.map(toEntry));
  const runtime = [assetKey(RUNTIME_PATH), await runtimeModule()] as const;
  return { ok: true, assets: new Map([...entries, runtime]), changes, steps };
}

async function toEntry(output: Blob & { path: string }): Promise<[string, Blob]> {
  const key = assetKey(output.path);
  if (!output.path.endsWith(".html")) return [key, output];
  const html = withReloadClient(withImportMap(await output.text()));
  return [key, new Blob([html], { type: output.type })];
}

/** Maps the runtime's bare module names to its URL. Must come before the app's script tags. */
export function withImportMap(html: string): string {
  const head = /<head[^>]*>/i.exec(html);
  if (!head) return IMPORT_MAP + html;
  const end = head.index + head[0].length;
  return html.slice(0, end) + IMPORT_MAP + html.slice(end);
}
