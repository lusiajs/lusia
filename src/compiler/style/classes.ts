import { blankSections, scriptSection } from "#language/parse/sections.ts";
import { mapRules } from "./css-blocks.ts";
import { MODE_BLOCK, type StyleMode, UNSCOPED_AT_RULES } from "./modes.ts";
import { closingParen, splitTopLevel } from "./selector.ts";

export interface StyleClass {
  name: string;
  mode: StyleMode;
}

export interface MarkupClasses {
  used: Set<string>;
  unsafeDynamic: boolean;
}

const GLOBAL = ":global(";
const CLASS_TOKEN = /\.((?:[A-Za-z_-]|\\.)(?:[\w-]|\\.)*)/g;
const ATTRIBUTE_SELECTOR = /\[[^\]]*\]/g;
const CLASS_WORD = /^[A-Za-z_-][\w:-]*$/;
const STATIC_CLASS = /\sclass=(?:"([^"]*)"|'([^']*)')/g;
const CLASS_EXPRESSION = /\sclass=\{/g;
const TEMPLATE_HOLE = /\$\{[^}]*\}/g;
const CONCAT = /\+\s*["'`]|["'`]\s*\+|\$\{/;
const CALL = /[A-Za-z_$][\w$]*\s*\(/;

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

export function markupClasses(source: string): MarkupClasses {
  const markup = blankSections(source);
  const script = scriptText(source);
  const used = new Set<string>();
  for (const match of markup.matchAll(STATIC_CLASS)) addTokens(match[1] ?? match[2] ?? "", used);
  addWords(script, used);
  for (const expression of braceExpressions(markup)) addWords(expression, used);

  const classExpressions = findClassExpressions(markup);
  const unsafeDynamic = classExpressions.some((expression) => usesConcat(expression, script));
  return { used, unsafeDynamic };
}

function scriptText(source: string): string {
  const section = scriptSection(source);
  return section ? source.slice(section.contentStart, section.contentEnd) : "";
}

function addTokens(text: string, used: Set<string>): void {
  for (const token of text.split(/\s+/)) if (token) used.add(token);
}

// Class names inside string literals, e.g. `'is-active'` or `"row done"`.
function addWords(code: string, used: Set<string>): void {
  for (const literal of stringLiterals(code)) {
    for (const word of literal.split(/\s+/)) if (CLASS_WORD.test(word)) used.add(word);
  }
}

function usesConcat(expression: string, script: string): boolean {
  if (CONCAT.test(expression)) return true;
  return CALL.test(expression) && CONCAT.test(script);
}

function findClassExpressions(markup: string): string[] {
  return [...markup.matchAll(CLASS_EXPRESSION)].map((match) =>
    expressionAt(markup, match.index + match[0].length - 1),
  );
}

function braceExpressions(text: string): string[] {
  const expressions: string[] = [];
  let open = text.indexOf("{");
  while (open !== -1) {
    const end = expressionEnd(text, open);
    expressions.push(text.slice(open + 1, end));
    open = text.indexOf("{", end + 1);
  }
  return expressions;
}

function expressionAt(text: string, open: number): string {
  return text.slice(open + 1, expressionEnd(text, open));
}

function expressionEnd(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === "`") i = closingQuote(text, i);
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return i;
  }
  return text.length;
}

function closingQuote(text: string, start: number): number {
  const quote = text[start];
  for (let i = start + 1; i < text.length; i++) {
    if (text[i] === "\\") i++;
    else if (text[i] === quote) return i;
  }
  return text.length;
}

// Template literals keep only their text, without the `${...}` parts.
function stringLiterals(code: string): string[] {
  const literals: string[] = [];
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch !== '"' && ch !== "'" && ch !== "`") continue;
    const end = closingQuote(code, i);
    const body = code.slice(i + 1, end);
    literals.push(ch === "`" ? body.replace(TEMPLATE_HOLE, " ") : body);
    i = end;
  }
  return literals;
}
