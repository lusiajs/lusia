import { lusia } from "#bun-plugin/index.ts";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";
import type { Screens } from "#runtime/screen/screens.ts";
import { basename } from "node:path";
import { formatBuildFailure } from "./build-errors.ts";
import { colorEnabled } from "../log/color.ts";
import { isShimInput, RUNTIME_SPECIFIER, runtimeShim } from "./runtime-shim.ts";

export interface HotModule {
  url: string;
  /** Other files would not share their state with the page. */
  onlyComponents: boolean;
  body: Blob;
}

type HotBuild = { ok: true; module: HotModule } | { ok: false; messages: string[] };

export interface HotBuilder {
  build(file: string): Promise<HotBuild>;
}

export function createHotBuilder(animate?: AnimateConfig, screens?: Screens): HotBuilder {
  let sequence = 0;

  return {
    async build(file) {
      const result = await Bun.build({
        entrypoints: [file],
        format: "esm",
        target: "browser",
        minify: false,
        throw: false,
        metafile: true,
        external: [RUNTIME_SPECIFIER],
        plugins: [lusia({ dev: true, animate, screens }), runtimeShim()],
      });
      if (!result.success)
        return { ok: false, messages: [formatBuildFailure(result.logs, colorEnabled())] };
      const body = new Blob([await result.outputs[0]!.text()], { type: "text/javascript" });
      const inputs = Object.keys(result.metafile!.inputs);
      const onlyComponents = inputs.every(
        (input) => input.endsWith(".lusia") || isShimInput(input),
      );
      sequence++;
      const url = `/__lusia/hot/${Date.now()}-${sequence}-${encodeURIComponent(basename(file))}.js`;
      return { ok: true, module: { url, onlyComponents, body } };
    },
  };
}
