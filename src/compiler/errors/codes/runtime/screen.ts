import type { ErrorCode } from "../../codes.ts";

export const RUNTIME_SCREEN_CODES = {
  L2080: {
    message: "SCREEN.$name cannot be set",
    hint: "SCREEN is read-only. It follows the window width, so there is nothing to set.",
  },
} as const satisfies Record<string, ErrorCode>;
