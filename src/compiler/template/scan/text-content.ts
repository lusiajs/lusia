import type { AttrPart } from "../types/attribute.ts";
import type { Cursor } from "./cursor.ts";
import { decodeEntities } from "./entities.ts";

/** Plain-text elements: their content is not parsed as markup, so `{expr}` binds the whole text. */
const TEXT_ELEMENTS = new Set(["title", "textarea"]);

export interface TextContent {
  /** Static text and expressions, in order. */
  parts: AttrPart[];
  /** The content as written, used when it has no expression. */
  raw: string;
}

export function isTextElement(name: string): boolean {
  return TEXT_ELEMENTS.has(name);
}

/** Reads the content of a text element and its close tag. The cursor stops after the close tag. */
export function readTextContent(c: Cursor, name: string, start: number): TextContent {
  const close = `</${name}>`;
  const from = c.pos;
  const parts: AttrPart[] = [];
  let literal = "";
  while (c.peek() && !c.startsWith(close)) {
    if (c.peek() !== "{") {
      literal += c.src[c.pos++];
      continue;
    }
    if (literal) parts.push(decodeEntities(literal));
    literal = "";
    parts.push(c.readExpression());
  }
  if (!c.startsWith(close)) c.fail("L1009", { name }, start);
  const raw = c.src.slice(from, c.pos);
  c.pos += close.length;
  if (literal) parts.push(decodeEntities(literal));
  return { parts, raw };
}
