import { ON, type LayoutOn } from "./trigger.ts";

/** Which parts of the layout box a trigger follows. This table is the only place the triggers combine. */
export interface LayoutMode {
  place: boolean;
  size: boolean;
}

const MODES: ReadonlyMap<LayoutOn, LayoutMode> = new Map<LayoutOn, LayoutMode>([
  [ON.MOVE, { place: true, size: false }],
  [ON.RESIZE, { place: false, size: true }],
  [ON.MOVE_OR_RESIZE, { place: true, size: true }],
]);

export function layoutModeOf(on: LayoutOn): LayoutMode {
  return MODES.get(on)!;
}

/** The layout box as the watcher reads it: the box's place and size, free of transforms and scrolling. */
export interface LayoutKey {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function layoutChanged(mode: LayoutMode, prev: LayoutKey, next: LayoutKey): boolean {
  const moved = prev.x !== next.x || prev.y !== next.y;
  const resized = prev.width !== next.width || prev.height !== next.height;
  return (mode.place && moved) || (mode.size && resized);
}
