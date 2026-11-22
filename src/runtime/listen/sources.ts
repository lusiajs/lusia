import { readScroll, type ScrollMore } from "../animate/options/scroll-options.ts";
import { readViewMore, type ViewMore } from "../animate/options/view-options.ts";
import { watchScroll } from "../animate/scroll/scroll.ts";
import { watchView } from "../animate/scroll/view.ts";
import { runtimeError } from "../errors.ts";
import { watchClickOutside } from "./click-outside.ts";
import { EVENT, type LusiaEvent } from "./events.ts";

export type Stop = () => void;
export type ListenOptions = Omit<ViewMore, "reverse"> & ScrollMore;

export function startEvent(
  target: EventTarget,
  what: LusiaEvent,
  handler: (event: unknown) => void,
  options: ListenOptions,
): Stop {
  const el = elementOf(target, what);
  if (what === EVENT.VIEW) return startView(el, handler, options);
  if (what === EVENT.SCROLL) return startScroll(el, handler, options);
  if (what === EVENT.SIZE) return startSize(el, handler);
  return watchClickOutside(el, handler);
}

function elementOf(target: EventTarget, what: LusiaEvent): Element {
  if (target instanceof Element) return target;
  throw runtimeError("L2078", { event: `EVENT.${what.description}` });
}

function startView(el: Element, handler: (event: unknown) => void, options: ListenOptions): Stop {
  const { view } = readViewMore({ margin: options.margin, amount: options.amount });
  return watchView(el, view, (inView) => handler({ in: inView }));
}

function startScroll(el: Element, handler: (event: unknown) => void, options: ListenOptions): Stop {
  const scroll = readScroll({
    start: options.start,
    end: options.end,
    follow: options.follow,
    part: options.part,
  });
  return watchScroll(el, (progress) => handler({ progress }), scroll);
}

function startSize(el: Element, handler: (event: unknown) => void): Stop {
  const observer = new ResizeObserver(([entry]) => {
    const box = entry!.contentRect;
    handler({ width: box.width, height: box.height });
  });
  observer.observe(el);
  return () => observer.disconnect();
}
