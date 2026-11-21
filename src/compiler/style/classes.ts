import { mapRules } from "./css-blocks.ts";
import { MODE_BLOCK, type StyleMode, UNSCOPED_AT_RULES } from "./modes.ts";
import { closingParen, splitTopLevel } from "./selector.ts";

export { markupClasses } from "./markup.ts";
export type { ClassType, ClassTypeResolver, MarkupClasses, WideClass } from "./markup.ts";

export interface StyleClass {
  name: string;
  mode: StyleMode;
}

const GLOBAL = ":global(";
const CLASS_TOKEN = /\.((?:[A-Za-z_-]|\\.)(?:[\w-]|\\.)*)/g;
const ATTRIBUTE_SELECTOR = /\[[^\]]*\]/g;

export function styleClasses(css: string, mode: StyleMode): StyleClass[] {
  const found = new Map<string, StyleClass>();
  collectRules(css, mode, found);
  return [...found.values()];
}

function collectRules(css: string, mode: StyleMode, found: Map<string, StyleClass>): void {
  mapRules(css, (prelude, body) => {
    collectRule(prelude, body, mode, found);
    return "";
  });
}

function collectRule(
  prelude: string,
  body: string,
  mode: StyleMode,
  found: Map<string, StyleClass>,
): void {
  const modeBlock = prelude.match(MODE_BLOCK);
  if (modeBlock) {
    collectRules(body, modeBlock[1] as StyleMode, found);
  } else if (mode === "global" || UNSCOPED_AT_RULES.test(prelude)) {
    return;
  } else if (prelude.startsWith("@")) {
    collectRules(body, mode, found);
  } else {
    for (const selector of splitTopLevel(prelude, ",")) addSelectorClasses(selector, mode, found);
  }
}

function addSelectorClasses(selector: string, mode: StyleMode, found: Map<string, StyleClass>) {
  const scoped = stripGlobals(selector).replace(ATTRIBUTE_SELECTOR, "");
  for (const match of scoped.matchAll(CLASS_TOKEN)) {
    addClass(unescapeIdent(match[1]!), mode, found);
  }
}

function stripGlobals(selector: string): string {
  let out = selector;
  for (let start = out.indexOf(GLOBAL); start !== -1; start = out.indexOf(GLOBAL)) {
    const end = closingParen(out, start + GLOBAL.length - 1);
    out = out.slice(0, start) + out.slice(end + 1);
  }
  return out;
}

function unescapeIdent(ident: string): string {
  return ident.replace(/\\(.)/g, "$1");
}

function addClass(name: string, mode: StyleMode, found: Map<string, StyleClass>): void {
  const key = `${mode} ${name}`;
  if (!found.has(key)) found.set(key, { name, mode });
}
