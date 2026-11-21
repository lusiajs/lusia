import { relative } from "node:path";
import { compileParts, type CompileOptions, type CompileResult } from "./pipeline.ts";
import { compileStyleResult } from "./style/sass.ts";

export { LusiaError } from "./errors/error.ts";
export { CODES, type ErrorCodeName } from "./errors/codes.ts";
export { hash } from "./id.ts";
export { parse } from "./parse/sections.ts";
export { splitImports, type LusiaImport } from "./parse/imports.ts";
export { depsCurrent, forgetStyles, type StyleDep } from "./style/sass.ts";
export { scopeCss } from "./style/modes.ts";
export { LAZY_MODES, LAZY_PREFETCH, type ChildInfo, type LazyOptions } from "./lazy/options.ts";
export { fallbackSource } from "./lazy/fallback-source.ts";
export { compileTemplate } from "./template/scan/scanner.ts";
export type { CompileOptions, CompileResult } from "./pipeline.ts";

export function compile(source: string, file: string, options: CompileOptions = {}): CompileResult {
  return compileParts(source, file, {
    dev: options.dev ?? false,
    displayFile: relative(process.cwd(), file),
    styles: (style, index, id) => compileStyleResult(style, file, id, index),
    lazy: options.lazy,
  });
}
