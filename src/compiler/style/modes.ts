import type { Section } from "../parse/sections.ts";
import { mapRules } from "./css-blocks.ts";
import { scopeFilter, scopeSelectorList } from "./scope.ts";

/** `tree`: this component and everything inside it. `scoped`: only its own markup. `global`: the whole page. */
export type StyleMode = "tree" | "scoped" | "global";

export const UNSCOPED_AT_RULES = /^@(-webkit-)?(keyframes|font-face|page|property|counter-style)\b/;
export const MODE_BLOCK = /^@(scoped|global)\s*$/;

export function styleMode(style: Section): StyleMode {
  if ("global" in style.attrs) return "global";
  if ("scoped" in style.attrs) return "scoped";
  return "tree";
}

function scopeRule(prelude: string, body: string, id: string, mode: StyleMode): string {
  const modeBlock = prelude.match(MODE_BLOCK);
  if (modeBlock) return scopeCss(body, id, modeBlock[1] as StyleMode);
  if (mode === "global" || UNSCOPED_AT_RULES.test(prelude)) return `${prelude} {${body}}\n`;
  if (prelude.startsWith("@")) return `${prelude} {\n${scopeCss(body, id, mode)}}\n`;
  return `${scopeSelectorList(prelude, scopeFilter(id, mode))} {${body}}\n`;
}

/** Rewrite every selector in plain CSS for `mode`. `@scoped { }` and `@global { }` blocks switch mode. */
export function scopeCss(css: string, id: string, mode: StyleMode): string {
  return mapRules(css, (prelude, body) => scopeRule(prelude, body, id, mode));
}
