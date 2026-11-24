import type { Pass } from "./passes.ts";
import { resolveWaiters } from "./player-queue.ts";
import type { PlayState } from "./player-state.ts";
import { startPlaying } from "./loop.ts";
import { prefersReducedMotion } from "./reduced-motion.ts";
import { startTurn } from "./turn.ts";

/** Where a new play takes over from the running one. `restart` snaps to the new play's own start. */
export interface Switch {
  from: number;
  speed: number;
  restart: boolean;
}

export function startPlay(
  state: PlayState,
  passes: Iterable<Pass>,
  switching: Switch | undefined,
  at = performance.now(),
): Promise<void> {
  const iterator = passes[Symbol.iterator]();
  const first = iterator.next();
  if (first.done) return Promise.resolve();
  if (prefersReducedMotion()) {
    state.target = first.value.to;
    state.show(state.target);
    state.settle();
    return Promise.resolve();
  }
  const done = new Promise<void>((resolve) => {
    state.finish = resolve;
  });
  state.passes = iterator;
  state.ended = false;
  state.at = at;
  state.playAt = switching?.from ?? state.progress;
  if (switching?.restart) state.show(first.value.to === 1 ? 0 : 1);
  begin(state, first.value, state.at);
  if (switching && !switching.restart) turnFrom(state, switching.from, switching.speed);
  startPlaying(state);
  return done;
}

/** Forward passes wait for the delay before they start moving. */
export function begin(state: PlayState, pass: Pass, now: number): void {
  if (pass.from !== undefined) state.show(pass.from);
  state.target = pass.to;
  state.duration = state.timing.duration;
  state.clock = pass.to === 1 ? now + state.timing.delay : now;
}

export function startQueued(state: PlayState, endedAt: number): void {
  const queued = state.queued;
  if (!queued) return;
  state.queued = undefined;
  const from = state.turn ? state.progress : state.playAt;
  const done = startPlay(
    state,
    queued.passes,
    { from, speed: state.speed, restart: false },
    endedAt,
  );
  void done.then(() => resolveWaiters(queued));
}

/** Starts the turn for a switch. SWITCH_STOP holds the new play until the element has come to rest. */
function turnFrom(state: PlayState, from: number, speed: number): void {
  state.turn = startTurn(state.timing.midway, from, speed);
  if (state.turn?.kind !== "stop") return;
  state.playAt = from + (speed * state.turn.duration) / 2;
  state.clock = state.at + state.turn.duration;
}
