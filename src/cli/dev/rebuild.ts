import type { LazySettings } from "#bun-plugin/children.ts";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";
import { colorEnabled, stripAnsi } from "../log/color.ts";
import { buildDev } from "../build/dev-build.ts";
import type { DevServer } from "./dev-server.ts";
import { createHotBuilder, type HotBuilder, type HotModule } from "../build/hot-build.ts";
import type { Logger } from "../log/log.ts";
import { formatRebuild, now, type Steps } from "../build/timings.ts";
import { chooseUpdate, describeUpdate, RELOAD, type Update } from "./update.ts";
import { buildHotModules } from "./hot-plan.ts";
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
  log: Logger;
  quiet: boolean;
  lazy: LazySettings;
  animate?: AnimateConfig;
}

/** Runs one build at a time. Changes that arrive mid-build are merged and built next. */
export function createRebuild({
  root,
  server,
  log,
  quiet,
  lazy: startLazy,
  animate: startAnimate,
}: RebuildOptions): Rebuild {
  let busy = false;
  let pending: Change | null = null;
  // A failed build may leave code the page never got, so the next success reloads.
  let needsReload = false;
  let lazy = startLazy;
  let animate = startAnimate;
  let hotBuilder: HotBuilder = createHotBuilder(animate);

  function applyConfig(config: DevConfig): void {
    lazy = config.lazy;
    animate = config.animate;
    hotBuilder = createHotBuilder(animate);
  }

  function report(messages: string[]): void {
    for (const message of messages) process.stderr.write(`${message}\n`);
    server.showError(stripAnsi(messages.join("\n\n")));
    needsReload = true;
  }

  async function buildAndPublish(change: Change): Promise<void> {
    const started = now();
    if (change.files.some(isConfigFile)) {
      const config = await readDevConfig(root);
      if (!config.ok) return report(config.messages);
      applyConfig(config.config);
    }
    const build = await buildDev(root, lazy, animate);
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
    const sendStart = now();
    server.publish(build.assets, update, modules);
    if (!quiet) {
      const steps: Steps = { ...build.steps, wait: change.waitMs, send: now() - sendStart };
      steps.total = now() - started;
      log.info(formatRebuild(steps, describeUpdate(update), colorEnabled()));
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

function mergeChange(pending: Change | null, change: Change): Change {
  if (!pending) return change;
  return { files: [...new Set([...pending.files, ...change.files])], waitMs: change.waitMs };
}
