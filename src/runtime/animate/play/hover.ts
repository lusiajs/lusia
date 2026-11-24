import { bindEvent, type Cleanup } from "../../dom/template/bindings.ts";
import { prepareTimeline } from "../options/keyframes.ts";
import type { Group } from "./group.ts";
import { HOVER_AREA } from "../modes/hover-modes.ts";
import type { HoverRead } from "../options/hover-options.ts";
import type { Timing } from "../options/options.ts";
import { midwayDefault } from "../options/midway-options.ts";
import { Player } from "./player.ts";
import { restBox } from "./rest-box.ts";

interface HoverState {
  /** True between enter and leave. Touch toggles it, so it is the single source of truth. */
  inside: boolean;
  /** True once the item has been entered at least once. `once` uses it. */
  entered: boolean;
  /** A play waiting for its delay: "in" after enter, "out" after leave. */
  pending: "in" | "out" | undefined;
  timer: ReturnType<typeof setTimeout> | undefined;
}

export function bindHover(
  el: HTMLElement,
  group: Group,
  once: boolean,
  hover: HoverRead,
  cleanups: Cleanup[],
): void {
  const state: HoverState = { inside: false, entered: false, pending: undefined, timer: undefined };
  const outPlayer = hover.out ? outPlayerFor(el, hover.out) : undefined;
  const cancel = (): void => cancelPending(state);
  const playIn = (): void => {
    if (outPlayer) {
      outPlayer.cancel();
      void group.forwardFromCurrent();
    } else {
      void group.forward();
    }
  };
  const playOut = (): void => {
    if (outPlayer) {
      group.cancel();
      outPlayer.startFromCurrent();
      void outPlayer.forward();
    } else {
      void group.backward();
    }
  };
  const enter = (): void => {
    cancel();
    if (once && state.entered) return;
    state.inside = true;
    state.entered = true;
    after(state, hover.inDelay, "in", playIn);
  };
  const leave = (): void => {
    if (!state.inside) return;
    state.inside = false;
    const playedIn = state.pending !== "in";
    cancel();
    if (playedIn && !once) after(state, hover.outDelay, "out", playOut);
  };

  if (hover.area === HOVER_AREA.FINAL) bindFinalArea(el, state, enter, leave, cleanups);
  else bindElementArea(el, enter, leave, cleanups);
  bindEvent(
    el,
    "pointerdown",
    (event) => {
      if (!isTouch(event)) return;
      if (state.inside) leave();
      else enter();
    },
    cleanups,
  );
  bindEvent(
    document,
    "pointerdown",
    (event) => {
      if (isTouch(event) && state.inside && !el.contains(event.target as Node)) leave();
    },
    cleanups,
  );
  bindEvent(el, "focusin", enter, cleanups);
  bindEvent(el, "focusout", leave, cleanups);
  cleanups.push(() => {
    cancel();
    outPlayer?.cancel();
  });
}

/** The element's own hit box: the pointer events of the moving element. */
function bindElementArea(
  el: HTMLElement,
  enter: () => void,
  leave: () => void,
  cleanups: Cleanup[],
): void {
  bindEvent(
    el,
    "pointerenter",
    (event) => {
      if (!isTouch(event)) enter();
    },
    cleanups,
  );
  bindEvent(
    el,
    "pointerleave",
    (event) => {
      if (!isTouch(event)) leave();
    },
    cleanups,
  );
}

/** The resting box: the pointer is checked against where the element sits without its transform. */
function bindFinalArea(
  el: HTMLElement,
  state: HoverState,
  enter: () => void,
  leave: () => void,
  cleanups: Cleanup[],
): void {
  bindEvent(
    document,
    "pointermove",
    (event) => {
      if (isTouch(event)) return;
      const pointer = event as PointerEvent;
      const isOver = isInBox(restBox(el), pointer.clientX, pointer.clientY);
      if (isOver && !state.inside) enter();
      else if (!isOver && state.inside) leave();
    },
    cleanups,
  );
  bindEvent(
    document.documentElement,
    "pointerout",
    (event) => {
      if ((event as PointerEvent).relatedTarget === null) leave();
    },
    cleanups,
  );
}

function isInBox(box: DOMRect, x: number, y: number): boolean {
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
}

/** A delay of 0 plays at once, so the play is synchronous unless the item asks to wait. */
function after(state: HoverState, delay: number, kind: "in" | "out", play: () => void): void {
  if (delay <= 0) return play();
  state.pending = kind;
  state.timer = setTimeout(() => {
    state.pending = undefined;
    play();
  }, delay);
}

function cancelPending(state: HoverState): void {
  clearTimeout(state.timer);
  state.timer = undefined;
  state.pending = undefined;
}

function isTouch(event: Event): boolean {
  return (event as PointerEvent).pointerType === "touch";
}

function outPlayerFor(el: HTMLElement, out: NonNullable<HoverRead["out"]>): Player {
  const timing: Timing = {
    duration: out.duration,
    delay: 0,
    loop: undefined,
    keep: true,
    midway: midwayDefault(),
  };
  const player = new Player(el.style);
  player.load(prepareTimeline(out.keyframes, el), timing);
  return player;
}
