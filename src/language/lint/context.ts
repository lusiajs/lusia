import type { PropDef } from "../parse/props.ts";
import { blankSections, scriptSection } from "../parse/sections.ts";
import type { LintContext } from "./types.ts";

export function buildContext(
  source: string,
  childLookup: (name: string) => PropDef[] | undefined,
): LintContext {
  const script = scriptSection(source);
  const cache = new Map<string, PropDef[] | undefined>();
  return {
    source,
    script: script ? source.slice(script.contentStart, script.contentEnd) : "",
    scriptOffset: script?.contentStart ?? 0,
    markup: blankSections(source),
    childProps(name) {
      if (!cache.has(name)) cache.set(name, childLookup(name));
      return cache.get(name);
    },
  };
}
