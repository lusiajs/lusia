import { readImportClause } from "./import-clause.ts";
import {
  isWordChar,
  readWordEnd,
  skipBlockComment,
  skipLineComment,
  skipString,
  skipWhitespace,
  wordAt,
} from "./text-scan.ts";

export interface ImportedName {
  imported: string;
  local: string;
  typeOnly: boolean;
}

export interface ScriptImport {
  specifier: string;
  names: ImportedName[];
  defaultName?: string;
  namespaceName?: string;
}

interface ParsedImport {
  statement: ScriptImport;
  end: number;
}

export function parseScriptImports(script: string): ScriptImport[] {
  const imports: ScriptImport[] = [];
  let index = 0;
  while (index < script.length) {
    const start = nextImportIndex(script, index);
    if (start === -1) break;
    const parsed = readImport(script, start);
    if (parsed) {
      imports.push(parsed.statement);
      index = parsed.end;
    } else {
      index = start + "import".length;
    }
  }
  return imports;
}

function nextImportIndex(text: string, from: number): number {
  let index = from;
  while (index < text.length) {
    const char = text[index];
    if (char === "/" && text[index + 1] === "/") {
      index = skipLineComment(text, index);
    } else if (char === "/" && text[index + 1] === "*") {
      index = skipBlockComment(text, index);
    } else if (char === '"' || char === "'" || char === "`") {
      index = skipString(text, index);
    } else if (isWordChar(char)) {
      const end = readWordEnd(text, index);
      if (text.slice(index, end) === "import" && text[index - 1] !== ".") return index;
      index = end;
    } else {
      index++;
    }
  }
  return -1;
}

function readImport(text: string, start: number): ParsedImport | undefined {
  let pos = skipWhitespace(text, start + "import".length);
  const first = text[pos];
  if (first === "(" || first === ".") return undefined;
  if (first === '"' || first === "'") return sideEffectImport(text, pos);

  const typeOnly = startsTypeOnly(text, pos);
  if (typeOnly) pos = skipWhitespace(text, pos + "type".length);

  const clause = readImportClause(text, pos, typeOnly);
  if (!clause) return undefined;
  pos = skipWhitespace(text, clause.end);
  if (wordAt(text, pos) !== "from") return undefined;
  pos = skipWhitespace(text, pos + "from".length);

  const literal = readString(text, pos);
  if (!literal) return undefined;

  const statement: ScriptImport = {
    specifier: literal.value,
    names: clause.names,
  };
  if (clause.defaultName) statement.defaultName = clause.defaultName;
  if (clause.namespaceName) statement.namespaceName = clause.namespaceName;
  return { statement, end: literal.end };
}

function startsTypeOnly(text: string, pos: number): boolean {
  if (wordAt(text, pos) !== "type") return false;
  const after = skipWhitespace(text, pos + "type".length);
  const next = text[after];
  if (next === "," || next === "=") return false;
  return wordAt(text, after) !== "from";
}

function sideEffectImport(text: string, start: number): ParsedImport | undefined {
  const literal = readString(text, start);
  if (!literal) return undefined;
  return {
    statement: { specifier: literal.value, names: [] },
    end: literal.end,
  };
}

function readString(text: string, start: number): { value: string; end: number } | undefined {
  const quote = text[start];
  if (quote !== '"' && quote !== "'") return undefined;
  let index = start + 1;
  while (index < text.length) {
    const char = text[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === quote) return { value: text.slice(start + 1, index), end: index + 1 };
    if (char === "\n") return undefined;
    index++;
  }
  return undefined;
}
