import type * as TypeScript from "typescript";
import { scriptSection } from "#language/parse/sections.ts";

export type TypeScriptModule = typeof TypeScript;

export interface NamedImport {
  specifier: string;
  exportName: string;
  localName: string;
}

const NAMED_IMPORT = /import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;
const TYPESCRIPT_FILE = /\.(?:c|m)?tsx?$/;

export function scriptText(text: string): string {
  const section = scriptSection(text);
  return section ? text.slice(section.contentStart, section.contentEnd) : "";
}

export function namedImports(script: string): NamedImport[] {
  const imports: NamedImport[] = [];
  for (const match of script.matchAll(NAMED_IMPORT)) {
    for (const part of match[1]!.split(",")) {
      const [exportName, localName] = part.trim().split(/\s+as\s+/);
      if (exportName)
        imports.push({ specifier: match[2]!, exportName, localName: localName ?? exportName });
    }
  }
  return imports;
}

/** The TypeScript file a module specifier resolves to, or undefined for anything else. */
export function resolvedTypeScriptFile(
  ts: TypeScriptModule,
  specifier: string,
  documentPath: string,
): string | undefined {
  const resolution = ts.resolveModuleName(specifier, documentPath, compilerOptions(ts), ts.sys);
  const file = resolution.resolvedModule?.resolvedFileName;
  return file && TYPESCRIPT_FILE.test(file) ? file : undefined;
}

export function compilerOptions(ts: TypeScriptModule): TypeScript.CompilerOptions {
  return {
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    allowImportingTsExtensions: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
  };
}
