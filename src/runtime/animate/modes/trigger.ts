import type { ComputedVariable } from "../../variable/compute.ts";
import type { Variable } from "../../variable/variable.ts";

const ATTACH: unique symbol = Symbol("ATTACH");
const DETACH: unique symbol = Symbol("DETACH");
const VIEW: unique symbol = Symbol("VIEW");
const HOVER: unique symbol = Symbol("HOVER");
const SCROLL: unique symbol = Symbol("SCROLL");
const MOVE: unique symbol = Symbol("MOVE");
const RESIZE: unique symbol = Symbol("RESIZE");
const MOVE_OR_RESIZE: unique symbol = Symbol("MOVE_OR_RESIZE");
const MANUAL: unique symbol = Symbol("MANUAL");
const MOUSE_MOVE: unique symbol = Symbol("MOUSE_MOVE");

export const ON = Object.freeze({
  ATTACH,
  DETACH,
  VIEW,
  HOVER,
  SCROLL,
  MOVE,
  RESIZE,
  MOVE_OR_RESIZE,
  MANUAL,
  MOUSE_MOVE,
} as const);

export type On = (typeof ON)[keyof typeof ON];

export type LayoutOn = typeof ON.MOVE | typeof ON.RESIZE | typeof ON.MOVE_OR_RESIZE;

/** A variable or computed variable: truthy plays forward, falsy plays back. */
export type Source = Variable<unknown> | ComputedVariable<unknown>;

const ONS: ReadonlySet<unknown> = new Set<unknown>(Object.values(ON));

export function isOn(value: unknown): value is On {
  return ONS.has(value);
}

const LAYOUT_ONS: ReadonlySet<unknown> = new Set<unknown>([ON.MOVE, ON.RESIZE, ON.MOVE_OR_RESIZE]);

export function isLayoutOn(value: unknown): value is LayoutOn {
  return LAYOUT_ONS.has(value);
}
