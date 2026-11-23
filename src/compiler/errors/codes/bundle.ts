import type { ErrorCode } from "../codes.ts";

export const BUNDLE_CODES = {
  L3001: {
    message: '"$name" is not exported by "$module"',
    hint: "Check the name, or see reference/api.ts.",
  },
  L3002: {
    message: 'cannot resolve "$name"',
    hint: "Check the spelling of the path or package name, and that the file exists.",
  },
  L3003: {
    message: "$message",
    hint: "Fix the code on this line, then build again.",
  },
  L3004: {
    message: "$message",
    hint: "Fix the lusia config file, then run the command again.",
  },
  L3005: {
    message: "lusia format needs prettier.",
    hint: "Run: bun add -d prettier",
  },
} as const satisfies Record<string, ErrorCode>;
