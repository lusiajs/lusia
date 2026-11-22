import { runtimeError } from "../../errors.ts";
import type { ComputedVariable } from "../../variable/compute.ts";
import { isReactive } from "../../variable/reactive.ts";
import {
  DEFAULT_END,
  DEFAULT_RANGE,
  DEFAULT_START,
  readScrollPoint,
  sameTouch,
  type ScrollPoint,
  type ScrollRange,
} from "../scroll/scroll-touch.ts";
import { animateConfig } from "./config-store.ts";

export interface ScrollMore {
  start?: ScrollPoint;
  end?: ScrollPoint;
  follow?: ComputedVariable<Element | null>;
  part?: [number, number];
}

export type Part = [number, number];

// Pinned when `follow` has no start or end: the element sticks to the screen.
export interface ScrollRead {
  range: ScrollRange;
  part: Part;
  follow: ComputedVariable<Element | null> | undefined;
  pinned: boolean;
}

/** A ranged follow item plays the whole section: `part` cannot combine with start and end. */
const WHOLE_SECTION: Part = [0, 1];

export function sameScroll(a: ScrollRead, b: ScrollRead): boolean {
  return (
    sameTouch(a.range.start, b.range.start) &&
    sameTouch(a.range.end, b.range.end) &&
    a.part[0] === b.part[0] &&
    a.part[1] === b.part[1] &&
    a.follow === b.follow &&
    a.pinned === b.pinned
  );
}

// `part` cannot combine with start and end.
export function readScroll({ start, end, follow, part }: ScrollMore): ScrollRead {
  if (follow === undefined) {
    return { range: readRange(start, end), part: readPart(part), follow: undefined, pinned: false };
  }
  if (!isReactive(follow)) throw runtimeError("L2016");
  const ranged = start !== undefined || end !== undefined;
  if (ranged && part !== undefined) throw runtimeError("L2015");
  if (ranged) {
    return { range: readRange(start, end), part: WHOLE_SECTION, follow, pinned: false };
  }
  return { range: DEFAULT_RANGE, part: readPart(part), follow, pinned: true };
}

/** The `more` of a scroll item with no start, end or part: the config values, then the library ones. */
export function scrollDefault(): ScrollRead {
  return readScroll({});
}

function readRange(start: unknown, end: unknown): ScrollRange {
  const config = animateConfig().scroll ?? {};
  const range = {
    start: readScrollPoint(start ?? config.start ?? DEFAULT_START, "start"),
    end: readScrollPoint(end ?? config.end ?? DEFAULT_END, "end"),
  };
  if (sameTouch(range.start, range.end)) throw runtimeError("L2018");
  return range;
}

/** The slice of the section's progress that this item plays. `[0, 1]` means the whole section. */
function readPart(part: Part | undefined): Part {
  const value = part ?? animateConfig().scroll?.part ?? WHOLE_SECTION;
  if (!Array.isArray(value) || value.length !== 2) throw badPart(value);
  const [from, to] = value;
  if (!(from >= 0 && from < to && to <= 1)) throw badPart(value);
  return [from, to];
}

function badPart(part: unknown): Error {
  return runtimeError("L2019", { value: String(part) });
}
