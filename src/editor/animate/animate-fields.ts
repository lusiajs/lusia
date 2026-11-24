import { CSS_PROPERTIES } from "../css/css-properties.ts";
import { enumNameItem } from "../completion/enum-members.ts";
import { expressionEnd } from "#language/format/format-expressions.ts";
import type { CompletionItemData, ScriptItem } from "../completion-data.ts";

const ANIMATE_OPEN = "animate={";

const FIELD_ITEMS: CompletionItemData[] = [
  {
    label: "play",
    kind: "property",
    insertText: "play: $1",
    snippet: true,
    detail: "Keyframes to play, or a function ({ x, y }) => style with ON.MOUSE_MOVE",
  },
  {
    label: "on",
    kind: "property",
    insertText: "on: $1",
    snippet: true,
    detail: "Trigger: ON member or a variable (default ON.ATTACH)",
  },
  {
    label: "control",
    kind: "property",
    insertText: "control: $1",
    snippet: true,
    detail: "A controller() that plays, reverses, stops or seeks",
  },
  {
    label: "once",
    kind: "property",
    insertText: "once: true",
    snippet: false,
    detail: "Play forward only once",
  },
  {
    label: "options",
    kind: "property",
    insertText: "options: { $1 }",
    snippet: true,
    detail:
      "Trigger options: VIEW margin, amount, reverse; HOVER inDelay, outDelay, out, outDuration, area; SCROLL start, end, follow, part; DETACH and ATTACH animateSpace",
  },
  {
    label: "midway",
    kind: "property",
    insertText: "midway: { $1 }",
    snippet: true,
    detail: "What a new play does while one runs: { mode, duration, ease }",
  },
  {
    label: "keep",
    kind: "property",
    insertText: "keep: false",
    snippet: false,
    detail: "Remove the inline styles when a play ends (default true)",
  },
  {
    label: "duration",
    kind: "property",
    insertText: "duration: $1",
    snippet: true,
    detail: "Length of one play, in ms (default 300)",
  },
  {
    label: "delay",
    kind: "property",
    insertText: "delay: $1",
    snippet: true,
    detail: "Wait before each forward play, in ms",
  },
  {
    label: "loop",
    kind: "property",
    insertText: "loop: $1",
    snippet: true,
    detail: "true repeats forever, or a count",
  },
  {
    label: "backAndForth",
    kind: "property",
    insertText: "backAndForth: true",
    snippet: false,
    detail: "With loop: each repeat plays 0 to 1, then back to 0",
  },
];

const ANIMATE_SPACE_FIELD: CompletionItemData = {
  label: "animateSpace",
  kind: "property",
  insertText: "animateSpace: true",
  snippet: false,
  detail: "Siblings slide into the space taken or freed, instead of jumping. Default false",
};

