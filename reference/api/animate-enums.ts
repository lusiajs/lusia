import type { ApiEntry } from "./types.ts";

export const animateEnumEntries: ApiEntry[] = [
	{
		id: "midway",
		name: "MIDWAY",
		kind: "value",
		group: "motion",
		signature:
			"const MIDWAY: { readonly TURN: MidwayMode; readonly FINISH: MidwayMode; readonly RESTART: MidwayMode; readonly SKIP: MidwayMode; readonly IGNORE: MidwayMode }",
		summary: "What happens when a new play is asked for while one is still running.",
		bullets: [
			"Set it with midway: MIDWAY.FINISH, or with an object: midway: { play: MIDWAY.FINISH, turn: TURN.SMOOTH }.",
			"TURN (default): switch at once from the current progress. turn shapes the change.",
			"FINISH: let the running play end, then run the newest request only.",
			"RESTART starts the new play from its own beginning. SKIP jumps the running play to its end first.",
			"IGNORE drops requests while a play runs.",
		],
		example: `import { WHEN, MIDWAY } from "lusia";\n\n<div animate={{ style: grow, when: WHEN.HOVER, midway: MIDWAY.FINISH }}>...</div>`,
		members: [
			{
				name: "TURN",
				summary: "Switch at once from the current progress. The default.",
			},
			{
				name: "FINISH",
				summary: "Let the running play end, then run the newest request.",
			},
			{
				name: "RESTART",
				summary: "Start the new play from its own beginning.",
			},
			{
				name: "SKIP",
				summary: "Jump the running play to its end, then run the new one.",
			},
			{ name: "IGNORE", summary: "Drop requests while a play runs." },
		],
	},
	{
		id: "turn",
		name: "TURN",
		kind: "value",
		group: "motion",
		signature:
			"const TURN: { readonly SUDDEN: TurnMode; readonly SMOOTH: TurnMode; readonly STOP: TurnMode }",
		summary: "How the motion changes direction when a running play is turned around.",
		bullets: [
			"Used by midway TURN, and by the switch of FINISH and SKIP.",
			"turnDuration sets the length of the change in ms (default 200). turnStyle and turnEase shape its blend.",
			"turn can also be a function (from, to, t, speed) => progress, for full control.",
		],
		example: `<div animate={{ style: grow, when: WHEN.HOVER, midway: { turn: TURN.SMOOTH, turnDuration: 250 } }}>...</div>`,
		members: [
			{
				name: "SUDDEN",
				summary: "The new play starts from the current progress. Its speed may jump. The default.",
			},
			{
				name: "SMOOTH",
				summary: "Keeps the current speed and bends into the new direction.",
			},
			{
				name: "STOP",
				summary: "Slows to rest over half of turnDuration, then starts the new play.",
			},
		],
	},
	{
		id: "scroll-at",
		name: "SCROLL_AT",
		kind: "value",
		group: "motion",
		signature:
			"const SCROLL_AT: { readonly ENTER: ScrollAtMode; readonly CENTER: ScrollAtMode; readonly LEAVE: ScrollAtMode }",
		summary: "Where the element meets the window, for the start and end of WHEN.SCROLL.",
		bullets: [
			"Use it as more: { start: SCROLL_AT.ENTER, end: SCROLL_AT.LEAVE }. The defaults are ENTER and LEAVE.",
			"Or write { element, window } with EDGE values: element is the point on the element, window the point on the window.",
			"{ element: EDGE.TOP, window: EDGE.BOTTOM } is the same as ENTER.",
		],
		example: `import { WHEN, SCROLL_AT } from "lusia";\n\n<div animate={{ style: fadeOut, when: WHEN.SCROLL, more: { start: SCROLL_AT.CENTER, end: SCROLL_AT.LEAVE } }}>...</div>`,
		members: [
			{
				name: "ENTER",
				summary: "The element's top meets the window's bottom. The default start.",
			},
			{
				name: "CENTER",
				summary: "The element's centre meets the window's centre.",
			},
			{
				name: "LEAVE",
				summary: "The element's bottom meets the window's top. The default end.",
			},
		],
	},
	{
		id: "edge",
		name: "EDGE",
		kind: "value",
		group: "motion",
		signature:
			"const EDGE: { readonly TOP: 0; readonly CENTER: 0.5; readonly BOTTOM: 1 }",
		summary: "A point on an element or the window, for { element, window } in WHEN.SCROLL.",
		bullets: [
			"Each value is a fraction of the height: 0 is the top, 1 the bottom. A plain number from 0 to 1 works too.",
			"Use it in an object: more: { start: { element: EDGE.TOP, window: EDGE.CENTER } }.",
			"A plain number works too: { element: 0.25, window: 0.5 } is a quarter of the way down the element.",
		],
		example: `<div animate={{ style: fadeOut, when: WHEN.SCROLL, more: { start: { element: EDGE.TOP, window: EDGE.CENTER } } }}>...</div>`,
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
		signature:
			"const HOVER_AREA: { readonly FINAL: HoverArea; readonly ELEMENT: HoverArea }",
		summary: "Where a hover is checked.",
		bullets: [
			"Use it as more: { area: HOVER_AREA.ELEMENT } in WHEN.HOVER. The default is FINAL.",
			"FINAL reads the element's resting box. The pointer must be over that box to hover.",
			"ELEMENT reads the box as it is drawn now, so a transform moves the hover area with it.",
		],
		example: `import { WHEN, HOVER_AREA, PRESET } from "lusia";\n\n<div animate={{ style: PRESET.ZOOM_IN, when: WHEN.HOVER, more: { area: HOVER_AREA.ELEMENT } }}>...</div>`,
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
		id: "animate-more",
		name: "more",
		kind: "type",
		group: "motion",
		signature:
			"more?: { margin?: number | string; amount?: number; reverse?: boolean } | { area?: HoverArea; inDelay?: number; outDelay?: number; out?: Keyframes; outDuration?: number } | { start?: ScrollAt; end?: ScrollAt; follow?: Variable<Element | null>; part?: [number, number] } | { animateSpace?: boolean }",
		summary: "Options for the trigger an item uses. Each trigger accepts its own keys.",
		bullets: [
			'VIEW: margin (px or a CSS length such as "10%"), amount (0 to 1, default 0.15), reverse.',
			"HOVER: area (HOVER_AREA.FINAL, the default, checks the resting box; HOVER_AREA.ELEMENT checks the box as it is drawn now), inDelay and outDelay (ms to wait after enter or leave), out (keyframes for leaving) and outDuration (ms, default the item duration).",
			"SCROLL: start and end (SCROLL_AT or { element, window }, default ENTER and LEAVE) on the item's own box. follow: a variable of the element whose box is measured. Alone it is pinned to the screen; with start and end it runs from those points. part: [from, to] plays only that slice, without start and end.",
			"DETACH and ATTACH: animateSpace, default false. See animateSpace.",
			"Any other trigger that sets more is an error.",
		],
		example: `<div animate={{\n  style: fadeUp,\n  when: WHEN.VIEW,\n  more: { margin: "10%", amount: 0.5, reverse: true },\n}}>...</div>`,
	},
	{
		id: "animate-space",
		name: "animateSpace",
		kind: "type",
		group: "motion",
		signature: "more?: { animateSpace?: boolean }",
		summary: "Slides the siblings into the space an element takes or frees, instead of a jump.",
		bullets: [
			"Only ATTACH and DETACH read it. Other triggers ignore it.",
			"ATTACH: the siblings slide apart to open the space. DETACH: they slide closed to fill the space the element frees. false: they jump at once.",
			"Default false for both. The first one found wins: more.animateSpace on the item, then animate.attach.animateSpace or animate.detach.animateSpace in the config, then the library default false.",
			"The slide uses the same duration, delay and ease as the element's own animation. Several slides at once add up.",
			"It needs a layout box. An element with display: none has no space to slide.",
		],
		example: `<li animate={{ style: fadeOut, when: WHEN.DETACH, more: { animateSpace: true } }}>...</li>`,
	},
];
