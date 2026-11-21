import type { Cleanup } from "../dom/template/bindings.ts";
import type { Leave } from "../dom/component/leave.ts";
import { itemsOf, type Animate } from "./animation.ts";
import { prepareTimeline } from "./options/keyframes.ts";
import { readItem } from "./options/options.ts";
import { Player } from "./play/player.ts";
import { ownTimelines } from "./play/timeline.ts";
import { WHEN } from "./modes/trigger.ts";
import { bindTrigger } from "./play/triggers.ts";
import { groupSlots, type Slot } from "./play/slots.ts";
import { runtimeError, withWhere, type KeyWheres } from "../errors.ts";
import { currentScope } from "../config/scope.ts";
import { resolveConfig } from "../config/resolve.ts";
import type { AnimateConfig } from "./options/config.ts";
import {
  rememberAnimateConfig,
  withAnimateConfig,
  withElementConfig,
} from "./options/config-store.ts";

/** Compiled `animate={...}`. The value is read again at every play, so keyframes can come from variables. */
export function animate(
  el: HTMLElement,
  readValue: () => Animate,
  cleanups: Cleanup[],
  leaves: Leave[],
  where?: string,
  keys?: KeyWheres,
): void {
  const config = scopeAnimateConfig();
  rememberAnimateConfig(el, config);
  withAnimateConfig(config, () => bindAnimate(el, readValue, cleanups, leaves, where, keys));
}

// The scope is read once, at bind, so later setConfig calls never move an element already bound.
function scopeAnimateConfig(): AnimateConfig {
  return resolveConfig(currentScope()).animate ?? {};
}

function bindAnimate(
  el: HTMLElement,
  readValue: () => Animate,
  cleanups: Cleanup[],
  leaves: Leave[],
  where?: string,
  keys?: KeyWheres,
): void {
  const first = withWhere(where, () => itemsOf(readValue()).map(readItem), keys);
  const players = first.map(() => new Player(el.style));
  const load = (): void => loadTimelines(el, readValue, players);
  const reload = (): void => withElementConfig(el, () => withWhere(where, load, keys));
  reload();
  const slots = groupSlots(first, players, reload);
  for (const slot of startOrder(slots)) slot.group.show(0);
  cleanups.push(() => slots.forEach((slot) => slot.group.cancel()));
  for (const slot of slots) {
    if (slot.control) cleanups.push(slot.control.attach(slot.group));
    bindTrigger(el, slot, cleanups, leaves);
  }
}

function loadTimelines(el: HTMLElement, readValue: () => Animate, players: Player[]): void {
  const items = itemsOf(readValue()).map(readItem);
  if (items.length !== players.length) throw runtimeError("L2039");
  const timelines = ownTimelines(
    items.map((item) => ({
      timeline: prepareTimeline(item.keyframes, el),
      detach: item.when === WHEN.DETACH,
    })),
  );
  players.forEach((player, i) => player.load(timelines[i]!, items[i]!.timing));
}

/** DETACH slots write their start first, so an enter item's start values win on a shared property. */
function startOrder(slots: Slot[]): Slot[] {
  const detach = slots.filter((slot) => slot.when === WHEN.DETACH);
  return [...detach, ...slots.filter((slot) => slot.when !== WHEN.DETACH)];
}
