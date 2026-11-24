import type { Controller } from "./controller.ts";
import { Group } from "./group.ts";
import type { ItemOptions } from "../options/options.ts";
import type { Player } from "./player.ts";
import type { ReadOptions } from "../options/trigger-options.ts";
import { sameOptions } from "../options/trigger-options.ts";
import { isLayoutOn, ON, type On, type Source } from "../modes/trigger.ts";
import { layoutModeOf } from "../modes/layout-mode.ts";
import type { GlideSpec } from "../layout/layout-glide.ts";
import type { SpaceSpec } from "../layout/space/space-closer.ts";
import type { PointerSpec } from "../options/pointer-item.ts";

/** The players that share one trigger, `once`, controller and options. A group is driven together. */
export interface Slot {
  on: On | Source;
  once: boolean;
  control: Controller | undefined;
  options: ReadOptions;
  /** Set for the layout triggers and for a glide item. Each such item has its own slot. */
  glide: GlideSpec | undefined;
  /** Set for a glide item: the variable that holds the element to glide to. */
  glideTarget: Source | undefined;
  /** Set for an item that moves its siblings with `animateSpace`. Each such item has its own slot. */
  space: SpaceSpec | undefined;
  /** Set for ON.MOUSE_MOVE. Each such item has its own slot. */
  pointer: PointerSpec | undefined;
  loops: boolean;
  group: Group;
}

interface Bucket {
  on: On | Source;
  once: boolean;
  control: Controller | undefined;
  options: ReadOptions;
  glide: GlideSpec | undefined;
  glideTarget: Source | undefined;
  space: SpaceSpec | undefined;
  pointer: PointerSpec | undefined;
  loops: boolean;
  players: Player[];
}

export function groupSlots(items: ItemOptions[], players: Player[], refresh: () => void): Slot[] {
  const buckets: Bucket[] = [];
  items.forEach((item, i) => addToBucket(buckets, item, players[i]!));
  return buckets.map((bucket) => ({
    on: bucket.on,
    once: bucket.once,
    control: bucket.control,
    options: bucket.options,
    glide: bucket.glide,
    glideTarget: bucket.glideTarget,
    space: bucket.space,
    pointer: bucket.pointer,
    loops: bucket.loops,
    group: new Group(bucket.players, refresh),
  }));
}

function addToBucket(buckets: Bucket[], item: ItemOptions, player: Player): void {
  const bucket = bucketFor(buckets, item);
  bucket.players.push(player);
  if (item.timing.loop !== undefined) bucket.loops = true;
}

function bucketFor(buckets: Bucket[], item: ItemOptions): Bucket {
  const { on, once, control, options, space, pointer, glideTarget } = item;
  const glide = glideSpecOf(item);
  const alone = glide || space || pointer;
  const found = alone
    ? undefined
    : buckets.find(
        (b) =>
          b.on === on &&
          b.once === once &&
          b.control === control &&
          sameOptions(b.options, options),
      );
  if (found) return found;
  const bucket: Bucket = {
    on,
    once,
    control,
    options,
    glide,
    glideTarget,
    space,
    pointer,
    loops: false,
    players: [],
  };
  buckets.push(bucket);
  return bucket;
}

/** A glide item holds its end box. A layout trigger returns to its layout box. */
function glideSpecOf(item: ItemOptions): GlideSpec | undefined {
  if (item.glideTarget !== undefined) {
    return { ...timingOf(item), mode: layoutModeOf(ON.MOVE_OR_RESIZE), hold: true };
  }
  if (!isLayoutOn(item.on)) return undefined;
  return { ...timingOf(item), mode: layoutModeOf(item.on), hold: false };
}

function timingOf(item: ItemOptions): Omit<GlideSpec, "mode" | "hold"> {
  return {
    duration: item.timing.duration,
    delay: item.timing.delay,
    easing: item.keyframes.ease,
  };
}
