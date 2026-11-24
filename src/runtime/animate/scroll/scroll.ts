import type { Part, ScrollRead } from "../options/scroll-options.ts";
import type { ScrollRange, ScrollTouch } from "./scroll-touch.ts";
import { unwrap } from "../../variable/reactive.ts";
import type { ComputedVariable } from "../../variable/compute.ts";
import { watch } from "../../variable/graph.ts";

interface Tracked {
  el: Element;
  onProgress: (progress: number) => void;
  scroll: ScrollRead;
  followed: Element | null;
  stopFollow: (() => void) | undefined;
  last: number;
  next: number;
}

const tracked = new Set<Tracked>();
/** Section progress of each followed element, measured once per frame. */
const measured = new Map<Element, number>();
let scheduled = false;

/** Reports the element's place on screen as progress. One shared listener serves every scroll item. */
export function watchScroll(
  el: Element,
  onProgress: (progress: number) => void,
  scroll: ScrollRead,
): () => void {
  const target: Tracked = {
    el,
    onProgress,
    scroll,
    followed: null,
    stopFollow: undefined,
    last: NaN,
    next: NaN,
  };
  if (scroll.follow) target.stopFollow = followVariable(target, scroll.follow);
  tracked.add(target);
  if (tracked.size === 1) startListening();
  schedule();
  return () => unwatch(target);
}

function followVariable(target: Tracked, follow: ComputedVariable<Element | null>): () => void {
  return watch(() => {
    target.followed = unwrap(follow) as Element | null;
    schedule();
  });
}

function unwatch(target: Tracked): void {
  tracked.delete(target);
  target.stopFollow?.();
  if (tracked.size === 0) stopListening();
}

/** Capture on the document catches scrolling in any container, not only the window. */
const LISTEN_OPTIONS = { passive: true, capture: true };

function startListening(): void {
  document.addEventListener("scroll", schedule, LISTEN_OPTIONS);
  window.addEventListener("resize", schedule, LISTEN_OPTIONS);
}

function stopListening(): void {
  document.removeEventListener("scroll", schedule, LISTEN_OPTIONS);
  window.removeEventListener("resize", schedule, LISTEN_OPTIONS);
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(update);
}

function update(): void {
  scheduled = false;
  measured.clear();
  let waiting = false;
  for (const target of tracked) {
    if (isMeasurable(target)) target.next = partProgress(targetProgress(target), target.scroll.part);
    else waiting = true;
  }
  for (const target of tracked) {
    if (Number.isNaN(target.next) || target.next === target.last) continue;
    target.last = target.next;
    target.onProgress(target.next);
  }
  // Elements watched before they join the page are measured again next frame, not on the first scroll.
  if (waiting) schedule();
}

function isMeasurable(target: Tracked): boolean {
  const el = target.scroll.follow ? target.followed : target.el;
  return el === null || el.isConnected;
}

function targetProgress(target: Tracked): number {
  if (target.scroll.follow) return followedProgress(target.followed, target.scroll);
  return scrollProgress(target.el, target.scroll.range);
}

function followedProgress(el: Element | null, scroll: ScrollRead): number {
  if (el === null) return 0;
  if (!scroll.pinned) return scrollProgress(el, scroll.range);
  const found = measured.get(el);
  if (found !== undefined) return found;
  const progress = pinnedProgress(el.getBoundingClientRect(), window.innerHeight);
  measured.set(el, progress);
  return progress;
}

/** 0 when the element meets the window at `start`, 1 when it meets it at `end`. Linear, clamped. */
function scrollProgress(el: Element, range: ScrollRange): number {
  const rect = el.getBoundingClientRect();
  const viewport = window.innerHeight;
  const startTop = topWhenTouching(range.start, viewport, rect.height);
  const endTop = topWhenTouching(range.end, viewport, rect.height);
  const span = startTop - endTop;
  if (span === 0) return 0;
  return clamp01((startTop - rect.top) / span);
}

function topWhenTouching(touch: ScrollTouch, viewport: number, height: number): number {
  return touch.screen * viewport - touch.element * height;
}

// A tall element runs from its top edge to its bottom edge.
function pinnedProgress(rect: { top: number; height: number }, viewport: number): number {
  if (rect.height <= viewport) return rect.top <= 0 ? 1 : 0;
  return clamp01(-rect.top / (rect.height - viewport));
}

function partProgress(progress: number, [from, to]: Part): number {
  return clamp01((progress - from) / (to - from));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
