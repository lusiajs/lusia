import * as sass from "sass";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { lusiaError } from "../errors/create.ts";
import type { Section } from "../parse/sections.ts";
import { DEFAULT_SCREENS, type Screens } from "#runtime/screen/screens.ts";
import { scopeCss, styleMode } from "./modes.ts";
import { SCREEN_USE, screenImporter, styleColumn } from "./screen-mixin.ts";

/** A file a Sass style imported, with the text it had when the style was compiled. */
export interface StyleDep {
  path: string;
  text: string;
}

export interface StyleResult {
  css: string;
  deps: StyleDep[];
  /** Time spent in the Sass compiler. Zero on a cache hit. */
  sassMs: number;
}

interface SassOutput {
  css: string;
  deps: StyleDep[];
  sassMs: number;
}

interface SassEntry {
  content: string;
  deps: StyleDep[];
  css: string;
}

// File -> style index -> entry. A new edit overwrites its own slot, so the cache stays bounded.
const sassCache = new Map<string, SassEntry[]>();

export function compileStyle(style: Section, file: string, id: string, index = 0): string {
  return compileStyleResult(style, file, id, index).css;
}

export function compileStyleResult(
  style: Section,
  file: string,
  id: string,
  index = 0,
  screens: Screens = DEFAULT_SCREENS,
): StyleResult {
  const isPlainCss = style.attrs.lang === "css";
  const sassOutput = isPlainCss
    ? { css: style.content, deps: [], sassMs: 0 }
    : compileScss(style, file, index, screens);
  const css = scopeCss(sassOutput.css, id, styleMode(style)).trim();
  return { css, deps: sassOutput.deps, sassMs: sassOutput.sassMs };
}

export function depsCurrent(deps: StyleDep[]): boolean {
  return deps.every((dep) => {
    try {
      return readFileSync(dep.path, "utf8") === dep.text;
    } catch {
      return false;
    }
  });
}

/** Drops every cached style of a file, for example when the file was deleted. */
export function forgetStyles(file: string): void {
  sassCache.delete(file);
}

function compileScss(style: Section, file: string, index: number, screens: Screens): SassOutput {
  const input = sassInput(style.content, screens);
  const hit = cachedEntry(file, index, input);
  if (hit) return { css: hit.css, deps: hit.deps, sassMs: 0 };
  const start = performance.now();
  const result = runSass(style, file, screens);
  const sassMs = performance.now() - start;
  const deps = result.loadedUrls
    .filter((url) => url.protocol === "file:")
    .map((url) => {
      const path = fileURLToPath(url);
      return { path, text: readFileSync(path, "utf8") };
    });
  storeEntry(file, index, { content: input, deps, css: result.css });
  return { css: result.css, deps, sassMs };
}

// The screen sizes are part of the input, because the screen() mixin is built from them.
function sassInput(content: string, screens: Screens): string {
  return JSON.stringify([screens, content]);
}

function cachedEntry(file: string, index: number, input: string): SassEntry | undefined {
  const entry = sassCache.get(file)?.[index];
  if (entry && entry.content === input && depsCurrent(entry.deps)) return entry;
  return undefined;
}

function storeEntry(file: string, index: number, entry: SassEntry): void {
  let entries = sassCache.get(file);
  if (!entries) {
    entries = [];
    sassCache.set(file, entries);
  }
  entries[index] = entry;
}

function runSass(style: Section, file: string, screens: Screens): sass.CompileResult {
  try {
    return sass.compileString(SCREEN_USE + style.content, {
      loadPaths: [dirname(file)],
      importers: [screenImporter(screens)],
      style: "expanded",
    });
  } catch (error) {
    const sassError = error as sass.Exception;
    const span = sassError.span;
    const line = span ? style.line + span.start.line : style.line;
    const column = span ? styleColumn(span) : 1;
    throw lusiaError(
      "L1005",
      { message: sassError.sassMessage ?? String(error) },
      { file, line, column },
    );
  }
}
