import { EDGE, type ScrollEdge } from "../modes/edge.ts";
import { runtimeError } from "../../errors.ts";

/** A point on the element and the point on the screen that meet: `[element edge, screen edge]`. */
export type ScrollPoint = [ScrollEdge, ScrollEdge];

export interface ScrollTouch {
  element: ScrollEdge;
  screen: ScrollEdge;
}

/** `start` and `end` of WHEN.SCROLL: the progress is 0 at `start` and 1 at `end`. */
export interface ScrollRange {
  start: ScrollTouch;
  end: ScrollTouch;
}

export const DEFAULT_START: ScrollPoint = [EDGE.TOP, EDGE.BOTTOM];
export const DEFAULT_END: ScrollPoint = [EDGE.BOTTOM, EDGE.TOP];

export const DEFAULT_RANGE: ScrollRange = {
  start: toTouch(DEFAULT_START),
  end: toTouch(DEFAULT_END),
};

export function readScrollPoint(value: unknown, name: "start" | "end"): ScrollTouch {
  if (!isPair(value)) throw runtimeError("L2017", { name });
  return toTouch([
    readEdge(value[0], `${name}[0]`),
    readEdge(value[1], `${name}[1]`),
  ]);
}

function isPair(value: unknown): value is ScrollPoint {
  return Array.isArray(value) && value.length === 2;
}

function toTouch([element, screen]: ScrollPoint): ScrollTouch {
  return { element, screen };
}

function readEdge(value: unknown, name: string): ScrollEdge {
  if (typeof value === "number" && value >= 0 && value <= 1) return value;
  throw runtimeError("L2048", { name, value: String(value) });
}

export function sameTouch(a: ScrollTouch, b: ScrollTouch): boolean {
  return a.element === b.element && a.screen === b.screen;
}
