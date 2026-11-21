import { withElementConfig } from "../../options/config-store.ts";
import { startPlaying, type Playable } from "../../play/loop.ts";
import { easingOf, type SpaceSpec } from "./space-closer.ts";
import { liftOut, restoreLift } from "./space-lift.ts";
import {
  boxesOf,
  compensate,
  movingElements,
  restoreShift,
  writeShift,
  type Mover,
} from "./space-movers.ts";
import type { EaseStyle } from "../../modes/easing.ts";
import type { Ease } from "../../modes/modes.ts";

/** Opens the space for an element that has just appeared. The siblings start where they were without it, and slide apart. */
export class Opener implements Playable {
  private finish: () => void = () => {};
  private finished = false;
  private begin = 0;
  private readonly movers: Mover[];
  private readonly easeStyle: EaseStyle;
  private readonly ease: Ease;

  constructor(
    private readonly el: HTMLElement,
    private readonly spec: SpaceSpec,
  ) {
    [this.easeStyle, this.ease] = withElementConfig(el, () => easingOf(spec.keyframes));
    const targets = movingElements(el);
    const lift = liftOut(el);
    const before = boxesOf(targets);
    restoreLift(el, lift);
    this.movers = compensate(targets, before);
  }

  start(): Promise<void> {
    this.begin = performance.now();
    return new Promise((resolve) => {
      this.finish = resolve;
      startPlaying(this);
    });
  }

  /** The element is gone, so the siblings stop where they are and go back to their places. */
  cancel(): void {
    if (this.finished) return;
    this.end();
  }

  step(now: number): boolean {
    if (this.finished) return true;
    const progress = clampedProgress(now - this.begin - this.spec.delay, this.spec.duration);
    const eased = this.ease(this.easeStyle, progress);
    for (const mover of this.movers) writeShift(mover, 1 - eased);
    if (progress < 1) return false;
    this.end();
    return true;
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
