import type { ErrorCode } from "../../codes.ts";

export const RUNTIME_ANIMATE_TRIGGER_CODES = {
  L2048: {
    message:
      "animate options $name must be EDGE.TOP, EDGE.CENTER, EDGE.BOTTOM or a number from 0 to 1, got $value",
    hint: "Use an EDGE member, such as EDGE.CENTER, or a number from 0 to 1.",
  },
  L2056: {
    message: "animate options animateSpace must be true or false, got $value",
    hint: "Use true to slide the siblings, or false (default) to let them jump.",
  },
} as const satisfies Record<string, ErrorCode>;
