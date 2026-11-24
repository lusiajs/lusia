import { withElementConfig } from "../../options/config-store.ts";
import { animateDefault } from "../../options/defaults.ts";
import type { EaseStyle } from "../../modes/easing.ts";
import type { Keyframes } from "../../options/keyframes.ts";
import { readEase, readKey } from "../../options/keyform.ts";
import { startPlaying, type Playable } from "../../play/loop.ts";
import type { Ease } from "../../modes/modes.ts";
import { liftOut, placeLift, restoreLift, type Lift } from "./space-lift.ts";
import {
  boxesOf,
  compensate,
  movingElements,
  reopenMovers,
  restoreShift,
  writeShift,
  type Box,
  type Mover,
} from "./space-movers.ts";

export interface SpaceSpec {
  duration: number;
  delay: number;
  keyframes: Keyframes;
}

/** Closes the space a leaving element holds. The elements around it slide into the new place with transforms. */
export class Closer implements Playable {
  private finish: () => void = () => {};
  private finished = false;
  private begin = 0;
  /** How far the space has closed, from 0 to 1. A cancel reopens it for the same share of the duration. */
  private closed = 0;
  private reopenBegin: number | undefined;
  private reopenDuration = 0;
  private readonly lift: Lift;
  private readonly targets: HTMLElement[];
  private readonly wanted: Box;
  private movers: Mover[];
  private readonly easeStyle: EaseStyle;
  private readonly ease: Ease;

  constructor(
    private readonly el: HTMLElement,
    private readonly spec: SpaceSpec,
  ) {
    [this.easeStyle, this.ease] = withElementConfig(el, () => easingOf(spec.keyframes));
    this.targets = movingElements(el);
    const before = boxesOf(this.targets);
    const rect = el.getBoundingClientRect();
    this.wanted = { top: rect.top, left: rect.left };
    this.lift = liftOut(el);
    this.movers = compensate(this.targets, before);
    placeLift(el, this.wanted);
  }

  start(): Promise<void> {
    this.begin = performance.now();
    return new Promise((resolve) => {
      this.finish = resolve;
      startPlaying(this);
    });
  }

  /** Puts the element back into flow and slides the other elements back from where they are. */
  cancel(): void {
    if (this.finished || this.reopenBegin !== undefined) return;
    this.reopenDuration = this.spec.duration * this.closed;
    this.reopenBegin = performance.now();
    this.movers = reopenMovers(this.targets, this.movers, () => restoreLift(this.el, this.lift));
  }

  step(now: number): boolean {
    if (this.finished) return true;
    const progress = this.progressAt(now);
    const eased = this.ease(this.easeStyle, progress);
    if (this.reopenBegin === undefined) this.closed = eased;
    for (const mover of this.movers) writeShift(mover, 1 - eased);
    if (this.reopenBegin === undefined) placeLift(this.el, this.wanted);
    if (progress < 1) return false;
    this.end();
    return true;
  }

  private progressAt(now: number): number {
    if (this.reopenBegin !== undefined) {
      return clampedProgress(now - this.reopenBegin, this.reopenDuration);
    }
    return clampedProgress(now - this.begin - this.spec.delay, this.spec.duration);
  }

  private end(): void {
    this.finished = true;
    for (const mover of this.movers) restoreShift(mover);
    this.finish();
  }
}

function clampedProgress(elapsed: number, duration: number): number {
  if (duration <= 0) return 1;
  return Math.min(1, Math.max(0, elapsed / duration));
}

/** The ease of the last key, which closes or opens the space. */
export function easingOf(keyframes: Keyframes): [EaseStyle, Ease] {
  const [easeStyle, ease] = readKey(keyframes[1]!, readEase(keyframes.ease), animateDefault());
  return [easeStyle, ease];
}
