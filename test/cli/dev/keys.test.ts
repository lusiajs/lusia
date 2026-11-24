import { describe, expect, test } from "bun:test";
import { startKeys, type KeyActions, type KeyInput } from "#cli/dev/keys.ts";

type Listener = (chunk: Buffer | string) => void;

/** A stdin stand-in: `press` emits a chunk to the listeners, like a key press would. */
function fakeInput() {
  const listeners = new Set<Listener>();
  const calls: string[] = [];
  const input: KeyInput = {
    setRawMode: (enabled) => calls.push(`raw ${enabled}`),
    on: (_event, listener) => listeners.add(listener),
    off: (_event, listener) => listeners.delete(listener),
    resume: () => calls.push("resume"),
    pause: () => calls.push("pause"),
  };
  return {
    input,
    calls,
    listenerCount: () => listeners.size,
    press: (key: string) => [...listeners].forEach((listener) => listener(key)),
  };
}

function fakeActions(): KeyActions & { ran: string[] } {
  const ran: string[] = [];
  return {
    ran,
    report: () => ran.push("report"),
    reload: () => ran.push("reload"),
    open: () => ran.push("open"),
    urls: () => ran.push("urls"),
    clear: () => ran.push("clear"),
    help: () => ran.push("help"),
  };
}

describe("startKeys", () => {
  test("turns raw mode on and resumes stdin when it starts", () => {
    const fake = fakeInput();
    startKeys({ input: fake.input, actions: fakeActions(), interrupt: () => {} });
    expect(fake.calls).toEqual(["raw true", "resume"]);
  });

  test("runs the action for each shortcut key", () => {
    const fake = fakeInput();
    const actions = fakeActions();
    startKeys({ input: fake.input, actions, interrupt: () => {} });
    for (const key of ["d", "r", "o", "u", "c", "h"]) fake.press(key);
    expect(actions.ran).toEqual(["report", "reload", "open", "urls", "clear", "help"]);
  });

  test("ignores unknown keys", () => {
    const fake = fakeInput();
    const actions = fakeActions();
    startKeys({ input: fake.input, actions, interrupt: () => {} });
    fake.press("x");
    fake.press("q");
    fake.press("\x1b[A");
    expect(actions.ran).toEqual([]);
  });

  test("Ctrl+C restores the terminal and calls interrupt, not an action", () => {
    const fake = fakeInput();
    const actions = fakeActions();
    let interrupted = 0;
    startKeys({ input: fake.input, actions, interrupt: () => (interrupted += 1) });
    fake.press("\x03");
    expect(interrupted).toBe(1);
    expect(fake.calls).toContain("raw false");
    expect(fake.calls).toContain("pause");
    expect(fake.listenerCount()).toBe(0);
    expect(actions.ran).toEqual([]);
  });

  test("pause stops the shortcuts and resume brings them back, without touching raw mode", () => {
    const fake = fakeInput();
    const actions = fakeActions();
    const keys = startKeys({ input: fake.input, actions, interrupt: () => {} });
    keys.pause();
    fake.press("d");
    expect(actions.ran).toEqual([]);
    expect(fake.listenerCount()).toBe(0);
    keys.resume();
    fake.press("d");
    expect(actions.ran).toEqual(["report"]);
    expect(fake.listenerCount()).toBe(1);
    expect(fake.calls).toEqual(["raw true", "resume"]);
  });

  test("resume twice does not add a second listener", () => {
    const fake = fakeInput();
    const keys = startKeys({ input: fake.input, actions: fakeActions(), interrupt: () => {} });
    keys.resume();
    expect(fake.listenerCount()).toBe(1);
  });

  test("stop restores the terminal and stops listening", () => {
    const fake = fakeInput();
    const actions = fakeActions();
    const keys = startKeys({ input: fake.input, actions, interrupt: () => {} });
    keys.stop();
    fake.press("d");
    expect(fake.calls.slice(-2)).toEqual(["raw false", "pause"]);
    expect(actions.ran).toEqual([]);
  });
});
