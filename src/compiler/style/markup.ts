import { blankSections, scriptSection } from "#language/parse/sections.ts";

/** The class names a value can give: its literal strings, or `{ wide }` with its printed type when it could be any string. */
export type ClassType = string[] | { wide: string };

/** Undefined means the type cannot be read, so the component's classes stay unknown. */
export type ClassTypeResolver = (name: string, offset: number) => ClassType | undefined;

export interface WideClass {
  name: string;
  offset: number;
  type: string;
}

export interface MarkupClasses {
  used: Set<string>;
  unsafeDynamic: boolean;
  wide: WideClass[];
}

interface ClassExpression {
  code: string;
  offset: number;
}

interface ExpressionReading {
  unsafe: boolean;
  values: string[];
  wide: WideClass[];
}

const CLASS_WORD = /^[A-Za-z_-][\w:-]*$/;
const STATIC_CLASS = /\sclass=(?:"([^"]*)"|'([^']*)')/g;
const CLASS_EXPRESSION = /\sclass=\{/g;
const TEMPLATE_HOLE = /\$\{[^}]*\}/g;
const CONCAT = /\+\s*["'`]|["'`]\s*\+|\$\{/;
const CALL = /[A-Za-z_$][\w$]*\s*\(/;
const DECLARATION = /\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g;
const DESTRUCTURING = /\b(?:const|let|var)\s*\{([^}]*)\}/g;
const LOOP_ITEM =
  /\b(?:as|index)=(?:\{\s*([A-Za-z_][\w$]*)\s*\}|"([A-Za-z_][\w$]*)")|<FOR\s+\{\s*([A-Za-z_][\w$]*)\s*\}/g;
const QUOTED_STRING = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g;
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT = /\/\/[^\n]*/g;
const REFERENCED_NAME = /(?<![\w$.])[A-Za-z_][\w$]*/g;
const KEYWORDS = new Set([
  "true",
  "false",
  "null",
  "undefined",
  "this",
  "new",
  "typeof",
  "in",
  "of",
]);

export function markupClasses(source: string, resolveType?: ClassTypeResolver): MarkupClasses {
  const markup = blankSections(source);
  const script = scriptText(source);
  const used = new Set<string>();
  for (const match of markup.matchAll(STATIC_CLASS)) addTokens(match[1] ?? match[2] ?? "", used);
  addWords(script, used);
  for (const expression of braceExpressions(markup)) addWords(expression, used);

  const names = localNames(script, markup);
  const readings = findClassExpressions(markup).map((expression) =>
    readExpression(expression, script, names, resolveType),
  );
  for (const reading of readings) for (const value of reading.values) used.add(value);
  return {
    used,
    unsafeDynamic: readings.some((reading) => reading.unsafe),
    wide: readings.flatMap((reading) => reading.wide),
  };
}

function readExpression(
  expression: ClassExpression,
  script: string,
  names: Set<string>,
  resolveType: ClassTypeResolver | undefined,
): ExpressionReading {
  if (usesConcat(expression.code, script)) return unsafeReading();
  const undeclared = undeclaredNames(expression.code, names);
  if (undeclared.length === 0) return { unsafe: false, values: [], wide: [] };
  if (!resolveType) return unsafeReading();
  const reading: ExpressionReading = { unsafe: false, values: [], wide: [] };
  for (const name of undeclared) {
    const type = resolveType(name, expression.offset);
    if (type === undefined) return unsafeReading();
    if (Array.isArray(type)) reading.values.push(...type);
    else addWide(reading, { name, offset: expression.offset, type: type.wide });
  }
  return reading;
}

function unsafeReading(): ExpressionReading {
  return { unsafe: true, values: [], wide: [] };
}

function addWide(reading: ExpressionReading, wide: WideClass): void {
  reading.unsafe = true;
  reading.wide.push(wide);
}

function undeclaredNames(code: string, names: Set<string>): string[] {
  return [...new Set(referencedNames(code).filter((name) => !names.has(name)))];
}

// Names declared in the script or made by a loop in the markup. Anything else comes from an import or a prop.
function localNames(script: string, markup: string): Set<string> {
  const names = new Set<string>();
  for (const match of script.matchAll(DECLARATION)) names.add(match[1]!);
  for (const match of script.matchAll(DESTRUCTURING)) {
    for (const name of destructuredNames(match[1]!)) names.add(name);
  }
  for (const match of markup.matchAll(LOOP_ITEM)) names.add(match[1] ?? match[2] ?? match[3]!);
  return names;
}

function destructuredNames(pattern: string): string[] {
  return pattern
    .split(",")
    .map((part) => part.split(":").pop()!.split("=")[0]!.replace("...", "").trim())
    .filter(Boolean);
}

function referencedNames(expression: string): string[] {
  const code = expression
    .replace(QUOTED_STRING, " ")
    .replace(BLOCK_COMMENT, " ")
    .replace(LINE_COMMENT, " ")
    .replace(/`/g, " ");
  return [...code.matchAll(REFERENCED_NAME)]
    .map((match) => match[0])
    .filter((name) => !KEYWORDS.has(name));
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

function findClassExpressions(markup: string): ClassExpression[] {
  const bound = [...markup.matchAll(CLASS_EXPRESSION)].map((match) => {
    const open = match.index + match[0].length - 1;
    return { code: expressionAt(markup, open), offset: open + 1 };
  });
  const interpolated = [...markup.matchAll(STATIC_CLASS)].flatMap((match) => {
    const value = match[1] ?? match[2] ?? "";
    const valueStart = match.index + match[0].length - 1 - value.length;
    return braceSpans(value).map((span) => ({ code: span.code, offset: valueStart + span.offset }));
  });
  return [...bound, ...interpolated];
}

function braceExpressions(text: string): string[] {
  return braceSpans(text).map((span) => span.code);
}

function braceSpans(text: string): ClassExpression[] {
  const spans: ClassExpression[] = [];
  let open = text.indexOf("{");
  while (open !== -1) {
    const end = expressionEnd(text, open);
    spans.push({ code: text.slice(open + 1, end), offset: open + 1 });
    open = text.indexOf("{", end + 1);
  }
  return spans;
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
