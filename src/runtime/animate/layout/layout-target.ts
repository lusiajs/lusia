import type { Cleanup } from "../../dom/template/bindings.ts";
import { untrack, watch } from "../../variable/graph.ts";
import { isReactive, unwrap } from "../../variable/reactive.ts";
import type { Source } from "../modes/trigger.ts";
import { prefersReducedMotion } from "../play/reduced-motion.ts";
import { copyBox } from "./layout-box.ts";
import {
  clearGlide,
  newGlide,
  startGlide,
  stepGlide,
  type Glide,
  type GlideSpec,
} from "./layout-glide.ts";

interface Gliding {
  el: HTMLElement;
  glide: Glide;
}

const gliding = new Set<Gliding>();
let scheduled = false;

/** A glide item: each new element in the variable is a box the element glides to. Null does nothing. */
export function bindGlideTarget(
  el: HTMLElement,
  target: Source,
  spec: GlideSpec,
  cleanups: Cleanup[],
): void {
  const item: Gliding = { el, glide: newGlide(spec) };
  let started = false;
  const stop = watch(() => {
    const value = unwrap(target);
    untrack(() => {
      if (started) glideTo(item, value);
    });
  });
  started = true;
  cleanups.push(stop, () => forget(item));
}

function glideTo(item: Gliding, value: unknown): void {
  if (!(value instanceof Element)) return;
  const { el, glide } = item;
  copyBox(glide.to, value.getBoundingClientRect());
  copyBox(glide.view, glide.active ? glide.visual : el.getBoundingClientRect());
  const now = performance.now();
  startGlide(glide, el, now);
  if (prefersReducedMotion()) {
    stepGlide(glide, el, now + glide.spec.delay + glide.spec.duration);
    return;
  }
  gliding.add(item);
  request();
}

function frame(): void {
  scheduled = false;
  const now = performance.now();
  for (const item of gliding) {
    if (!stepGlide(item.glide, item.el, now)) gliding.delete(item);
  }
  if (gliding.size > 0) request();
}

function request(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(frame);
}

function forget(item: Gliding): void {
  gliding.delete(item);
  clearGlide(item.glide, item.el);
}
