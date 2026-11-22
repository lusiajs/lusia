import { hash } from "./id.ts";
import { ownClassNames, scopeClassesOf } from "./style/scope-classes.ts";
import { importsWithSplits } from "./lazy/plan.ts";
import type { LazyOptions } from "./lazy/options.ts";
import { splitImports } from "./parse/imports.ts";
import { parse, type Section } from "./parse/sections.ts";
import { generate } from "./template/codegen/generate.ts";
import { scriptRange } from "./template/check/script-range.ts";
import { compileTemplate } from "./template/scan/scanner.ts";
import type { StyleResult } from "./style/sass.ts";
import { extractSourceMap } from "./sourcemap/extract.ts";
import { withScreenMedia } from "./style/screen-style.ts";
import { DEFAULT_SCREENS, type Screens } from "#runtime/screen/screens.ts";

export interface CompileOptions {
  /** Dev builds keep runtime error locations. Default false. */
  dev?: boolean;
  /** Splits imported .lusia files into their own chunks. Off when absent. */
  lazy?: LazyOptions;
  /** Screen sizes for `<style>` inside `<IF {SCREEN.X}>`. Defaults to PHONE, TABLET and DESKTOP. */
  screens?: Screens;
}

export interface CompileResult {
  code: string;
  css: string;
  id: string;
  /** A version 3 source map for `code`, as JSON. */
  map: string;
  /** The Sass files the styles imported. */
  deps: StyleResult["deps"];
  /** Time spent in the Sass compiler. Zero when every style came from the cache. */
  sassMs: number;
  /** The script and markup only. If this is unchanged, a change to the styles alone needs no reload. */
  scriptAndMarkup: string;
}

/** Turns one style section into scoped CSS. The caller decides whether Sass runs. */
export type StyleCompiler = (style: Section, index: number, id: string) => StyleResult;

export interface PipelineOptions {
  dev: boolean;
  displayFile: string;
  styles: StyleCompiler;
  lazy?: LazyOptions;
  screens?: Screens;
}

/** The shared compile steps. The Node build and the browser build differ only in the style step. */
export function compileParts(
  source: string,
  file: string,
  options: PipelineOptions,
): CompileResult {
  const parsed = parse(source, file);
  const id = hash(file);
  const screens = options.screens ?? DEFAULT_SCREENS;
  const styles = parsed.styles.map((style, index) =>
    withScreenMedia(options.styles(style, index, id), style, screens, file),
  );
  const css = styles.map((style) => style.css).join("\n");
  const scopes = scopeClassesOf(css, id);
  const { statements, body, components } = splitImports(parsed.script, file);
  const deps = styles.flatMap((style) => style.deps);
  const sassMs = styles.reduce((sum, style) => sum + style.sassMs, 0);
  const scriptAndMarkup = JSON.stringify([
    parsed.script?.content,
    parsed.script?.attrs,
    parsed.markup,
  ]);
  const imports = importsWithSplits(statements, parsed.markup, body, options.lazy);
  const template = compileTemplate(
    parsed.markup,
    file,
    parsed.markupLine,
    components,
    ownClassNames(scopes),
  );
  const generated = generate({
    imports,
    body,
    bodyLine: parsed.script?.line ?? 1,
    template,
    css,
    id,
    scopes,
    file: options.displayFile,
    dev: options.dev,
    source,
    script: scriptRange(parsed.script),
  });
  const { code, map } = extractSourceMap(generated, file, source);
  return { code, css, id, map, deps, sassMs, scriptAndMarkup };
}
