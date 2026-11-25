import { EASE, MIDWAY, PRESET } from "lusiajs";
import { defineConfig } from "lusiajs/config";

export default defineConfig({
  animate: {
    duration: 400,
    ease: [EASE.STYLE.QUART, EASE.INOUT],
    midway: { mode: MIDWAY.SWITCH_SMOOTH },
    in: PRESET.FADE_IN,
    out: PRESET.FADE_OUT,
    attach: { animateSpace: false },
    detach: { animateSpace: false },
  },
});
