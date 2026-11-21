import { findEnum, findScriptApi } from "../api-lookup.ts";
import { enumOwnerAt } from "../completion/enum-members.ts";
import type { HoverResult } from "../hover.ts";
import { importedSymbolAt, type SymbolLookup } from "../script/imported-symbols.ts";
import { scriptSource } from "#language/parse/sections.ts";
import { dottedNameAt, wordAt } from "#language/parse/word.ts";

export function scriptHover(
  text: string,
  offset: number,
  symbolsOf?: SymbolLookup,
): HoverResult | undefined {
  const dotted = dottedNameAt(text, offset);
  if (dotted?.name.includes(".")) {
    const api = findScriptApi(dotted.name);
    if (api) return withRange({ kind: "api", entry: api }, dotted.start, dotted.end);
    const root = dotted.name.split(".")[0] ?? "";
    const enumEntry = findEnum(root) ?? enumOwnerAt(text, offset);
    if (enumEntry) return withRange({ kind: "api", entry: enumEntry }, dotted.start, dotted.end);
  }
  const word = wordAt(text, offset);
  const entry = findScriptApi(word) ?? enumOwnerAt(text, offset);
  if (entry) return { kind: "api", entry };
  if (!symbolsOf || word === "") return undefined;
  const imported = importedSymbolAt(scriptSource(text), word, symbolsOf);
  return imported ? { kind: "symbol", symbol: imported.symbol, local: imported.local } : undefined;
}

function withRange(result: HoverResult, start: number, end: number): HoverResult {
  return { ...result, range: { start, end } };
}
