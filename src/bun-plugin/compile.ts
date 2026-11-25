import {
  compile,
  LusiaError,
  type CompileOptions,
  type CompileResult,
  type LazyOptions,
} from "#compiler/index.ts";
import type { Screens } from "#runtime/screen/screens.ts";
import { formatError } from "#cli/format/format-error.ts";
import { colorEnabled } from "#cli/log/color.ts";

/** Compiles one .lusia file. A compile error is thrown with its position and hint in the message. */
export function compileFile(
  source: string,
  path: string,
  dev: boolean,
  lazy?: LazyOptions,
  screens?: Screens,
): CompileResult {
  return compileWith(source, path, { dev, lazy, screens });
}

/** The fallback module gets its own id, so in dev it never replaces the component's definition. */
export function compileFallbackFile(source: string, path: string, dev: boolean): CompileResult {
  return compileWith(source, path, { dev, idKey: `${path}?fallback` });
}

function compileWith(source: string, path: string, options: CompileOptions): CompileResult {
  try {
    return compile(source, path, options);
  } catch (error) {
    if (error instanceof LusiaError) throw new Error(formatError(error, source, colorEnabled()));
    throw error;
  }
}
