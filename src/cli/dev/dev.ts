import { basename, resolve, sep } from "node:path";
import type { LazySettings } from "#bun-plugin/children.ts";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";
import type { Screens } from "#runtime/screen/screens.ts";
import { version } from "../../../package.json" with { type: "json" };
import { colorEnabled } from "../log/color.ts";
import { formatBrowserError, formatBuildError } from "../log/dev-block.ts";
import { formatHeader } from "../log/dev-header.ts";
import { entryPath } from "../build/bundle.ts";
import { now } from "../build/timings.ts";
import { emptyReport } from "../build/build-report.ts";
import { startupDetails } from "../log/dev-detail.ts";
import { prepareStyles } from "../build/sass-warm.ts";
import { saveStyleCache } from "../build/sass-disk-cache.ts";
import { DEFAULT_SCREENS } from "#runtime/screen/screens.ts";
import { createDevServer } from "./dev-server.ts";
import { startShortcuts } from "./key-actions.ts";
import { createRebuild } from "./rebuild.ts";
import { serverUrls } from "./server-urls.ts";
import { startupSteps } from "./startup.ts";
import { createUpdatePrinter } from "./update-printer.ts";
import { watchFolder } from "./watch.ts";
import { writeScreenTypes } from "../types/screen-types.ts";

const INTERRUPT_EXIT_CODE = 130;

export interface DevOptions {
  dir: string;
  port: number;
  /** Hides the timing lines. Errors and file changes still show. */
  quiet?: boolean;
  lazy: LazySettings;
  animate?: AnimateConfig;
  screens?: Screens;
  /** Time spent reading lusia.config, shown under the boot step. */
  configMs?: number;
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
  configMs,
}: DevOptions): Promise<DevHandle> {
  const started = now();
  const root = resolve(dir);
  const color = colorEnabled();
  entryPath(root);
  const typesStart = now();
  await writeScreenTypes(root, screens);
  const types = now() - typesStart;

  const printer = createUpdatePrinter((text) => process.stderr.write(`${text}\n`), {
    color,
    showTiming: !quiet,
  });
  const server = createDevServer({
    dir: root,
    port,
    onReady: (ms) => printer.ready(ms),
    onBrowserError: (error) =>
      printer.print(formatBrowserError({ time: new Date(), ...error }, color)),
  });
  const styles = await prepareStyles(root, screens ?? DEFAULT_SCREENS);
  const rebuild = createRebuild({
    root,
    server,
    lazy,
    animate,
    screens,
    startStyles: styles.blocks,
    onUpdate: (update) => printer.show(update),
    onBuildError: (messages) =>
      printer.print(formatBuildError(new Date(), relativeTo(root, messages), color)),
  });
  const firstBuild = (await rebuild.startup()) ?? {
    steps: {},
    report: emptyReport(root),
  };
  const startup = startupSteps({
    started,
    types,
    styles: styles.ms,
    build: firstBuild.steps,
    total: now(),
    configMs,
  });
  void saveStyleCache(root);

  const urls = serverUrls(server.url);
  printer.print(
    formatHeader({
      urls,
      version: `v${version}`,
      startup,
      details: startupDetails(firstBuild.report, startup),
      quiet,
      watching: `${basename(root)}/`,
      width: terminalWidth(),
      color,
    }),
  );
  const watcher = watchFolder(root, (files, waitMs) => {
    void rebuild.request({ files, waitMs });
  });

  const keys = startShortcuts({
    root,
    urls,
    localUrl: server.url.href,
    startup,
    color,
    printer,
    rebuild,
    onInterrupt: () => {
      stop();
      process.exit(INTERRUPT_EXIT_CODE);
    },
  });
  function stop(): void {
    keys?.stop();
    watcher.close();
    server.stop();
  }
  return { url: server.url, stop };
}

/** Build messages show paths from the app folder, not the whole disk path. */
function relativeTo(root: string, messages: string[]): string[] {
  const prefix = `${root}${sep}`;
  return messages.map((message) => message.split(prefix).join(""));
}

// Some terminals report 0 columns, which would squash the box.
function terminalWidth(): number {
  const columns = process.stderr.columns;
  return columns && columns > 0 ? columns : Infinity;
}
