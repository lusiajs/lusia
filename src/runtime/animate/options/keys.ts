import { closestName } from "./closest.ts";
import type { Values } from "../../../compiler/errors/create.ts";

export const ITEM_KEYS: readonly string[] = [
  "play",
  "on",
  "once",
  "options",
  "midway",
  "keep",
  "control",
  "duration",
  "delay",
  "loop",
  "backAndForth",
];

/** Old item keys. Each one has its own error, and they tell an item apart from keyframes. */
export const OLD_ITEM_KEYS: readonly string[] = [
  "animation",
  "active",
  "style",
  "when",
  "more",
  "curve",
  "transition",
  "reverse",
  "alternate",
];

/** The one word key of keyframes. The other keys are numbers from 0 to 1. */
export const KEYFRAMES_NAME = "ease";

export const KEYFRAMES_HINT = "Use a number from 0 to 1, or 'ease'.";
export const SPELLING_HINT = "Check the spelling of the key.";

export const VIEW_KEYS: readonly string[] = ["margin", "amount", "reverse"];
export const HOVER_KEYS: readonly string[] = ["area", "inDelay", "outDelay", "out", "outDuration"];
export const SCROLL_KEYS: readonly string[] = ["start", "end", "follow", "part"];
export const SPACE_KEYS: readonly string[] = ["animateSpace"];

export const OPTION_KEYS_BY_ON: Readonly<Record<string, readonly string[]>> = {
  VIEW: VIEW_KEYS,
  HOVER: HOVER_KEYS,
  SCROLL: SCROLL_KEYS,
  ATTACH: SPACE_KEYS,
  DETACH: SPACE_KEYS,
};

export function isNumberKey(key: string): boolean {
  return key.trim() !== "" && Number.isFinite(Number(key));
}

export function isKeyframesKey(key: string): boolean {
  return key === KEYFRAMES_NAME || isNumberKey(key);
}

export function hasItemKey(keys: readonly string[]): boolean {
  return keys.some((key) => ITEM_KEYS.includes(key) || OLD_ITEM_KEYS.includes(key));
}

/** Names as a list: "a", "a or b", "a, b or c". */
export function keyList(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}

export function unknownKeyValues(key: string, names: readonly string[], fallback: string): Values {
  const near = closestName(key, names);
  const tip = near === undefined ? fallback : `did you mean '${near}'?`;
  return { key, keys: keyList(names), tip };
}
