import type { Cleanup } from "../dom/template/bindings.ts";
import { batch } from "../variable/graph.ts";
import { EVENT, type LusiaEvent } from "./events.ts";
import { startListening } from "./listen.ts";

const MARKUP_EVENTS: ReadonlyMap<string, LusiaEvent> = new Map<string, LusiaEvent>([
  ["view", EVENT.VIEW],
  ["scroll", EVENT.SCROLL],
  ["size", EVENT.SIZE],
  ["click-outside", EVENT.CLICK_OUTSIDE],
]);

/** Compiled `on:name={fn}`: an EVENT name or a DOM event, stopped with the element's bindings. */
export function bindListen(
  el: Element,
  name: string,
  fn: (event: unknown) => void,
  cleanups: Cleanup[],
): void {
  const what = MARKUP_EVENTS.get(name) ?? name;
  const handler = (event: unknown): void => batch(() => fn(event));
  cleanups.push(startListening(el, what, handler, {}));
}
