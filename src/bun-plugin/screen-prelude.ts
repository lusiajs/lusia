import type { Screens } from "#runtime/screen/screens.ts";

const IMPORT_LINE = 'import { setScreens } from "lusiajs/internal";';

/** The code that sets the build's screen sizes in a compiled module. Empty when none are set. */
export function screenPrelude(screens: Screens | undefined): string {
  if (screens === undefined) return "";
  return `${IMPORT_LINE}\nsetScreens(${JSON.stringify(screens)});\n`;
}

/** The screen sizes as JSON for the compile cache key. */
export function screensKey(screens: Screens | undefined): string {
  return JSON.stringify(screens ?? null);
}
