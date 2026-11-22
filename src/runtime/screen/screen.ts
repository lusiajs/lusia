import { runtimeError } from "../errors.ts";
import { compute, type ComputedVariable } from "../variable/compute.ts";
import { startScreenState, type ScreenState } from "./screen-state.ts";
import { configuredScreens } from "./screens-store.ts";
import { REDUCED_MOTION } from "./screens.ts";

export type ScreenFlag = ComputedVariable<boolean>;

export type ScreenObject = Readonly<Record<string, ScreenFlag>> & {
  PHONE: ScreenFlag;
  TABLET: ScreenFlag;
  DESKTOP: ScreenFlag;
  REDUCED_MOTION: ScreenFlag;
};

// Made on the first read of each name, so an app that never reads SCREEN pays nothing.
const flags = new Map<string, ScreenFlag>();
let state: ScreenState | undefined;

function screenState(): ScreenState {
  state ??= startScreenState(configuredScreens());
  return state;
}

function isScreenName(name: string): boolean {
  return name === REDUCED_MOTION || Object.hasOwn(configuredScreens(), name);
}

function makeFlag(name: string): ScreenFlag {
  const current = screenState();
  if (name === REDUCED_MOTION) return compute(() => current.reduced.get());
  return compute(() => current.active.get() === name);
}

function flagNamed(name: string): ScreenFlag | undefined {
  const known = flags.get(name);
  if (known) return known;
  if (!isScreenName(name)) return undefined;
  const flag = makeFlag(name);
  flags.set(name, flag);
  return flag;
}

export const SCREEN: ScreenObject = new Proxy({} as ScreenObject, {
  get(_target, key) {
    return typeof key === "string" ? flagNamed(key) : undefined;
  },
  set(_target, key) {
    throw runtimeError("L2080", { name: String(key) });
  },
});
