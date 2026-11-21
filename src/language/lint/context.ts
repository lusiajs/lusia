import type { PropDef } from "../parse/props.ts";
import { blankSections, scriptSection } from "../parse/sections.ts";
import type { ChildSource, ChildSourceLookup, LintContext, LintOptions } from "./types.ts";

export function buildContext(
  source: string,
  options: LintOptions,
  childLookup: (name: string) => PropDef[] | undefined,
  childSourceLookup: ChildSourceLookup,
): LintContext {
  const script = scriptSection(source);
  return {
    source,
    script: script ? source.slice(script.contentStart, script.contentEnd) : "",
    scriptOffset: script?.contentStart ?? 0,
    markup: blankSections(source),
    file: options.file,
    resolveClassType: options.resolveClassType,
    childProps: cached<PropDef[] | undefined>(childLookup),
    childSource: cached<ChildSource | undefined>(childSourceLookup),
  };
}

function cached<T>(lookup: (name: string) => T): (name: string) => T {
  const cache = new Map<string, T>();
  return (name) => {
    if (!cache.has(name)) cache.set(name, lookup(name));
    return cache.get(name) as T;
  };
}
