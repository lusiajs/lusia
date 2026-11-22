const VIEW: unique symbol = Symbol("VIEW");
const SCROLL: unique symbol = Symbol("SCROLL");
const SIZE: unique symbol = Symbol("SIZE");
const CLICK_OUTSIDE: unique symbol = Symbol("CLICK_OUTSIDE");

export const EVENT = Object.freeze({ VIEW, SCROLL, SIZE, CLICK_OUTSIDE } as const);

export type LusiaEvent = (typeof EVENT)[keyof typeof EVENT];

const EVENTS: ReadonlySet<unknown> = new Set<unknown>(Object.values(EVENT));

export function isLusiaEvent(value: unknown): value is LusiaEvent {
  return EVENTS.has(value);
}

export interface ViewEvent {
  in: boolean;
}

export interface ScrollEvent {
  progress: number;
}

export interface SizeEvent {
  width: number;
  height: number;
}

/** A click or tap outside the element, or the Escape key. */
export type ClickOutsideEvent = PointerEvent | KeyboardEvent;
