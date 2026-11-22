import { lusiaError, type Values } from "../errors/create.ts";
import type { ErrorCodeName } from "../errors/codes.ts";
import { RESERVED_TAGS } from "./reserved.ts";
import { HTML_TAGS } from "./html-tags.ts";
import { columnAt, lineAt } from "../utils/position.ts";
import type { Section } from "./sections.ts";

/** A default import of a `.lusia` file: the tag name and the file it loads. */
export interface LusiaImport {
  name: string;
  specifier: string;
}

export interface ImportStatement {
  text: string;
  /** Set when the statement is a default import of a `.lusia` file. */
  lusia?: LusiaImport;
}

export interface SplitScript {
  /** Import statements, hoisted to module level so they run once per file. */
  imports: string;
  /** The same statements, one by one, so the compiler can replace some of them. */
  statements: ImportStatement[];
  /** The rest of the script, run once per instance. */
  body: string;
  /** Default-import names of `.lusia` files, usable as tags in markup. */
  components: Set<string>;
}

const IMPORT_STATEMENT = /^[ \t]*import(?!\s*\()\s[^"']*?(["'])([^"'\n]+)\1[ \t]*;?/gm;
const EXPORT_STATEMENT = /^[ \t]*export\b/m;
const DEFAULT_IMPORT = /^\s*import\s+(?!type\s)([A-Za-z_$][\w$]*)\s*(?:,|from\b)/;

function defaultLusiaImport(statement: string, specifier: string): string | undefined {
  if (!specifier.endsWith(".lusia")) return undefined;
  return DEFAULT_IMPORT.exec(statement)?.[1];
}

function boxName(name: string): string {
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}Box`;
}

function checkComponentName(name: string, script: Section, offset: number, file: string): void {
  if (RESERVED_TAGS.has(name)) throw scriptError(script, offset, file, "L1004", { name });
  if (HTML_TAGS.has(name.toLowerCase())) {
    throw scriptError(script, offset, file, "L1046", { name, suggestion: boxName(name) });
  }
}

function scriptError(
  script: Section,
  offset: number,
  file: string,
  code: ErrorCodeName,
  values?: Values,
) {
  const line = script.line - 1 + lineAt(script.content, offset);
  return lusiaError(code, values, { file, line, column: columnAt(script.content, offset) });
}

function rejectExports(script: Section, file: string): void {
  const match = EXPORT_STATEMENT.exec(script.content);
  if (!match) return;
  const at = match.index + match[0].length - "export".length;
  throw scriptError(script, at, file, "L1003");
}

export function splitImports(section: Section | null, file: string): SplitScript {
  if (!section) return { imports: "", statements: [], body: "", components: new Set() };
  rejectExports(section, file);
  const script = section.content;
  const statements: ImportStatement[] = [];
  const components = new Set<string>();
  const body = script.replace(
    IMPORT_STATEMENT,
    (statement, _quote, specifier: string, offset: number) => {
      const name = defaultLusiaImport(statement, specifier);
      if (name) {
        checkComponentName(name, section, offset, file);
        components.add(name);
      }
      statements.push({
        text: statement.trim(),
        lusia: name ? { name, specifier } : undefined,
      });
      return "";
    },
  );
  const imports = statements.map((statement) => statement.text).join("\n");
  return { imports, statements, body, components };
}
