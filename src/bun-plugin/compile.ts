import { compile, LusiaError, type CompileResult, type LazyOptions } from "#compiler/index.ts";
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
  try {
    return compile(source, path, { dev, lazy, screens });
  } catch (error) {
    if (error instanceof LusiaError) throw new Error(formatError(error, source, colorEnabled()));
    throw error;
  }
}
