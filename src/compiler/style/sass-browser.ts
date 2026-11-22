import * as sass from "sass";
import { lusiaError } from "../errors/create.ts";
import type { Section } from "../parse/sections.ts";
import { DEFAULT_SCREENS, type Screens } from "#runtime/screen/screens.ts";
import { SCREEN_USE, screenImporter, styleColumn } from "./screen-mixin.ts";

// Sass for the browser. Files come only from the importers, because there is no file system.
// The screen() mixin module is always served, since every style starts with its @use.
export function compileScssText(
  content: string,
  file: string,
  importers: sass.Importer[],
  line = 1,
  screens: Screens = DEFAULT_SCREENS,
): string {
  const allImporters = [screenImporter(screens), ...importers];
  try {
    return sass.compileString(SCREEN_USE + content, {
      importers: allImporters,
      style: "expanded",
    }).css;
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
  screens?: Screens,
): string {
  return compileScssText(style.content, file, importers, style.line, screens);
}
