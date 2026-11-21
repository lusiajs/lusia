import type { ApiEntry } from "../../reference/api/types.ts";
import { codeSpan } from "./markdown.ts";

function mentionsName(text: string, name: string): boolean {
  return text.includes(codeSpan(name));
}

function entryText(entry: ApiEntry): string {
  return [entry.summary, ...entry.bullets].join("\n");
}

// Other entries whose summary or bullets show this entry's name as inline code.
export function seeAlsoEntries(entry: ApiEntry, all: ApiEntry[]): ApiEntry[] {
  const text = entryText(entry);
  return all.filter((other) => other.id !== entry.id && mentionsName(text, other.name));
}
