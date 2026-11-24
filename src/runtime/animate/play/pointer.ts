import { bindEvent, type Cleanup } from "../../dom/template/bindings.ts";
import { cssName, prepareTimeline, type Keyframes, type Style } from "../options/keyframes.ts";
import { midwayDefault } from "../options/midway-options.ts";
import type { PointerPosition, PointerSpec } from "../options/pointer-item.ts";
import type { Timing } from "../options/options.ts";
import { Player } from "./player.ts";
import { restBox } from "./rest-box.ts";

interface PointerState {
  el: HTMLElement;
  spec: PointerSpec;
  player: Player;
  /** The one position object every call of the play gets. */
  position: PointerPosition;
  /** The base value of each property the play writes, read before its first write. */
  base: Record<string, string>;
  clientX: number;
  clientY: number;
  inside: boolean;
  scheduled: boolean;
}

/** While the pointer is over the element, its play writes the styles. On leave, the styles ease back to the base. */
export function bindPointer(el: HTMLElement, spec: PointerSpec, cleanups: Cleanup[]): void {
  const state: PointerState = {
    el,
    spec,
    player: new Player(el.style),
    position: { x: 0, y: 0 },
    base: {},
    clientX: 0,
    clientY: 0,
    inside: false,
    scheduled: false,
  };
  bindEvent(el, "pointermove", (event) => move(state, event as PointerEvent), cleanups);
  bindEvent(el, "pointerleave", () => leave(state), cleanups);
  cleanups.push(() => state.player.cancel());
}

function move(state: PointerState, event: PointerEvent): void {
  if (!state.inside) enter(state);
  state.clientX = event.clientX;
  state.clientY = event.clientY;
  if (state.scheduled) return;
  state.scheduled = true;
  requestAnimationFrame(() => frame(state));
}

function enter(state: PointerState): void {
  state.inside = true;
  state.player.cancel();
}

function leave(state: PointerState): void {
  if (!state.inside) return;
  state.inside = false;
  easeBack(state);
}

/** One write per frame, with the pointer read from the element's box with no transform, so the play cannot move its own box. */
function frame(state: PointerState): void {
  state.scheduled = false;
  if (!state.inside) return;
  const box = restBox(state.el);
  state.position.x = fraction(state.clientX - box.left, box.width);
  state.position.y = fraction(state.clientY - box.top, box.height);
  writeStyle(state, state.spec.play(state.position));
}

function fraction(offset: number, size: number): number {
  if (size <= 0) return 0;
  return Math.min(1, Math.max(0, offset / size));
}

function writeStyle(state: PointerState, style: Style): void {
  const values = style as Record<string, string | number>;
  for (const key in values) {
    rememberBase(state, key);
    state.el.style.setProperty(cssName(key), String(values[key]));
  }
}

function rememberBase(state: PointerState, key: string): void {
  if (key in state.base) return;
  const name = cssName(key);
  state.base[key] =
    state.el.style.getPropertyValue(name) || getComputedStyle(state.el).getPropertyValue(name);
}

function easeBack(state: PointerState): void {
  const keyframes = { 0: state.base, 1: state.base } as unknown as Keyframes;
  state.player.load(prepareTimeline(keyframes, state.el), backTiming(state.spec.duration));
  state.player.startFromCurrent();
  void state.player.forward();
}

function backTiming(duration: number): Timing {
  return { duration, delay: 0, loop: undefined, keep: true, midway: midwayDefault() };
}
