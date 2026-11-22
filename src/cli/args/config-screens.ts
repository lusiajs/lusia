import { REDUCED_MOTION } from "#runtime/screen/screens.ts";
import { asObject, configError, type JsonObject } from "./config-values.ts";

const SCREEN_NAME = /^[A-Z][A-Z0-9_]*$/;

/** The screen sizes: UPPER_SNAKE_CASE names, unique whole-number starts, the smallest at 0. */
export function optionalScreens(root: JsonObject): Record<string, number> | undefined {
  if (root.screens === undefined) return undefined;
  const screens = asObject(root.screens, '"screens" must be an object');
  const entries = Object.entries(screens);
  if (entries.length === 0)
    throw configError('"screens" needs at least one screen, such as PHONE: 0');
  for (const [name, start] of entries) checkScreen(name, start);
  checkUnique(entries as Array<[string, number]>);
  const smallest = Math.min(...(entries as Array<[string, number]>).map(([, start]) => start));
  if (smallest !== 0)
    throw configError('the smallest screen in "screens" must start at 0, such as PHONE: 0');
  return screens as Record<string, number>;
}

function checkScreen(name: string, start: unknown): void {
  if (name === REDUCED_MOTION)
    throw configError(`"${REDUCED_MOTION}" is the motion setting, not a screen. Pick another name`);
  if (!SCREEN_NAME.test(name))
    throw configError(`screen "${name}" must be UPPER_SNAKE_CASE, such as PHONE or WIDE_DESKTOP`);
  if (typeof start !== "number" || !Number.isInteger(start) || start < 0)
    throw configError(`"screens.${name}" must be a whole number, 0 or more`);
}

function checkUnique(entries: Array<[string, number]>): void {
  const names = new Map<number, string>();
  for (const [name, start] of entries) {
    const other = names.get(start);
    if (other !== undefined)
      throw configError(
        `"screens.${other}" and "screens.${name}" both start at ${start}. Each screen needs its own start`,
      );
    names.set(start, name);
  }
}
