import type { Controller } from "./controller.ts";
import { Group } from "./group.ts";
import type { ItemOptions } from "../options/options.ts";
import type { Player } from "./player.ts";
import type { ReadOptions } from "../options/trigger-options.ts";
import { sameOptions } from "../options/trigger-options.ts";
import { isLayoutOn, type On, type Source } from "../modes/trigger.ts";
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
  /** Set for the layout triggers, which glide the element. Each layout item has its own slot. */
  glide: GlideSpec | undefined;
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
  space: SpaceSpec | undefined;
  pointer: PointerSpec | undefined;
  loops: boolean;
  players: Player[];
}

export function groupSlots(items: ItemOptions[], players: Player[], refresh: () => void): Slot[] {
  const buckets: Bucket[] = [];
  items.forEach((item, i) => addToBucket(buckets, item, players[i]!));
  return buckets.map(
    ({ on, once, control, options, glide, space, pointer, loops, players: members }) => ({
      on,
      once,
      control,
      options,
      glide,
      space,
      pointer,
      loops,
      group: new Group(members, refresh),
    }),
  );
}

function addToBucket(buckets: Bucket[], item: ItemOptions, player: Player): void {
  const bucket = bucketFor(buckets, item);
  bucket.players.push(player);
  if (item.timing.loop !== undefined) bucket.loops = true;
}

function bucketFor(buckets: Bucket[], item: ItemOptions): Bucket {
  const { on, once, control, options, space, pointer } = item;
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
    space,
    pointer,
    loops: false,
    players: [],
  };
  buckets.push(bucket);
  return bucket;
}

function glideSpecOf(item: ItemOptions): GlideSpec | undefined {
  if (!isLayoutOn(item.on)) return undefined;
  return {
    mode: layoutModeOf(item.on),
    duration: item.timing.duration,
    delay: item.timing.delay,
    easing: item.keyframes.ease,
  };
}
