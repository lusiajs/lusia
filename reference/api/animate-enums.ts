import type { ApiEntry } from "./types.ts";

export const animateEnumEntries: ApiEntry[] = [
  {
    id: "midway",
    name: "MIDWAY",
    kind: "value",
    group: "motion",
    signature:
      "const MIDWAY: { readonly SWITCH: MidwayMode; readonly SWITCH_SMOOTH: MidwayMode; readonly SWITCH_STOP: MidwayMode; readonly WAIT: MidwayMode; readonly RESTART: MidwayMode; readonly JUMP_TO_END: MidwayMode; readonly KEEP_CURRENT: MidwayMode }",
    summary: "What happens when a new play is asked for while one is still running.",
    bullets: [
      "Set it in an object: midway: { mode: MIDWAY.WAIT }. A bare MIDWAY member is an error.",
      "mode, duration (in ms, default 200) and ease are all optional. duration and ease shape a switch.",
      "SWITCH (default) changes at once from the current progress. SWITCH_SMOOTH keeps the current speed. SWITCH_STOP slows to rest first.",
      "WAIT lets the running play end, then runs only the newest request. RESTART starts the new play from its beginning. JUMP_TO_END jumps the running play to its end first. KEEP_CURRENT drops requests while a play runs.",
      "mode can also be a function (from, to, t, speed) => progress, for a custom change.",
    ],
    example: `import { ON, MIDWAY } from "lusiajs";\n\n<div animate={{ play: grow, on: ON.HOVER, midway: { mode: MIDWAY.WAIT } }}>...</div>`,
    members: [
      {
        name: "SWITCH",
        summary: "Switch at once from the current progress. The default.",
      },
      {
        name: "SWITCH_SMOOTH",
        summary: "Keeps the current speed and bends into the new direction.",
      },
      {
        name: "SWITCH_STOP",
        summary: "Slows to rest over half of duration, then starts the new play.",
      },
      {
        name: "WAIT",
        summary: "Let the running play end, then run the newest request.",
      },
      {
        name: "RESTART",
        summary: "Start the new play from its own beginning.",
      },
      {
        name: "JUMP_TO_END",
        summary: "Jump the running play to its end, then run the new one.",
      },
      { name: "KEEP_CURRENT", summary: "Drop requests while a play runs." },
    ],
  },
  {
    id: "edge",
    name: "EDGE",
    kind: "value",
    group: "motion",
    signature: "const EDGE: { readonly TOP: 0; readonly CENTER: 0.5; readonly BOTTOM: 1 }",
    summary: "A point on an element or the screen, for start and end in ON.SCROLL.",
    bullets: [
      "Each value is a fraction of the height: 0 is the top, 1 the bottom. A plain number from 0 to 1 works too.",
      "start and end are pairs: [element edge, screen edge]. The first point is on the element, the second on the screen.",
      "Default: start [EDGE.TOP, EDGE.BOTTOM], end [EDGE.BOTTOM, EDGE.TOP].",
    ],
    example: `<div animate={{ play: fadeOut, on: ON.SCROLL, options: { start: [EDGE.TOP, EDGE.CENTER], end: [EDGE.BOTTOM, EDGE.TOP] } }}>...</div>`,
    members: [
      { name: "TOP", summary: "The top edge, 0." },
      { name: "CENTER", summary: "The middle, 0.5." },
      { name: "BOTTOM", summary: "The bottom edge, 1." },
    ],
  },
  {
    id: "hover-area",
    name: "HOVER_AREA",
    kind: "value",
    group: "motion",
    signature: "const HOVER_AREA: { readonly FINAL: HoverArea; readonly ELEMENT: HoverArea }",
    summary: "Where a hover is checked.",
    bullets: [
      "Use it as options: { area: HOVER_AREA.ELEMENT } in ON.HOVER. The default is FINAL.",
      "FINAL reads the element's resting box. The pointer must be over that box to hover.",
      "ELEMENT reads the box as it is drawn now, so a transform moves the hover area with it.",
    ],
    example: `import { ON, HOVER_AREA, PRESET } from "lusiajs";\n\n<div animate={{ play: PRESET.ZOOM_IN, on: ON.HOVER, options: { area: HOVER_AREA.ELEMENT } }}>...</div>`,
    members: [
      {
        name: "FINAL",
        summary: "The resting box, the box with no transform. The default.",
      },
      {
        name: "ELEMENT",
        summary: "The box the element is drawn in right now.",
      },
    ],
  },
  {
    id: "animate-options",
    name: "options",
    kind: "type",
    group: "motion",
    signature:
      "options?: { margin?: number | string; amount?: number; reverse?: boolean } | { area?: HoverArea; inDelay?: number; outDelay?: number; out?: Keyframes; outDuration?: number } | { start?: [number, number]; end?: [number, number]; follow?: Variable<Element | null>; part?: [number, number] } | { animateSpace?: boolean }",
    summary: "Options for the trigger an item uses. Each trigger accepts its own keys.",
    bullets: [
      'VIEW: margin (px or a CSS length such as "10%"), amount (0 to 1, default 0.15), reverse.',
      "HOVER: area (HOVER_AREA.FINAL, the default, checks the resting box; HOVER_AREA.ELEMENT checks the box as it is drawn now), inDelay and outDelay (ms to wait after enter or leave), out (keyframes for leaving) and outDuration (ms, default the item duration).",
      "SCROLL: start and end (each a pair [element edge, screen edge], default [EDGE.TOP, EDGE.BOTTOM] and [EDGE.BOTTOM, EDGE.TOP]) on the item's own box. follow: a variable of the element whose box is measured. Alone it is pinned to the screen; with start and end it runs from those points. part: [from, to] plays only that slice, without start and end.",
      "DETACH and ATTACH: animateSpace, default false. See animateSpace.",
      "Any other trigger that sets options is an error.",
    ],
    example: `<div animate={{\n  play: fadeUp,\n  on: ON.VIEW,\n  options: { margin: "10%", amount: 0.5, reverse: true },\n}}>...</div>`,
  },
  {
    id: "animate-space",
    name: "animateSpace",
    kind: "type",
    group: "motion",
    signature: "options?: { animateSpace?: boolean }",
    summary: "Slides the siblings into the space an element takes or frees, instead of a jump.",
    bullets: [
      "Only ATTACH and DETACH accept it. On any other trigger it is an unknown key and throws error L2012.",
      "ATTACH: the siblings slide apart to open the space. DETACH: they slide closed to fill the space the element frees. false: they jump at once.",
      "Default false for both. The first one found wins: options.animateSpace on the item, then animate.attach.animateSpace or animate.detach.animateSpace in the config, then the library default false.",
      "The slide uses the same duration, delay and ease as the element's own animation. Several slides at once add up.",
      "It needs a layout box. An element with display: none has no space to slide.",
    ],
    example: `<li animate={{ play: fadeOut, on: ON.DETACH, options: { animateSpace: true } }}>...</li>`,
  },
];
