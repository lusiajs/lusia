import { parseScriptImports, type ScriptImport } from "./import-declarations.ts";
import type { ScriptSymbol } from "./symbols.ts";

export interface ImportedSymbol {
  local: string;
  symbol: ScriptSymbol;
}

export type SymbolLookup = (specifier: string) => ScriptSymbol[];

/** The symbols a script imports from other files, in the order its import statements appear. */
export function importedSymbols(script: string, symbolsOf: SymbolLookup): ImportedSymbol[] {
  const found = new Map<string, ImportedSymbol>();
  for (const statement of parseScriptImports(script)) {
    const symbols = lookupSymbols(symbolsOf, statement.specifier);
    readNamed(symbols, statement, found);
    readDefault(symbols, statement, found);
  }
  return [...found.values()];
}

/** The imported symbol a local name refers to, such as `Badge` in `import Badge from "./badge.lusia"`. */
export function importedSymbolAt(
  script: string,
  local: string,
  symbolsOf: SymbolLookup,
): ImportedSymbol | undefined {
  return importedSymbols(script, symbolsOf).find((imported) => imported.local === local);
}

function readNamed(
  symbols: ScriptSymbol[],
  statement: ScriptImport,
  found: Map<string, ImportedSymbol>,
): void {
  for (const name of statement.names) {
    const symbol = symbols.find((candidate) => candidate.name === name.imported);
    if (symbol) found.set(name.local, { local: name.local, symbol });
  }
}

function readDefault(
  symbols: ScriptSymbol[],
  statement: ScriptImport,
  found: Map<string, ImportedSymbol>,
): void {
  const local = statement.defaultName;
  if (!local) return;
  const symbol =
    symbols.find((candidate) => candidate.isDefault) ??
    symbols.find((candidate) => candidate.name === local);
  if (symbol) found.set(local, { local, symbol });
}

function lookupSymbols(symbolsOf: SymbolLookup, specifier: string): ScriptSymbol[] {
  try {
    return symbolsOf(specifier);
  } catch {
    return [];
  }
}
