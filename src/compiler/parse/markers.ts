import { lusiaError, type Values } from "../errors/create.ts";
import type { ErrorCodeName } from "../errors/codes.ts";
import { LusiaError } from "../errors/error.ts";
import { columnAt, lineAt } from "../utils/position.ts";
import { nextDepth, readTags, type Tag } from "./tags.ts";

export interface MarkupBlock {
  /** The markup inside the block, without its tags. */
  content: string;
  /** 1-based line where the content starts. */
  line: number;
}

export interface Markers {
  /** The markup without <FALLBACK>, <head>, <NO_LAZY /> and <NO_SSR />. Their lines stay as line breaks. */
  markup: string;
  fallback: MarkupBlock | null;
  head: MarkupBlock | null;
  nolazy: boolean;
  nossr: boolean;
}

interface Span {
  start: number;
  end: number;
}

const FALLBACK = "FALLBACK";
const HEAD = "head";
const NO_LAZY = "NO_LAZY";
const NO_SSR = "NO_SSR";
const OLD_NO_LAZY = "NOLAZY";
const EVENT_ATTR = /\son[a-z]+=\{/;

function failAt(
  markup: string,
  file: string,
  index: number,
  code: ErrorCodeName,
  values?: Values,
): LusiaError {
  const span = {
    file,
    line: lineAt(markup, index),
    column: columnAt(markup, index),
  };
  return lusiaError(code, values, span);
}

/** Index of the closing tag that ends a block opened at `open`, counting only the tags inside it. */
function closeOf(tags: Tag[], open: number, name: string): number {
  let depth = 0;
  for (let i = open + 1; i < tags.length; i++) {
    const tag = tags[i]!;
    if (tag.name === name && tag.closing && depth === 0) return i;
    depth = nextDepth(depth, tag);
  }
  return -1;
}

/** Reads the block opened by tags[open] up to its closing tag. Its tags are skipped by the caller. */
function blockAt(
  markup: string,
  file: string,
  tags: Tag[],
  open: number,
  name: string,
): { block: MarkupBlock; close: number } {
  const tag = tags[open]!;
  const close = closeOf(tags, open, name);
  if (close === -1) throw failAt(markup, file, tag.start, "L1001", { tag: name });
  const closeTag = tags[close]!;
  const block = {
    content: markup.slice(tag.end, closeTag.start),
    line: lineAt(markup, tag.end),
  };
  return { block, close };
}

/** Removes <FALLBACK>, <head>, <NO_LAZY /> and <NO_SSR /> from the markup and checks them. Only top-level markers are allowed. */
export function extractMarkers(markup: string, file: string): Markers {
  const expressions: number[] = [];
  const tags = readTags(markup, expressions);
  const removed: Span[] = [];
  let fallback: MarkupBlock | null = null;
  let head: MarkupBlock | null = null;
  let nolazy = false;
  let nossr = false;
  let depth = 0;
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i]!;
    if (tag.name === FALLBACK && !tag.closing) {
      if (depth > 0) throw failAt(markup, file, tag.start, "L1038", { tag: FALLBACK });
      if (fallback) throw failAt(markup, file, tag.start, "L1039");
      const { block, close } = blockAt(markup, file, tags, i, FALLBACK);
      checkFallbackContent(
        markup,
        file,
        tags.slice(i + 1, close),
        expressions,
        tag.end,
        tags[close]!.start,
      );
      fallback = block;
      removed.push({ start: tag.start, end: tags[close]!.end });
      i = close;
    } else if (tag.name === HEAD && !tag.closing) {
      if (depth > 0) throw failAt(markup, file, tag.start, "L1038", { tag: HEAD });
      if (head) throw failAt(markup, file, tag.start, "L1051");
      const { block, close } = blockAt(markup, file, tags, i, HEAD);
      head = block;
      removed.push({ start: tag.start, end: tags[close]!.end });
      i = close;
    } else if (tag.name === OLD_NO_LAZY && depth === 0) {
      throw failAt(markup, file, tag.start, "L1050");
    } else if (tag.name === NO_LAZY) {
      if (depth > 0) throw failAt(markup, file, tag.start, "L1038", { tag: NO_LAZY });
      if (nolazy) throw failAt(markup, file, tag.start, "L1040");
      if (!tag.selfClosing) throw failAt(markup, file, tag.start, "L1041");
      nolazy = true;
      removed.push({ start: tag.start, end: tag.end });
    } else if (tag.name === NO_SSR) {
      if (depth > 0) throw failAt(markup, file, tag.start, "L1038", { tag: NO_SSR });
      if (nossr) throw failAt(markup, file, tag.start, "L1052");
      if (!tag.selfClosing) throw failAt(markup, file, tag.start, "L1053");
      nossr = true;
      removed.push({ start: tag.start, end: tag.end });
    } else {
      depth = nextDepth(depth, tag);
    }
  }
  return { markup: blank(markup, removed), fallback, head, nolazy, nossr };
}

function checkFallbackContent(
  markup: string,
  file: string,
  inside: Tag[],
  expressions: number[],
  from: number,
  to: number,
): void {
  for (const tag of inside) {
    if (tag.name === FALLBACK) throw failAt(markup, file, tag.start, "L1038", { tag: FALLBACK });
    if (/^[A-Z]/.test(tag.name)) {
      throw failAt(markup, file, tag.start, "L1042", {
        what: `The component or tag <${tag.name}>`,
      });
    }
    if (EVENT_ATTR.test(markup.slice(tag.start, tag.end))) {
      throw failAt(markup, file, tag.start, "L1042", {
        what: "An event such as onclick",
      });
    }
  }
  const expression = expressions.find((index) => index > from && index < to);
  if (expression !== undefined) {
    throw failAt(markup, file, expression, "L1042", {
      what: "An expression in {braces}",
    });
  }
}

/** Replaces each span with its line breaks, so the lines after it keep their numbers. */
function blank(markup: string, spans: Span[]): string {
  let result = "";
  let last = 0;
  for (const span of spans) {
    result +=
      markup.slice(last, span.start) + markup.slice(span.start, span.end).replace(/[^\n]/g, "");
    last = span.end;
  }
  return result + markup.slice(last);
}
