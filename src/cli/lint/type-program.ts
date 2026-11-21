import type * as TypeScript from "typescript";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseLusiaImports } from "#language/parse/imports.ts";
import {
  compilerOptions,
  namedImports,
  resolvedTypeScriptFile,
  scriptText,
  type TypeScriptModule,
} from "./class-imports.ts";

export interface LintDocument {
  path: string;
  text: string;
}

/** One TypeScript program for a whole lint run. `program()` builds it on first use. */
export interface ClassTypes {
  ts: TypeScriptModule;
  program: () => TypeScript.Program;
}

/** TypeScript is an optional peer. Without it, class types stay unknown. */
export async function loadTypeScript(): Promise<TypeScriptModule | undefined> {
  try {
    return await import("typescript");
  } catch {
    return undefined;
  }
}

export async function loadClassTypes(documents: LintDocument[]): Promise<ClassTypes | undefined> {
  const ts = await loadTypeScript();
  if (!ts) return undefined;
  const roots = typeRoots(ts, documents);
  return { ts, program: createTypeProgram(ts, roots) };
}

// Every .ts file a component imports a named value from, including through its child components.
function typeRoots(ts: TypeScriptModule, documents: LintDocument[]): string[] {
  const roots = new Set<string>();
  const seen = new Set<string>();
  const visit = (path: string, text: string): void => {
    if (seen.has(path)) return;
    seen.add(path);
    const script = scriptText(text);
    for (const item of namedImports(script)) {
      const file = resolvedTypeScriptFile(ts, item.specifier, path);
      if (file) roots.add(file);
    }
    for (const child of parseLusiaImports(script)) {
      const childPath = resolve(dirname(path), child.specifier);
      if (existsSync(childPath)) visit(childPath, readFileSync(childPath, "utf8"));
    }
  };
  for (const document of documents) visit(document.path, document.text);
  return [...roots];
}

function createTypeProgram(ts: TypeScriptModule, roots: string[]): () => TypeScript.Program {
  let program: TypeScript.Program | undefined;
  return () => {
    program ??= ts.createProgram(roots, compilerOptions(ts));
    return program;
  };
}