/** The keys of `options` for each trigger. Each trigger takes only its own. */
const OPTION_FIELDS: Record<string, CompletionItemData[]> = {
  VIEW: [
    {
      label: "margin",
      kind: "property",
      insertText: "margin: $1",
      snippet: true,
      detail: 'How far inside the screen edge, in px or a CSS length such as "10%" (default 0)',
    },
    {
      label: "amount",
      kind: "property",
      insertText: "amount: $1",
      snippet: true,
      detail: "Share of the element that must be visible, 0 to 1 (default 0.15)",
    },
    {
      label: "reverse",
      kind: "property",
      insertText: "reverse: true",
      snippet: false,
      detail: "Play back out when it leaves the view, and again on re-entry",
    },
  ],
  HOVER: [
    {
      label: "inDelay",
      kind: "property",
      insertText: "inDelay: $1",
      snippet: true,
      detail: "Ms to wait after pointer enter before playing in (default 0)",
    },
    {
      label: "outDelay",
      kind: "property",
      insertText: "outDelay: $1",
      snippet: true,
      detail: "Ms to wait after pointer leave before playing back (default 0)",
    },
    {
      label: "out",
      kind: "property",
      insertText: "out: { $1 }",
      snippet: true,
      detail: "Keyframes for leaving. Without it, the in plays backward",
    },
    {
      label: "outDuration",
      kind: "property",
      insertText: "outDuration: $1",
      snippet: true,
      detail: "Ms for the way out (default: the item duration). Needs out",
    },
    {
      label: "area",
      kind: "property",
      insertText: "area: $1",
      snippet: true,
      detail:
        "Where the hover is checked: HOVER_AREA.FINAL (resting box, default) or HOVER_AREA.ELEMENT",
    },
  ],
  DETACH: [ANIMATE_SPACE_FIELD],
  ATTACH: [ANIMATE_SPACE_FIELD],
  SCROLL: [
    {
      label: "start",
      kind: "property",
      insertText: "start: $1",
      snippet: true,
      detail:
        "Where the progress is 0: [element edge, screen edge] with EDGE (default [EDGE.TOP, EDGE.BOTTOM])",
    },
    {
      label: "end",
      kind: "property",
      insertText: "end: $1",
      snippet: true,
      detail:
        "Where the progress is 1: [element edge, screen edge] with EDGE (default [EDGE.BOTTOM, EDGE.TOP]). Not with follow",
    },
    {
      label: "follow",
      kind: "property",
      insertText: "follow: $1",
      snippet: true,
      detail:
        "Variable of the tall element that drives the progress, such as one set by bind-element. Not with start or end",
    },
    {
      label: "part",
      kind: "property",
      insertText: "part: [$1]",
      snippet: true,
      detail: "Slice of the progress that this item plays: [from, to], 0 to 1",
    },
  ],
};

const MIDWAY_FIELDS: CompletionItemData[] = [
  {
    label: "mode",
    kind: "property",
    insertText: "mode: $1",
    snippet: true,
    detail:
      "MIDWAY member or a function: what a new play does while one runs (default MIDWAY.SWITCH)",
  },
  {
    label: "duration",
    kind: "property",
    insertText: "duration: $1",
    snippet: true,
    detail: "Length of the change in ms (default 200)",
  },
  {
    label: "ease",
    kind: "property",
    insertText: "ease: [$1]",
    snippet: true,
    detail:
      "Easing of the change: [EASE.STYLE.x, EASE.y], [EASE.STYLE.x] or [EASE.y] (default [EASE.STYLE.CUBIC, EASE.INOUT])",
  },
];

const CSS_FIELDS: CompletionItemData[] = CSS_PROPERTIES.map((name) => ({
  label: name,
  kind: "property",
  insertText: `${name}: $1`,
  snippet: true,
  detail: "CSS style property",
}));

const CSS_NAMES: ReadonlySet<string> = new Set(CSS_PROPERTIES);

const KEYFRAMES_FIELDS: CompletionItemData[] = [
  {
    label: "ease",
    kind: "property",
    insertText: "ease: [$1]",
    snippet: true,
    detail:
      "Easing for keys that do not set their own: [EASE.STYLE.x, EASE.y], [EASE.STYLE.x] or [EASE.y]",
  },
];

/** Undefined when the cursor is outside `animate={...}`. */
export function animateFieldsAt(text: string, offset: number): ScriptItem[] | undefined {
  const open = animateExpressionOpen(text, offset);
  if (open === -1) return undefined;
  const typed = text.slice(open, offset);
  if (ON_VALUE.test(typed)) return enumNameItem("ON");
  if (MIDWAY_VALUE.test(typed)) return enumNameItem("MIDWAY");
  if (isObjectKeyPosition(typed, OPTIONS_OPEN)) return optionFieldsFor(typed);
  if (isObjectKeyPosition(typed, MIDWAY_OPEN)) return MIDWAY_FIELDS;
  if (isObjectKeyPosition(typed, PLAY_OPEN)) return KEYFRAMES_FIELDS;
  if (isCssKeyPosition(typed)) return CSS_FIELDS;
  return isItemKeyPosition(typed) ? FIELD_ITEMS : undefined;
}

