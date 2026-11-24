import { basename, resolve, sep } from "node:path";
import type { LazySettings } from "#bun-plugin/children.ts";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";
import type { Screens } from "#runtime/screen/screens.ts";
import { version } from "../../../package.json" with { type: "json" };
import { colorEnabled } from "../log/color.ts";
import { formatBrowserError, formatBuildError } from "../log/dev-block.ts";
import { formatHeader, type HeaderUrl } from "../log/dev-header.ts";
import { entryPath } from "../build/bundle.ts";
import { now, type Steps } from "../build/timings.ts";
import { prepareStyles } from "../build/sass-warm.ts";
import { saveStyleCache } from "../build/sass-disk-cache.ts";
import { DEFAULT_SCREENS } from "#runtime/screen/screens.ts";
import { createDevServer } from "./dev-server.ts";
import { networkAddress } from "./network-address.ts";
import { createRebuild } from "./rebuild.ts";
import { createUpdatePrinter } from "./update-printer.ts";
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
  const rebuild = createRebuild({
    root,
    server,
    lazy,
    animate,
    screens,
    onUpdate: (update) => printer.show(update),
    onBuildError: (messages) =>
      printer.print(formatBuildError(new Date(), relativeTo(root, messages), color)),
  });
  const styles = await prepareStyles(root, screens ?? DEFAULT_SCREENS);
  const firstBuild = (await rebuild.request({ files: [], waitMs: 0 })) ?? {};
  const startup = startupSteps({ started, types, styles, build: firstBuild, total: now() });
  void saveStyleCache(root);

  printer.print(
    formatHeader({
      urls: serverUrls(server.url),
      version: `v${version}`,
      startup,
      quiet,
      watching: `${basename(root)}/`,
      width: terminalWidth(),
      color,
    }),
  );
  const watcher = watchFolder(root, (files, waitMs) => {
    void rebuild.request({ files, waitMs });
  });
  return {
    url: server.url,
    stop() {
      watcher.close();
      server.stop();
    },
  };
}

interface StartupTimes {
  started: number;
  types: number;
  styles: number;
  build: Steps;
  total: number;
}

/** Server is the time left over: everything from the first build's end to the header print. */
function startupSteps({ started, types, styles, build, total }: StartupTimes): Steps {
  const sass = styles + (build.sass ?? 0);
  const buildMs = sass + (build.compile ?? 0) + (build.bundle ?? 0);
  const server = total - started - types - buildMs;
  return {
    boot: started,
    types,
    sass,
    compile: build.compile,
    bundle: build.bundle,
    server,
    total,
  };
}

/** Build messages show paths from the app folder, not the whole disk path. */
function relativeTo(root: string, messages: string[]): string[] {
  const prefix = `${root}${sep}`;
  return messages.map((message) => message.split(prefix).join(""));
}

function serverUrls(url: URL): HeaderUrl[] {
  const address = networkAddress();
  const local = { label: "Local", url: url.href };
  // The dev server binds all interfaces, so the LAN address reaches it.
  if (!address) return [local];
  return [local, { label: "Network", url: `http://${address}:${url.port}/` }];
}

// Some terminals report 0 columns, which would squash the box.
function terminalWidth(): number {
  const columns = process.stderr.columns;
  return columns && columns > 0 ? columns : Infinity;
}
