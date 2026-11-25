import { lusiaError, type Values } from "../errors/create.ts";
import type { ErrorCodeName } from "../errors/codes.ts";
import { LusiaError } from "../errors/error.ts";
import { columnAt, lineAt } from "../utils/position.ts";
import { nextDepth, readTags, type Tag } from "./tags.ts";

export interface FallbackBlock {
  /** The markup inside <FALLBACK>, without its tags. */
  content: string;
  /** 1-based line where the content starts. */
  line: number;
}

export interface Markers {
  /** The markup without <FALLBACK> and <NO_LAZY />. Their lines stay as line breaks. */
  markup: string;
  fallback: FallbackBlock | null;
  nolazy: boolean;
}

interface Span {
  start: number;
  end: number;
}

const FALLBACK = "FALLBACK";
const NO_LAZY = "NO_LAZY";
const OLD_NO_LAZY = "NOLAZY";
const EVENT_ATTR = /\son[a-z]+=\{/;

function failAt(
  markup: string,
  file: string,
  index: number,
  code: ErrorCodeName,
  values?: Values,
): LusiaError {
  const span = { file, line: lineAt(markup, index), column: columnAt(markup, index) };
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

/** Removes <FALLBACK> and <NO_LAZY /> from the markup and checks them. Only top-level markers are allowed. */
export function extractMarkers(markup: string, file: string): Markers {
  const expressions: number[] = [];
  const tags = readTags(markup, expressions);
  const removed: Span[] = [];
  let fallback: FallbackBlock | null = null;
  let nolazy = false;
  let depth = 0;
  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i]!;
    if (tag.name === FALLBACK && !tag.closing) {
      if (depth > 0) throw failAt(markup, file, tag.start, "L1038", { tag: FALLBACK });
      if (fallback) throw failAt(markup, file, tag.start, "L1039");
      const close = closeOf(tags, i, FALLBACK);
      if (close === -1) throw failAt(markup, file, tag.start, "L1001", { tag: FALLBACK });
      const closeTag = tags[close]!;
      checkFallbackContent(
        markup,
        file,
        tags.slice(i + 1, close),
        expressions,
        tag.end,
        closeTag.start,
      );
      fallback = { content: markup.slice(tag.end, closeTag.start), line: lineAt(markup, tag.end) };
      removed.push({ start: tag.start, end: closeTag.end });
      i = close;
    } else if (tag.name === OLD_NO_LAZY && depth === 0) {
      throw failAt(markup, file, tag.start, "L1050");
    } else if (tag.name === NO_LAZY) {
      if (depth > 0) throw failAt(markup, file, tag.start, "L1038", { tag: NO_LAZY });
      if (nolazy) throw failAt(markup, file, tag.start, "L1040");
      if (!tag.selfClosing) throw failAt(markup, file, tag.start, "L1041");
      nolazy = true;
      removed.push({ start: tag.start, end: tag.end });
    } else {
      depth = nextDepth(depth, tag);
    }
  }
  return { markup: blank(markup, removed), fallback, nolazy };
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
      throw failAt(markup, file, tag.start, "L1042", { what: "An event such as onclick" });
    }
  }
  const expression = expressions.find((index) => index > from && index < to);
  if (expression !== undefined) {
    throw failAt(markup, file, expression, "L1042", { what: "An expression in {braces}" });
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
