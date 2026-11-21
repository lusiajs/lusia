import { CHILD_RULES, PARENT_RULES } from "./rules.ts";
import { renderParent } from "./components.ts";
import type { Variant } from "./variants.ts";

export const COMPONENTS = Number(process.env.BENCH_COMPONENTS ?? 300);

export interface BuiltApp {
  css: string;
  markup: string;
  cssBytes: number;
  htmlBytes: number;
  markers: number;
}

const ATTRIBUTE_MARKER = / data-l="/g;
const CLASS_MARKER = /\bs-[pc]\d+\b/g;

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

export function buildApp(variant: Variant): BuiltApp {
  const styles: string[] = [];
  const roots: string[] = [];
  for (let index = 0; index < COMPONENTS; index++) {
    const parentId = `p${index}`;
    const childId = `c${index}`;
    styles.push(variant.styleFor(parentId, PARENT_RULES), variant.styleFor(childId, CHILD_RULES));
    roots.push(renderParent(parentId, childId, variant.mark));
  }
  const css = styles.join("\n");
  const markup = roots.join("\n");
  return {
    css,
    markup,
    cssBytes: new TextEncoder().encode(css).byteLength,
    htmlBytes: new TextEncoder().encode(markup).byteLength,
    markers: countMatches(markup, ATTRIBUTE_MARKER) + countMatches(markup, CLASS_MARKER),
  };
}
