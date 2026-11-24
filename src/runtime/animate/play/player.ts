import type { Timing } from "../options/options.ts";
import { MIDWAY } from "../modes/midway-modes.ts";
import { forwardPasses, LEAVE, type Pass } from "./passes.ts";
import { queuePasses } from "./player-queue.ts";
import { PlayState } from "./player-state.ts";
import { startPlay, type Switch } from "./player-start.ts";
import { startingFrom, type Timeline } from "./timeline.ts";

/** Moves one element through its timeline. How a request meets a running play is set by `midway`. */
export class Player {
  private readonly state: PlayState;

  constructor(style: CSSStyleDeclaration) {
    this.state = new PlayState(style);
  }

  /** Swaps in the timeline and timing for the next play. The progress is kept. */
  load(timeline: Timeline, timing: Timing): void {
    this.state.timeline = timeline;
    this.state.timing = timing;
  }

  show(progress: number): void {
    this.state.show(progress);
  }

  /** Stops, then starts the next play from the styles the element has now, so nothing jumps. */
  startFromCurrent(): void {
    const state = this.state;
    state.cancel();
    state.timeline = startingFrom(state.timeline, (prop) => state.style.getPropertyValue(prop));
    state.show(0);
  }

  seek(progress: number): void {
    this.state.cancel();
    this.state.show(progress);
  }

  forward(): Promise<void> {
    return this.run(forwardPasses(this.state.timing.loop));
  }

  backward(): Promise<void> {
    return this.run(LEAVE);
  }

  /** Plays the passes in order. The promise resolves when the last pass ends or the run is replaced. */
  run(passes: Iterable<Pass>): Promise<void> {
    const state = this.state;
    if (!state.isBusy()) return startPlay(state, passes, undefined);
    const mode = state.timing.midway.mode;
    if (mode === MIDWAY.KEEP_CURRENT) return Promise.resolve();
    if (mode === MIDWAY.WAIT) return queuePasses(state, passes);
    if (mode === MIDWAY.JUMP_TO_END) return this.skipThen(passes);
    if (mode === MIDWAY.RESTART) return this.restartWith(passes);
    return this.turnInto(passes);
  }

  cancel(): void {
    this.state.cancel();
  }

  /** A looping play that is off screen writes nothing. Its clock keeps running, so it catches up when shown. */
  setOffScreen(offScreen: boolean): void {
    this.state.offScreen = offScreen;
  }

  private turnInto(passes: Iterable<Pass>): Promise<void> {
    const state = this.state;
    const switching: Switch = { from: state.progress, speed: state.speed, restart: false };
    state.cancel();
    return startPlay(state, passes, switching);
  }

  private skipThen(passes: Iterable<Pass>): Promise<void> {
    const state = this.state;
    const end = state.target;
    state.cancel();
    state.show(end);
    return startPlay(state, passes, { from: end, speed: 0, restart: false });
  }

  private restartWith(passes: Iterable<Pass>): Promise<void> {
    const state = this.state;
    state.cancel();
    return startPlay(state, passes, { from: state.playAt, speed: 0, restart: true });
  }
}
