import type { EaseStyle } from "../modes/easing.ts";
import { readEase } from "./keyform.ts";
import { EASE, type Ease } from "../modes/modes.ts";
import { animateConfig } from "./config-store.ts";

/** The engine default: used for a part when neither the key nor the keyframes `ease` sets it. */
export interface AnimateDefault {
  easeStyle: EaseStyle;
  ease: Ease;
  duration: number;
}

const LIBRARY_DEFAULT: AnimateDefault = {
  easeStyle: EASE.STYLE.QUART,
  ease: EASE.INOUT,
  duration: 300,
};

/** The config layer over the library default. */
export function animateDefault(): AnimateDefault {
  const configured = animateConfig();
  const ease = readEase(configured.ease);
  return {
    easeStyle: ease.easeStyle ?? LIBRARY_DEFAULT.easeStyle,
    ease: ease.ease ?? LIBRARY_DEFAULT.ease,
    duration: configured.duration ?? LIBRARY_DEFAULT.duration,
  };
}
