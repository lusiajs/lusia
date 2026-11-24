import { isReactive } from "../../variable/reactive.ts";
import type { AnimateItem } from "../animation.ts";
import type { Controller } from "../play/controller.ts";
import type { Keyframes } from "./keyframes.ts";
import type { LoopSpec } from "../play/passes.ts";
import { animateDefault } from "./defaults.ts";
import { animateConfig } from "./config-store.ts";
import { readMs } from "./read-ms.ts";
import { readMidway, type MidwayOptions } from "./midway-options.ts";
import { ON, isLayoutOn, isOn, type On, type Source } from "../modes/trigger.ts";
import { readOptions, type ReadOptions } from "./trigger-options.ts";
import type { SpaceSpec } from "../layout/space/space-closer.ts";
import { runtimeError } from "../../errors.ts";
import { ITEM_KEYS, SPELLING_HINT, unknownKeyValues } from "./keys.ts";
import { readKeyframes } from "./item-style.ts";
import { rejectOldNames } from "./old-names.ts";

export interface Timing {
  duration: number;
  delay: number;
  loop: LoopSpec | undefined;
  keep: boolean;
  midway: MidwayOptions;
}

export interface ItemOptions {
  keyframes: Keyframes;
  timing: Timing;
  on: On | Source;
  once: boolean;
  control: Controller | undefined;
  options: ReadOptions;
  /** Set for an ATTACH or DETACH item with `animateSpace`. It slides the siblings into the space. */
  space: SpaceSpec | undefined;
}

export function readItem(item: AnimateItem): ItemOptions {
  rejectOldNames(item);
  rejectUnknownKeys(item);
  const on = readOn(item);
  rejectLoop(item, on);
  const duration = readMs(item.duration, animateDefault().duration, "duration");
  const options = readOptions(on, item.options, { duration });
  const keyframes = readKeyframes(item, on);
  const timing = {
    duration,
    delay: readMs(item.delay, animateConfig().delay ?? 0, "delay"),
    loop: readLoop(item.loop, item.backAndForth),
    keep: readKeep(item.keep),
    midway: readMidway(item.midway),
  };
  return {
    keyframes,
    timing,
    space: readSpace(on, options, keyframes, timing),
    on,
    once: item.once ?? (on === ON.VIEW && !options.reverse),
    control: item.control,
    options,
  };
}

function readSpace(
  on: On | Source,
  options: ReadOptions,
  keyframes: Keyframes,
  timing: Timing,
): SpaceSpec | undefined {
  if (!isSpaceOn(on) || !options.space.animateSpace) return undefined;
  return { duration: timing.duration, delay: timing.delay, keyframes };
}

function isSpaceOn(on: On | Source): boolean {
  return on === ON.ATTACH || on === ON.DETACH;
}

/** A removed member such as ON.IN is undefined, so an `on` key with no value means an old name. */
function readOn(item: AnimateItem): On | Source {
  if ("on" in item && item.on === undefined) throw runtimeError("L2044");
  const on = item.on ?? ON.ATTACH;
  if (isReactive(on) || isOn(on)) return on;
  throw runtimeError("L2002");
}

/** An item keeps its last frame unless `keep: false`. Without its own value it takes the config's. */
function readKeep(keep: boolean | undefined): boolean {
  if (keep === undefined) return animateConfig().keep ?? true;
  return keep !== false;
}

/** A scroll-linked item follows the page position, and a glide plays once per change, so neither loops. */
function rejectLoop(item: AnimateItem, on: On | Source): void {
  if (!item.loop) return;
  if (on === ON.SCROLL) throw runtimeError("L2009");
  if (isLayoutOn(on)) throw runtimeError("L2051");
}

/** Runs after the old names are rejected, so any key left that is not an item key is a typo. */
function rejectUnknownKeys(item: AnimateItem): void {
  for (const key of Object.keys(item)) {
    if (!ITEM_KEYS.includes(key)) {
      throw runtimeError("L2055", unknownKeyValues(key, ITEM_KEYS, SPELLING_HINT), key);
    }
  }
}

/** `loop: true` repeats forever; a number repeats that many times. Zero or missing means no loop. */
function readLoop(
  loop: boolean | number | undefined,
  backAndForth: boolean | undefined,
): LoopSpec | undefined {
  if (!loop) return undefined;
  const count = loop === true ? Infinity : loop;
  if (!(count >= 0)) throw runtimeError("L2004", { value: String(loop) });
  if (count === 0) return undefined;
  return { count, backAndForth: backAndForth === true };
}
