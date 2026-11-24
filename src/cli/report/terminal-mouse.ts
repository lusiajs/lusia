export type MouseKind = "press" | "release" | "wheel-up" | "wheel-down";

export interface MouseEvent {
  kind: MouseKind;
  x: number;
  y: number;
}

export const MOUSE_ENABLE = "\x1b[?1000h\x1b[?1006h";
export const MOUSE_DISABLE = "\x1b[?1000l\x1b[?1006l";

const SGR_MOUSE = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;
const BUTTON_MASK = 3;
const LEFT_BUTTON = 0;
const WHEEL_DOWN_BUTTON = 1;
const MOTION_BIT = 32;
const WHEEL_BIT = 64;

/** Every SGR mouse event in one input chunk, in order. */
export function parseMouseEvents(data: string): MouseEvent[] {
  const events: MouseEvent[] = [];
  for (const match of data.matchAll(SGR_MOUSE)) {
    const event = toMouseEvent(match);
    if (event !== undefined) events.push(event);
  }
  return events;
}

/** The first SGR mouse event in an input chunk, if any. */
export function parseMouse(data: string): MouseEvent | undefined {
  return parseMouseEvents(data)[0];
}

function toMouseEvent(match: RegExpMatchArray): MouseEvent | undefined {
  const [, code = "", column = "", row = "", final = ""] = match;
  const kind = mouseKind(Number(code), final);
  if (kind === undefined) return undefined;
  return { kind, x: Number(column) - 1, y: Number(row) - 1 };
}

function mouseKind(button: number, final: string): MouseKind | undefined {
  if ((button & WHEEL_BIT) !== 0) return wheelKind(button);
  if ((button & MOTION_BIT) !== 0) return undefined;
  if (final === "m") return "release";
  return (button & BUTTON_MASK) === LEFT_BUTTON ? "press" : undefined;
}

function wheelKind(button: number): MouseKind {
  return (button & BUTTON_MASK) === WHEEL_DOWN_BUTTON ? "wheel-down" : "wheel-up";
}
