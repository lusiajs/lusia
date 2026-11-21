import { lusiaError, type Values } from "#compiler/errors/create.ts";
import type { ErrorCodeName } from "#compiler/errors/codes.ts";
import { skipExpression } from "#compiler/utils/braces.ts";
import { lineIndexAt, lineStarts } from "#compiler/utils/position.ts";
import type { Expr } from "../types/expression.ts";

const WHITESPACE = /\s/;

/** Reads markup one character at a time and reports errors with file positions. */
export class Cursor {
  pos = 0;
  private readonly starts: number[];

  constructor(
    readonly src: string,
    private readonly file: string,
    private readonly startLine: number,
  ) {
    this.starts = lineStarts(src);
  }

  peek(offset = 0): string {
    return this.src[this.pos + offset] ?? "";
  }

  startsWith(text: string): boolean {
    return this.src.startsWith(text, this.pos);
  }

  /** Matches a sticky (`y`) pattern at the cursor, without moving it. */
  match(pattern: RegExp): RegExpExecArray | null {
    pattern.lastIndex = this.pos;
    return pattern.exec(this.src);
  }

  readUntil(end: RegExp): string {
    const start = this.pos;
    while (this.peek() && !end.test(this.peek())) this.pos++;
    return this.src.slice(start, this.pos);
  }

  skipWhitespace(): void {
    while (WHITESPACE.test(this.peek())) this.pos++;
  }

  /** Reads a `{...}` expression. Its code has no braces and no outer spaces. */
  readExpression(): Expr {
    const start = this.pos;
    const end = skipExpression(this.src, start);
    if (end === -1) this.fail("L1010", {}, start);
    this.pos = end;
    const raw = this.src.slice(start + 1, end - 1);
    const code = raw.trim();
    if (!code) this.fail("L1011", {}, start);
    const at = start + 1 + (raw.length - raw.trimStart().length);
    return { code, ...this.locate(at) };
  }

  /** The 1-based line and column of an index in the .lusia file. */
  locate(at: number): { line: number; column: number } {
    const row = lineIndexAt(this.starts, at);
    return { line: this.startLine + row, column: at - this.starts[row]! + 1 };
  }

  fail(code: ErrorCodeName, values: Values = {}, at = this.pos): never {
    throw lusiaError(code, values, { file: this.file, ...this.locate(at) });
  }
}
