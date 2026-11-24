import { runtimeError } from "../../errors.ts";
import { ON, type On, type Source } from "../modes/trigger.ts";
import { animateConfig } from "./config-store.ts";

/** The `options` of ON.ATTACH and ON.DETACH. `animateSpace` slides the siblings into the space the element takes or frees. */
export interface SpaceOptions {
  animateSpace?: boolean;
}

export interface SpaceRead {
  animateSpace: boolean;
}

const LIBRARY_ANIMATE_SPACE = false;

/** Only ATTACH and DETACH use the space, so the other triggers get a fixed value. */
export function readSpace({ animateSpace }: SpaceOptions, on: On | Source): SpaceRead {
  if (animateSpace === undefined) {
    return { animateSpace: spaceDefault(on) };
  }
  if (typeof animateSpace !== "boolean") {
    throw runtimeError("L2056", { value: String(animateSpace) });
  }
  return { animateSpace };
}

/** The config section of the trigger, then the library default of that trigger. */
function spaceDefault(on: On | Source): boolean {
  if (on === ON.ATTACH) {
    return animateConfig().attach?.animateSpace ?? LIBRARY_ANIMATE_SPACE;
  }
  if (on === ON.DETACH) {
    return animateConfig().detach?.animateSpace ?? LIBRARY_ANIMATE_SPACE;
  }
  return false;
}
