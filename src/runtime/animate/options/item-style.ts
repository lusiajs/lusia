import { runtimeError } from "../../errors.ts";
import type { AnimateItem } from "../animation.ts";
import { isLayoutOn, ON, type Source, type On } from "../modes/trigger.ts";
import type { Keyframes } from "./keyframes.ts";
import { PRESET } from "./presets.ts";
import { animateConfig } from "./config-store.ts";

/** The keyframes of a layout item with no play. It has no props, so only the glide and the timing run. */
const NO_PLAY: Keyframes = { 0: {}, 1: {} };

/** The styles the glide writes. A layout item cannot animate them, or its keyframes would fight the glide. */
const GLIDE_PROPS = ["translate", "scale"];

export function readKeyframes(item: AnimateItem, on: On | Source): Keyframes {
  if (!item.play) return keyframesWithoutPlay(on);
  if (isLayoutOn(on)) rejectGlideStyles(item.play);
  return item.play;
}

/** An item with no play takes the config preset: `out` for DETACH, `in` for the other triggers. */
function keyframesWithoutPlay(on: On | Source): Keyframes {
  if (isLayoutOn(on)) return NO_PLAY;
  const preset = on === ON.DETACH ? animateConfig().out : animateConfig().in;
  if (preset === undefined) throw runtimeError("L2001");
  return typeof preset === "string" ? PRESET[preset] : preset;
}

function rejectGlideStyles(keyframes: Keyframes): void {
  for (const [key, value] of Object.entries(keyframes)) {
    if (key === "ease") continue;
    const style = (Array.isArray(value) ? value[value.length - 1] : value) as Record<
      string,
      unknown
    >;
    for (const name of GLIDE_PROPS) {
      if (name in style) throw runtimeError("L2052", { name });
    }
  }
}
