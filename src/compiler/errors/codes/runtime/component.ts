import type { ErrorCode } from "../../codes.ts";

export const RUNTIME_COMPONENT_CODES = {
  L2040: {
    message: "props() can only be called in a component's <script>",
    hint: "Call props() at the top level of a .lusia <script>.",
  },
  L2058: {
    message: "$prop is read-only in this component",
    hint: "The parent can let it write back: pass it with bind-$prop={variable}.",
  },
  L2070: {
    message: "onAttach() and onDetach() can only be called in a component's <script>",
    hint: "Call them at the top level of a .lusia <script>.",
  },
  L2078: {
    message: "$event needs an element, not window or document",
    hint: "Pass an element, for example one from bind-element={el}, inside onAttach.",
  },
  L2079: {
    message: "listen() got an unknown event: $value",
    hint: 'Use an EVENT value, like EVENT.VIEW, or a DOM event name, like "click".',
  },
} as const satisfies Record<string, ErrorCode>;
