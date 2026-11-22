import { expressionEnd } from "./format-expressions.ts";
import { closingQuote } from "./object-literal.ts";

const PAIRED_OPEN = /^<(IF|EACH|FOR|HTML|FALLBACK)(?=[\s/>])/;
const CHAIN_OPEN = /^<(ELSEIF|ELSE)(?=[\s/>])/;
const PAIRED_CLOSE = /^<\/(IF|EACH|FOR|HTML|FALLBACK)\s*>/;
export interface FlowTag {
  /** The original opening tag, put back as it was. */
  open: string;
  /** The tag name that closes the placeholder: IF for a chain branch. */
  type: string;
  /** ELSEIF or ELSE: it closes the branch before it instead of opening a block. */
  chain: boolean;
}

export interface ProtectedFlow {
  text: string;
  tags: FlowTag[];
}

interface Replacement {
  text: string;
  length: number;
}

/** Keeps each opening tag whole, for restoreFlowTags. */
export function protectFlowTags(markup: string): ProtectedFlow {
  const tags: FlowTag[] = [];
  let text = "";
  let index = 0;
  let paragraphs = 0;
  while (index < markup.length) {
    const ch = markup.charAt(index);
    if (ch === "{") {
      const end = expressionEnd(markup, index);
      const next = end === -1 ? index + 1 : end + 1;
      text += markup.slice(index, next);
      index = next;
      continue;
    }
    if (ch !== "<") {
      text += ch;
      index++;
      continue;
    }
    if (markup.startsWith("<!--", index)) {
      const end = markup.indexOf("-->", index);
      const next = end === -1 ? markup.length : end + 3;
      text += markup.slice(index, next);
      index = next;
      continue;
    }
    const replacement = paragraphs === 0 ? flowReplacement(markup, index, tags) : undefined;
    if (replacement) {
      text += replacement.text;
      index += replacement.length;
      continue;
    }
    const end = tagEnd(markup, index);
    const next = end === -1 ? index + 1 : end + 1;
    const tag = markup.slice(index, next);
    paragraphs = paragraphDepth(tag, paragraphs);
    text += tag;
    index = next;
  }
  return { text, tags };
}

/** The placeholder for a flow tag at index, or undefined for any other tag. */
function flowReplacement(markup: string, index: number, tags: FlowTag[]): Replacement | undefined {
  const rest = markup.slice(index);
  const close = PAIRED_CLOSE.exec(rest);
  if (close) return { text: "</div>", length: close[0].length };
  const end = tagEnd(markup, index);
  if (end === -1) return undefined;
  const open = markup.slice(index, end + 1);
  const next = tags.length;
  const chain = CHAIN_OPEN.exec(rest);
  if (chain) {
    tags.push({ open, type: "IF", chain: true });
    return { text: `</div><div data-lusia-flow="${next}">`, length: open.length };
  }
  const paired = PAIRED_OPEN.exec(rest);
  if (paired) {
    tags.push({ open, type: paired[1] ?? "", chain: false });
    return { text: `<div data-lusia-flow="${next}">`, length: open.length };
  }
  return undefined;
}

/** A block placeholder would close an open `<p>`, so flow tags inside one stay as they are. */
function paragraphDepth(tag: string, depth: number): number {
  if (/^<p(?=[\s>])/i.test(tag)) return depth + 1;
  if (/^<\/p\s*>/i.test(tag)) return Math.max(0, depth - 1);
  return depth;
}

// Quotes and {...} values may hold a `>`, so they are skipped.
export function tagEnd(text: string, start: number): number {
  let index = start + 1;
  while (index < text.length) {
    const ch = text.charAt(index);
    if (ch === '"' || ch === "'") {
      index = closingQuote(text, index);
    } else if (ch === "{") {
      const end = expressionEnd(text, index);
      if (end === -1) return -1;
      index = end;
    } else if (ch === ">") {
      return index;
    }
    index++;
  }
  return -1;
}
