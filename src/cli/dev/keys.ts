import { SHORTCUTS, type KeyAction } from "./shortcuts.ts";

const INTERRUPT = "\x03";

export type KeyActions = Record<KeyAction, () => void>;

/** The part of stdin the keys need. process.stdin fits, and tests can pass a fake. */
export interface KeyInput {
  setRawMode(enabled: boolean): unknown;
  on(event: "data", listener: (chunk: Buffer | string) => void): unknown;
  off(event: "data", listener: (chunk: Buffer | string) => void): unknown;
  resume(): unknown;
  pause(): unknown;
}

export interface KeyOptions {
  input: KeyInput;
  actions: KeyActions;
  /** Runs on Ctrl+C. Raw mode turns Ctrl+C into a key, so it no longer sends SIGINT. */
  interrupt: () => void;
}

export interface KeyControl {
  stop(): void;
  /** Stops the shortcut keys while another screen reads input. Raw mode stays on. */
  pause(): void;
  resume(): void;
}

const actionByKey = new Map(SHORTCUTS.map(({ key, action }) => [key, action] as const));

/** Raw mode delivers each key at once, without Enter. Stop restores the terminal. */
export function startKeys({ input, actions, interrupt }: KeyOptions): KeyControl {
  function onData(chunk: Buffer | string): void {
    const key = String(chunk);
    if (key === INTERRUPT) {
      stop();
      interrupt();
      return;
    }
    const action = actionByKey.get(key);
    if (action) actions[action]();
  }

  function stop(): void {
    listening = false;
    input.off("data", onData);
    input.setRawMode(false);
    input.pause();
  }

  function pause(): void {
    if (!listening) return;
    listening = false;
    input.off("data", onData);
  }

  function resume(): void {
    if (listening) return;
    listening = true;
    input.on("data", onData);
  }

  let listening = true;
  input.setRawMode(true);
  input.on("data", onData);
  input.resume();
  return { stop, pause, resume };
}
