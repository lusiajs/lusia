import { stopOnDetach } from "../dom/component/lifecycle.ts";
import { runtimeError } from "../errors.ts";
import { batch } from "../variable/graph.ts";
import {
  EVENT,
  isLusiaEvent,
  type LusiaEvent,
  type OutsideEvent,
  type ScrollEvent,
  type SizeEvent,
  type ViewEvent,
} from "./events.ts";
import { isKeeping } from "./keep-running.ts";
import { startEvent, type ListenOptions, type Stop } from "./sources.ts";

type DomEvents = HTMLElementEventMap & WindowEventMap & DocumentEventMap;

export type EventOf<W> = W extends typeof EVENT.VIEW
  ? ViewEvent
  : W extends typeof EVENT.SCROLL
    ? ScrollEvent
    : W extends typeof EVENT.SIZE
      ? SizeEvent
      : W extends typeof EVENT.OUTSIDE
        ? OutsideEvent
        : W extends keyof DomEvents
          ? DomEvents[W]
          : Event;

type What = LusiaEvent | keyof DomEvents | (string & {});

/** Calls `fn` on a DOM event or an EVENT value. Stops when the component detaches, unless inside keepRunning. */
export function listen<W extends What>(
  target: EventTarget,
  what: W,
  fn: (event: EventOf<W>) => void,
  options?: ListenOptions,
): Stop;
export function listen<W extends What>(
  targets: readonly EventTarget[],
  what: W,
  fn: (event: EventOf<W>) => void,
  options?: ListenOptions,
): Stop[];
export function listen(
  target: EventTarget | readonly EventTarget[],
  what: What,
  fn: (event: unknown) => void,
  options: ListenOptions = {},
): Stop | Stop[] {
  if (isTargetList(target)) return target.map((one) => listenOne(one, what, fn, options));
  return listenOne(target, what, fn, options);
}

function isTargetList(target: EventTarget | readonly EventTarget[]): target is readonly EventTarget[] {
  return Array.isArray(target);
}

function listenOne(
  target: EventTarget,
  what: What,
  fn: (event: unknown) => void,
  options: ListenOptions,
): Stop {
  const handler = (event: unknown): void => batch(() => fn(event));
  const stop = once(start(target, what, handler, options));
  if (!isKeeping()) stopOnDetach(stop);
  return stop;
}

function start(
  target: EventTarget,
  what: What,
  handler: (event: unknown) => void,
  options: ListenOptions,
): Stop {
  if (isLusiaEvent(what)) return startEvent(target, what, handler, options);
  if (typeof what !== "string") throw runtimeError("L2079", { value: String(what) });
  target.addEventListener(what, handler);
  return () => target.removeEventListener(what, handler);
}

function once(stop: Stop): Stop {
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    stop();
  };
}
