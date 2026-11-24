import { readAnimateConfig, type AnimateConfig } from "#runtime/animate/options/config.ts";
import { animateConfigFromNames } from "#runtime/animate/options/config-names.ts";
import { asObject, checkKeys, type JsonObject } from "./config-values.ts";

const ANIMATE_KEYS = ["duration", "delay", "ease", "keep", "in", "out"];

const ANIMATE_SECTIONS: Readonly<Record<string, readonly string[]>> = {
  midway: ["mode", "duration", "ease", "play", "turn", "turnDuration", "turnStyle", "turnEase"],
  view: ["margin", "amount", "reverse"],
  hover: ["inDelay", "outDelay", "outDuration"],
  scroll: ["start", "end", "part"],
  attach: ["animateSpace"],
  detach: ["animateSpace"],
};

/** The JSON form: names such as "QUART" become values, and the values are checked. */
export function optionalAnimateNames(root: JsonObject): AnimateConfig | undefined {
  if (root.animate === undefined) return undefined;
  return animateConfigFromNames(checkAnimate(root.animate));
}

/** The TS form: the values are already runtime values, so only the values are checked. */
export function optionalAnimateValues(root: JsonObject): AnimateConfig | undefined {
  if (root.animate === undefined) return undefined;
  return readAnimateConfig(checkAnimate(root.animate));
}

function checkAnimate(value: unknown): JsonObject {
  const animate = asObject(value, '"animate" must be an object');
  checkKeys(animate, [...ANIMATE_KEYS, ...Object.keys(ANIMATE_SECTIONS)], "animate");
  for (const [section, keys] of Object.entries(ANIMATE_SECTIONS)) {
    checkSection(animate, section, keys);
  }
  return animate;
}

function checkSection(animate: JsonObject, section: string, keys: readonly string[]): void {
  if (animate[section] === undefined) return;
  const object = asObject(animate[section], `"animate.${section}" must be an object`);
  checkKeys(object, keys, `animate.${section}`);
}
