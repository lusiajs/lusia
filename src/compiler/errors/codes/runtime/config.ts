import type { ErrorCode } from "../../codes.ts";

export const RUNTIME_CONFIG_CODES = {
  L2071: {
    message: 'setConfig has an unknown key "$key", use $keys',
    hint: "Check the spelling. Only animate and lazy can be set at runtime.",
  },
  L2072: {
    message: 'setConfig key "$key" is build-only',
    hint: "Move it to lusia.config. setConfig sets only animate and lazy.prefetch.",
  },
  L2073: {
    message: 'setConfig lazy has an unknown key "$key", use $keys',
    hint: "Only lazy.prefetch can be set at runtime.",
  },
  L2074: {
    message: "setConfig lazy.prefetch must be idle, view or none, got $value",
    hint: 'Use "idle", "view" or "none".',
  },
  L2075: {
    message: "setConfig with $reach must run at the top of a component script",
    hint: "It sets what the markup binds with, so it cannot run later. Move it to the top of the <script>, or use SCOPE.GLOBAL inside onAttach.",
  },
  L2076: {
    message: "setConfig with SCOPE.GLOBAL cannot run at the top of a component script",
    hint: "A global setting outlives the component, so it must be a visible step. Move it into onAttach, onDetach or a function.",
  },
} as const satisfies Record<string, ErrorCode>;
