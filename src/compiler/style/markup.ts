import { findPropsCall, parsePropDefs, type PropDef, type PropsCall } from "#language/parse/props.ts";
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

interface ReadContext {
  script: string;
  names: Set<string>;
  props: PropDef[];
  propsCall: PropsCall | undefined;
  resolveType: ClassTypeResolver | undefined;
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
// A class value marked on purpose stays unknown: its classes are not read and no warning is given.
const ON_PURPOSE_COMMENT = /(?:\/\/|\/\*)\s*@on-purpose\b/;
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

  const propsCall = findPropsCall(script);
  const context: ReadContext = {
    script,
    names: localNames(script, markup, propsCall),
    props: parsePropDefs(source),
    propsCall,
    resolveType,
  };
  const readings = findClassExpressions(markup).map((expression) => readExpression(expression, context));
  for (const reading of readings) for (const value of reading.values) used.add(value);
  return {
    used,
    unsafeDynamic: readings.some((reading) => reading.unsafe),
    wide: readings.flatMap((reading) => reading.wide),
  };
}

function readExpression(expression: ClassExpression, context: ReadContext): ExpressionReading {
  if (usesConcat(expression.code, context.script) || ON_PURPOSE_COMMENT.test(expression.code)) {
    return unsafeReading();
  }
  const pattern = propReadPattern(context.propsCall);
  const reading = readProps(expression.code, context.props, pattern);
  const undeclared = undeclaredNames(stripPropReads(expression.code, pattern), context.names);
  if (undeclared.length === 0) return reading;
  if (!context.resolveType) return unsafeReading();
  return readUndeclared(reading, undeclared, expression, context.resolveType);
}

// A prop with a literal union gives its choices; any other prop value is unknown.
function readProps(code: string, props: PropDef[], pattern: RegExp | undefined): ExpressionReading {
  const reading = emptyReading();
  for (const name of propNamesRead(code, pattern)) {
    const choices = props.find((prop) => prop.name === name)?.choices;
    if (choices) reading.values.push(...choices);
    else reading.unsafe = true;
  }
  return reading;
}

// Matches `holder.name` for an object form, or a destructured name such as `tone`. Group 1 is the prop name.
function propReadPattern(call: PropsCall | undefined): RegExp | undefined {
  if (!call) return undefined;
  if (call.binding.kind === "object") {
    return new RegExp(`(?<![\\w$.])${escapeName(call.binding.name)}\\.([A-Za-z_$][\\w$]*)`, "g");
  }
  const names = propsBindingNames(call);
  if (names.length === 0) return undefined;
  return new RegExp(`(?<![\\w$.])(${names.map(escapeName).join("|")})(?![\\w$])`, "g");
}

function propNamesRead(code: string, pattern: RegExp | undefined): string[] {
  if (!pattern) return [];
  return [...code.matchAll(pattern)].map((match) => match[1]!);
}

function stripPropReads(code: string, pattern: RegExp | undefined): string {
  return pattern ? code.replace(pattern, " ") : code;
}

function propsBindingNames(call: PropsCall): string[] {
  if (call.binding.kind === "object") return [call.binding.name];
  return call.binding.names.map((entry) => entry.split(/[:=]/)[0]!.trim());
}

function escapeName(name: string): string {
  return name.replace(/\$/g, "\\$");
}

function readUndeclared(
  reading: ExpressionReading,
  names: string[],
  expression: ClassExpression,
  resolveType: ClassTypeResolver,
): ExpressionReading {
  for (const name of names) {
    const type = resolveType(name, expression.offset);
    if (type === undefined) return unsafeReading();
    if (Array.isArray(type)) reading.values.push(...type);
    else addWide(reading, { name, offset: expression.offset, type: type.wide });
  }
  return reading;
}

function emptyReading(): ExpressionReading {
  return { unsafe: false, values: [], wide: [] };
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
function localNames(script: string, markup: string, propsCall: PropsCall | undefined): Set<string> {
  const names = new Set<string>();
  for (const match of script.matchAll(DECLARATION)) names.add(match[1]!);
  for (const match of script.matchAll(DESTRUCTURING)) {
    for (const name of destructuredNames(match[1]!)) names.add(name);
  }
  for (const match of markup.matchAll(LOOP_ITEM)) names.add(match[1] ?? match[2] ?? match[3]!);
  if (propsCall) for (const name of propsBindingNames(propsCall)) names.delete(name);
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
