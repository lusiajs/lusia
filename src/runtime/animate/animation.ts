import type { Controller } from "./play/controller.ts";
import type { Keyframes } from "./options/keyframes.ts";
import type { SpaceOptions } from "./options/space-options.ts";
import type { HoverOptions } from "./options/hover-options.ts";
import type { ScrollOptions } from "./options/scroll-options.ts";
import type { AnimateMidway } from "./options/midway-options.ts";
import { ON, type LayoutOn, type Source } from "./modes/trigger.ts";
import type { ViewOptions } from "./options/view-options.ts";
import type { PointerPlay } from "./options/pointer-item.ts";
import { hasItemKey } from "./options/keys.ts";

interface ItemBase {
  play: Keyframes;
  control?: Controller;
  once?: boolean;
  keep?: boolean;
  midway?: AnimateMidway;
  duration?: number;
  delay?: number;
  loop?: boolean | number;
  backAndForth?: boolean;
}

/** ATTACH (the default) takes `animateSpace`. MANUAL and a variable take no `options`. */
interface AttachItem extends ItemBase {
  on?: typeof ON.ATTACH;
  options?: SpaceOptions;
}

interface PlainItem extends ItemBase {
  on?: typeof ON.MANUAL | Source;
  options?: never;
}

interface DetachItem extends ItemBase {
  on: typeof ON.DETACH;
  options?: SpaceOptions;
}

/** A layout trigger glides the element. Its play is optional: the glide runs without it. */
interface LayoutItem extends Omit<ItemBase, "play"> {
  play?: Keyframes;
  on: LayoutOn;
  options?: never;
}

interface ViewItem extends ItemBase {
  on: typeof ON.VIEW;
  options?: ViewOptions;
}

interface HoverItem extends ItemBase {
  on: typeof ON.HOVER;
  options?: HoverOptions;
}

interface ScrollItem extends ItemBase {
  on: typeof ON.SCROLL;
  options?: ScrollOptions;
}

/** MOUSE_MOVE takes a function play, which gets the pointer position. Its timing is the way back. */
interface MouseMoveItem extends Omit<ItemBase, "play"> {
  play: PointerPlay;
  on: typeof ON.MOUSE_MOVE;
  options?: never;
}

export type AnimateItem =
  | PlainItem
  | AttachItem
  | DetachItem
  | LayoutItem
  | ViewItem
  | HoverItem
  | ScrollItem
  | MouseMoveItem;

export type Animate = Keyframes | AnimateItem | (Keyframes | AnimateItem)[];

export function itemsOf(value: Animate): AnimateItem[] {
  const list = Array.isArray(value) ? value : [value];
  return list.map(toItem);
}

function toItem(value: Keyframes | AnimateItem): AnimateItem {
  return isItem(value) ? value : { play: value };
}

/** Keyframes only have numeric keys and `ease`, so any item key tells the two apart. */
function isItem(value: Keyframes | AnimateItem): value is AnimateItem {
  return hasItemKey(Object.keys(value));
}
