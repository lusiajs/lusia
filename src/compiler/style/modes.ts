import type { Section } from "../parse/sections.ts";
import { mapRules } from "./css-blocks.ts";
import { scopeFilter, scopeSelectorList } from "./scope.ts";

/** `tree`: this component and everything inside it. `scoped`: only its own markup. `global`: the whole page. */
export type StyleMode = "tree" | "scoped" | "global";

const UNSCOPED_AT_RULES = /^@(-webkit-)?(keyframes|font-face|page|property|counter-style)\b/;
const MODE_BLOCK = /^@(scoped|global)\s*$/;

export function styleMode(style: Section): StyleMode {
  if ("global" in style.attrs) return "global";
  if ("scoped" in style.attrs) return "scoped";
  return "tree";
}

function scopeRule(
  prelude: string,
  body: string,
  id: string,
  mode: StyleMode,
  marked: boolean,
): string {
  const modeBlock = prelude.match(MODE_BLOCK);
  if (modeBlock) return scopeCss(body, id, modeBlock[1] as StyleMode, marked);
  if (mode === "global" || UNSCOPED_AT_RULES.test(prelude)) return `${prelude} {${body}}\n`;
  if (prelude.startsWith("@")) return `${prelude} {\n${scopeCss(body, id, mode, marked)}}\n`;
  return `${scopeSelectorList(prelude, scopeFilter(id, mode, marked))} {${body}}\n`;
}

/**
 * Rewrite every selector in plain CSS for `mode`. `@scoped { }` and `@global { }` blocks switch mode.
 * `marked` selects the class form, for components whose elements all carry the scope class.
 */
export function scopeCss(css: string, id: string, mode: StyleMode, marked = false): string {
  return mapRules(css, (prelude, body) => scopeRule(prelude, body, id, mode, marked));
}

/** A style needs the scope class on elements unless it is purely global. */
export function usesScope(style: Section): boolean {
  return styleMode(style) !== "global" || style.content.includes("@scoped");
}
