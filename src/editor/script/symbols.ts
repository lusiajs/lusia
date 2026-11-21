import { scanExports } from "./exports-scan.ts";
import { declarationDoc } from "./jsdoc.ts";
import type { SymbolKind } from "./signature.ts";

export interface ScriptSymbol {
  name: string;
  kind: SymbolKind;
  signature: string;
  isDefault: boolean;
  doc: string;
  specifier: string;
}

export function exportedSymbols(source: string, specifier: string): ScriptSymbol[] {
  return scanExports(source).map((declaration) => ({
    name: declaration.name,
    kind: declaration.kind,
    signature: declaration.signature,
    isDefault: declaration.isDefault,
    doc: declaration.docIndex === undefined ? "" : declarationDoc(source, declaration.docIndex),
    specifier,
  }));
}
