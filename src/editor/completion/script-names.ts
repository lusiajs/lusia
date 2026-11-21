import type { CompletionItemData, CompletionKind } from "../completion-data.ts";
import { localItems } from "./locals.ts";
import { importedSymbols, type SymbolLookup } from "../script/imported-symbols.ts";
import type { SymbolKind } from "../script/signature.ts";

const SYMBOL_KINDS: Record<SymbolKind, CompletionKind> = {
  function: "function",
  class: "class",
  interface: "type",
  type: "type",
  enum: "variable",
  const: "variable",
};

export function withScriptNames(
  base: CompletionItemData[],
  script: string,
  symbolsOf?: SymbolLookup,
): CompletionItemData[] {
  const taken = new Set(base.map((item) => item.label));
  return [...base, ...importedItems(script, symbolsOf, taken), ...localItems(script, taken)];
}

function importedItems(
  script: string,
  symbolsOf: SymbolLookup | undefined,
  taken: Set<string>,
): CompletionItemData[] {
  if (!symbolsOf) return [];
  return importedSymbols(script, symbolsOf).flatMap((imported) => {
    if (taken.has(imported.local)) return [];
    taken.add(imported.local);
    const item: CompletionItemData = {
      label: imported.local,
      kind: SYMBOL_KINDS[imported.symbol.kind],
      insertText: imported.local,
      snippet: false,
      detail: imported.symbol.signature,
    };
    if (imported.symbol.doc !== "") item.documentation = imported.symbol.doc;
    return [item];
  });
}
