import { runtimeError } from "../../errors.ts";
import { ON, isOn, type On, type Source } from "../modes/trigger.ts";
import { readSpace, type SpaceOptions, type SpaceRead } from "./space-options.ts";
import {
  hoverDefault,
  readHover,
  sameHover,
  type HoverOptions,
  type HoverRead,
} from "./hover-options.ts";
import {
  HOVER_KEYS,
  keyList,
  SCROLL_KEYS,
  SPACE_KEYS,
  SPELLING_HINT,
  unknownKeyValues,
  VIEW_KEYS,
} from "./keys.ts";
import { readViewOptions, sameView, type ViewOptions, type ViewSettings } from "./view-options.ts";
import { readScroll, sameScroll, type ScrollOptions, type ScrollRead } from "./scroll-options.ts";

export type TriggerOptions = ViewOptions | HoverOptions | ScrollOptions | SpaceOptions;

/** The item's own timing, used as the defaults for `options`. */
export interface OptionsBase {
  duration: number;
}

// Fields a trigger does not use keep their defaults.
export interface ReadOptions {
  view: ViewSettings;
  reverse: boolean;
  hover: HoverRead;
  scroll: ScrollRead;
  space: SpaceRead;
}

/** The `options` of an item that sets none. Every field takes its config value, then its library default. */
function defaultOptions(on: On | Source): ReadOptions {
  return {
    ...readViewOptions({}),
    hover: hoverDefault(),
    scroll: readScroll({}),
    space: readSpace({}, on),
  };
}

export function readOptions(
  on: On | Source,
  options: TriggerOptions | undefined,
  base: OptionsBase,
): ReadOptions {
  if (options === undefined) return defaultOptions(on);
  if (on === ON.VIEW)
    return {
      ...defaultOptions(on),
      ...readViewOptions(checkKeys<ViewOptions>(options, VIEW_KEYS)),
    };
  if (on === ON.HOVER)
    return {
      ...defaultOptions(on),
      hover: readHover(checkKeys<HoverOptions>(options, HOVER_KEYS), base),
    };
  if (on === ON.SCROLL)
    return {
      ...defaultOptions(on),
      scroll: readScroll(checkKeys<ScrollOptions>(options, SCROLL_KEYS)),
    };
  if (on === ON.ATTACH || on === ON.DETACH)
    return {
      ...defaultOptions(on),
      space: readSpace(checkKeys<SpaceOptions>(options, SPACE_KEYS), on),
    };
  throw runtimeError("L2010", { on: onName(on) });
}

/** True when two items can share one trigger: the same settings for every field their trigger reads. */
export function sameOptions(a: ReadOptions, b: ReadOptions): boolean {
  return (
    sameView(a.view, b.view) &&
    a.reverse === b.reverse &&
    sameHover(a.hover, b.hover) &&
    sameScroll(a.scroll, b.scroll) &&
    a.space.animateSpace === b.space.animateSpace
  );
}

function onName(on: On | Source): string {
  return isOn(on) ? `ON.${String(on.description)}` : "a variable";
}

function checkKeys<T extends object>(options: TriggerOptions, allowed: readonly string[]): T {
  if (typeof options !== "object" || options === null) {
    throw runtimeError("L2011", { keys: keyList(allowed), value: String(options) });
  }
  for (const key of Object.keys(options)) {
    if (!allowed.includes(key)) {
      const values = unknownKeyValues(key, allowed, SPELLING_HINT);
      throw runtimeError("L2012", values, key);
    }
  }
  return options as T;
}
