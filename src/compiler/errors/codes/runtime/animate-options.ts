import type { ErrorCode } from "../../codes.ts";

export const RUNTIME_ANIMATE_OPTIONS_CODES = {
  L2039: {
    message: "animate list changed length after it was attached",
    hint: "Keep the number of animate items fixed. Only their values can change.",
  },
  L2044: {
    message: "ON.IN and ON.OUT were renamed to ON.ATTACH and ON.DETACH",
    hint: "Replace IN with ATTACH and OUT with DETACH.",
  },
  L2045: {
    message: "animation was renamed to play",
    hint: "Write play: keyframes instead of animation: keyframes.",
  },
  L2046: {
    message: "active was renamed to on",
    hint: "Write on: instead of active:.",
  },
  L2051: {
    message: "loop does not work with ON.MOVE, RESIZE or MOVE_OR_RESIZE",
    hint: "Remove loop. A glide plays once for each change.",
  },
  L2052: {
    message: "$name is set by the glide and cannot be in play",
    hint: "Remove $name from play. Use transform for other moves.",
  },
  L2065: {
    message: "animate $name must be an object, got $value",
    hint: "Write an object, such as { duration: 500 }.",
  },
  L2066: {
    message: 'animate $name has an unknown key "$key", use $keys',
    hint: "$tip",
  },
  L2067: {
    message: "animate $name has an unknown name $value",
    hint: "Check the spelling. Use a member name such as CUBIC, INOUT or WAIT.",
  },
  L2068: {
    message: "animate $name must be a preset name or a keyframes object, got $value",
    hint: "Use a PRESET name such as FADE_IN.",
  },
  L2069: {
    message: "animate $name must be true or false, got $value",
    hint: "Use true or false.",
  },
  L2081: {
    message: "midway is an object now. Write midway: { mode: MIDWAY.X }.",
    hint: "Put the MIDWAY member in mode, such as midway: { mode: MIDWAY.WAIT }.",
  },
  L2082: {
    message: "midway $key was renamed to $to",
    hint: "Write midway: { $to: ... } instead.",
  },
  L2084: {
    message: "style was renamed to play",
    hint: "Write play: keyframes instead of style: keyframes.",
  },
  L2085: {
    message: "when was renamed to on",
    hint: "Write on: instead of when:.",
  },
  L2086: {
    message: "more was renamed to options",
    hint: "Write options: { ... } instead of more: { ... }.",
  },
} as const satisfies Record<string, ErrorCode>;
