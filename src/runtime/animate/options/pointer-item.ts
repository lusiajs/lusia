import { runtimeError } from "../../errors.ts";
import { ON, type On, type Source } from "../modes/trigger.ts";
import type { Style } from "./keyframes.ts";

/** The pointer position inside the element, x and y from 0 to 1. One object is reused for every move. */
export interface PointerPosition {
  x: number;
  y: number;
}

/** The play of ON.MOUSE_MOVE: a function from the pointer position to the styles to write. */
export type PointerPlay = (pointer: PointerPosition) => Style;

/** What a MOUSE_MOVE item needs to play its way back when the pointer leaves. */
export interface PointerSpec {
  play: PointerPlay;
  duration: number;
}

/** Only ON.MOUSE_MOVE takes a function play, and it must be one. */
export function readPointerPlay(play: unknown, on: On | Source): PointerPlay | undefined {
  if (on === ON.MOUSE_MOVE) {
    if (typeof play !== "function") throw runtimeError("L2088", { value: String(play) });
    return play as PointerPlay;
  }
  if (typeof play === "function") throw runtimeError("L2087", { on: onName(on) });
  return undefined;
}

function onName(on: On | Source): string {
  return typeof on === "symbol" ? `ON.${String(on.description)}` : "a variable";
}
