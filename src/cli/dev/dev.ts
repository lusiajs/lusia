import { resolve } from "node:path";
import type { LazySettings } from "#bun-plugin/children.ts";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";
import type { Screens } from "#runtime/screen/screens.ts";
import { colorEnabled } from "../log/color.ts";
import { entryPath } from "../build/bundle.ts";
import { createDevServer } from "./dev-server.ts";
import { createLogger } from "../log/log.ts";
import { formatBrowserReady } from "../build/timings.ts";
import { createRebuild } from "./rebuild.ts";
import { watchFolder } from "./watch.ts";
import { writeScreenTypes } from "../types/screen-types.ts";

export interface DevOptions {
  dir: string;
  port: number;
  /** Hides the timing lines. Errors and file changes still show. */
  quiet?: boolean;
  lazy: LazySettings;
  animate?: AnimateConfig;
  screens?: Screens;
}

export interface DevHandle {
  url: URL;
  stop(): void;
}

export async function startDev({
  dir,
  port,
  quiet = false,
  lazy,
  animate,
  screens,
}: DevOptions): Promise<DevHandle> {
  const root = resolve(dir);
  const log = createLogger("dev");
  entryPath(root);
  await writeScreenTypes(root, screens);

  const server = createDevServer({
    dir: root,
    port,
    onReady: (ms) => {
      if (!quiet) log.info(formatBrowserReady(ms, colorEnabled()));
    },
  });
  const rebuild = createRebuild({ root, server, log, quiet, lazy, animate, screens });
  await rebuild.request({ files: [], waitMs: 0 });

  const watcher = watchFolder(root, (files, waitMs) => {
    log.info(`changed ${files.join(", ")}`);
    void rebuild.request({ files, waitMs });
  });
  log.info(`serving ${server.url.href}`);
  return {
    url: server.url,
    stop() {
      watcher.close();
      server.stop();
    },
  };
}
