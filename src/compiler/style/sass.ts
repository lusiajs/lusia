import type * as sass from "sass";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
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
  cached: boolean;
}

interface SassOutput {
  css: string;
  deps: StyleDep[];
  sassMs: number;
  cached: boolean;
}

interface SassEntry {
  content: string;
  screens: Screens;
  deps: StyleDep[];
  css: string;
}

export interface CachedStyle extends SassEntry {
  file: string;
  index: number;
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
    ? { css: style.content, deps: [], sassMs: 0, cached: false }
    : compileScss(style, file, index, screens);
  const css = scopeCss(sassOutput.css, id, styleMode(style)).trim();
  return { css, deps: sassOutput.deps, sassMs: sassOutput.sassMs, cached: sassOutput.cached };
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

/** Every cached style, for saving the cache to disk. */
export function cachedStyleEntries(): CachedStyle[] {
  return [...sassCache].flatMap(([file, entries]) =>
    entries.flatMap((entry, index) => ({ file, index, ...entry })),
  );
}

export function isStyleCached(
  file: string,
  index: number,
  style: StyleSource,
  screens: Screens,
): boolean {
  return cachedEntry(file, index, style, screens) !== undefined;
}

export function primeStyle(
  file: string,
  index: number,
  style: StyleSource,
  screens: Screens,
  css: string,
  deps: StyleDep[],
): void {
  storeEntry(file, index, { content: style.content, screens, deps, css });
}

/** The Sass source for a style: the screen() mixin, then the style's own content. */
export function scssSource(style: StyleSource): string {
  return SCREEN_USE + style.content;
}

/** The Sass options for a style. Sync and async compilers both take these. */
export function sassOptions(file: string, screens: Screens) {
  return {
    loadPaths: [dirname(file)],
    importers: [screenImporter(screens)],
    style: "expanded" as const,
  };
}

/** The paths of the files a Sass compile loaded from disk. */
export function loadedFilePaths(urls: URL[]): string[] {
  return urls.filter((url) => url.protocol === "file:").map((url) => fileURLToPath(url));
}

type StyleSource = Pick<Section, "content">;

function compileScss(style: Section, file: string, index: number, screens: Screens): SassOutput {
  const hit = cachedEntry(file, index, style, screens);
  if (hit) return { css: hit.css, deps: hit.deps, sassMs: 0, cached: true };
  const start = performance.now();
  const result = runSass(style, file, screens);
  const sassMs = performance.now() - start;
  const deps = loadedFilePaths(result.loadedUrls).map((path) => ({
    path,
    text: readFileSync(path, "utf8"),
  }));
  primeStyle(file, index, style, screens, result.css, deps);
  return { css: result.css, deps, sassMs, cached: false };
}

// The screen sizes are part of the key, because the screen() mixin is built from them.
function cachedEntry(
  file: string,
  index: number,
  style: StyleSource,
  screens: Screens,
): SassEntry | undefined {
  const entry = sassCache.get(file)?.[index];
  const matches =
    entry !== undefined &&
    entry.content === style.content &&
    JSON.stringify(entry.screens) === JSON.stringify(screens);
  if (matches && depsCurrent(entry.deps)) return entry;
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

// Loaded on the first cache miss, so a cache hit never pays for the Sass compiler.
const requireFromHere = createRequire(import.meta.url);
let sassCompilerModule: typeof sass | undefined;

function sassCompiler(): typeof sass {
  if (!sassCompilerModule) sassCompilerModule = requireFromHere("sass") as typeof sass;
  return sassCompilerModule;
}

function runSass(style: Section, file: string, screens: Screens): sass.CompileResult {
  try {
    return sassCompiler().compileString(scssSource(style), sassOptions(file, screens));
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
