import type { EaseStyle } from "../modes/easing.ts";
import type { Ease } from "../modes/modes.ts";
import { MIDWAY, isSwitchMode } from "../modes/midway-modes.ts";
import type { MidwayOptions } from "../options/midway-options.ts";

/** Gives the progress to show during a turn. `t` is ms since the switch, `speed` is progress per ms. */
export type TurnFn = (from: number, to: number, t: number, speed: number) => number;

/** A change of direction in progress. `age` is the ms since the switch. */
export interface Turn {
  kind: "smooth" | "stop" | "custom";
  from: number;
  speed: number;
  age: number;
  duration: number;
  easeStyle: EaseStyle;
  ease: Ease;
  custom: TurnFn | undefined;
}

/** The turn for a switch, or undefined for an instant switch. SWITCH_STOP takes half of `duration`. */
export function startTurn(
  { mode, duration, easeStyle, ease }: MidwayOptions,
  from: number,
  speed: number,
): Turn | undefined {
  if (mode === MIDWAY.SWITCH || duration <= 0) return undefined;
  const base = { from, speed, age: 0, easeStyle, ease, custom: undefined };
  if (typeof mode === "function") return { ...base, kind: "custom", duration, custom: mode };
  if (mode === MIDWAY.SWITCH_STOP) return { ...base, kind: "stop", duration: duration / 2 };
  if (isSwitchMode(mode)) return { ...base, kind: "smooth", duration };
  return undefined;
}

export function turnValue(turn: Turn, playAt: number): number {
  const { from, speed, age, duration } = turn;
  if (turn.custom) return turn.custom(from, playAt, age, speed);
  if (turn.kind === "stop") return from + speed * age - (speed * age * age) / (2 * duration);
  const old = from + speed * age;
  const weight = turn.ease(turn.easeStyle, Math.min(1, age / duration));
  return old + (playAt - old) * weight;
}
