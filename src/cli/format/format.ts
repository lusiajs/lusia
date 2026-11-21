import { relative } from "node:path";
import { formatLusia } from "#language/format/format.ts";
import { ANSI, colorEnabled, paint } from "../log/color.ts";
import { collectFiles } from "../files.ts";
import { openFormatCache, type FormatCache } from "./format-cache.ts";
import { partsFor, prettierConfigFor } from "./format-parts.ts";

export interface FormatOptions {
  paths: string[];
  check: boolean;
  quiet: boolean;
  cache?: boolean;
  indentScriptAndStyle?: boolean;
}

export async function runFormat(options: FormatOptions): Promise<number> {
  const files = await collectFiles(options.paths);
  const color = colorEnabled();
  const changed: string[] = [];
  const errors: string[] = [];
  const cache = options.cache === false ? undefined : openFormatCache(process.cwd());
  for (const file of files) {
    try {
      await formatOne(file, options, cache, changed);
    } catch (error) {
      errors.push(`${display(file)}: ${messageOf(error)}`);
    }
  }
  cache?.save();
  report(options, files.length, changed, errors, color);
  return errors.length > 0 || (options.check && changed.length > 0) ? 1 : 0;
}

async function formatOne(
  file: string,
  options: FormatOptions,
  cache: FormatCache | undefined,
  changed: string[],
): Promise<void> {
  const source = await Bun.file(file).text();
  const indent = options.indentScriptAndStyle ?? true;
  const prettierConfig = await prettierConfigFor(file);
  // The indent setting is part of the cache key, so turning it off reformats every file.
  const config = { ...prettierConfig, lusiaIndentScriptAndStyle: indent };
  const decision = cache?.decide(file, source, config) ?? "unknown";
  if (decision === "clean") return;
  if (decision === "changed" && options.check) {
    changed.push(display(file));
    return;
  }
  const formatted = await formatLusia(source, partsFor(prettierConfig, indent));
  cache?.record(file, source, formatted, config);
  if (formatted === source) return;
  if (!options.check) await Bun.write(file, formatted);
  changed.push(display(file));
}

function report(
  options: FormatOptions,
  count: number,
  changed: string[],
  errors: string[],
  color: boolean,
): void {
  for (const error of errors) {
    const label = paint("error", ANSI.red);
    process.stderr.write(`${color ? label : "error"} ${error}\n`);
  }
  if (options.check) {
    for (const path of changed)
      process.stdout.write(`${color ? paint(path, ANSI.yellow) : path}\n`);
    if (!options.quiet) process.stdout.write(`${summary(count, changed.length)}\n`);
    return;
  }
  if (!options.quiet) process.stdout.write(`${writtenSummary(count, changed.length)}\n`);
}

function summary(count: number, changed: number): string {
  if (changed === 0) {
    return count === 1 ? "The file is formatted." : `All ${count} files are formatted.`;
  }
  return `${changed} of ${count} ${plural(count)} would be reformatted.`;
}

function writtenSummary(count: number, changed: number): string {
  if (changed === 0) return `${count} ${plural(count)} already formatted.`;
  return `Formatted ${changed} of ${count} ${plural(count)}.`;
}

function plural(count: number): string {
  return count === 1 ? "file" : "files";
}

function display(file: string): string {
  return relative(process.cwd(), file) || file;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
