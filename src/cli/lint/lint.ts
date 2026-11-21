import { compile } from "#compiler/index.ts";
import { LusiaError } from "#compiler/errors/error.ts";
import { lintLusia, type LintIssue, type LintRuleSettings } from "#language/lint/lint.ts";
import { applyFixes } from "#language/lint/fixes.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import { childPropsLookup, childSourceLookup } from "../build/component-file.ts";
import { classTypeResolver } from "./class-types.ts";
import { loadClassTypes, type ClassTypes } from "./type-program.ts";
import { ANSI, colorEnabled, paint } from "../log/color.ts";
import { collectFiles } from "../files.ts";
import { formatError } from "../format/format-error.ts";

const FIX_ROUNDS = 5;

export interface LintOptions {
  paths: string[];
  fix: boolean;
  maxWarnings: number;
  quiet: boolean;
  rules?: LintRuleSettings;
}

export async function runLint(options: LintOptions): Promise<number> {
  const files = await collectFiles(options.paths);
  const classTypes = await loadClassTypes(
    files.map((file) => ({ path: file, text: readFileSync(file, "utf8") })),
  );
  const color = colorEnabled();
  let errors = 0;
  let warnings = 0;
  let fixed = 0;
  for (const file of files) {
    let source = readFileSync(file, "utf8");
    if (options.fix) {
      const next = fixedSource(file, source, options.rules, classTypes);
      if (next !== source) {
        writeFileSync(file, next);
        source = next;
        fixed++;
      }
    }
    const compileError = compileErrorOf(source, file);
    if (compileError) {
      errors++;
      process.stderr.write(`${formatError(compileError, source, color)}\n`);
    }
    for (const issue of issuesOf(file, source, options.rules, classTypes)) {
      process.stdout.write(`${formatIssue(file, issue, color)}\n`);
      if (issue.severity === "error") errors++;
      else warnings++;
    }
  }
  report(files.length, errors, warnings, fixed, options);
  return errors > 0 || warnings > options.maxWarnings ? 1 : 0;
}

function fixedSource(
  file: string,
  source: string,
  rules: LintRuleSettings | undefined,
  classTypes: ClassTypes | undefined,
): string {
  let current = source;
  for (let round = 0; round < FIX_ROUNDS; round++) {
    const next = applyFixes(current, issuesOf(file, current, rules, classTypes));
    if (next === current) break;
    current = next;
  }
  return current;
}

function issuesOf(
  file: string,
  source: string,
  rules: LintRuleSettings | undefined,
  classTypes: ClassTypes | undefined,
): LintIssue[] {
  const resolveClassType = classTypeResolver(classTypes, file, source);
  return lintLusia(
    source,
    childPropsLookup(file, source),
    { rules, file, resolveClassType },
    childSourceLookup(file, source),
  );
}

function compileErrorOf(source: string, file: string): LusiaError | undefined {
  try {
    compile(source, file);
    return undefined;
  } catch (error) {
    if (error instanceof LusiaError) return error;
    return new LusiaError(error instanceof Error ? error.message : String(error), file);
  }
}

function formatIssue(file: string, issue: LintIssue, color: boolean): string {
  const place = `${display(file)}:${issue.line}:${issue.column}`;
  const severity = issue.severity === "error" ? "error" : "warning";
  const detail = `${severity} ${issue.code}: ${issue.message}`;
  if (!color) return `${place} ${detail}`;
  const severityCode = issue.severity === "error" ? ANSI.red : ANSI.yellow;
  return `${paint(place, ANSI.cyan)} ${paint(severity, severityCode)} ${issue.code}: ${issue.message}`;
}

function report(
  count: number,
  errors: number,
  warnings: number,
  fixed: number,
  options: LintOptions,
): void {
  if (warnings > options.maxWarnings) {
    process.stderr.write(`Too many warnings: ${warnings}, the limit is ${options.maxWarnings}.\n`);
  }
  if (options.quiet) return;
  const files = `${count} ${count === 1 ? "file" : "files"}`;
  const fixes = fixed > 0 ? `, ${fixed} fixed` : "";
  if (errors === 0 && warnings === 0) {
    process.stdout.write(`${files} checked, no problems${fixes}.\n`);
    return;
  }
  const errorWord = errors === 1 ? "error" : "errors";
  const warningWord = warnings === 1 ? "warning" : "warnings";
  process.stdout.write(
    `${files} checked: ${errors} ${errorWord}, ${warnings} ${warningWord}${fixes}.\n`,
  );
}

function display(file: string): string {
  return relative(process.cwd(), file) || file;
}
