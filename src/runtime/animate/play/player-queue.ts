import type { Pass } from "./passes.ts";
import type { PlayState } from "./player-state.ts";

/** A request waiting for the running play (MIDWAY.WAIT). Only the last one runs, and every waiter resolves with it. */
export interface Queued {
  passes: Iterable<Pass>;
  waiters: Array<() => void>;
}

export function queuePasses(state: PlayState, passes: Iterable<Pass>): Promise<void> {
  return new Promise<void>((resolve) => {
    if (state.queued) {
      state.queued.passes = passes;
      state.queued.waiters.push(resolve);
    } else {
      state.queued = { passes, waiters: [resolve] };
    }
  });
}

export function dropQueued(state: PlayState): void {
  const queued = state.queued;
  state.queued = undefined;
  if (queued) resolveWaiters(queued);
}

export function resolveWaiters(queued: Queued): void {
  queued.waiters.forEach((resolve) => resolve());
}
