import type { DefaultEasing } from "./keyform.ts";
import { EASE } from "../modes/modes.ts";
import { MIDWAY, TURN } from "../modes/midway-modes.ts";
import { runtimeError } from "../../errors.ts";
import { readAnimateConfig, type AnimateConfig } from "./config.ts";

type Table = ReadonlyMap<string, unknown>;
type Convert = (value: unknown) => unknown;

const STYLE_NAMES: Table = new Map(Object.entries(EASE.STYLE));
const DIRECTION_NAMES: Table = new Map<string, unknown>([
  ["IN", EASE.IN],
  ["OUT", EASE.OUT],
  ["INOUT", EASE.INOUT],
]);
const EASE_PART_NAMES: Table = new Map([...STYLE_NAMES, ...DIRECTION_NAMES]);
const MIDWAY_NAMES: Table = new Map(Object.entries(MIDWAY));
const TURN_NAMES: Table = new Map(Object.entries(TURN));

function nameOf(table: Table, label: string): Convert {
  return (value) => {
    for (const [name, member] of table) if (member === value) return name;
    throw runtimeError("L2067", { name: label, value: String(value) });
  };
}

function valueOf(table: Table, label: string): Convert {
  return (name) => {
    if (typeof name === "string" && table.has(name)) return table.get(name);
    throw runtimeError("L2067", { name: label, value: String(name) });
  };
}

function easingToNames(easing: unknown): unknown {
  if (!Array.isArray(easing)) return easing;
  return easing.map(nameOf(EASE_PART_NAMES, "ease"));
}

function easingFromNames(names: unknown): unknown {
  if (!Array.isArray(names)) return names;
  return names.map(valueOf(EASE_PART_NAMES, "ease")) as DefaultEasing;
}

/** A preset is a PRESET name or a keyframes object whose easing functions are written as names. */
function presetToNames(preset: unknown): unknown {
  if (typeof preset !== "object" || preset === null) return preset;
  return mapKeyframes(preset, easingToNames, nameOf(EASE_PART_NAMES, "ease"));
}

function presetFromNames(preset: unknown): unknown {
  if (typeof preset !== "object" || preset === null) return preset;
  return mapKeyframes(
    preset,
    easingFromNames,
    valueOf(EASE_PART_NAMES, "ease"),
  );
}

function mapKeyframes(
  keyframes: object,
  mapDefault: Convert,
  mapPart: Convert,
): unknown {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(keyframes)) {
    mapped[key] =
      key === "default" ? mapDefault(value) : mapKey(value, mapPart);
  }
  return mapped;
}

function mapKey(value: unknown, mapPart: Convert): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((part) =>
    typeof part === "function" || typeof part === "string"
      ? mapPart(part)
      : part,
  );
}

const MIDWAY_TO_NAMES = new Map<string, Convert>([
  ["play", nameOf(MIDWAY_NAMES, "midway.play")],
  ["turn", nameOf(TURN_NAMES, "midway.turn")],
  ["turnStyle", nameOf(STYLE_NAMES, "midway.turnStyle")],
  ["turnEase", nameOf(DIRECTION_NAMES, "midway.turnEase")],
]);

const MIDWAY_FROM_NAMES = new Map<string, Convert>([
  ["play", valueOf(MIDWAY_NAMES, "midway.play")],
  ["turn", valueOf(TURN_NAMES, "midway.turn")],
  ["turnStyle", valueOf(STYLE_NAMES, "midway.turnStyle")],
  ["turnEase", valueOf(DIRECTION_NAMES, "midway.turnEase")],
]);

const TOP_TO_NAMES = new Map<string, Convert>([
  ["ease", easingToNames],
  ["in", presetToNames],
  ["out", presetToNames],
  ["midway", (midway) => mapFields(midway, MIDWAY_TO_NAMES)],
]);

const TOP_FROM_NAMES = new Map<string, Convert>([
  ["ease", easingFromNames],
  ["in", presetFromNames],
  ["out", presetFromNames],
  ["midway", (midway) => mapFields(midway, MIDWAY_FROM_NAMES)],
]);

/** Converts the fields that have a converter; the others, such as numbers and booleans, pass through. */
function mapFields(
  fields: unknown,
  converters: ReadonlyMap<string, Convert>,
): unknown {
  if (typeof fields !== "object" || fields === null || Array.isArray(fields))
    return fields;
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    const convert = converters.get(key);
    mapped[key] = convert ? convert(value) : value;
  }
  return mapped;
}

/** The JSON form of a config: enum values become their names. */
export function animateConfigToNames(config: AnimateConfig): unknown {
  return mapFields(config, TOP_TO_NAMES);
}

/** Reads the JSON form of a config, with names in place of enum values. Throws on an unknown name. */
export function animateConfigFromNames(named: unknown): AnimateConfig {
  return readAnimateConfig(mapFields(named, TOP_FROM_NAMES));
}
