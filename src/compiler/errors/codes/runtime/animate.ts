import type { ErrorCode } from "../../codes.ts";

export const RUNTIME_ANIMATE_CODES = {
  L2001: {
    message: "animate item needs a style",
    hint: "Add style to the item, such as { style: fadeIn }.",
  },
  L2002: {
    message:
      "animate when must be WHEN.ATTACH, DETACH, VIEW, HOVER, SCROLL, MOVE, RESIZE, MOVE_OR_RESIZE or MANUAL, or a variable",
    hint: "Pass one of the WHEN values, or a variable.",
  },
  L2003: {
    message: "animate $name must be a time in ms, got $value",
    hint: "Use a number of milliseconds, such as 300.",
  },
  L2004: {
    message: "animate loop must be true or a count, got $value",
    hint: "Use true, or a number of times such as 3.",
  },
  L2005: {
    message: "ease moved into the keyframes: default: [...]",
    hint: "Write default: [EASE.STYLE.QUART, EASE.INOUT] inside the keyframes.",
  },
  L2006: {
    message: "curve/transition moved into the keyframes: default: [EASE.STYLE.X, EASE.Y]",
    hint: "Write default: [EASE.STYLE.X, EASE.Y] inside the keyframes.",
  },
  L2007: {
    message: "alternate was renamed to backAndForth",
    hint: "Write backAndForth: true instead.",
  },
  L2008: {
    message: "reverse moved into more: { reverse: true }",
    hint: "Write more: { reverse: true } instead.",
  },
  L2009: {
    message: "loop does not work with WHEN.SCROLL",
    hint: "Remove loop, or use another WHEN value.",
  },
  L2010: {
    message: "more is not used with $when",
    hint: "Remove more, or use a WHEN value that takes it.",
  },
  L2011: {
    message: "animate more must be an object with $keys, got $value",
    hint: "Pass an object with the keys listed.",
  },
  L2012: {
    message: 'more has an unknown key "$key", use $keys',
    hint: "$tip",
  },
  L2013: {
    message: "animate more outDuration needs out",
    hint: "Add out with the keyframes for leaving, or remove outDuration.",
  },
  L2014: {
    message: "animate more out must be keyframes, such as { 0: { opacity: 1 }, 1: { opacity: 0 } }",
    hint: "Give out an object of keyframes.",
  },
  L2015: {
    message: "animate more part cannot be used with start and end",
    hint: "Use part alone, or start and end alone.",
  },
  L2016: {
    message:
      "animate more follow must be a variable that holds an element, such as one set by bind-element",
    hint: "Use a variable that bind-element writes to.",
  },
  L2017: {
    message: "animate more $name must be SCROLL_AT or { element, window }, got $value",
    hint: "Use a SCROLL_AT member, such as SCROLL_AT.ENTER, or { element: EDGE.TOP, window: EDGE.BOTTOM }.",
  },
  L2018: {
    message: "animate more start and end must be different moments",
    hint: "Use two different SCROLL_AT members, or two different points.",
  },
  L2019: {
    message: "animate more part must be [from, to] with 0 <= from < to <= 1, got $value",
    hint: "Use a pair such as [0, 0.5].",
  },
  L2020: {
    message: "animate more reverse must be true or false, got $value",
    hint: "Use true or false.",
  },
  L2021: {
    message: 'animate more margin must be a number of px or a CSS length such as "10%", got $value',
    hint: 'Use a number of px, such as 40, or a string such as "10%".',
  },
  L2022: {
    message: "animate more amount must be a number from 0 to 1, got $value",
    hint: "Use a number from 0 to 1, such as 0.5.",
  },
  L2023: {
    message:
      "animate midway must be a MIDWAY member or an object such as { play: MIDWAY.FINISH }, got $value",
    hint: "Use a MIDWAY member, or an object with play.",
  },
  L2024: {
    message:
      'midway has an unknown key "$key", use play, turn, turnDuration, turnStyle or turnEase',
    hint: "Check the spelling of the key.",
  },
  L2025: {
    message: "animate midway.play must be a MIDWAY member such as MIDWAY.FINISH, got $value",
    hint: "Use a member of MIDWAY, such as MIDWAY.FINISH.",
  },
  L2026: {
    message:
      "animate midway.turn must be a TURN member such as TURN.SMOOTH, or a function, got $value",
    hint: "Use a member of TURN, such as TURN.SMOOTH, or a function.",
  },
  L2027: {
    message: "animate midway.turnDuration must be a time in ms, got $value",
    hint: "Use a number of milliseconds, such as 200.",
  },
  L2028: {
    message: "animate midway.turnStyle must be an EASE.STYLE member, got $value",
    hint: "Use a member of EASE.STYLE, such as EASE.STYLE.CUBIC.",
  },
  L2029: {
    message: "animate midway.turnEase must be an EASE member such as EASE.INOUT, got $value",
    hint: "Use a member of EASE, such as EASE.INOUT.",
  },
  L2060: {
    message: "animate more area must be HOVER_AREA.FINAL or HOVER_AREA.ELEMENT",
    hint: "Use HOVER_AREA.FINAL, or leave area out.",
  },
} as const satisfies Record<string, ErrorCode>;
