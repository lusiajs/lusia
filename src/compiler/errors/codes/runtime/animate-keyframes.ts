import type { ErrorCode } from "../../codes.ts";

export const RUNTIME_ANIMATE_KEYFRAMES_CODES = {
  L2032: {
    message: "animate default must be [EASE.STYLE.x, EASE.y], [EASE.STYLE.x] or [EASE.y]",
    hint: "Use one of the three listed forms.",
  },
  L2033: {
    message:
      "animate key must be a style object, [EASE.STYLE.x, EASE.y, style], [EASE.STYLE.x, style] or [EASE.y, style]",
    hint: "Use a style object, or one of the listed forms with it.",
  },
  L2034: {
    message: "animate easing style must be a function of t, such as EASE.STYLE.QUART",
    hint: "Use a member of EASE.STYLE, such as EASE.STYLE.QUART.",
  },
  L2035: {
    message: "animate ease must be EASE.IN, EASE.OUT or EASE.INOUT",
    hint: "Use a member of EASE, such as EASE.INOUT.",
  },
  L2036: {
    message: "animate keyframe $at is outside 0..1",
    hint: "Keyframe keys are fractions of the animation, from 0 to 1.",
  },
  L2037: {
    message: "animate keyframe $at is listed twice",
    hint: "Keep one entry for each key.",
  },
  L2038: {
    message: "animate keyframes must include the keys 0 and 1",
    hint: "Add a key 0 for the start and a key 1 for the end.",
  },
  L2054: {
    message: "unknown keyframes key '$key'. Keys are numbers from 0 to 1 or 'default'",
    hint: "$tip",
  },
  L2055: {
    message: "unknown animate key '$key'",
    hint: "$tip",
  },
} as const satisfies Record<string, ErrorCode>;
