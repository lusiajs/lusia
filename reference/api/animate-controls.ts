import type { ApiEntry } from "./types.ts";

export const animateControlEntries: ApiEntry[] = [
  {
    id: "on",
    name: "ON",
    kind: "value",
    group: "motion",
    signature:
      "const ON: { readonly ATTACH: On; readonly DETACH: On; readonly VIEW: On; readonly HOVER: On; readonly SCROLL: On; readonly MOVE: On; readonly RESIZE: On; readonly MOVE_OR_RESIZE: On; readonly MANUAL: On; readonly MOUSE_MOVE: On }",
    summary: "What plays an animation item.",
    bullets: [
      "ATTACH (the default) plays 0 to 1 once when attached. DETACH plays on detach, and detach waits for it.",
      "VIEW: plays when scrolled into view, once by default. options: { reverse: true } replays it.",
      "HOVER: 0 to 1 on pointer enter, 1 to 0 on leave. options: { inDelay, outDelay, out } change the timing and the way out. MANUAL: only a controller plays it.",
      "SCROLL: the progress follows the element's place on screen. Time settings do not apply.",
      "MOVE, RESIZE, MOVE_OR_RESIZE: the element glides from its old box to its new one when its layout box changes. play is optional.",
    ],
    example: `import { ON } from "lusiajs";\n\n<section animate={{ play: fadeUp, on: ON.VIEW }}>...</section>`,
    members: [
      {
        name: "ATTACH",
        summary: "Plays 0 to 1 once when attached. The default.",
      },
      {
        name: "DETACH",
        summary:
          "Plays its own keyframes on detach. Detach waits for it. The siblings jump by default. options.animateSpace: true slides them closed.",
      },
      {
        name: "VIEW",
        summary: "Plays when at least 15% is visible. Once unless options.reverse is set.",
      },
      {
        name: "HOVER",
        summary: "Plays 0 to 1 on pointer enter, 1 to 0 on leave.",
      },
      {
        name: "SCROLL",
        summary: "Moves the animation with the element's place on the screen.",
      },
      {
        name: "MOVE",
        summary: "Glides the element when its place changes.",
      },
      {
        name: "RESIZE",
        summary: "Glides the element when its size changes.",
      },
      {
        name: "MOVE_OR_RESIZE",
        summary: "Glides the element when its place or size changes.",
      },
      {
        name: "MANUAL",
        summary: "No trigger. Only a controller plays it.",
      },
      {
        name: "MOUSE_MOVE",
        summary:
          "Plays a function of the pointer position, { x, y } from 0 to 1 inside the element. On leave, it eases back to the base style.",
      },
    ],
  },
  {
    id: "animate-item",
    name: "AnimateItem",
    kind: "type",
    group: "motion",
    signature:
      "type AnimateItem = { play: Keyframes; on?: On | Variable<unknown> | ComputedVariable<unknown>; control?: Controller; once?: boolean; options?: TriggerOptions; midway?: { mode?: MidwayMode | MidwayFn; duration?: number; ease?: EaseValue }; keep?: boolean; duration?: number; delay?: number; loop?: boolean | number; backAndForth?: boolean }",
    summary: "One animation in an animate value, with its own trigger and timing.",
    bullets: [
      "Defaults: on ON.ATTACH, duration from the engine default (300 ms), delay 0, no loop, keep true.",
      "The easing comes from the key, then the keyframes ease, then the config, then the engine default. ease is not an item field.",
      "once plays forward only once. options: { reverse: true } lets VIEW replay on each entry.",
      "Old names are errors: style is play, when is on, more is options, and midway takes an object.",
      "control: a controller() plays, reverses, stops or seeks the item.",
    ],
    example: `import type { AnimateItem } from "lusiajs";\n\nconst slideIn: AnimateItem = { play: slideFrom, duration: 600 };`,
  },
  {
    id: "controller",
    name: "controller()",
    kind: "function",
    group: "motion",
    signature: "controller(): Controller",
    summary: "Drives animations by hand. One controller can drive several items.",
    bullets: [
      "Pass it as control: in an item, and use ON.MANUAL or any trigger.",
      "play() and reverse() return a Promise that resolves when the play ends.",
      "stop() ends the play where it is. seek(progress) jumps to a progress from 0 to 1.",
    ],
    example: `import { controller, PRESET, ON } from "lusiajs";\n\nconst ctl = controller();\n// in markup: <div animate={{ play: PRESET.POP_IN, on: ON.MANUAL, control: ctl }}>\nawait ctl.play();`,
  },
];
