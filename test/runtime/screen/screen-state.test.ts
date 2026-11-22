import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { activeScreen, startScreenState } from "#runtime/screen/screen-state.ts";
import { DEFAULT_SCREENS, REDUCED_MOTION_QUERY, screenRanges } from "#runtime/screen/screens.ts";

type Listener = () => void;

const RANGES = screenRanges(DEFAULT_SCREENS);
const globals = globalThis as unknown as Record<string, unknown>;

let listeners: Listener[] = [];
let reduced = false;

function fakeMatchMedia(query: string) {
  return {
    get matches() {
      return query === REDUCED_MOTION_QUERY && reduced;
    },
    addEventListener(_type: string, listener: Listener) {
      listeners.push(listener);
    },
  };
}

// Every query listener fires; the state reads innerWidth, so it does not matter which one.
function resize(width: number): void {
  globals.innerWidth = width;
  for (const listener of listeners) listener();
}

beforeEach(() => {
  listeners = [];
  reduced = false;
  globals.matchMedia = fakeMatchMedia;
  globals.innerWidth = 400;
});

afterEach(() => {
  delete globals.matchMedia;
  delete globals.innerWidth;
});

describe("activeScreen", () => {
  test("picks the widest screen that starts at or before the width", () => {
    expect(activeScreen(RANGES, 0)).toBe("PHONE");
    expect(activeScreen(RANGES, 599.99)).toBe("PHONE");
    expect(activeScreen(RANGES, 600)).toBe("TABLET");
    expect(activeScreen(RANGES, 999)).toBe("TABLET");
    expect(activeScreen(RANGES, 1200)).toBe("DESKTOP");
  });
});

describe("startScreenState in a browser", () => {
  test("starts with the size of the window", () => {
    const state = startScreenState(DEFAULT_SCREENS);
    expect(state.active.get()).toBe("PHONE");
    expect(state.reduced.get()).toBe(false);
  });

  test("moves to the size the window resizes to", () => {
    const state = startScreenState(DEFAULT_SCREENS);
    resize(800);
    expect(state.active.get()).toBe("TABLET");
    resize(1100);
    expect(state.active.get()).toBe("DESKTOP");
  });

  test("follows the reduced motion query", () => {
    const state = startScreenState(DEFAULT_SCREENS);
    reduced = true;
    for (const listener of listeners) listener();
    expect(state.reduced.get()).toBe(true);
  });
});

describe("startScreenState outside a browser", () => {
  test("the smallest screen is on and motion is not reduced", () => {
    delete globals.matchMedia;
    const state = startScreenState(DEFAULT_SCREENS);
    expect(state.active.get()).toBe("PHONE");
    expect(state.reduced.get()).toBe(false);
  });
});
