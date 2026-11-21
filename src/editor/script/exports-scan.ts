import { declarationSignature, type SymbolKind } from "./signature.ts";
import { countBraces, maskSource, skipWhitespace, wordAt } from "./text-scan.ts";

export interface ExportDeclaration {
  name: string;
  kind: SymbolKind;
  signature: string;
  isDefault: boolean;
  docIndex?: number;
}

const EXPORT = /\bexport\b/g;
const IDENTIFIER_NAME = /^[A-Za-z_$][\w$]*$/;
const KIND_BY_KEYWORD: Record<string, SymbolKind | undefined> = {
  function: "function",
  const: "const",
  let: "const",
  var: "const",
  class: "class",
  interface: "interface",
  type: "type",
  enum: "enum",
};

export function scanExports(source: string): ExportDeclaration[] {
  const masked = maskSource(source);
  const declarations: ExportDeclaration[] = [];
  let depth = 0;
  let scanned = 0;
  for (const match of masked.matchAll(EXPORT)) {
    depth = countBraces(masked, scanned, match.index, depth);
    scanned = match.index;
    if (depth > 0) continue;
    declarations.push(...readExport(source, masked, match.index));
  }
  return declarations;
}

function readExport(source: string, masked: string, index: number): ExportDeclaration[] {
  const start = skipWhitespace(masked, index + "export".length);
  if (masked[start] === "{") return readBraceExport(masked, start);

  let pos = start;
  let isDefault = false;
  if (wordAt(masked, pos) === "default") {
    isDefault = true;
    pos = skipWhitespace(masked, pos + "default".length);
  }
  if (wordAt(masked, pos) === "async") pos = skipWhitespace(masked, pos + "async".length);
  if (wordAt(masked, pos) === "declare") pos = skipWhitespace(masked, pos + "declare".length);

  let keyword = wordAt(masked, pos);
  if (keyword === "const" && wordAt(masked, skipWhitespace(masked, pos + 5)) === "enum") {
    keyword = "enum";
    pos = skipWhitespace(masked, pos + 5);
  }
  const kind = KIND_BY_KEYWORD[keyword];
  if (!kind) return [];
  pos = skipWhitespace(masked, pos + keyword.length);

  if (kind === "function" && masked[pos] === "*") pos = skipWhitespace(masked, pos + 1);

  const name = wordAt(masked, pos);
  if (!name && !isDefault) return [];
  const nameEnd = name ? pos + name.length : pos;
  return [
    {
      name: name || "default",
      kind,
      signature: declarationSignature(source, masked, kind, start, nameEnd),
      isDefault,
      docIndex: index,
    },
  ];
}

function readBraceExport(masked: string, start: number): ExportDeclaration[] {
  const close = masked.indexOf("}", start);
  if (close === -1) return [];
  if (wordAt(masked, skipWhitespace(masked, close + 1)) === "from") return [];

  const declarations: ExportDeclaration[] = [];
  for (const entry of masked.slice(start + 1, close).split(",")) {
    const name = readExportedName(entry);
    if (!name) continue;
    declarations.push({ name, kind: "const", signature: `const ${name}`, isDefault: false });
  }
  return declarations;
}

function readExportedName(entry: string): string | undefined {
  const text = entry.trim().replace(/^type\s+/, "");
  const parts = text.split(/\s+as\s+/);
  const name = (parts[1] ?? parts[0] ?? "").trim();
  return IDENTIFIER_NAME.test(name) ? name : undefined;
}
