import { animateDefault } from "../options/defaults.ts";
import type { EaseStyle } from "../modes/easing.ts";
import { readEase, type EaseValue } from "../options/keyform.ts";
import { EASE, type Ease } from "../modes/modes.ts";
import {
  copyBox,
  cssHeight,
  cssWidth,
  glideBox,
  layoutPlace,
  newBox,
  newSlide,
  readEdges,
  slideFor,
  type Box,
  type Edges,
  type Slide,
} from "./layout-box.ts";
import type { LayoutMode } from "../modes/layout-mode.ts";

export interface GlideSpec {
  mode: LayoutMode;
  duration: number;
  delay: number;
  /** The keyframes `ease`, if any. The engine default fills the rest. */
  easing: EaseValue | undefined;
  /** Keeps the end box when the glide ends. Otherwise the element returns to its layout box. */
  hold: boolean;
}

/** One element's glide. `view` is the visual box the last frame showed. */
export interface Glide {
  spec: GlideSpec;
  active: boolean;
  begin: number;
  easeStyle: EaseStyle;
  ease: Ease;
  view: Box;
  from: Box;
  to: Box;
  visual: Box;
  writtenSlide: Slide;
  /** The layout place at the size written this frame, for the slide. */
  place: Box;
  /** Padding and border from when the size glide started. */
  edges: Edges;
  /** The inline size before the glide took over, restored when it ends. */
  baseWidth: string;
  baseHeight: string;
  sizeRemembered: boolean;
}

export function newGlide(spec: GlideSpec): Glide {
  return {
    spec,
    active: false,
    begin: 0,
    easeStyle: EASE.STYLE.QUART,
    ease: EASE.INOUT,
    view: newBox(),
    from: newBox(),
    to: newBox(),
    visual: newBox(),
    writtenSlide: newSlide(),
    place: newBox(),
    edges: { x: 0, y: 0, borderBox: true },
    baseWidth: "",
    baseHeight: "",
    sizeRemembered: false,
  };
}

// Easing is read here so engine defaults are current.
export function startGlide(glide: Glide, el: HTMLElement, now: number): void {
  const easing = readEase(glide.spec.easing);
  const engine = animateDefault();
  glide.easeStyle = easing.easeStyle ?? engine.easeStyle;
  glide.ease = easing.ease ?? engine.ease;
  if (glide.spec.mode.size) {
    if (!glide.sizeRemembered) rememberBaseSize(glide, el);
    readEdges(el, glide.edges);
  }
  copyBox(glide.from, glide.view);
  glide.begin = now;
  glide.active = true;
}

/** Writes this frame's glide. Returns false once it ends and the element is back on its layout box. */
export function stepGlide(glide: Glide, el: HTMLElement, now: number): boolean {
  const { duration, delay, mode, hold } = glide.spec;
  const elapsed = now - glide.begin - delay;
  const progress = duration > 0 ? Math.min(1, Math.max(0, elapsed / duration)) : 1;
  if (progress >= 1 && !hold) {
    clearGlide(glide, el);
    return false;
  }
  const eased = glide.ease(glide.easeStyle, progress);
  glideBox(glide.from, glide.to, eased, mode, glide.visual);
  if (mode.size) writeSize(glide, el);
  if (mode.place) writeSlide(glide, el);
  if (progress < 1) return true;
  glide.active = false;
  return false;
}

export function clearGlide(glide: Glide, el: HTMLElement): void {
  glide.active = false;
  glide.sizeRemembered = false;
  glide.writtenSlide.x = 0;
  glide.writtenSlide.y = 0;
  el.style.removeProperty("translate");
  if (glide.spec.mode.size) showLayoutSize(glide, el);
}

/** Reveals the layout size for one read, so the watcher never measures the glide's own write. */
export function showLayoutSize(glide: Glide, el: HTMLElement): void {
  setInline(el, "width", glide.baseWidth);
  setInline(el, "height", glide.baseHeight);
}

function writeSlide(glide: Glide, el: HTMLElement): void {
  let place = glide.to;
  if (glide.spec.mode.size) {
    // Writing the size can move the layout box, for example a centred fixed element.
    layoutPlace(el.getBoundingClientRect(), glide.writtenSlide, glide.place);
    place = glide.place;
  }
  slideFor(glide.visual, place, glide.writtenSlide);
  el.style.setProperty("translate", `${glide.writtenSlide.x}px ${glide.writtenSlide.y}px`);
}

/** The element's own size follows the glide, so its text, borders and children keep their shape. */
function writeSize(glide: Glide, el: HTMLElement): void {
  el.style.setProperty("width", `${cssWidth(glide.edges, glide.visual.width)}px`);
  el.style.setProperty("height", `${cssHeight(glide.edges, glide.visual.height)}px`);
}

function rememberBaseSize(glide: Glide, el: HTMLElement): void {
  glide.baseWidth = el.style.getPropertyValue("width");
  glide.baseHeight = el.style.getPropertyValue("height");
  glide.sizeRemembered = true;
}

function setInline(el: HTMLElement, property: "width" | "height", value: string): void {
  if (value === "") el.style.removeProperty(property);
  else el.style.setProperty(property, value);
}