export function isInAnimate(text: string, offset: number): boolean {
  return animateExpressionOpen(text, offset) !== -1;
}

/** Only a key of a keyframe css object counts, such as `opacity` in `0: { opacity }`. */
export function cssKeyAt(text: string, offset: number): string | undefined {
  let start = offset;
  while (start > 0 && WORD_CHAR.test(text.charAt(start - 1))) start--;
  let end = offset;
  while (end < text.length && WORD_CHAR.test(text.charAt(end))) end++;
  const name = text.slice(start, end);
  if (!CSS_NAMES.has(name)) return undefined;
  const open = animateExpressionOpen(text, start);
  if (open === -1 || !isCssKeyPosition(text.slice(open, start))) return undefined;
  return name;
}

const WORD_CHAR = /[\w$]/;
/** A `{` that is the value of a numeric key: `0: {`, or `1: [EASE.OUT, {` with the ease first. */
const CSS_OPEN = /\b\d+(?:\.\d+)?\s*:\s*(?:\[[^[\]{}]*,?\s*)?$/;

function isCssKeyPosition(typed: string): boolean {
  const stack = openersOf(typed);
  if (stack[stack.length - 1] !== "{") return false;
  const before = typed.slice(0, typed.lastIndexOf("{"));
  return CSS_OPEN.test(before) && KEY_POSITION.test(typed);
}

const ON_VALUE = /\bon\s*:\s*[\w$]*$/;
const MIDWAY_VALUE = /\bmidway\s*:\s*[\w$]*$/;
const OPTIONS_OPEN = /\boptions\s*:\s*$/;
const MIDWAY_OPEN = /\bmidway\s*:\s*$/;
const PLAY_OPEN = /\bplay\s*:\s*$/;
const KEY_POSITION = /[{,]\s*[\w$]*$/;
const ON_NAMES = /\bon\s*:\s*ON\.([A-Z_]+)/g;

/** True at a key of an object that follows `opener`, such as `options: {...}`. */
function isObjectKeyPosition(typed: string, opener: RegExp): boolean {
  const stack = openersOf(typed);
  if (stack[stack.length - 1] !== "{") return false;
  const before = typed.slice(0, typed.lastIndexOf("{"));
  return opener.test(before) && KEY_POSITION.test(typed);
}

/** The `options` keys for the last `on: ON.X` before the cursor. Undefined when no trigger is set yet. */
function optionFieldsFor(typed: string): CompletionItemData[] | undefined {
  const names = [...typed.matchAll(ON_NAMES)];
  const trigger = names[names.length - 1]?.[1];
  return trigger === undefined ? undefined : OPTION_FIELDS[trigger];
}

function animateExpressionOpen(text: string, offset: number): number {
  const start = text.lastIndexOf(ANIMATE_OPEN, offset);
  if (start === -1) return -1;
  const open = start + ANIMATE_OPEN.length - 1;
  const end = expressionEnd(text, open);
  return end === -1 || end >= offset ? open : -1;
}

/** Keyframes objects (keys start with a number) are skipped. */
function isItemKeyPosition(typed: string): boolean {
  const stack = openersOf(typed);
  const inner = stack[stack.length - 1];
  const valid = stack.length === 2 || (stack.length === 3 && stack[1] === "[");
  if (inner !== "{" || !valid) return false;
  const body = typed.slice(typed.lastIndexOf("{") + 1);
  return !/^\s*\d/.test(body) && KEY_POSITION.test(typed);
}

/** The brackets still open at the end of `typed`, outermost first. Strings are skipped. */
function openersOf(typed: string): string[] {
  const stack: string[] = [];
  let quote: string | undefined;
  for (const ch of typed) {
    if (quote) {
      if (ch === quote) quote = undefined;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
    } else if (ch === "{" || ch === "[" || ch === "(") {
      stack.push(ch);
    } else if (ch === "}" || ch === "]" || ch === ")") {
      stack.pop();
    }
  }
  return stack;
}
