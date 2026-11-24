import type { PlayState } from "./player-state.ts";
import { begin, startQueued } from "./player-start.ts";
import { turnValue, type Turn } from "./turn.ts";

export function moveTo(state: PlayState, now: number): void {
  const elapsed = now - state.clock;
  const used = Math.abs(state.target - state.playAt) * state.duration;
  state.clock = now;
  state.playAt = advance(state.playAt, state.target, elapsed, state.duration);
  if (state.playAt === state.target) nextPass(state, now - Math.max(0, elapsed - used));
}

export function present(state: PlayState, now: number): void {
  const dt = now - state.at;
  state.at = now;
  const value = state.turn ? turnedValue(state, state.turn, dt) : state.playAt;
  if (dt > 0) state.speed = (value - state.progress) / dt;
  state.write(value);
}

function turnedValue(state: PlayState, turn: Turn, dt: number): number {
  turn.age += dt;
  if (turn.age < turn.duration) return turnValue(turn, state.playAt);
  state.turn = undefined;
  return state.playAt;
}

/** `endedAt` is when the finished pass really ended, so time left over in the frame carries to the next one. */
function nextPass(state: PlayState, endedAt: number): void {
  const next = state.passes!.next();
  if (next.done) endPlay(state, endedAt);
  else begin(state, next.value, endedAt);
}

/** The last pass ended. A queued request (MIDWAY.WAIT) starts now, from where this play ended. */
function endPlay(state: PlayState, endedAt: number): void {
  const finish = state.finish;
  state.passes = undefined;
  state.finish = undefined;
  state.ended = true;
  finish?.();
  startQueued(state, endedAt);
}

function advance(progress: number, target: number, elapsed: number, duration: number): number {
  if (duration <= 0) return target;
  const moved = progress + Math.sign(target - progress) * (elapsed / duration);
  return target > progress ? Math.min(moved, target) : Math.max(moved, target);
}
