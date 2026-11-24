import type { ErrorCode } from "../codes.ts";
import { RUNTIME_ANIMATE_KEYFRAMES_CODES } from "./runtime/animate-keyframes.ts";
import { RUNTIME_ANIMATE_TRIGGER_CODES } from "./runtime/animate-trigger.ts";
import { RUNTIME_ANIMATE_OPTIONS_CODES } from "./runtime/animate-options.ts";
import { RUNTIME_ANIMATE_CODES } from "./runtime/animate.ts";
import { RUNTIME_COMPONENT_CODES } from "./runtime/component.ts";
import { RUNTIME_CONFIG_CODES } from "./runtime/config.ts";
import { RUNTIME_DOM_CODES } from "./runtime/dom.ts";
import { RUNTIME_LAZY_CODES } from "./runtime/lazy.ts";
import { RUNTIME_SCREEN_CODES } from "./runtime/screen.ts";
import { RUNTIME_VARIABLE_CODES } from "./runtime/variable.ts";

export const RUNTIME_CODES = {
  ...RUNTIME_ANIMATE_CODES,
  ...RUNTIME_ANIMATE_KEYFRAMES_CODES,
  ...RUNTIME_ANIMATE_OPTIONS_CODES,
  ...RUNTIME_COMPONENT_CODES,
  ...RUNTIME_CONFIG_CODES,
  ...RUNTIME_DOM_CODES,
  ...RUNTIME_ANIMATE_TRIGGER_CODES,
  ...RUNTIME_VARIABLE_CODES,
  ...RUNTIME_LAZY_CODES,
  ...RUNTIME_SCREEN_CODES,
} as const satisfies Record<string, ErrorCode>;
