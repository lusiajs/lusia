import { hash } from "./id.ts";
import { ownClassNames, scopeClassesOf } from "./style/scope-classes.ts";
import { importsWithSplits } from "./lazy/plan.ts";
import type { LazyOptions } from "./lazy/options.ts";
import { splitImports } from "./parse/imports.ts";
import { parse, type Section } from "./parse/sections.ts";
import { generate, type NoSsrParts } from "./template/codegen/generate.ts";
import { scriptRange } from "./template/check/script-range.ts";
import { compileTemplate } from "./template/scan/scanner.ts";
import type { StyleResult } from "./style/sass.ts";
import { extractSourceMap } from "./sourcemap/extract.ts";
import { withScreenMedia } from "./style/screen-style.ts";
import { DEFAULT_SCREENS, type Screens } from "#runtime/screen/screens.ts";
import { basename } from "node:path";
import { scriptProps } from "./props/script.ts";
import { rewriteTemplateProps } from "./props/template.ts";

export interface CompileOptions {
  /** Dev builds keep runtime error locations. Default false. */
  dev?: boolean;
  /** Splits imported .lusia files into their own chunks. Off when absent. */
  lazy?: LazyOptions;
  /** Screen sizes for `<style>` inside `<IF {SCREEN.X}>`. Defaults to PHONE, TABLET and DESKTOP. */
  screens?: Screens;
  /** The text the component id is hashed from. Defaults to the file path. */
  idKey?: string;
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
  /** One entry per Sass style, in source order. Plain CSS styles are left out. */
  styleBlocks: StyleBlockTiming[];
  /** The script and markup only. If this is unchanged, a change to the styles alone needs no reload. */
  scriptAndMarkup: string;
}

export interface StyleBlockTiming {
  index: number;
  cached: boolean;
  ms: number;
}

/** Turns one style section into scoped CSS. The caller decides whether Sass runs. */
export type StyleCompiler = (style: Section, index: number, id: string) => StyleResult;

export interface PipelineOptions {
  dev: boolean;
  displayFile: string;
  styles: StyleCompiler;
  lazy?: LazyOptions;
  screens?: Screens;
  idKey?: string;
}

/** The shared compile steps. The Node build and the browser build differ only in the style step. */
export function compileParts(
  source: string,
  file: string,
  options: PipelineOptions,
): CompileResult {
  const parsed = parse(source, file);
  const id = hash(options.idKey ?? file);
  const screens = options.screens ?? DEFAULT_SCREENS;
  const styles = parsed.styles.map((style, index) =>
    withScreenMedia(options.styles(style, index, id), style, screens, file),
  );
  const css = styles.map((style) => style.css).join("\n");
  const scopes = scopeClassesOf(css, id);
  const { statements, body, components } = splitImports(parsed.script, file);
  const script = scriptProps(body, statements, file, parsed.script?.line ?? 1);
  const deps = styles.flatMap((style) => style.deps);
  const sassMs = styles.reduce((sum, style) => sum + style.ms, 0);
  const styleBlocks = parsed.styles.flatMap((section, index) =>
    section.attrs.lang === "css" ? [] : [styleBlockTiming(index, styles[index]!)],
  );
  const scriptAndMarkup = JSON.stringify([
    parsed.script?.content,
    parsed.script?.attrs,
    parsed.markup,
    parsed.head?.content,
    parsed.nossr,
  ]);
  const imports = importsWithSplits(
    statements,
    `${parsed.markup}\n${parsed.head?.content ?? ""}`,
    body,
    options.lazy,
  );
  const classes = ownClassNames(scopes);
  const template = compileTemplate(parsed.markup, file, parsed.markupLine, components, classes);
  const head = parsed.head
    ? compileTemplate(parsed.head.content, file, parsed.head.line, components, classes)
    : undefined;
  rewriteTemplateProps(template, script.names, file);
  if (head) rewriteTemplateProps(head, script.names, file);
  const generated = generate({
    imports,
    body: script.body,
    bodyLine: parsed.script?.line ?? 1,
    template,
    head,
    noSsr: noSsrParts(parsed.nossr, parsed.fallback !== null, file),
    css,
    id,
    scopes,
    file: options.displayFile,
    dev: options.dev,
    source,
    script: scriptRange(parsed.script),
    propsHolder: script.holder,
  });
  const { code, map } = extractSourceMap(generated, file, source);
  return { code, css, id, map, deps, sassMs, styleBlocks, scriptAndMarkup };
}

function noSsrParts(nossr: boolean, hasFallback: boolean, file: string): NoSsrParts | undefined {
  if (!nossr) return undefined;
  return hasFallback ? { fallbackSpecifier: `./${basename(file)}?fallback` } : {};
}

function styleBlockTiming(index: number, style: StyleResult): StyleBlockTiming {
  return { index, cached: style.cached ?? false, ms: style.ms };
}
