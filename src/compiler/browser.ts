import type * as sass from "sass";
import { transform } from "sucrase";
import { LusiaError } from "./errors/error.ts";
import { compileParts } from "./pipeline.ts";
import { parse, type Section } from "./parse/sections.ts";
import { scopeCss, styleMode } from "./style/modes.ts";
import { DEFAULT_SCREENS, type Screens } from "#runtime/screen/screens.ts";
import { compileSectionScss } from "./style/sass-browser.ts";
import type { StyleResult } from "./style/sass.ts";

export { LusiaError } from "./errors/error.ts";

export interface BrowserOptions {
  /** Sass importers. They are the only way `@use` and `@import` find files in the browser. */
  importers?: sass.Importer[];
  /** Screen sizes for the screen() mixin and SCREEN styles. Default: PHONE, TABLET, DESKTOP. */
  screens?: Screens;
}

export interface BrowserCompile {
  code: string;
}

export function compileForBrowser(
  source: string,
  file: string,
  options: BrowserOptions = {},
): BrowserCompile {
  checkScriptSyntax(source, file);
  const screens = options.screens ?? DEFAULT_SCREENS;
  const importers = options.importers ?? [];
  const { code } = compileParts(source, file, {
    dev: true,
    displayFile: file,
    styles: (style, _index, id) => browserStyle(style, file, id, importers, screens),
    screens,
  });
  return { code: stripTypes(code, file) };
}

/** Throws a SyntaxError with `loc` on bad syntax. */
export function stripTypes(code: string, file: string): string {
  return transform(code, { transforms: ["typescript"], filePath: file }).code;
}

// The generated code moves lines around, so the script is checked on its own, with the source's line numbers.
function checkScriptSyntax(source: string, file: string): void {
  const script = parse(source, file).script;
  if (!script) return;
  try {
    stripTypes(script.content, file);
  } catch (error) {
    const loc = (error as { loc?: { line: number; column: number } }).loc;
    if (!(error instanceof SyntaxError) || !loc) throw error;
    const line = script.line + loc.line - 1;
    throw new LusiaError(cleanSyntaxMessage(error.message), file, line, loc.column, {
      hint: "Fix the TypeScript in the script.",
    });
  }
}

export function cleanSyntaxMessage(message: string): string {
  return message.replace(/^Error transforming [^:]*: /, "").replace(/ \(\d+:\d+\)$/, "");
}

function browserStyle(
  style: Section,
  file: string,
  id: string,
  importers: sass.Importer[],
  screens: Screens,
): StyleResult {
  const css =
    style.attrs.lang === "css"
      ? style.content
      : compileSectionScss(style, file, importers, screens);
  return { css: scopeCss(css, id, styleMode(style)).trim(), deps: [], sassMs: 0, cached: false };
}
