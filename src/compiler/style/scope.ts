import { COMPONENT_ATTR } from "#runtime/markers.ts";
import type { StyleMode } from "./modes.ts";
import { closingParen, scopeSelector, splitTopLevel, subjectStart } from "./selector.ts";

const GLOBAL = ":global(";

export function scopeFilter(id: string, mode: Exclude<StyleMode, "global">): string {
  const root = `[${COMPONENT_ATTR}="${id}"]`;
  const inTree = `:where(${root}, ${root} *)`;
  if (mode === "tree") return inTree;
  const childRoot = `${root} [${COMPONENT_ATTR}]:not(${root})`;
  return `${inTree}:not(:where(${childRoot}, ${childRoot} *))`;
}

function unwrapGlobals(selector: string): string {
  let out = selector;
  for (let start = out.indexOf(GLOBAL); start !== -1; start = out.indexOf(GLOBAL)) {
    const open = start + GLOBAL.length - 1;
    const close = closingParen(out, open);
    out = out.slice(0, start) + out.slice(open + 1, close) + out.slice(close + 1);
  }
  return out;
}

// `.card :global(a)` scopes `.card` and leaves `a` global, so the filter goes on the part before :global.
function scopeWithGlobal(selector: string, filter: string): string {
  const scopedPart = selector.slice(0, selector.indexOf(GLOBAL)).trim();
  const globalPart = unwrapGlobals(selector.slice(scopedPart.length).trim());
  if (!scopedPart) return globalPart;
  return `${scopeSelector(scopedPart, filter)} ${globalPart}`;
}

// Only what sits inside :global() is global; an unwrapped subject is still scoped.
function scopeOne(selector: string, filter: string): string {
  if (!selector.includes(GLOBAL)) return scopeSelector(selector, filter);
  const subjectIsGlobal = selector.slice(subjectStart(selector)).includes(GLOBAL);
  if (subjectIsGlobal) return scopeWithGlobal(selector, filter);
  return scopeSelector(unwrapGlobals(selector), filter);
}

export function scopeSelectorList(list: string, filter: string): string {
  return splitTopLevel(list, ",")
    .map((selector) => scopeOne(selector, filter))
    .join(", ");
}
