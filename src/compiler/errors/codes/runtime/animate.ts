import type { ErrorCode } from "../../codes.ts";

export const RUNTIME_ANIMATE_CODES = {
  L2001: {
    message: "animate item needs a play",
    hint: "Add play to the item, such as { play: fadeIn }.",
  },
  L2002: {
    message:
      "animate on must be ON.ATTACH, DETACH, VIEW, HOVER, SCROLL, MOVE, RESIZE, MOVE_OR_RESIZE, MANUAL or MOUSE_MOVE, or a variable",
    hint: "Pass one of the ON values, or a variable.",
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
    message: "ease is not an item key. It goes in the keyframes",
    hint: "Write ease: [EASE.STYLE.QUART, EASE.INOUT] inside the keyframes.",
  },
  L2006: {
    message: "curve/transition moved into the keyframes: ease: [EASE.STYLE.X, EASE.Y]",
    hint: "Write ease: [EASE.STYLE.X, EASE.Y] inside the keyframes.",
  },
  L2007: {
    message: "alternate was renamed to backAndForth",
    hint: "Write backAndForth: true instead.",
  },
  L2008: {
    message: "reverse moved into options: { reverse: true }",
    hint: "Write options: { reverse: true } instead.",
  },
  L2009: {
    message: "loop does not work with ON.SCROLL",
    hint: "Remove loop, or use another ON value.",
  },
  L2010: {
    message: "options is not used with $on",
    hint: "Remove options, or use an ON value that takes it.",
  },
  L2011: {
    message: "animate options must be an object with $keys, got $value",
    hint: "Pass an object with the keys listed.",
  },
  L2012: {
    message: 'options has an unknown key "$key", use $keys',
    hint: "$tip",
  },
  L2013: {
    message: "animate options outDuration needs out",
    hint: "Add out with the keyframes for leaving, or remove outDuration.",
  },
  L2014: {
    message:
      "animate options out must be keyframes, such as { 0: { opacity: 1 }, 1: { opacity: 0 } }",
    hint: "Give out an object of keyframes.",
  },
  L2015: {
    message: "animate options part cannot be used with start and end",
    hint: "Use part alone, or start and end alone.",
  },
  L2016: {
    message:
      "animate options follow must be a variable that holds an element, such as one set by bind-element",
    hint: "Use a variable that bind-element writes to.",
  },
  L2017: {
    message: "$name must be a pair [element edge, screen edge]",
    hint: "Write $name: [EDGE.TOP, EDGE.BOTTOM].",
  },
  L2018: {
    message: "animate options start and end must be different moments",
    hint: "Use two different pairs, such as [EDGE.TOP, EDGE.BOTTOM] and [EDGE.BOTTOM, EDGE.TOP].",
  },
  L2019: {
    message: "animate options part must be [from, to] with 0 <= from < to <= 1, got $value",
    hint: "Use a pair such as [0, 0.5].",
  },
  L2020: {
    message: "animate options reverse must be true or false, got $value",
    hint: "Use true or false.",
  },
  L2021: {
    message:
      'animate options margin must be a number of px or a CSS length such as "10%", got $value',
    hint: 'Use a number of px, such as 40, or a string such as "10%".',
  },
  L2022: {
    message: "animate options amount must be a number from 0 to 1, got $value",
    hint: "Use a number from 0 to 1, such as 0.5.",
  },
  L2023: {
    message: "animate midway must be an object such as { mode: MIDWAY.WAIT }, got $value",
    hint: "Use an object with mode, duration or ease.",
  },
  L2024: {
    message: 'midway has an unknown key "$key", use mode, duration or ease',
    hint: "Check the spelling of the key.",
  },
  L2025: {
    message:
      "animate midway.mode must be a MIDWAY member: SWITCH, SWITCH_SMOOTH, SWITCH_STOP, WAIT, RESTART, JUMP_TO_END or KEEP_CURRENT, or a function, got $value",
    hint: "Use a member of MIDWAY, such as MIDWAY.WAIT.",
  },
  L2026: {
    message: "animate midway.mode in lusia.config must be a MIDWAY member, not a function",
    hint: "Use a MIDWAY member in lusia.config. A function works only on an item.",
  },
  L2027: {
    message: "animate midway.duration must be a time in ms, got $value",
    hint: "Use a number of milliseconds, such as 200.",
  },
  L2060: {
    message: "animate options area must be HOVER_AREA.FINAL or HOVER_AREA.ELEMENT",
    hint: "Use HOVER_AREA.FINAL, or leave area out.",
  },
} as const satisfies Record<string, ErrorCode>;
