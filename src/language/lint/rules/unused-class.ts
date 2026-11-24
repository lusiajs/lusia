import { parse, type Section } from "#compiler/parse/sections.ts";
import { markupClasses, styleClasses, type StyleClass } from "#compiler/style/classes.ts";
import {
  compileLintScss,
  lintStyleCurrent,
  type CompiledStyle,
} from "#language/lint/style-compile";
import { styleMode } from "#compiler/style/modes.ts";
import { parseLusiaImports } from "../../parse/imports.ts";
import { scriptSection } from "../../parse/sections.ts";
import type { ChildSourceLookup, LintContext, LintFinding, LintRule } from "../types.ts";

const SCSS_ON_PURPOSE = /(?:\/\/|\/\*)\s*@on-purpose\b/;
const PLAIN_CSS_ON_PURPOSE = /\/\*\s*@on-purpose\b/;

interface Usage {
  used: Set<string>;
  unsafeDynamic: boolean;
}

export const unusedClass: LintRule = (context) => {
  const root = markupClasses(context.source, context.resolveClassType);
  if (root.unsafeDynamic) return [];
  const treeUsage = childTreeUsage(context.script, context.childSource);
  if (treeUsage.unsafeDynamic) return [];
  return styleSections(context.source).flatMap((section) =>
    unusedInSection(
      section,
      context,
      (item) => root.used.has(item.name) || (item.mode === "tree" && treeUsage.used.has(item.name)),
    ),
  );
};

// Sections the compiler cannot read are reported by the compiler itself.
function styleSections(source: string): Section[] {
  try {
    return parse(source, "").styles;
  } catch {
    return [];
  }
}

function unusedInSection(
  section: Section,
  context: LintContext,
  isUsed: (item: StyleClass) => boolean,
): LintFinding[] {
  const mode = styleMode(section);
  if (mode === "global") return [];
  const css = compiledCss(section, context.file);
  if (css === undefined) return [];
  return styleClasses(css, mode)
    .filter((item) => !isUsed(item))
    .flatMap((item) => unusedFinding(context.source, section, item.name));
}

// Compiled CSS has no comments, so the marker is read from the source line of the class.
function unusedFinding(source: string, section: Section, name: string): LintFinding[] {
  const token = classToken(section, name);
  if (token !== undefined && isOnPurpose(source, token, section)) return [];
  return [
    {
      offset: token ?? section.from,
      code: "unused-class",
      message: `".${name}" is not used. No element in this component or its child components has this class.`,
      severity: "warning",
    },
  ];
}

function isOnPurpose(source: string, offset: number, section: Section): boolean {
  const marker = section.attrs.lang === "css" ? PLAIN_CSS_ON_PURPOSE : SCSS_ON_PURPOSE;
  return marker.test(lineAt(source, offset));
}

function lineAt(source: string, offset: number): string {
  const start = source.lastIndexOf("\n", offset) + 1;
  const end = source.indexOf("\n", offset);
  return source.slice(start, end === -1 ? source.length : end);
}

// The editor lints on every keystroke, so the same style is compiled once.
const compiledStyles = new Map<string, CompiledStyle>();
const COMPILED_LIMIT = 200;

function compiledCss(section: Section, file: string | undefined): string | undefined {
  if (section.attrs.lang === "css") return section.content;
  const key = `${file ?? ""}\0${section.content}`;
  const hit = compiledStyles.get(key);
  if (hit && lintStyleCurrent(hit)) return hit.css;
  const compiled = compileLintScss(section.content, file);
  if (!compiled) return undefined;
  if (compiledStyles.size >= COMPILED_LIMIT) compiledStyles.clear();
  compiledStyles.set(key, compiled);
  return compiled.css;
}

function classToken(section: Section, name: string): number | undefined {
  const match = new RegExp(`\\.${escapeName(name)}(?![\\w-])`).exec(section.content);
  return match ? section.from + match.index : undefined;
}

function escapeName(name: string): string {
  return name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Classes used by the markup of every imported component below this one. */
function childTreeUsage(script: string, lookup: ChildSourceLookup): Usage {
  const usage: Usage = { used: new Set(), unsafeDynamic: false };
  collectChildUsage(script, lookup, new Set(), usage);
  return usage;
}

function collectChildUsage(
  script: string,
  lookup: ChildSourceLookup,
  visited: Set<string>,
  usage: Usage,
): void {
  for (const item of parseLusiaImports(script)) {
    const child = lookup(item.name);
    if (!child || visited.has(child.path)) continue;
    visited.add(child.path);
    const childMarkup = markupClasses(child.source, child.resolveClassType);
    for (const name of childMarkup.used) usage.used.add(name);
    usage.unsafeDynamic ||= childMarkup.unsafeDynamic;
    collectChildUsage(childScript(child.source), child.childSource, visited, usage);
  }
}

function childScript(source: string): string {
  const section = scriptSection(source);
  return section ? source.slice(section.contentStart, section.contentEnd) : "";
}
