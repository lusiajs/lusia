import { expressionEnd } from "#language/format/format-expressions.ts";
import { tagEnd } from "#language/format/flow-placeholders.ts";
import { tagAttributes, type AttributeName } from "#language/lint/attributes.ts";
import { scriptImports } from "#language/parse/imports.ts";
import { blankSections } from "#language/parse/sections.ts";

export const TOKEN_TYPES = [
  "lusiaBranch",
  "lusiaLoop",
  "lusiaSlot",
  "lusiaHint",
  "decorator",
  "event",
  "parameter",
  "class",
  "enumMember",
] as const;

export const TOKEN_MODIFIERS = ["readonly"] as const;

export type TokenType = (typeof TOKEN_TYPES)[number];
export type TokenModifier = (typeof TOKEN_MODIFIERS)[number];

export interface SemanticToken {
  /** 0-based. */
  line: number;
  /** 0-based. */
  character: number;
  length: number;
  type: TokenType;
  modifiers: TokenModifier[];
}

interface RawToken {
  start: number;
  length: number;
  type: TokenType;
  modifiers: TokenModifier[];
}

const FLOW_TAGS: ReadonlyMap<string, TokenType> = new Map([
  ["IF", "lusiaBranch"],
  ["ELSEIF", "lusiaBranch"],
  ["ELSE", "lusiaBranch"],
  ["EACH", "lusiaLoop"],
  ["FOR", "lusiaLoop"],
  ["CONTENT", "lusiaSlot"],
  ["HTML", "lusiaSlot"],
  ["FALLBACK", "lusiaSlot"],
  ["NO_LAZY", "lusiaHint"],
  ["NO_SSR", "lusiaHint"],
]);
const BLOCK_ATTRIBUTES: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["EACH", new Set(["as", "index", "key"])],
  ["FOR", new Set(["from", "to", "step"])],
]);
const ENUM_NAMES = ["EVENT", "ON", "SCREEN", "EASE", "EDGE", "PRESET"];
const ENUM_ACCESS = new RegExp(`\\b(${ENUM_NAMES.join("|")})((?:\\.[A-Za-z_$][\\w$]*)+)`, "g");
const TAG = /<(\/?)([A-Za-z][\w.-]*)/g;
const EVENT_ATTRIBUTE = /^(on:?)([a-z][\w.-]*)$/;

/** Colors Lusia markup. Script and style content is left to the editor. */
export function semanticTokens(source: string): SemanticToken[] {
  const markup = blankSections(source);
  const components = new Set(scriptImports(source).map((item) => item.name));
  const raw = [...tagTokens(markup, components), ...expressionTokens(markup)];
  raw.sort((a, b) => a.start - b.start);
  return toPositions(source, raw);
}

function tagTokens(markup: string, components: ReadonlySet<string>): RawToken[] {
  const tokens: RawToken[] = [];
  for (const tag of markup.matchAll(TAG)) {
    const closing = tag[1] === "/";
    const name = tag[2] ?? "";
    const nameStart = (tag.index ?? 0) + (closing ? 2 : 1);
    const flow = FLOW_TAGS.get(name);
    if (flow) tokens.push(...flowBracketTokens(markup, tag.index ?? 0, nameStart, flow));
    const nameToken = tagNameToken(name, nameStart, components);
    if (nameToken) tokens.push(nameToken);
    if (!closing) tokens.push(...tagAttributeTokens(markup, nameStart + name.length, name));
  }
  return tokens;
}

function tagNameToken(
  name: string,
  start: number,
  components: ReadonlySet<string>,
): RawToken | undefined {
  const flow = FLOW_TAGS.get(name);
  if (flow) return token(start, name.length, flow);
  if (components.has(name)) return token(start, name.length, "class");
  return undefined;
}

/** `<` or `</` before a flow tag name, and its `>` or `/>`, take the tag's color. */
function flowBracketTokens(markup: string, open: number, nameStart: number, type: TokenType): RawToken[] {
  const tokens = [token(open, nameStart - open, type)];
  const end = tagEnd(markup, open);
  if (end === -1) return tokens;
  const selfClose = markup.charAt(end - 1) === "/";
  const closeStart = selfClose ? end - 1 : end;
  tokens.push(token(closeStart, end + 1 - closeStart, type));
  return tokens;
}

function tagAttributeTokens(markup: string, nameEnd: number, tagName: string): RawToken[] {
  return tagAttributes(markup, nameEnd).flatMap((attribute) => attributeTokens(attribute, tagName));
}

function attributeTokens(attribute: AttributeName, tagName: string): RawToken[] {
  const { name, offset } = attribute;
  if (name === "animate" || name.startsWith("bind-"))
    return [token(offset, name.length, "decorator")];
  const event = eventTokens(attribute);
  if (event.length > 0) return event;
  if (BLOCK_ATTRIBUTES.get(tagName)?.has(name)) return [token(offset, name.length, "parameter")];
  return [];
}

/** `on:click` and `onclick`: the prefix is a decorator, the event name is an event. */
function eventTokens({ name, offset }: AttributeName): RawToken[] {
  const match = EVENT_ATTRIBUTE.exec(name);
  if (!match) return [];
  const prefix = match[1] ?? "";
  const eventName = match[2] ?? "";
  return [
    token(offset, prefix.length, "decorator"),
    token(offset + prefix.length, eventName.length, "event"),
  ];
}

function expressionTokens(markup: string): RawToken[] {
  const tokens: RawToken[] = [];
  let open = markup.indexOf("{");
  while (open !== -1) {
    const close = expressionEnd(markup, open);
    const end = close === -1 ? markup.length : close + 1;
    tokens.push(...enumMemberTokens(markup, open, end));
    open = markup.indexOf("{", end);
  }
  return tokens;
}

function enumMemberTokens(markup: string, from: number, to: number): RawToken[] {
  const tokens: RawToken[] = [];
  for (const match of markup.slice(from, to).matchAll(ENUM_ACCESS)) {
    let start = from + (match.index ?? 0) + (match[1]?.length ?? 0);
    for (const member of (match[2] ?? "").split(".").slice(1)) {
      start += 1;
      tokens.push(token(start, member.length, "enumMember", ["readonly"]));
      start += member.length;
    }
  }
  return tokens;
}

function token(
  start: number,
  length: number,
  type: TokenType,
  modifiers: TokenModifier[] = [],
): RawToken {
  return { start, length, type, modifiers };
}

function toPositions(source: string, tokens: RawToken[]): SemanticToken[] {
  const starts = lineStarts(source);
  return tokens.map((item) => {
    const line = lineIndexAt(starts, item.start);
    return {
      line,
      character: item.start - (starts[line] ?? 0),
      length: item.length,
      type: item.type,
      modifiers: item.modifiers,
    };
  });
}

function lineStarts(source: string): number[] {
  const starts = [0];
  for (const match of source.matchAll(/\n/g)) starts.push(match.index + 1);
  return starts;
}

function lineIndexAt(starts: readonly number[], offset: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if ((starts[middle] ?? 0) <= offset) low = middle;
    else high = middle - 1;
  }
  return low;
}
