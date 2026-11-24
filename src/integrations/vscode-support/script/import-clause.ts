import type { ImportedName } from "./import-declarations.ts";
import { skipWhitespace, wordAt } from "./text-scan.ts";

export interface ImportClause {
  names: ImportedName[];
  defaultName?: string;
  namespaceName?: string;
  end: number;
}

const IDENTIFIER_NAME = /^[A-Za-z_$][\w$]*$/;

export function readImportClause(
  text: string,
  start: number,
  typeOnly: boolean,
): ImportClause | undefined {
  let pos = start;
  let defaultName: string | undefined;
  let namespaceName: string | undefined;
  let names: ImportedName[] = [];

  if (text[pos] === "{") {
    const list = readNamedList(text, pos, typeOnly);
    if (!list) return undefined;
    names = list.names;
    pos = list.end;
  } else if (text[pos] === "*") {
    const namespace = readNamespace(text, pos);
    if (!namespace) return undefined;
    namespaceName = namespace.name;
    pos = namespace.end;
  } else {
    const name = wordAt(text, pos);
    if (!name) return undefined;
    defaultName = name;
    pos = skipWhitespace(text, pos + name.length);
    if (text[pos] === ",") {
      pos = skipWhitespace(text, pos + 1);
      if (text[pos] === "{") {
        const list = readNamedList(text, pos, typeOnly);
        if (!list) return undefined;
        names = list.names;
        pos = list.end;
      } else if (text[pos] === "*") {
        const namespace = readNamespace(text, pos);
        if (!namespace) return undefined;
        namespaceName = namespace.name;
        pos = namespace.end;
      } else {
        return undefined;
      }
    }
  }

  return { names, defaultName, namespaceName, end: pos };
}

function readNamedList(
  text: string,
  start: number,
  typeOnly: boolean,
): { names: ImportedName[]; end: number } | undefined {
  const close = text.indexOf("}", start);
  if (close === -1) return undefined;
  const names: ImportedName[] = [];
  for (const entry of text.slice(start + 1, close).split(",")) {
    const name = readImportedName(entry, typeOnly);
    if (name) names.push(name);
  }
  return { names, end: close + 1 };
}

function readImportedName(entry: string, typeOnly: boolean): ImportedName | undefined {
  let text = entry.trim();
  let nameTypeOnly = typeOnly;
  if (/^type\s+/.test(text)) {
    nameTypeOnly = true;
    text = text.replace(/^type\s+/, "");
  }
  const [imported = "", local = imported] = text.split(/\s+as\s+/);
  const importedName = imported.trim();
  const localName = local.trim();
  if (!IDENTIFIER_NAME.test(importedName) || !IDENTIFIER_NAME.test(localName)) return undefined;
  return { imported: importedName, local: localName, typeOnly: nameTypeOnly };
}

function readNamespace(text: string, start: number): { name: string; end: number } | undefined {
  let pos = skipWhitespace(text, start + 1);
  if (wordAt(text, pos) !== "as") return undefined;
  pos = skipWhitespace(text, pos + "as".length);
  const name = wordAt(text, pos);
  return name ? { name, end: pos + name.length } : undefined;
}
