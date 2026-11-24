import type { LazySettings } from "#bun-plugin/children.ts";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";
import type { Screens } from "#runtime/screen/screens.ts";
import { stripAnsi } from "../log/color.ts";
import { buildDev } from "../build/dev-build.ts";
import type { DevServer } from "./dev-server.ts";
import { createHotBuilder, type HotBuilder, type HotModule } from "../build/hot-build.ts";
import type { UpdateBlock } from "../log/dev-block.ts";
import { now, type Steps } from "../build/timings.ts";
import { chooseUpdate, RELOAD, type Update } from "./update.ts";
import { buildHotModules } from "./hot-plan.ts";
import { writeScreenTypes } from "../types/screen-types.ts";
import { type DevConfig, isConfigFile, readDevConfig } from "./config-reload.ts";

interface Change {
  files: string[];
  waitMs: number;
}

interface Rebuild {
  request(change: Change): Promise<void>;
}

interface RebuildOptions {
  root: string;
  server: DevServer;
  onUpdate: (update: UpdateBlock) => void;
  onBuildError: (messages: string[]) => void;
  lazy: LazySettings;
  animate?: AnimateConfig;
  screens?: Screens;
}

/** Runs one build at a time. Changes that arrive mid-build are merged and built next. */
export function createRebuild({
  root,
  server,
  onUpdate,
  onBuildError,
  lazy: startLazy,
  animate: startAnimate,
  screens: startScreens,
}: RebuildOptions): Rebuild {
  let busy = false;
  let pending: Change | null = null;
  // A failed build may leave code the page never got, so the next success reloads.
  let needsReload = false;
  let lazy = startLazy;
  let animate = startAnimate;
  let screens = startScreens;
  let hotBuilder: HotBuilder = createHotBuilder(animate, screens);

  function applyConfig(config: DevConfig): void {
    lazy = config.lazy;
    animate = config.animate;
    screens = config.screens;
    hotBuilder = createHotBuilder(animate, screens);
  }

  function report(messages: string[]): void {
    onBuildError(messages);
    server.showError(stripAnsi(messages.join("\n\n")));
    needsReload = true;
  }

  async function buildAndPublish(change: Change): Promise<void> {
    const started = now();
    if (change.files.some(isConfigFile)) {
      const config = await readDevConfig(root);
      if (!config.ok) return report(config.messages);
      applyConfig(config.config);
      await writeScreenTypes(root, config.config.screens);
    }
    const build = await buildDev(root, lazy, animate, screens);
    if (!build.ok) return report(build.messages);
    const planned: Update = needsReload ? RELOAD : chooseUpdate(change.files, build.changes);
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
    if (change.files.length > 0) {
      const steps: Steps = { ...build.steps, wait: change.waitMs, total: now() - started };
      onUpdate({ time: new Date(), kind: blockKind(update), files: change.files, steps });
    }
  }

  return {
    async request(change) {
      pending = mergeChange(pending, change);
      if (busy) return;
      busy = true;
      try {
        while (pending) {
          const next = pending;
          pending = null;
          await buildAndPublish(next);
        }
      } finally {
        busy = false;
      }
    },
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
