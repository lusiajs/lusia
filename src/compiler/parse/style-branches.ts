import { lusiaError } from "../errors/create.ts";
import { skipExpression } from "../utils/braces.ts";
import { columnAt, lineAt } from "../utils/position.ts";

/** The IF branch a `<style>` sits in: the earlier branch conditions, and its own (none for ELSE). */
export interface StyleBranch {
  earlier: string[];
  test: string | undefined;
}

interface Frame {
  kind: "if" | "loop";
  tests: string[];
  current: string | undefined;
}

export interface Range {
  start: number;
  end: number;
}

const IF_OPEN = /<IF\s*\{/y;
const ELSEIF_OPEN = /<ELSEIF\s*\{/y;
const ELSE_OPEN = /<ELSE\s*>/y;
const IF_CLOSE = /<\/IF\s*>/y;
const LOOP_OPEN = /<(EACH|FOR)(?=[\s/>])/y;
const LOOP_CLOSE = /<\/(EACH|FOR)\s*>/y;

function matchAt(pattern: RegExp, source: string, pos: number): RegExpExecArray | null {
  pattern.lastIndex = pos;
  return pattern.exec(source);
}

/** Reads `{expr}` that starts at `open`. Returns the trimmed code and the index after `}`. */
function readTest(source: string, open: number): { test: string; next: number } {
  const end = skipExpression(source, open);
  if (end === -1) return { test: "", next: source.length };
  return { test: source.slice(open + 1, end - 1).trim(), next: end };
}

/** One step of the flow-tag walk. Returns the next position. */
function step(source: string, pos: number, stack: Frame[]): number {
  const ifOpen = matchAt(IF_OPEN, source, pos);
  if (ifOpen) {
    const { test, next } = readTest(source, pos + ifOpen[0].length - 1);
    stack.push({ kind: "if", tests: [], current: test });
    return next;
  }
  const elseifOpen = matchAt(ELSEIF_OPEN, source, pos);
  const top = stack.at(-1);
  if (elseifOpen && top?.kind === "if") {
    const { test, next } = readTest(source, pos + elseifOpen[0].length - 1);
    top.tests.push(top.current!);
    top.current = test;
    return next;
  }
  const elseOpen = matchAt(ELSE_OPEN, source, pos);
  if (elseOpen && top?.kind === "if") {
    top.tests.push(top.current!);
    top.current = undefined;
    return pos + elseOpen[0].length;
  }
  const close = matchAt(IF_CLOSE, source, pos) ?? matchAt(LOOP_CLOSE, source, pos);
  if (close) {
    stack.pop();
    return pos + close[0].length;
  }
  const loop = matchAt(LOOP_OPEN, source, pos);
  if (loop) stack.push({ kind: "loop", tests: [], current: undefined });
  return pos + 1;
}

/**
 * The IF branches around each style, outermost first. `skip` holds the script and style
 * ranges, which are not markup. A style inside EACH or FOR is an error.
 */
export function styleBranches(
  source: string,
  styleStarts: number[],
  skip: Range[],
  file: string,
): StyleBranch[][] {
  const result: StyleBranch[][] = [];
  const stack: Frame[] = [];
  let pos = 0;
  for (const start of styleStarts) {
    pos = walk(source, pos, start, skip, stack);
    if (stack.some((frame) => frame.kind === "loop")) {
      throw lusiaError(
        "L1047",
        {},
        { file, line: lineAt(source, start), column: columnAt(source, start) },
      );
    }
    result.push(stack.map((frame) => ({ earlier: [...frame.tests], test: frame.current })));
  }
  return result;
}

function walk(source: string, from: number, to: number, skip: Range[], stack: Frame[]): number {
  let pos = from;
  while (pos < to) {
    const skipped = skip.find((range) => range.start === pos);
    if (skipped) pos = skipped.end;
    else if (source[pos] === "{") pos = expressionEnd(source, pos, to);
    else if (source.startsWith("<!--", pos)) pos = commentEnd(source, pos);
    else if (source[pos] === "<") pos = step(source, pos, stack);
    else pos++;
  }
  return pos;
}

function commentEnd(source: string, pos: number): number {
  const end = source.indexOf("-->", pos);
  return end === -1 ? source.length : end + 3;
}

function expressionEnd(source: string, pos: number, to: number): number {
  const end = skipExpression(source, pos);
  return end === -1 ? to : end;
}
