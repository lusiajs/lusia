import { findPropsCall, type PropsCall } from "#language/parse/props.ts";
import { lusiaError } from "../errors/create.ts";
import type { Span } from "../errors/create.ts";
import type { ImportStatement } from "../parse/imports.ts";
import { columnAt, lineAt } from "../utils/position.ts";
import { blankRange, maskNonCode } from "./mask.ts";
import { rewriteProps, type PropRule } from "./rewrite.ts";
import { findShadow } from "./shadow.ts";

export interface ScriptProps {
  body: string;
  names: ReadonlySet<string>;
  holder?: string;
}

const DESTRUCTURED_HOLDER = "__props";
const PROPS_IMPORT = /import\s*\{[^}]*\bprops\b[^}]*\}\s*from\s*["']lusiajs["']/;
const PROPS_CALL = /(?<![\w$.])props\s*\(/g;
const CLASS_ARGUMENT = /^\s*class\b/;

export function scriptProps(
  body: string,
  statements: ImportStatement[],
  file: string,
  bodyLine: number,
): ScriptProps {
  const none = { body, names: new Set<string>() };
  if (!statements.some((statement) => PROPS_IMPORT.test(statement.text))) return none;
  const masked = maskNonCode(body);
  checkCalls(masked, body, file, bodyLine);
  const call = findPropsCall(body);
  if (!call) return none;
  if (call.binding.kind === "object") {
    return { body: insertKeys(body, call), names: new Set(), holder: call.binding.name };
  }
  const names = new Set(call.binding.names);
  const shadow = findShadow(blankRange(masked, call.start, call.end), names);
  if (shadow) {
    throw lusiaError("L1056", { name: shadow.name }, spanAt(body, shadow.index, file, bodyLine));
  }
  const rule: PropRule = { names, target: DESTRUCTURED_HOLDER };
  return { body: rewriteDestructured(body, call, rule), names, holder: DESTRUCTURED_HOLDER };
}

function checkCalls(masked: string, body: string, file: string, bodyLine: number): void {
  const calls = [...masked.matchAll(PROPS_CALL)];
  if (calls.length > 1) throw bodyError("L1054", {}, body, calls[1]!.index, file, bodyLine);
  const first = calls[0];
  if (first && !CLASS_ARGUMENT.test(masked.slice(first.index + first[0].length))) {
    throw bodyError("L1055", {}, body, first.index, file, bodyLine);
  }
}

function insertKeys(body: string, call: PropsCall): string {
  return `${body.slice(0, call.end - 1)}, ${JSON.stringify(call.names)}${body.slice(call.end - 1)}`;
}

function rewriteDestructured(body: string, call: PropsCall, rule: PropRule): string {
  const { start, classStart, end } = call;
  const head = body.slice(start, classStart);
  const keyword = head.startsWith("let") ? "let" : "const";
  const newlines = "\n".repeat(head.split("\n").length - 1);
  const declaration = `${keyword} ${DESTRUCTURED_HOLDER} = props(${newlines}`;
  const classText = `${body.slice(classStart, end - 1)}, ${JSON.stringify(call.names)})`;
  return rewriteProps(body.slice(0, start), rule) + declaration + classText + rewriteProps(body.slice(end), rule);
}

function bodyError(
  code: "L1054" | "L1055",
  values: Record<string, string>,
  body: string,
  index: number,
  file: string,
  bodyLine: number,
) {
  return lusiaError(code, values, spanAt(body, index, file, bodyLine));
}

function spanAt(body: string, index: number, file: string, bodyLine: number): Span {
  return { file, line: bodyLine - 1 + lineAt(body, index), column: columnAt(body, index) };
}
