import type { ErrorCode } from "../../codes.ts";

export const RUNTIME_ROUTER_CODES = {
  L2091: {
    message: "PARAMS.$name cannot be set",
    hint: "PARAMS is read-only. It follows the page address and the query. Set PATH to go to another page.",
  },
} as const satisfies Record<string, ErrorCode>;
