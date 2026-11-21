import type { Section } from "#compiler/parse/sections.ts";

export interface ScriptRange {
  from: number;
  to: number;
}

/** An absent script has an empty range. */
export function scriptRange(script: Section | null): ScriptRange {
  if (!script) return { from: 0, to: 0 };
  return { from: script.from, to: script.from + script.content.length };
}
