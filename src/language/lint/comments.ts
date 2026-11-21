const DISABLE_COMMENT = /(?:<!--|\/\*)\s*lusia-lint-disable(-next-line)?\b([^>*]*?)(?:-->|\*\/)/g;
const CODE = /[A-Za-z][\w-]*/g;

export interface LintDirective {
  /** The codes the comment names, or undefined for every rule. */
  codes: Set<string> | undefined;
  fromLine: number;
  /** Last line the directive covers. Undefined means the rest of the file. */
  toLine: number | undefined;
}

export function parseLintDirectives(source: string): LintDirective[] {
  return [...source.matchAll(DISABLE_COMMENT)].map((match) => toDirective(source, match));
}

function toDirective(source: string, match: RegExpMatchArray): LintDirective {
  const start = match.index ?? 0;
  const codes = codesOf(match[2] ?? "");
  if (!match[1]) return { codes, fromLine: lineAt(source, start), toLine: undefined };
  const line = lineAt(source, start + match[0].length) + 1;
  return { codes, fromLine: line, toLine: line };
}

function codesOf(text: string): Set<string> | undefined {
  const codes = text.match(CODE) ?? [];
  return codes.length === 0 ? undefined : new Set(codes);
}

function lineAt(source: string, offset: number): number {
  return source.slice(0, offset).split("\n").length;
}

export function isLintDisabled(directives: LintDirective[], line: number, code: string): boolean {
  return directives.some(
    (directive) =>
      line >= directive.fromLine &&
      (directive.toLine === undefined || line <= directive.toLine) &&
      (directive.codes === undefined || directive.codes.has(code)),
  );
}
