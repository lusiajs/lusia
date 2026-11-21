import type { ApiEntry } from "./types.ts";

export const animateControlEntries: ApiEntry[] = [
	{
		id: "when",
		name: "WHEN",
		kind: "value",
		group: "motion",
		signature:
			"const WHEN: { readonly ATTACH: When; readonly DETACH: When; readonly VIEW: When; readonly HOVER: When; readonly SCROLL: When; readonly MOVE: When; readonly RESIZE: When; readonly MOVE_OR_RESIZE: When; readonly MANUAL: When }",
		summary: "What plays an animation item.",
		bullets: [
			"ATTACH (the default) plays 0 to 1 once when attached. DETACH plays on detach, and detach waits for it.",
			"VIEW: plays when scrolled into view, once by default. more: { reverse: true } replays it.",
			"HOVER: 0 to 1 on pointer enter, 1 to 0 on leave. more: { inDelay, outDelay, out } change the timing and the way out. MANUAL: only a controller plays it.",
			"SCROLL: the progress follows the element's place on screen. Time settings do not apply.",
			"MOVE, RESIZE, MOVE_OR_RESIZE: the element glides from its old box to its new one when its layout box changes. style is optional.",
		],
		example: `import { WHEN } from "lusia";\n\n<section animate={{ style: fadeUp, when: WHEN.VIEW }}>...</section>`,
		members: [
			{
				name: "ATTACH",
				summary: "Plays 0 to 1 once when attached. The default.",
			},
			{
				name: "DETACH",
				summary: "Plays its own keyframes on detach. Detach waits for it. The siblings jump by default. more.animateSpace: true slides them closed.",
			},
			{
				name: "VIEW",
				summary: "Plays when at least 15% is visible. Once unless more.reverse is set.",
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
		],
	},
	{
		id: "animate-item",
		name: "AnimateItem",
		kind: "type",
		group: "motion",
		signature:
			"type AnimateItem = { style: Keyframes; when?: When | Variable<unknown> | ComputedVariable<unknown>; control?: Controller; once?: boolean; more?: More; midway?: MidwayMode | MidwayItem; keep?: boolean; duration?: number; delay?: number; loop?: boolean | number; backAndForth?: boolean }",
		summary: "One animation in an animate value, with its own trigger and timing.",
		bullets: [
			"Defaults: when WHEN.ATTACH, duration from the engine default (300 ms), delay 0, no loop, keep true.",
			"The easing comes from the keyframes default, then the engine default. ease is not an item field.",
			"once plays forward only once. more: { reverse: true } lets VIEW replay on each entry.",
			"reverse at the top level is an error: it moved into more.",
			"control: a controller() plays, reverses, stops or seeks the item.",
		],
		example: `import type { AnimateItem } from "lusia";\n\nconst slideIn: AnimateItem = { style: slideFrom, duration: 600 };`,
	},
	{
		id: "set-animate-default",
		name: "setAnimateDefault()",
		kind: "function",
		group: "motion",
		signature:
			"setAnimateDefault(update: { ease?: DefaultEasing; duration?: number }): void",
		summary: "Updates the engine default for every animation in the app.",
		bullets: [
			"ease takes the same forms as a keyframes default: [EASE.STYLE.x, EASE.y], [EASE.STYLE.x] or [EASE.y]. Each part merges with the current default.",
			"duration replaces the default length in ms (300 at start).",
			"It is read at each play, so a call at app start applies everywhere.",
			"Only ease and duration are accepted. Other keys throw.",
		],
		example: `import { setAnimateDefault, EASE } from "lusia";\n\nsetAnimateDefault({ ease: [EASE.STYLE.CUBIC, EASE.OUT], duration: 400 });`,
	},
	{
		id: "controller",
		name: "controller()",
		kind: "function",
		group: "motion",
		signature: "controller(): Controller",
		summary: "Drives animations by hand. One controller can drive several items.",
		bullets: [
			"Pass it as control: in an item, and use WHEN.MANUAL or any trigger.",
			"play() and reverse() return a Promise that resolves when the play ends.",
			"stop() ends the play where it is. seek(progress) jumps to a progress from 0 to 1.",
		],
		example: `import { controller, PRESET, WHEN } from "lusia";\n\nconst ctl = controller();\n// in markup: <div animate={{ style: PRESET.POP_IN, when: WHEN.MANUAL, control: ctl }}>\nawait ctl.play();`,
	},
];
