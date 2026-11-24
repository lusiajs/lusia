import type { ApiEntry } from "./types.ts";

export const animateOptionEntries: ApiEntry[] = [
  {
    id: "animate",
    name: "animate={...}",
    kind: "markup",
    group: "motion",
    signature: "animate={Animate}",
    summary: "Animates CSS properties of an element over time.",
    bullets: [
      "Takes Keyframes, an AnimateItem, or an array of either.",
      "A bare Keyframes object plays once on attach, with the defaults.",
      "Item fields: play (required), on, duration in ms, delay, loop, once, options, midway, keep, control.",
      "on sets when it plays: ON.ATTACH, DETACH, VIEW, HOVER, SCROLL, MOVE, RESIZE, MOVE_OR_RESIZE, MANUAL, or a variable.",
      "options sets the options for the trigger: VIEW, HOVER and SCROLL each take their own.",
    ],
    example: `<div animate={[\n  { play: fadeIn, on: ON.VIEW, duration: 400 },\n  { play: glow, on: ON.HOVER },\n]}>Hi</div>`,
  },
  {
    id: "layout",
    name: "Layout",
    kind: "markup",
    group: "motion",
    signature: "animate={{ on: ON.MOVE }}",
    summary: "Glides an element to its new place or size, with no keyframes.",
    bullets: [
      "No keyframes: the element moves from its old box to its new one.",
      "ON.MOVE glides on a place change, ON.RESIZE on a size change, ON.MOVE_OR_RESIZE on either.",
      "Any cause works: a class change, a list reorder, or content that opens.",
    ],
    example: `import { ON } from "lusiajs";\n\n<div animate={{ on: ON.MOVE, duration: 600 }}>Box</div>`,
  },
  {
    id: "ease",
    name: "EASE",
    kind: "value",
    group: "motion",
    signature:
      "const EASE: { readonly STYLE: { readonly LINEAR: EaseStyle; ...; readonly BOUNCE: EaseStyle }; readonly IN: Ease; readonly OUT: Ease; readonly INOUT: Ease }",
    summary: "Easing styles (curves) and the direction each one plays.",
    bullets: [
      "EASE.STYLE holds the curves. Write EASE.STYLE.QUART in a key: [EASE.STYLE.QUART, EASE.OUT, style].",
      "IN starts slow and speeds up. OUT starts fast and slows down. INOUT is slow at both ends.",
      "Each STYLE member is a function (t) => number that goes from 0 to 1. Your own functions work too.",
      "The keyframes ease is only a default. Any number key with its own ease overrides it, such as 0.5: [EASE.IN, { opacity: 1 }].",
      "Without any ease, the engine default applies: QUART and INOUT.",
    ],
    table: [
      ["Order", "Where the ease comes from", "Example"],
      ["1 (first)", "The key's own ease", "0.5: [EASE.IN, { opacity: 1 }]"],
      ["2", "The keyframes ease", "ease: [EASE.STYLE.QUART, EASE.OUT]"],
      ["3", "The config animate.ease", "animate: { ease: [EASE.STYLE.CUBIC] }"],
      ["4 (last)", "The built-in default", "QUART and INOUT"],
    ],
    example: `import { EASE } from "lusiajs";\n\nconst land = { ease: [EASE.STYLE.QUART, EASE.OUT], 0: { translate: "0px 40px" }, 1: { translate: "0px 0px" } };`,
    members: [
      {
        name: "STYLE",
        summary: "The easing curves. Each one is a function from 0 to 1.",
        members: [
          {
            name: "LINEAR",
            summary: "Constant speed, no easing.",
          },
          { name: "QUAD", summary: "Gentle curve, t squared." },
          {
            name: "CUBIC",
            summary: "Stronger curve, t cubed. Good for most UI.",
          },
          {
            name: "QUART",
            summary: "Strong curve, t to the fourth.",
          },
          {
            name: "QUINT",
            summary: "Very strong curve, t to the fifth.",
          },
          {
            name: "SINE",
            summary: "Soft curve based on a sine wave.",
          },
          {
            name: "EXPO",
            summary: "Very fast start, long settle.",
          },
          {
            name: "CIRC",
            summary: "Round curve, based on a circle.",
          },
          {
            name: "BACK",
            summary: "Pulls back, then overshoots.",
          },
          {
            name: "ELASTIC",
            summary: "Springs around the end value.",
          },
          {
            name: "BOUNCE",
            summary: "Bounces like a ball landing.",
          },
        ],
      },
      {
        name: "IN",
        summary: "The style as it is: slow start, fast end.",
      },
      {
        name: "OUT",
        summary: "The style flipped: fast start, slow end.",
      },
      {
        name: "INOUT",
        summary: "Slow at both ends, fast in the middle.",
      },
    ],
  },
  {
    id: "config",
    name: "lusia.config",
    kind: "function",
    group: "motion",
    signature: "export default defineConfig({ animate: { duration: 400 } })",
    summary:
      "One file sets the app-wide defaults: animate timing and the build, dev and lint settings.",
    bullets: [
      "Name the file lusia.config.ts (TypeScript) or lusia.config.json (JSON). Put it in the app folder. Use only one of them. Dev reloads when it changes.",
      "Precedence, highest first: the value on the item in code, then setConfig in the component, then setConfig with SCOPE.GLOBAL, then lusia.config, then the library default.",
      'In TypeScript, enum values are the real values, such as EASE.STYLE.CUBIC. In JSON, write their names, such as "CUBIC".',
      "in and out name a preset. An item with no play uses in, or out when it detaches. An item's own play always wins.",
      "Per-element settings stay in code: play, on, control, once and loop.",
    ],
    example: `// lusia.config.ts\nimport { defineConfig } from "lusiajs/config";\nimport { EASE } from "lusiajs";\n\nexport default defineConfig({\n  animate: { duration: 400, ease: [EASE.STYLE.CUBIC, EASE.OUT] },\n});`,
  },
];
