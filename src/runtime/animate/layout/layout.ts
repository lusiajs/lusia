import { prefersReducedMotion } from "../play/reduced-motion.ts";
import { layoutChanged, type LayoutKey } from "../modes/layout-mode.ts";
import { copyBox, layoutPlace, newBox, type Box } from "./layout-box.ts";
import {
  clearGlide,
  newGlide,
  showLayoutSize,
  startGlide,
  stepGlide,
  type Glide,
  type GlideSpec,
} from "./layout-glide.ts";
import { copyKey, measureBox } from "./layout-measure.ts";
import { startListening, stopListening } from "./layout-listen.ts";
import { observeSize, unobserveSize } from "./layout-sizes.ts";
import { withElementConfig } from "../options/config-store.ts";

interface Watched {
  el: HTMLElement;
  glide: Glide;
  key: LayoutKey;
  rect: Box;
  /** A change was seen this frame and the glide starts in the write phase. */
  pending: boolean;
  once: boolean;
  /** `once` after the first change: no more changes are read. */
  spent: boolean;
  onChange: () => void;
}

const watched = new Set<Watched>();
const probe: LayoutKey = { x: 0, y: 0, width: 0, height: 0 };
let scheduled = false;

/** Glides el whenever its layout box changes. `onChange` runs at each change, in the write phase. Returns the stop function. */
export function watchLayout(
  el: HTMLElement,
  spec: GlideSpec,
  once: boolean,
  onChange: () => void,
): () => void {
  const item: Watched = {
    el,
    glide: newGlide(spec),
    key: { x: 0, y: 0, width: 0, height: 0 },
    rect: newBox(),
    pending: false,
    once,
    spent: false,
    onChange,
  };
  measureBox(el, item.key, item.rect);
  copyBox(item.glide.view, item.rect);
  watched.add(item);
  observeSize(item.el);
  if (watched.size === 1) startListening(request);
  return () => forget(item);
}

function frame(): void {
  scheduled = false;
  for (const item of watched) readItem(item);
  const now = performance.now();
  for (const item of watched) writeItem(item, now);
  for (const item of watched) {
    if (item.glide.active) {
      request();
      break;
    }
  }
}

function readItem(item: Watched): void {
  const { el, glide, rect } = item;
  // The glide owns width and height; the write phase puts its size back this frame.
  if (glide.active && glide.spec.mode.size) showLayoutSize(glide, el);
  measureBox(el, probe, rect);
  const changed = !item.spent && layoutChanged(glide.spec.mode, item.key, probe);
  copyKey(item.key, probe);
  if (changed) item.pending = true;
  if (!changed && !glide.active) return;
  layoutPlace(rect, glide.writtenSlide, glide.to);
  // The offsets are free of transforms, so another animation's scale cannot skew the target size.
  glide.to.width = probe.width;
  glide.to.height = probe.height;
}

function writeItem(item: Watched, now: number): void {
  const { el, glide } = item;
  if (item.pending) {
    item.pending = false;
    if (prefersReducedMotion()) clearGlide(glide, el);
    else withElementConfig(el, () => startGlide(glide, el, now));
    if (item.once) item.spent = true;
    item.onChange();
  }
  if (glide.active) stepGlide(glide, el, now);
  copyBox(glide.view, glide.active ? glide.visual : item.rect);
  if (item.spent && !glide.active) forget(item);
}

function request(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(frame);
}

function forget(item: Watched): void {
  if (!watched.has(item)) return;
  watched.delete(item);
  clearGlide(item.glide, item.el);
  unobserveSize(item.el);
  if (watched.size === 0) stopListening(request);
}
