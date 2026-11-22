import type { Cleanup } from "../../dom/template/bindings.ts";
import { isSwapping } from "../../dom/hot/session.ts";
import type { Leave } from "../../dom/component/leave.ts";
import { untrack, watch } from "../../variable/graph.ts";
import { isReactive, unwrap } from "../../variable/reactive.ts";
import type { Group } from "./group.ts";
import type { ScrollRead } from "../options/scroll-options.ts";
import { WHEN, type Source } from "../modes/trigger.ts";
import type { ViewSettings } from "../options/view-options.ts";
import { prefersReducedMotion } from "./reduced-motion.ts";
import { watchScroll } from "../scroll/scroll.ts";
import { watchView } from "../scroll/view.ts";
import { bindHover } from "./hover.ts";
import { watchLayout } from "../layout/layout.ts";
import type { SpaceSpec } from "../layout/space/space-closer.ts";
import { bindAttach } from "../layout/space/space-attach.ts";
import { bindDetach } from "../layout/space/space-detach.ts";
import type { Slot } from "./slots.ts";

/** Starts what the slot's trigger asks for. MANUAL slots only move through a controller. */
export function bindTrigger(
  el: HTMLElement,
  { when, once, more, glide, space, loops, group }: Slot,
  cleanups: Cleanup[],
  leaves: Leave[],
): void {
  if (loops) cleanups.push(pauseOffScreen(el, group));
  if (isReactive(when)) bindSource(when, group, once, cleanups);
  else if (when === WHEN.ATTACH) attachTrigger(el, group, space, cleanups);
  else if (when === WHEN.DETACH) bindDetach(el, group, space, leaves, cleanups);
  else if (when === WHEN.VIEW) bindView(el, more.view, group, once, cleanups);
  else if (when === WHEN.HOVER) bindHover(el, group, once, more.hover, cleanups);
  else if (when === WHEN.SCROLL) bindScroll(el, more.scroll, group, cleanups);
  else if (glide) cleanups.push(watchLayout(el, glide, once, () => void group.forward()));
}

// Loops start a little before they reach the screen, so they are running when it arrives.
const PAUSE_VIEW: ViewSettings = { rootMargin: "200px 0px", amount: 0 };

function pauseOffScreen(el: Element, group: Group): () => void {
  return watchView(el, PAUSE_VIEW, (inView) => group.setOffScreen(!inView));
}

/** A hot swap shows the end state at once, so the element does not play its entrance again. */
function attachTrigger(
  el: HTMLElement,
  group: Group,
  space: SpaceSpec | undefined,
  cleanups: Cleanup[],
): void {
  if (isSwapping()) {
    group.show(1);
    return;
  }
  if (space) bindAttach(el, space, cleanups);
  void group.forward();
}

/** Scroll-linked: the group follows the element's place on screen. Reduced motion shows the end state. */
function bindScroll(el: HTMLElement, scroll: ScrollRead, group: Group, cleanups: Cleanup[]): void {
  if (prefersReducedMotion()) {
    group.show(1);
    return;
  }
  cleanups.push(watchScroll(el, (progress) => group.show(progress), scroll));
}

/** The first value is applied without animating. Later changes play forward or back from the current progress. */
function bindSource(source: Source, group: Group, once: boolean, cleanups: Cleanup[]): void {
  let started = false;
  let played = false;
  const applyLater = (on: boolean): void => {
    if (on) {
      if (once && played) return;
      played = true;
      void group.forward();
    } else if (!once) {
      void group.backward();
    }
  };
  const stop = watch(() => {
    const on = Boolean(unwrap(source));
    untrack(() => {
      if (!started) {
        played = on;
        group.show(on ? 1 : 0);
      } else {
        applyLater(on);
      }
    });
  });
  started = true;
  cleanups.push(stop);
}

function bindView(
  el: HTMLElement,
  view: ViewSettings,
  group: Group,
  once: boolean,
  cleanups: Cleanup[],
): void {
  const stop = watchView(el, view, (inView, unwatch) => {
    if (inView) {
      if (once) unwatch();
      void group.forward();
    } else if (!once) {
      void group.backward();
    }
  });
  cleanups.push(stop);
}
