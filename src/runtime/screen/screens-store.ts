import { DEFAULT_SCREENS, type Screens } from "./screens.ts";

// Set by each compiled module from lusia.config. Read once, when SCREEN is first used.
let configured: Screens = DEFAULT_SCREENS;

export function setScreens(screens: Screens): void {
  configured = screens;
}

export function configuredScreens(): Screens {
  return configured;
}
