import type { EaseStyle } from "../modes/easing.ts";
import type { Keyframe, KeyframeValue, Style } from "./keyframes.ts";
import { isEase, type Ease } from "../modes/modes.ts";
import { runtimeError } from "../../errors.ts";

/** One or both parts of an easing. Missing parts fall back to the next level. */
export interface PartialEasing {
  easeStyle?: EaseStyle;
  ease?: Ease;
}

/** The forms of an `ease`: [style, ease], [style] or [ease]. */
export type EaseValue = [EaseStyle, Ease] | [EaseStyle] | [Ease];

export function readEase(value: EaseValue | undefined): PartialEasing {
  if (value === undefined) return {};
  if (!Array.isArray(value) || value.length < 1 || value.length > 2) throw runtimeError("L2032");
  const [first, second] = value;
  if (isEase(first)) {
    if (second !== undefined) throw runtimeError("L2032");
    return { ease: first };
  }
  const easeStyle = checkEaseStyle(first);
  return second === undefined ? { easeStyle } : { easeStyle, ease: checkEase(second) };
}

/** Resolves one key per part: the key first, then the keyframes `ease`, then the engine default. */
export function readKey(
  value: KeyframeValue,
  fromKeyframes: PartialEasing,
  engine: Required<PartialEasing>,
): Keyframe {
  const own = readParts(value);
  return [
    own.easeStyle ?? fromKeyframes.easeStyle ?? engine.easeStyle,
    own.ease ?? fromKeyframes.ease ?? engine.ease,
    own.style,
  ];
}

interface KeyParts extends PartialEasing {
  style: Style;
}

function readParts(value: KeyframeValue): KeyParts {
  if (!Array.isArray(value)) return { style: checkStyle(value) };
  if (value.length === 3)
    return {
      easeStyle: checkEaseStyle(value[0]),
      ease: checkEase(value[1]),
      style: checkStyle(value[2]),
    };
  if (value.length === 2) return readPair(value);
  throw runtimeError("L2033");
}

/** An EASE direction in the first slot means `[ease, style]`; anything else is an easing style. */
function readPair([first, style]: [EaseStyle | Ease, Style]): KeyParts {
  if (isEase(first)) return { ease: first, style: checkStyle(style) };
  return { easeStyle: checkEaseStyle(first), style: checkStyle(style) };
}

function checkStyle(value: unknown): Style {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw runtimeError("L2033");
  return value as Style;
}

function checkEaseStyle(value: unknown): EaseStyle {
  if (typeof value !== "function" || isEase(value)) {
    throw runtimeError("L2034");
  }
  return value as EaseStyle;
}

function checkEase(value: unknown): Ease {
  if (!isEase(value)) throw runtimeError("L2035", { value: String(value) });
  return value;
}
