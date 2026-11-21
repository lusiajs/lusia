import * as sass from "sass";
import { dirname } from "node:path";
import { parse, type Section } from "#compiler/parse/sections.ts";
import { markupClasses, styleClasses, type StyleClass } from "#compiler/style/classes.ts";
import { styleMode } from "#compiler/style/modes.ts";
import { parseLusiaImports } from "../../parse/imports.ts";
import { scriptSection } from "../../parse/sections.ts";
import type { ChildSourceLookup, LintContext, LintFinding, LintRule } from "../types.ts";

interface Usage {
  used: Set<string>;
  unsafeDynamic: boolean;
}

export const unusedClass: LintRule = (context) => {
  const root = markupClasses(context.source);
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
    .map((item) => ({
      offset: classOffset(section, item.name),
      code: "unused-class",
      message: `".${item.name}" is never used in markup`,
      severity: "warning",
    }));
}

function compiledCss(section: Section, file: string | undefined): string | undefined {
  if (section.attrs.lang === "css") return section.content;
  try {
    const loadPaths = file ? [dirname(file)] : [];
    return sass.compileString(section.content, {
      loadPaths,
      style: "expanded",
      logger: sass.Logger.silent,
    }).css;
  } catch {
    return undefined;
  }
}

function classOffset(section: Section, name: string): number {
  const match = new RegExp(`\\.${escapeName(name)}(?![\\w-])`).exec(section.content);
  return section.from + (match?.index ?? 0);
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
    const childMarkup = markupClasses(child.source);
    for (const name of childMarkup.used) usage.used.add(name);
    usage.unsafeDynamic ||= childMarkup.unsafeDynamic;
    collectChildUsage(childScript(child.source), child.childSource, visited, usage);
  }
}

function childScript(source: string): string {
  const section = scriptSection(source);
  return section ? source.slice(section.contentStart, section.contentEnd) : "";
}
