import { findApiById } from "../api-lookup.ts";
import { cssKeyAt, isInAnimate } from "../animate/animate-fields.ts";
import type { PropLookup } from "../completions.ts";
import { findComponentImport } from "#language/parse/imports.ts";
import { attributeNameAt, wordAt } from "#language/parse/word.ts";
import type { HoverResult } from "../hover.ts";
import { openTagAt, tagNameAt, type OpenTag } from "#language/parse/tag.ts";

const STYLE_TAG_IDS: Record<string, string> = { scoped: "style-scoped", global: "style-global" };

export function markupHover(
  text: string,
  offset: number,
  propsOf: PropLookup,
): HoverResult | undefined {
  const tag = openTagAt(text, offset);
  if (tag?.name === "style") return styleTagHover(text, offset);
  return (
    flowTagHover(text, offset) ??
    plainAttributeHover(text, offset, tag) ??
    animateMoreHover(text, offset) ??
    cssHover(text, offset) ??
    componentHover(text, offset, propsOf)
  );
}

function animateMoreHover(text: string, offset: number): HoverResult | undefined {
  if (wordAt(text, offset) !== "options" || !isInAnimate(text, offset)) return undefined;
  return apiResult("animate-options");
}

const FLOW_TAG_IDS: Record<string, string> = {
  IF: "if",
  ELSEIF: "elseif",
  ELSE: "else",
  EACH: "each",
  FOR: "for",
  CONTENT: "content",
  HTML: "html",
  FALLBACK: "fallback",
  NO_LAZY: "nolazy",
};

const FLOW_TAG_NAME = /<\/?(IF|ELSEIF|ELSE|EACH|FOR|CONTENT|HTML|FALLBACK|NO_LAZY)(?=[\s/>])/g;

function flowTagHover(text: string, offset: number): HoverResult | undefined {
  for (const match of text.matchAll(FLOW_TAG_NAME)) {
    const name = match[1] ?? "";
    const nameStart = match.index + match[0].length - name.length;
    if (offset >= nameStart && offset <= nameStart + name.length)
      return apiResult(FLOW_TAG_IDS[name]);
  }
  return undefined;
}

function plainAttributeHover(
  text: string,
  offset: number,
  tag: OpenTag | undefined,
): HoverResult | undefined {
  if (!tag || findComponentImport(text, tag.name)) return undefined;
  return apiResult(attributeHoverId(attributeNameAt(text, offset)));
}

function attributeHoverId(name: string): string | undefined {
  if (name === "animate" || name === "bind-value" || name === "bind-element") return name;
  if (name.startsWith("bind-")) return "bind-prop";
  if (/^on[a-z]+$/.test(name)) return "event";
  return undefined;
}

function apiResult(id: string | undefined): HoverResult | undefined {
  const entry = id ? findApiById(id) : undefined;
  return entry ? { kind: "api", entry } : undefined;
}

function componentHover(
  text: string,
  offset: number,
  propsOf: PropLookup,
): HoverResult | undefined {
  const componentTag = tagNameAt(text, offset);
  if (!componentTag || !findComponentImport(text, componentTag.name)) return undefined;
  return { kind: "component", name: componentTag.name, props: propsOf(componentTag.name) };
}

function styleTagHover(text: string, offset: number): HoverResult | undefined {
  const word = wordAt(text, offset);
  const entry = findApiById(STYLE_TAG_IDS[word] ?? "style");
  return entry ? { kind: "api", entry } : undefined;
}

function cssHover(text: string, offset: number): HoverResult | undefined {
  const name = cssKeyAt(text, offset);
  return name === undefined ? undefined : { kind: "css", name };
}
