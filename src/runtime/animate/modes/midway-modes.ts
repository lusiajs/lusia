/** What happens when a new play is asked for while one is still running. */
const SWITCH: unique symbol = Symbol("SWITCH");
const SWITCH_SMOOTH: unique symbol = Symbol("SWITCH_SMOOTH");
const SWITCH_STOP: unique symbol = Symbol("SWITCH_STOP");
const WAIT: unique symbol = Symbol("WAIT");
const RESTART: unique symbol = Symbol("RESTART");
const JUMP_TO_END: unique symbol = Symbol("JUMP_TO_END");
const KEEP_CURRENT: unique symbol = Symbol("KEEP_CURRENT");

export const MIDWAY = Object.freeze({
  SWITCH,
  SWITCH_SMOOTH,
  SWITCH_STOP,
  WAIT,
  RESTART,
  JUMP_TO_END,
  KEEP_CURRENT,
} as const);

export type MidwayMode = (typeof MIDWAY)[keyof typeof MIDWAY];

const MIDWAYS: ReadonlySet<unknown> = new Set<unknown>(Object.values(MIDWAY));
const SWITCHES: ReadonlySet<unknown> = new Set<unknown>([SWITCH, SWITCH_SMOOTH, SWITCH_STOP]);

export function isMidwayMode(value: unknown): value is MidwayMode {
  return MIDWAYS.has(value);
}

/** The modes that turn the motion around: SWITCH and its _SMOOTH and _STOP forms. */
export function isSwitchMode(value: unknown): boolean {
  return SWITCHES.has(value);
}
