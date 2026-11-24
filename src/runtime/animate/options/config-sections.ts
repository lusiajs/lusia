import { runtimeError } from "../../errors.ts";
import { readMidway, type AnimateMidway } from "./midway-options.ts";
import { readMs } from "./read-ms.ts";
import { ON } from "../modes/trigger.ts";
import { readScroll, type ScrollOptions } from "./scroll-options.ts";
import { readSpace, type SpaceOptions } from "./space-options.ts";
import { SPACE_KEYS, SPELLING_HINT, unknownKeyValues, VIEW_KEYS } from "./keys.ts";
import { readViewOptions, type ViewOptions } from "./view-options.ts";

const HOVER_CONFIG_KEYS = ["inDelay", "outDelay", "outDuration"];
const SCROLL_CONFIG_KEYS = ["start", "end", "part"];

/** Checks that a config value is an object with only the allowed keys. */
export function readObject(
  value: unknown,
  name: string,
  keys: readonly string[],
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw runtimeError("L2065", { name, value: String(value) });
  }
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) {
      throw runtimeError("L2066", { name, ...unknownKeyValues(key, keys, SPELLING_HINT) });
    }
  }
  return value as Record<string, unknown>;
}

// Each section check reuses the reader the items use, so a bad value fails the same way.

export function checkMidway(value: unknown): void {
  const mode = (value as AnimateMidway | undefined)?.mode;
  if (typeof mode === "function") throw runtimeError("L2026");
  readMidway(value as AnimateMidway);
}

export function checkView(value: unknown): void {
  readViewOptions(readObject(value, "view", VIEW_KEYS) as ViewOptions);
}

export function checkHover(value: unknown): void {
  const hover = readObject(value, "hover", HOVER_CONFIG_KEYS);
  readMs(hover.inDelay as number | undefined, 0, "hover.inDelay");
  readMs(hover.outDelay as number | undefined, 0, "hover.outDelay");
  readMs(hover.outDuration as number | undefined, 0, "hover.outDuration");
}

export function checkScroll(value: unknown): void {
  readScroll(readObject(value, "scroll", SCROLL_CONFIG_KEYS) as ScrollOptions);
}

export function checkAttach(value: unknown): void {
  readSpace(readObject(value, "attach", SPACE_KEYS) as SpaceOptions, ON.ATTACH);
}

export function checkDetach(value: unknown): void {
  readSpace(readObject(value, "detach", SPACE_KEYS) as SpaceOptions, ON.DETACH);
}
