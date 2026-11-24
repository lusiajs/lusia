import type { CompletionItemData } from "../completion-data.ts";
import { memberItems, type VariableKind } from "./members.ts";

export interface LocalName {
  name: string;
  kind: "function" | "class" | "variable";
}

const DECLARATION = /\b(const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g;
const BOUND_LIST = /\b(?:const|let|var)\s*\{([^}]*)\}\s*=/g;
const DEFAULT_IMPORT = /\bimport\s+([A-Za-z_$][\w$]*)\s+from\b/g;
const NAMED_IMPORT = /\bimport\s*\{([^}]*)\}\s*from\b/g;
const VARIABLE_DECLARATION =
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*variable(\.compute)?\s*[(<]/g;
const PROPS_DESTRUCTURING = /\b(?:const|let|var)\s*\{([^}]*)\}\s*=\s*props\s*\(/g;
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const RECEIVER = /([A-Za-z_$][\w$]*)\.[\w$]*$/;
const RECEIVER_WINDOW = 128;

/** The names a script declares or imports, such as `count`, `reset` and `Badge`. */
export function localNames(script: string): LocalName[] {
  const found = new Map<string, LocalName["kind"]>();
  for (const match of script.matchAll(DECLARATION)) {
    found.set(match[2] ?? "", kindOf(match[1] ?? ""));
  }
  for (const match of script.matchAll(BOUND_LIST)) {
    for (const name of boundNames(match[1] ?? "")) found.set(name, "variable");
  }
  for (const match of script.matchAll(DEFAULT_IMPORT)) {
    found.set(match[1] ?? "", "class");
  }
  for (const match of script.matchAll(NAMED_IMPORT)) {
    for (const name of importedNames(match[1] ?? "")) found.set(name, "variable");
  }
  return [...found]
    .filter(([name]) => IDENTIFIER.test(name))
    .map(([name, kind]) => ({ name, kind }));
}

/** Skips names that an API item already has. */
export function localItems(script: string, taken: ReadonlySet<string>): CompletionItemData[] {
  return localNames(script)
    .filter((local) => !taken.has(local.name))
    .map((local) => ({
      label: local.name,
      kind: local.kind,
      insertText: local.name,
      snippet: false,
      detail: "In this file",
    }));
}

/** What each name holds: from `variable()`, `variable.compute()` or destructured from `props()`. */
export function variableKinds(script: string): Map<string, VariableKind> {
  const kinds = new Map<string, VariableKind>();
  const declared = new Map<string, number>();
  const remember = (name: string, kind: VariableKind, index: number) => {
    if (index < (declared.get(name) ?? -1)) return;
    kinds.set(name, kind);
    declared.set(name, index);
  };
  for (const match of script.matchAll(VARIABLE_DECLARATION)) {
    remember(match[1] ?? "", match[2] ? "computed" : "variable", match.index);
  }
  for (const match of script.matchAll(PROPS_DESTRUCTURING)) {
    for (const name of boundNames(match[1] ?? "")) remember(name, "prop", match.index);
  }
  return kinds;
}

export function variableNames(script: string): Set<string> {
  return new Set(variableKinds(script).keys());
}

/** `.value`, `.get()`, `.set()`, `.peek()` and `.onUpdate()` for a variable. */
export function variableMemberItems(): CompletionItemData[] {
  return memberItems("variable");
}

/** The identifier before a `.` that the cursor is after, such as `count` in `count.va|`. */
export function receiverAt(text: string, offset: number): string | undefined {
  const head = text.slice(Math.max(0, offset - RECEIVER_WINDOW), offset);
  return RECEIVER.exec(head)?.[1];
}

function kindOf(keyword: string): LocalName["kind"] {
  if (keyword === "function") return "function";
  if (keyword === "class") return "class";
  return "variable";
}

/** The local names of `{ a, b: c, d = 1 }`: a, c and d. */
function boundNames(list: string): string[] {
  return list
    .split(",")
    .map((part) => part.split("=")[0] ?? "")
    .map((part) => part.split(":").pop()?.trim() ?? "")
    .filter((name) => name !== "");
}

/** The local names of `{ x, y as z }`: x and z. */
function importedNames(list: string): string[] {
  return list
    .split(",")
    .map(
      (part) =>
        part
          .trim()
          .split(/\s+as\s+/)
          .pop() ?? "",
    )
    .filter((name) => name !== "");
}
