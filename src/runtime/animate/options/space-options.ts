import { runtimeError } from "../../errors.ts";
import { WHEN, type When, type Source } from "../modes/trigger.ts";
import { animateConfig } from "./config-store.ts";

/** The `more` options of WHEN.ATTACH and WHEN.DETACH. `animateSpace` slides the siblings into the space the element takes or frees. */
export interface SpaceMore {
  animateSpace?: boolean;
}

export interface SpaceRead {
  animateSpace: boolean;
}

const LIBRARY_ANIMATE_SPACE = false;

/** Only ATTACH and DETACH use the space, so the other triggers get a fixed value. */
export function readSpace({ animateSpace }: SpaceMore, when: When | Source): SpaceRead {
  if (animateSpace === undefined) {
    return { animateSpace: spaceDefault(when) };
  }
  if (typeof animateSpace !== "boolean") {
    throw runtimeError("L2056", { value: String(animateSpace) });
  }
  return { animateSpace };
}

/** The config section of the trigger, then the library default of that trigger. */
function spaceDefault(when: When | Source): boolean {
  if (when === WHEN.ATTACH) {
    return animateConfig().attach?.animateSpace ?? LIBRARY_ANIMATE_SPACE;
  }
  if (when === WHEN.DETACH) {
    return animateConfig().detach?.animateSpace ?? LIBRARY_ANIMATE_SPACE;
  }
  return false;
}
