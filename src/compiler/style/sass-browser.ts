import * as sass from "sass";
import { lusiaError } from "../errors/create.ts";
import type { Section } from "../parse/sections.ts";
import { SCREEN_USE, styleColumn } from "./screen-mixin.ts";

// Sass for the browser. Files come only from the importers, because there is no file system.
export function compileScssText(
  content: string,
  file: string,
  importers: sass.Importer[],
  line = 1,
): string {
  try {
    return sass.compileString(SCREEN_USE + content, { importers, style: "expanded" }).css;
  } catch (error) {
    const sassError = error as sass.Exception;
    const span = sassError.span;
    const where = {
      file,
      line: span ? line + span.start.line : line,
      column: span ? styleColumn(span) : 1,
    };
    throw lusiaError("L1005", { message: sassError.sassMessage ?? String(error) }, where);
  }
}

export function compileSectionScss(
  style: Section,
  file: string,
  importers: sass.Importer[],
): string {
  return compileScssText(style.content, file, importers, style.line);
}
