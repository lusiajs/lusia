import type { LusiaError } from "#compiler/errors/error.ts";
import { relative } from "node:path";
import { ANSI, paint } from "../log/color.ts";

const CONTEXT_LINES = 2;

export function formatError(error: LusiaError, source: string | undefined, color: boolean): string {
  const paintWith = (text: string, code: string): string => (color ? paint(text, code) : text);
  const parts = [headline(error, paintWith)];
  const frame = source === undefined ? undefined : codeFrame(error, source, paintWith);
  if (frame) parts.push("", frame);
  if (error.hint) parts.push("", `${paintWith("hint", ANSI.cyan)}: ${error.hint}`);
  return parts.join("\n");
}

type Painter = (text: string, code: string) => string;

function headline(error: LusiaError, paintWith: Painter): string {
  const code = error.code ? ` ${error.code}` : "";
  const message = `${paintWith("error", ANSI.red)}${paintWith(code, ANSI.red)}: ${messageText(error)}`;
  if (error.file === undefined || error.line === undefined) return message;
  const place = `${paintWith(displayPath(error.file), ANSI.cyan)}:${paintWith(`${error.line}:${error.column ?? 1}`, ANSI.yellow)}`;
  return `${place} - ${message}`;
}

/** Dev runtime errors end with their location, which the headline already shows. */
function messageText(error: LusiaError): string {
  if (error.file === undefined || error.line === undefined) return error.message;
  const suffix = ` (${error.file}:${error.line}:${error.column ?? 1})`;
  return error.message.endsWith(suffix) ? error.message.slice(0, -suffix.length) : error.message;
}

function displayPath(file: string): string {
  return file.startsWith("/") ? relative(process.cwd(), file) : file;
}

function codeFrame(error: LusiaError, source: string, paintWith: Painter): string | undefined {
  if (error.line === undefined) return undefined;
  const lines = source.split("\n");
  const errorRow = error.line - 1;
  const first = Math.max(0, errorRow - CONTEXT_LINES);
  const last = Math.min(lines.length - 1, errorRow + CONTEXT_LINES);
  const width = String(last + 1).length;
  const rows: string[] = [];
  for (let row = first; row <= last; row++) {
    const number = paintWith(String(row + 1).padStart(width), ANSI.dim);
    rows.push(`${number} | ${lines[row]}`);
    if (row === errorRow) rows.push(`${" ".repeat(width)} | ${paintWith(caret(error), ANSI.red)}`);
  }
  return rows.join("\n");
}

function caret(error: LusiaError): string {
  const offset = " ".repeat(Math.max(0, (error.column ?? 1) - 1));
  const tildes = "~".repeat(Math.max(0, (error.length ?? 1) - 1));
  return `${offset}^${tildes}`;
}
