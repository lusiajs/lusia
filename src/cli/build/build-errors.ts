import { LusiaError } from "#compiler/errors/error.ts";
import { CODES, type ErrorCodeName } from "#compiler/errors/codes.ts";
import { fill, type Values } from "#compiler/errors/create.ts";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { stripAnsi } from "../log/color.ts";
import { exportsOf, missingExportHint } from "./export-hint.ts";
import { formatError } from "../format/format-error.ts";

export type BuildLog = BuildMessage | ResolveMessage;

interface Where {
  file?: string;
  line?: number;
  column?: number;
  length?: number;
}

const MISSING_EXPORT = /^No matching export in "(.+)" for import "(.+)"$/;
const UNRESOLVED = /^Could not resolve: "(.+)"$/;
const IMPORT_FROM = /\bfrom\s+["']([^"']+)["']/;
const LUSIA_ERROR = /\berror L\d{4}: /;

export function formatBuildFailure(logs: BuildLog[], color: boolean): string {
  const blocks = logs.map((log) => formatLog(log, color));
  return [...blocks, summary(logs.length)].join("\n\n");
}

function summary(count: number): string {
  return `Build failed: ${count} ${count === 1 ? "error" : "errors"}`;
}

function formatLog(log: BuildLog, color: boolean): string {
  // A .lusia compile error is already formatted by the plugin, so it is printed as it is.
  if (LUSIA_ERROR.test(stripAnsi(log.message))) return log.message;
  const error = toLusiaError(log);
  return formatError(error, error.file === undefined ? undefined : readSource(error.file), color);
}

function toLusiaError(log: BuildLog): LusiaError {
  const missing = MISSING_EXPORT.exec(log.message);
  if (missing) return missingExportError(log, missing[1]!, missing[2]!);
  const unresolved = UNRESOLVED.exec(log.message);
  if (unresolved)
    return bundleError("L3002", { name: unresolved[1]! }, whereOf(log), CODES.L3002.hint);
  return bundleError("L3003", { message: log.message }, whereOf(log), CODES.L3003.hint);
}

function missingExportError(log: BuildLog, modulePath: string, name: string): LusiaError {
  const where = whereOf(log);
  const specifier = importSpecifier(log) ?? modulePath;
  const exportNames = where.file === undefined ? [] : exportsOf(specifier, dirname(where.file));
  return bundleError(
    "L3001",
    { name, module: specifier },
    where,
    missingExportHint(name, exportNames),
  );
}

function importSpecifier(log: BuildLog): string | undefined {
  return IMPORT_FROM.exec(log.position?.lineText ?? "")?.[1];
}

function bundleError(code: ErrorCodeName, values: Values, where: Where, hint: string): LusiaError {
  return new LusiaError(fill(CODES[code].message, values), where.file, where.line, where.column, {
    code,
    hint,
    length: where.length,
  });
}

function whereOf(log: BuildLog): Where {
  const position = log.position;
  if (!position) return {};
  if (!position.file.endsWith(".lusia")) {
    return {
      file: position.file,
      line: position.line,
      column: position.column,
      length: position.length,
    };
  }
  return lusiaWhere(position.file, position.lineText, position.column, position.length);
}

// Bun reports compiled positions; import lines are copied as-is, so their text finds the source line.
function lusiaWhere(file: string, lineText: string, column: number, length: number): Where {
  const lines = readSource(file)?.split("\n");
  const text = lineText.trim();
  const row = lines?.findIndex((line) => line.trim() === text) ?? -1;
  if (lines === undefined || row === -1) return { file, length };
  const sourceIndent = leadingSpaces(lines[row]!);
  const compiledIndent = leadingSpaces(lineText);
  return { file, line: row + 1, column: column - compiledIndent + sourceIndent, length };
}

function leadingSpaces(text: string): number {
  return text.length - text.trimStart().length;
}

function readSource(file: string): string | undefined {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
}
