import { REACTIVE } from "../variable/reactive.ts";
import type { UpdateOptions, Variable } from "../variable/variable.ts";
import { goTo, pathState } from "./location.ts";
import { matchPattern } from "./pattern.ts";

export interface RouterPath extends Variable<string> {
  match(pattern: string): boolean;
}

/** The pathname of the page. Set it to go to another page; a query or hash in the value is kept in the URL. */
export const PATH: RouterPath = {
  get value() {
    return pathState.get();
  },
  set value(next: string) {
    goTo(next);
  },
  get: () => pathState.get(),
  set: (next: string) => goTo(next),
  peek: () => pathState.peek(),
  onUpdate: (fn: (now: string, before: string | undefined) => void, options?: UpdateOptions) =>
    pathState.onUpdate(fn, options),
  match: (pattern: string) => matchPattern(pattern, pathState.get()) !== undefined,
  [REACTIVE]: true,
};
