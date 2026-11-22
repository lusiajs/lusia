import { variable, type Variable } from "../variable/variable.ts";
import { REDUCED_MOTION_QUERY, screenRanges, type ScreenRange, type Screens } from "./screens.ts";
import { widthQuery } from "./width.ts";

export interface ScreenState {
  /** The name of the one size that is on. */
  active: Variable<string>;
  reduced: Variable<boolean>;
}

/** The widest screen that starts at or before the width. Exactly one screen is active. */
export function activeScreen(ranges: ScreenRange[], width: number): string {
  const first = ranges[0];
  if (first === undefined) throw new Error("screens must not be empty");
  return ranges.findLast((range) => range.min <= width)?.name ?? first.name;
}

/** Outside a browser, the smallest screen is on and motion is not reduced. */
export function startScreenState(screens: Screens): ScreenState {
  const ranges = screenRanges(screens);
  if (typeof matchMedia !== "function") {
    return { active: variable(activeScreen(ranges, 0)), reduced: variable(false) };
  }
  const active = variable(activeScreen(ranges, innerWidth));
  const motion = matchMedia(REDUCED_MOTION_QUERY);
  const reduced = variable(motion.matches);
  // The queries only signal a change. The size comes from innerWidth, so one screen stays on.
  for (const range of ranges) {
    matchMedia(widthQuery(range)).addEventListener("change", () => {
      active.set(activeScreen(ranges, innerWidth));
    });
  }
  motion.addEventListener("change", () => reduced.set(motion.matches));
  return { active, reduced };
}
