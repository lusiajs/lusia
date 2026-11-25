import type { Expr } from "../template/types/expression.ts";

// A marker comment records the .lusia position of the code after it. extractSourceMap removes them.
export function markAt(line: number, column: number): string {
  return `/*@${line}:${column}*/`;
}

export function markedCode(expr: Expr): string {
  return `${markAt(expr.line, expr.column)}${expr.code}`;
}

export function markedTarget(expr: Expr, holder?: string): string {
  const prop = holder === undefined ? undefined : propRead(holder).exec(expr.code)?.[1];
  if (prop === undefined) return markedCode(expr);
  return `${markAt(expr.line, expr.column)}__propTarget(${holder}, ${JSON.stringify(prop)})`;
}

function propRead(holder: string): RegExp {
  return new RegExp(`^\\s*${holder}\\.([A-Za-z_$][\\w$]*)\\s*$`);
}

/** Marks the start of every line of `text`, which begins on the .lusia line `firstLine`. */
export function markLines(text: string, firstLine: number): string {
  return text
    .split("\n")
    .map((line, row) => `${markAt(firstLine + row, 1)}${line}`)
    .join("\n");
}
