import { groupEnd, skipNonCode } from "#compiler/hot/group.ts";
import { scriptSource } from "./sections.ts";

export interface PropDef {
  name: string;
  type?: string;
  defaultValue?: string;
  optional?: boolean;
  choices?: string[];
}

export type PropsBinding =
  | { kind: "object"; name: string }
  | { kind: "destructure"; names: string[] };

export interface PropsCall {
  start: number;
  end: number;
  classStart: number;
  classEnd: number;
  names: string[];
  binding: PropsBinding;
}

const PROPS_HEAD = /(?:const|let)\s+(\{[^}]*\}|[A-Za-z_$][\w$]*)\s*=\s*props\s*\(\s*class\s*\{/y;
const CLOSE_PAREN = /\s*\)/y;
const IDENTIFIER = /[\w$]/;
const MEMBER_NAME = /^(?:([A-Za-z_$][\w$]*)|"([^"]*)"|'([^']*)')(\?)?/;
const NON_FIELD = /^(?:static|get|set|async)\s+[\w$"']/;
const STRING_LITERAL = /^(?:"([^"]*)"|'([^']*)')$/;
const OPENERS = new Set(["(", "[", "{"]);
const CLOSERS = new Set([")", "]", "}"]);

export function findPropsCall(script: string): PropsCall | undefined {
  let depth = 0;
  for (let pos = 0; pos < script.length; ) {
    const next = skipNonCode(script, pos);
    if (next !== pos) {
      pos = next;
      continue;
    }
    const head = depth === 0 ? matchPropsHead(script, pos) : null;
    if (head) return propsCallAt(script, head);
    const ch = script.charAt(pos);
    if (OPENERS.has(ch)) depth++;
    else if (CLOSERS.has(ch)) depth--;
    pos++;
  }
  return undefined;
}

export function parsePropDefs(source: string): PropDef[] {
  const script = scriptSource(source);
  const call = findPropsCall(script);
  return call ? parseMembers(classBody(script, call)) : [];
}

function matchPropsHead(script: string, pos: number): RegExpExecArray | null {
  if (pos > 0 && IDENTIFIER.test(script.charAt(pos - 1))) return null;
  PROPS_HEAD.lastIndex = pos;
  return PROPS_HEAD.exec(script);
}

function propsCallAt(script: string, head: RegExpExecArray): PropsCall | undefined {
  const start = head.index;
  const brace = start + head[0].length - 1;
  const classEnd = groupEnd(script, brace);
  if (classEnd === -1) return undefined;
  CLOSE_PAREN.lastIndex = classEnd;
  if (!CLOSE_PAREN.test(script)) return undefined;
  return {
    start,
    end: CLOSE_PAREN.lastIndex,
    classStart: start + head[0].lastIndexOf("class"),
    classEnd,
    names: parseMembers(script.slice(brace + 1, classEnd - 1)).map((prop) => prop.name),
    binding: bindingOf(head[1]!),
  };
}

function bindingOf(target: string): PropsBinding {
  if (!target.startsWith("{")) return { kind: "object", name: target };
  const names = target
    .slice(1, -1)
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
  return { kind: "destructure", names };
}

function classBody(script: string, call: PropsCall): string {
  const text = script.slice(call.classStart, call.classEnd);
  return text.slice(text.indexOf("{") + 1, -1);
}

function parseMembers(body: string): PropDef[] {
  return splitMembers(body)
    .map(parseMember)
    .filter((prop) => prop !== undefined);
}

function splitMembers(body: string): string[] {
  const members: string[] = [];
  let depth = 0;
  let angles = 0;
  let inType = true;
  let memberStart = 0;
  for (let pos = 0; pos < body.length; ) {
    const next = skipNonCode(body, pos);
    if (next !== pos) {
      pos = next;
      continue;
    }
    const ch = body.charAt(pos);
    if (OPENERS.has(ch)) depth++;
    else if (CLOSERS.has(ch)) depth--;
    else if (depth === 0 && (ch === ";" || ch === "\n")) {
      members.push(body.slice(memberStart, pos));
      memberStart = pos + 1;
      angles = 0;
      inType = true;
    } else if (depth === 0 && inType && ch === "<") angles++;
    else if (depth === 0 && inType && ch === ">" && body.charAt(pos - 1) !== "=" && angles > 0) angles--;
    else if (depth === 0 && inType && isAssign(body, pos)) inType = false;
    pos++;
  }
  members.push(body.slice(memberStart));
  return members;
}

function isAssign(text: string, pos: number): boolean {
  if (text.charAt(pos) !== "=") return false;
  if (text.charAt(pos + 1) === "=" || text.charAt(pos + 1) === ">") return false;
  const before = text.charAt(pos - 1);
  return before === "" || !"=!<>".includes(before);
}

function parseMember(raw: string): PropDef | undefined {
  const text = stripComments(raw).trim();
  if (!text || NON_FIELD.test(text)) return undefined;
  const head = MEMBER_NAME.exec(text);
  if (!head) return undefined;
  const rest = text.slice(head[0].length).trimStart();
  if (rest.startsWith("(")) return undefined;
  if (rest !== "" && !rest.startsWith(":") && !rest.startsWith("=")) return undefined;
  return buildProp(head, rest);
}

function buildProp(head: RegExpExecArray, rest: string): PropDef {
  const name = head[1] ?? head[2] ?? head[3]!;
  const equals = assignIndex(rest);
  const typeText = rest.startsWith(":") ? rest.slice(1, equals === -1 ? undefined : equals).trim() : "";
  const valueText = equals === -1 ? "" : rest.slice(equals + 1).trim();
  const prop: PropDef = { name };
  if (head[4]) prop.optional = true;
  if (typeText) prop.type = typeText;
  if (valueText) prop.defaultValue = valueText;
  const choices = literalChoices(typeText);
  if (choices) prop.choices = choices;
  return prop;
}

function assignIndex(text: string): number {
  for (let pos = 0; pos < text.length; ) {
    const next = skipNonCode(text, pos);
    if (next !== pos) {
      pos = next;
      continue;
    }
    if (isAssign(text, pos)) return pos;
    pos++;
  }
  return -1;
}

function literalChoices(type: string): string[] | undefined {
  if (!type) return undefined;
  const parts = type.split("|").map((part) => STRING_LITERAL.exec(part.trim()));
  if (parts.length < 2 || parts.some((match) => !match)) return undefined;
  return parts.map((match) => match![1] ?? match![2]!);
}

function stripComments(text: string): string {
  let out = "";
  for (let pos = 0; pos < text.length; ) {
    const next = skipNonCode(text, pos);
    if (next === pos) {
      out += text.charAt(pos);
      pos++;
    } else {
      out += isComment(text, pos) ? " " : text.slice(pos, next);
      pos = next;
    }
  }
  return out;
}

function isComment(text: string, pos: number): boolean {
  return text.startsWith("//", pos) || text.startsWith("/*", pos);
}
