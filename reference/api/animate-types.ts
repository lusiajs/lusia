import type { ApiEntry } from "./types.ts";

export const animateTypeEntries: ApiEntry[] = [
  {
    id: "animate-type",
    name: "Animate",
    kind: "type",
    group: "motion",
    signature: "type Animate = Keyframes | AnimateItem | (Keyframes | AnimateItem)[]",
    summary: "The value of the animate attribute.",
    bullets: [
      "A bare Keyframes object is shorthand for { play: it }.",
      "An array plays each item on its own trigger.",
      "Same-property conflicts: the later item wins.",
    ],
    example: `import type { Animate } from "lusiajs";\n\nconst value: Animate = [fadeIn, { play: glow, on: ON.HOVER }];`,
  },
  {
    id: "keyframes-type",
    name: "Keyframes",
    kind: "type",
    group: "motion",
    signature:
      "type Keyframes = { ease?: EaseValue } & Record<number, Style | [EaseStyle, Ease, Style] | [EaseStyle, Style] | [Ease, Style]>",
    summary: "The keys of one animation. Each key sets its styles, and optionally its easing.",
    bullets: [
      "Keys are numbers from 0 to 1, and must include 0 and 1.",
      "A key is { css } (the defaults apply), [ease, { css }], [EASE.STYLE.x, { css }] or [EASE.STYLE.x, ease, { css }].",
      "ease: [EASE.STYLE.x, ease], [EASE.STYLE.x] or [ease] is only a default for keys that do not set their own. Any number key overrides it.",
      "Precedence per part: the key's own ease, then the keyframes ease, then the config animate.ease, then the built-in QUART and INOUT.",
      "Style is a record of CSS properties in camelCase, such as backgroundColor. Custom properties start with --.",
    ],
    example: `import { EASE, type Keyframes } from "lusiajs";\n\nconst fade: Keyframes = {\n  ease: [EASE.STYLE.QUART, EASE.OUT],\n  0: { opacity: 0 },\n  0.5: [EASE.IN, { opacity: 0.8 }],\n  1: { opacity: 1 },\n};`,
  },
  {
    id: "preset",
    name: "PRESET",
    kind: "value",
    group: "motion",
    signature:
      "const PRESET: { readonly FADE_IN: Keyframes; readonly FADE_OUT: Keyframes; readonly SLIDE_UP: Keyframes; readonly SLIDE_DOWN: Keyframes; readonly SLIDE_LEFT: Keyframes; readonly SLIDE_RIGHT: Keyframes;readonly POP_IN: Keyframes; readonly POP_OUT: Keyframes; readonly ZOOM_IN: Keyframes; readonly ZOOM_OUT: Keyframes; readonly FLIP_IN: Keyframes; readonly FLIP_OUT: Keyframes; readonly BLUR_IN: Keyframes; readonly BLUR_OUT: Keyframes; readonly DROP_IN: Keyframes; readonly BOUNCE_IN: Keyframes; readonly SHAKE: Keyframes; readonly PULSE: Keyframes; readonly SPIN: Keyframes; readonly WOBBLE: Keyframes; readonly HEARTBEAT: Keyframes; readonly TADA: Keyframes }",
    summary: "Ready-made keyframes for common motion.",
    bullets: [
      "Use one as the play: animate={PRESET.FADE_IN} plays once on attach.",
      "NAME_IN plays on attach. NAME_OUT is for leaving: use it with on: ON.DETACH, and detach waits for it.",
      "Presets set only the properties they name, so they combine with the element's own transform.",
      "Spread one to change it: { ...PRESET.FADE_IN, 1: { opacity: 0.5 } }.",
      "IN presets ease OUT, OUT presets ease IN (both CUBIC). A key in a spread can still set its own.",
    ],
    example: `import { ON, PRESET } from "lusiajs";\n\n<section animate={{ play: PRESET.SLIDE_UP, on: ON.VIEW, duration: 500 }}>...</section>`,
    members: [
      { name: "FADE_IN", summary: "Fades in from transparent." },
      { name: "FADE_OUT", summary: "Fades out to transparent." },
      {
        name: "SLIDE_UP",
        summary: "Comes up from below, moving up 24px into place while fading in.",
      },
      {
        name: "SLIDE_DOWN",
        summary: "Comes down from above, moving down 24px into place while fading in.",
      },
      {
        name: "SLIDE_LEFT",
        summary: "Comes in from the left, moving right 24px into place while fading in.",
      },
      {
        name: "SLIDE_RIGHT",
        summary: "Comes in from the right, moving left 24px into place while fading in.",
      },
      { name: "POP_IN", summary: "Grows from 80% size while fading in." },
      { name: "POP_OUT", summary: "Shrinks to 80% size while fading out." },
      { name: "ZOOM_IN", summary: "Grows from nothing to full size." },
      { name: "ZOOM_OUT", summary: "Shrinks from full size to nothing." },
      {
        name: "FLIP_IN",
        summary: "Turns into view around the vertical axis while fading in.",
      },
      {
        name: "FLIP_OUT",
        summary: "Turns away around the vertical axis while fading out.",
      },
      { name: "BLUR_IN", summary: "Comes into focus from a blur while fading in." },
      { name: "BLUR_OUT", summary: "Blurs out while fading out." },
      { name: "DROP_IN", summary: "Falls in from above and settles with a small bounce." },
      { name: "BOUNCE_IN", summary: "Grows in with a bounce, then settles." },
      { name: "SHAKE", summary: "Shakes sideways 10px, then settles." },
      { name: "PULSE", summary: "Grows to 110% and back." },
      { name: "SPIN", summary: "One full turn." },
      { name: "WOBBLE", summary: "Wobbles side to side, then settles." },
      { name: "HEARTBEAT", summary: "Beats twice, then settles." },
      { name: "TADA", summary: "Grows and wiggles, then settles." },
    ],
  },
  {
    id: "interpolate",
    name: "interpolate()",
    kind: "function",
    group: "motion",
    signature: "interpolate(from: unknown, to: unknown): (t: number) => unknown",
    summary: "Blends two values. The same engine that animate uses.",
    bullets: [
      "Handles numbers, strings with units and colors, arrays and plain objects.",
      "Returns a function: call it with t from 0 to 1.",
      "Values that cannot blend switch at the middle.",
    ],
    example: `import { interpolate } from "lusiajs";\n\nconst mix = interpolate("0px", "100px");\nmix(0.5); // "50px"`,
  },
];
