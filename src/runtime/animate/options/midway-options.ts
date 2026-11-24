import type { EaseStyle } from "../modes/easing.ts";
import { EASE, type Ease } from "../modes/modes.ts";
import { isMidwayMode, MIDWAY, type MidwayMode } from "../modes/midway-modes.ts";
import type { TurnFn } from "../play/turn.ts";
import { runtimeError } from "../../errors.ts";
import { animateConfig } from "./config-store.ts";
import { readEase, type EaseValue } from "./keyform.ts";

/** The `mode` of a midway: a MIDWAY member, or a function for a custom switch. */
export type MidwayChoice = MidwayMode | TurnFn;

/** The `midway` field of an item. Each field is optional and takes its config or library value. */
interface MidwayItem {
  mode?: MidwayChoice;
  duration?: number;
  ease?: EaseValue;
}

export type AnimateMidway = MidwayItem;

export interface MidwayOptions {
  mode: MidwayChoice;
  duration: number;
  easeStyle: EaseStyle;
  ease: Ease;
}

const MIDWAY_KEYS: readonly string[] = ["mode", "duration", "ease"];

/** Keys from the old `turn` settings, with the key that replaces each one. */
const RENAMED_MIDWAY_KEYS: ReadonlyMap<string, string> = new Map([
  ["play", "mode"],
  ["turn", "mode"],
  ["turnDuration", "duration"],
  ["turnStyle", "ease"],
  ["turnEase", "ease"],
]);

/** The midway settings an item uses when it sets none: the config values, then the library ones. */
export function midwayDefault(): MidwayOptions {
  const midway = animateConfig().midway ?? {};
  const ease = readEase(midway.ease);
  return {
    mode: midway.mode ?? MIDWAY.SWITCH,
    duration: midway.duration ?? 200,
    easeStyle: ease.easeStyle ?? EASE.STYLE.CUBIC,
    ease: ease.ease ?? EASE.INOUT,
  };
}

export function readMidway(midway: AnimateMidway | undefined): MidwayOptions {
  if (midway === undefined) return midwayDefault();
  if (isMidwayMode(midway)) throw runtimeError("L2081");
  if (typeof midway !== "object" || midway === null || Array.isArray(midway)) {
    throw runtimeError("L2023", { value: String(midway) });
  }
  rejectRenamedKeys(midway);
  rejectUnknownKeys(midway);
  const base = midwayDefault();
  const ease = readEase(midway.ease);
  return {
    mode: readMode(Object.hasOwn(midway, "mode") ? midway.mode : base.mode),
    duration: readDuration(midway.duration ?? base.duration),
    easeStyle: ease.easeStyle ?? base.easeStyle,
    ease: ease.ease ?? base.ease,
  };
}

function rejectRenamedKeys(midway: object): void {
  for (const key of Object.keys(midway)) {
    const to = RENAMED_MIDWAY_KEYS.get(key);
    if (to !== undefined) throw runtimeError("L2082", { key, to });
  }
}

function rejectUnknownKeys(midway: object): void {
  for (const key of Object.keys(midway)) {
    if (!MIDWAY_KEYS.includes(key)) {
      throw runtimeError("L2024", { key });
    }
  }
}

function readMode(mode: unknown): MidwayChoice {
  if (typeof mode === "function" || isMidwayMode(mode)) return mode as MidwayChoice;
  throw runtimeError("L2025", { value: String(mode) });
}

function readDuration(duration: number): number {
  if (!Number.isFinite(duration) || duration < 0) {
    throw runtimeError("L2027", { value: String(duration) });
  }
  return duration;
}
