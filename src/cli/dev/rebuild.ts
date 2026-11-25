import type { LazySettings } from "#bun-plugin/children.ts";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";
import type { Screens } from "#runtime/screen/screens.ts";
import { stripAnsi } from "../log/color.ts";
import { buildDev } from "../build/dev-build.ts";
import type { BuildCache } from "../build/build-cache.ts";
import type { DevServer } from "./dev-server.ts";
import { createHotBuilder, type HotBuilder, type HotModule } from "../build/hot-build.ts";
import type { UpdateBlock } from "../log/dev-block.ts";
import { now, type Steps } from "../build/timings.ts";
import type { BuildReport, StyleTiming } from "../build/build-report.ts";
import { chooseUpdate, RELOAD, type Update } from "./update.ts";
import { buildHotModules } from "./hot-plan.ts";
import { writeScreenTypes } from "../types/screen-types.ts";
import { type DevConfig, isConfigFile, readDevConfig } from "./config-reload.ts";

interface Change {
  files: string[];
  waitMs: number;
  /** The first build. It prints no update block, and its styles come from the warm step. */
  startup?: boolean;
}

export interface BuildSummary {
  steps: Steps;
  report: BuildReport;
}

export interface Rebuild {
  request(change: Change): Promise<BuildSummary | undefined>;
  startup(): Promise<BuildSummary | undefined>;
  /** Rebuilds everything and sends a full reload to the page. */
  reload(): Promise<BuildSummary | undefined>;
  lastReport(): BuildReport | undefined;
}

interface RebuildOptions {
  root: string;
  cache: BuildCache;
  server: DevServer;
  onUpdate: (update: UpdateBlock) => void;
  onBuildError: (messages: string[]) => void;
  lazy: LazySettings;
  animate?: AnimateConfig;
  screens?: Screens;
  routes: Record<string, string>;
  /** Style blocks the startup warm step compiled. The startup build reports these. */
  startStyles: StyleTiming[];
  /** Called after each successful build, once its files are published. */
  onBuilt: () => void;
}

/** Runs one build at a time. Changes that arrive mid-build are merged and built next. */
export function createRebuild({
  root,
  cache,
  server,
  onUpdate,
  onBuildError,
  onBuilt,
  lazy: startLazy,
  animate: startAnimate,
  screens: startScreens,
  routes: startRoutes,
  startStyles,
}: RebuildOptions): Rebuild {
  let busy = false;
  let pending: Change | null = null;
  // A failed build may leave code the page never got, so the next success reloads.
  let needsReload = false;
  let lazy = startLazy;
  let animate = startAnimate;
  let screens = startScreens;
  let routes = startRoutes;
  let hotBuilder: HotBuilder = createHotBuilder(animate, screens);
  let latestReport: BuildReport | undefined;

  function applyConfig(config: DevConfig): void {
    lazy = config.lazy;
    animate = config.animate;
    screens = config.screens;
    routes = config.routes ?? {};
    hotBuilder = createHotBuilder(animate, screens);
  }

  function report(messages: string[]): undefined {
    onBuildError(messages);
    server.showError(stripAnsi(messages.join("\n\n")));
    needsReload = true;
    return undefined;
  }

  function reportFor(change: Change, buildReport: BuildReport): BuildReport {
    return change.startup ? { ...buildReport, styles: startStyles } : buildReport;
  }

  async function buildAndPublish(change: Change): Promise<BuildSummary | undefined> {
    const started = now();
    if (change.files.some(isConfigFile)) {
      const config = await readDevConfig(root);
      if (!config.ok) return report(config.messages);
      applyConfig(config.config);
      await writeScreenTypes(root, config.config.screens);
    }
    const build = await buildDev(root, cache, lazy, animate, screens, routes);
    if (!build.ok) return report(build.messages);
    const buildReport = reportFor(change, build.report);
    latestReport = buildReport;
    const planned: Update =
      needsReload || build.packagesBundled ? RELOAD : chooseUpdate(change.files, build.changes);
    let update = planned;
    let modules: HotModule[] = [];
    if (planned.kind === "hot") {
      const plan = await buildHotModules(hotBuilder, planned.paths);
      if (!plan.ok) return report(plan.messages);
      // A module that copies other files cannot share their state with the page, so it reloads.
      if (plan.modules.every((module) => module.onlyComponents)) modules = plan.modules;
      else update = RELOAD;
    }
    needsReload = false;
    server.publish(build.assets, update, modules);
    onBuilt();
    if (!change.startup) {
      const steps: Steps = { ...build.steps, wait: change.waitMs, total: now() - started };
      onUpdate({ time: new Date(), kind: blockKind(update), files: change.files, steps });
    }
    return { steps: build.steps, report: buildReport };
  }

  async function request(change: Change): Promise<BuildSummary | undefined> {
    pending = mergeChange(pending, change);
    if (busy) return undefined;
    busy = true;
    let first: BuildSummary | undefined;
    try {
      while (pending) {
        const next = pending;
        pending = null;
        const summary = await buildAndPublish(next);
        first ??= summary;
      }
    } finally {
      busy = false;
    }
    return first;
  }

  return {
    request,
    startup: () => request({ files: [], waitMs: 0, startup: true }),
    reload: () => request({ files: [], waitMs: 0 }),
    lastReport: () => latestReport,
  };
}

function blockKind(update: Update): UpdateBlock["kind"] {
  if (update.kind === "reload") return "reload";
  return update.kind === "styles" ? "css" : "hot";
}

function mergeChange(pending: Change | null, change: Change): Change {
  if (!pending) return change;
  return { files: [...new Set([...pending.files, ...change.files])], waitMs: change.waitMs };
}
