import { readDefault, type DefaultEasing } from "./keyform.ts";
import type { EaseStyle } from "../modes/easing.ts";
import type { Ease } from "../modes/modes.ts";
import type { MidwayMode, TurnMode } from "../modes/midway-modes.ts";
import type { ScrollPoint } from "../scroll/scroll-touch.ts";
import type { Part } from "./scroll-options.ts";
import type { Keyframes } from "./keyframes.ts";
import { runtimeError } from "../../errors.ts";
import { PRESET } from "./presets.ts";
import { readMs } from "./read-ms.ts";
import { storeAnimateConfig } from "./config-store.ts";
import {
  checkAttach,
  checkDetach,
  checkHover,
  checkMidway,
  checkScroll,
  checkView,
  readObject,
} from "./config-sections.ts";
import type { SpaceMore } from "./space-options.ts";

export type PresetName = keyof typeof PRESET;

export interface MidwayConfig {
  play?: MidwayMode;
  turn?: TurnMode;
  turnDuration?: number;
  turnStyle?: EaseStyle;
  turnEase?: Ease;
}

export interface ViewConfig {
  margin?: number | string;
  amount?: number;
  reverse?: boolean;
}

export interface HoverConfig {
  inDelay?: number;
  outDelay?: number;
  outDuration?: number;
}

export interface ScrollConfig {
  start?: ScrollPoint;
  end?: ScrollPoint;
  part?: Part;
}

/** The app-wide animate defaults from lusia.config. Every key is optional. */
export interface AnimateConfig {
  duration?: number;
  delay?: number;
  ease?: DefaultEasing;
  keep?: boolean;
  midway?: MidwayConfig;
  view?: ViewConfig;
  hover?: HoverConfig;
  scroll?: ScrollConfig;
  attach?: SpaceMore;
  detach?: SpaceMore;
  in?: PresetName | Keyframes;
  out?: PresetName | Keyframes;
}

const CONFIG_KEYS = [
  "duration",
  "delay",
  "ease",
  "keep",
  "midway",
  "view",
  "hover",
  "scroll",
  "attach",
  "detach",
  "in",
  "out",
];

type Check = (value: unknown) => void;

const CONFIG_CHECKS: ReadonlyMap<string, Check> = new Map<string, Check>([
  ["duration", (value) => void readMs(value as number, 0, "duration")],
  ["delay", (value) => void readMs(value as number, 0, "delay")],
  ["ease", (value) => void readDefault(value as DefaultEasing)],
  ["keep", (value) => checkBoolean("keep", value)],
  ["midway", checkMidway],
  ["view", checkView],
  ["hover", checkHover],
  ["scroll", checkScroll],
  ["attach", checkAttach],
  ["detach", checkDetach],
  ["in", (value) => checkPresetName("in", value)],
  ["out", (value) => checkPresetName("out", value)],
]);

/** Checks every key of a config and returns it, so the store only holds values the readers accept. */
export function readAnimateConfig(value: unknown): AnimateConfig {
  const fields = readObject(value, "config", CONFIG_KEYS);
  const config: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(fields)) {
    if (field === undefined) continue;
    CONFIG_CHECKS.get(key)?.(field);
    config[key] = field;
  }
  return config as AnimateConfig;
}

export function setAnimateConfig(config: AnimateConfig): void {
  storeAnimateConfig(readAnimateConfig(config));
}

function checkBoolean(name: string, value: unknown): void {
  if (typeof value !== "boolean") {
    throw runtimeError("L2069", { name, value: String(value) });
  }
}

function checkPresetName(name: string, value: unknown): void {
  if (isKeyframes(value) || isPresetName(value)) return;
  throw runtimeError("L2068", { name, value: String(value) });
}

function isPresetName(value: unknown): boolean {
  return typeof value === "string" && Object.hasOwn(PRESET, value);
}

function isKeyframes(value: unknown): boolean {
  return (
    typeof value === "object" && value !== null && 0 in value && 1 in value
  );
}
