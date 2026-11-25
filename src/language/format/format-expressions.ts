import { closingQuote } from "./object-literal.ts";

export interface ProtectedMarkup {
  text: string;
  expressions: string[];
}

const QUOTES = new Set(["'", '"', "`"]);
const PLACEHOLDER = /^LUSIAEXPR(\d+)X/;

const FLOW_OPEN = /<(?:IF|ELSEIF|ELSE|EACH|FOR|CONTENT|HTML|FALLBACK|NO_LAZY)(?=[\s/>])/y;
const FLOW_CLOSE = /<\/(?:IF|ELSEIF|ELSE|EACH|FOR|HTML|FALLBACK)\s*>/y;

export function protectExpressions(markup: string): ProtectedMarkup {
  const expressions: string[] = [];
  let text = "";
  let i = 0;
  while (i < markup.length) {
    const end = protectedEnd(markup, i);
    if (end === -1) {
      text += markup.charAt(i);
      i++;
    } else {
      text += placeholder(expressions.length, end + 1 - i);
      expressions.push(markup.slice(i, end + 1));
      i = end + 1;
    }
  }
  return { text, expressions };
}

/** Puts the expressions back. A placeholder that the formatter quoted as a whole attribute value loses the quotes. */
export function restoreExpressions(html: string, expressions: string[]): string {
  let text = "";
  let index = 0;
  while (index < html.length) {
    const start = html.indexOf("LUSIAEXPR", index);
    if (start === -1) {
      text += html.slice(index);
      break;
    }
    text += html.slice(index, start);
    const match = PLACEHOLDER.exec(html.slice(start));
    if (!match) {
      text += html.charAt(start);
      index = start + 1;
      continue;
    }
    const expression = expressionAt(expressions, match[1] ?? "");
    const end = skipPadding(html, start + match[0].length, expression, match[0].length);
    if (text.endsWith('="')) {
      text = `${text.slice(0, -2)}=${expression}`;
      index = html.charAt(end) === '"' ? end + 1 : end;
    } else if (text.endsWith("=")) {
      text = `${text.slice(0, -1)}=${expression}`;
      index = end;
    } else {
      text += expression;
      index = end;
    }
  }
  return text;
}

function skipPadding(html: string, end: number, expression: string, tokenLength: number): number {
  const filler = expression.length - tokenLength - 1;
  if (filler < 1) return end;
  const padding = `${"~".repeat(filler)}Q`;
  return html.startsWith(padding, end) ? end + padding.length : end;
}

/** The last index of the protected span that starts at `i` (an expression or a flow tag), or -1. */
function protectedEnd(markup: string, i: number): number {
  const ch = markup.charAt(i);
  if (ch === "{") return expressionEnd(markup, i);
  if (ch === "<") return flowTagEnd(markup, i);
  return -1;
}

/** The index of the `>` that ends a flow tag at `start`, or -1. Expressions inside it are skipped. */
function flowTagEnd(markup: string, start: number): number {
  FLOW_CLOSE.lastIndex = start;
  const close = FLOW_CLOSE.exec(markup);
  if (close) return start + close[0].length - 1;
  FLOW_OPEN.lastIndex = start;
  if (!FLOW_OPEN.test(markup)) return -1;
  for (let i = start; i < markup.length; i++) {
    const ch = markup.charAt(i);
    if (QUOTES.has(ch)) i = closingQuote(markup, i);
    else if (ch === "{") {
      i = expressionEnd(markup, i);
      if (i === -1) return -1;
    } else if (ch === ">") return i;
  }
  return -1;
}

export function inExpressionAt(text: string, offset: number): boolean {
  if (offset <= 0) return false;
  const open = text.lastIndexOf("{", offset - 1);
  if (open === -1) return false;
  const end = expressionEnd(text, open);
  return end === -1 || end >= offset;
}

/** The index of the `}` that closes the `{` at `open`, or -1. */
export function expressionEnd(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const ch = text.charAt(i);
    if (QUOTES.has(ch)) i = closingQuote(text, i);
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return i;
  }
  return -1;
}

/** A long expression gets padding, so the formatter wraps it like the real value. */
function placeholder(index: number, length: number): string {
  const token = `LUSIAEXPR${index}X`;
  if (length < token.length + 2) return token;
  return `${token}${"~".repeat(length - token.length - 1)}Q`;
}

function expressionAt(expressions: string[], index: string): string {
  return expressions[Number(index)] ?? "";
}
